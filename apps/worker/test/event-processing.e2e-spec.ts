import { PrismaClient } from '@prisma/client';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App as SupertestApp } from 'supertest/types';
import { AppModule as ApiAppModule } from '../../api/src/app.module';
import { seedDatabase } from '../../api/prisma/seed';
import { AppModule as WorkerAppModule } from '../src/app.module';
import { JobsService } from '../src/modules/jobs/jobs.service';

describe('Worker event processing (e2e)', () => {
  let prisma: PrismaClient;
  let apiApp: INestApplication<SupertestApp>;
  let workerApp: INestApplication<SupertestApp>;
  let jobsService: JobsService;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    await seedDatabase(prisma);

    const apiModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiAppModule],
    }).compile();

    apiApp = apiModuleFixture.createNestApplication();
    apiApp.setGlobalPrefix('api/v1');
    apiApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await apiApp.init();

    const workerModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [WorkerAppModule],
    }).compile();

    workerApp = workerModuleFixture.createNestApplication();
    await workerApp.init();
    jobsService = workerApp.get(JobsService);
  });

  afterEach(async () => {
    await apiApp.close();
    await workerApp.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('processes order, payment, inventory, and prescription events into notification attempts and worker audit trails', async () => {
    const loginResponse = await request(apiApp.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@lanyardpharmacy.com',
        password: 'Admin123!',
      })
      .expect(201);

    const headers = {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    };

    await request(apiApp.getHttpServer())
      .patch('/api/v1/inventory/batches/inv-pan-ex-main/adjust')
      .set(headers)
      .send({
        quantityDelta: -2,
        reason: 'Routine reconciliation',
      })
      .expect(200);

    const checkoutResponse = await request(apiApp.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set(headers)
      .send({
        customerId: 'cust-101',
        branchId: 'branch-airport',
        items: [
          {
            productId: 'prod-panadol-extra',
            quantity: 1,
          },
        ],
      })
      .expect(201);

    const paymentAttemptResponse = await request(apiApp.getHttpServer())
      .post('/api/v1/payments/attempts')
      .set(headers)
      .send({
        orderId: checkoutResponse.body.order.id,
        provider: 'paystack',
      })
      .expect(201);

    await request(apiApp.getHttpServer())
      .post('/api/v1/payments/webhooks')
      .send({
        provider: 'paystack',
        providerReference: paymentAttemptResponse.body.paymentAttempt.providerReference,
        status: 'captured',
      })
      .expect(201);

    await request(apiApp.getHttpServer())
      .post('/api/v1/prescriptions')
      .set(headers)
      .send({
        customerId: 'cust-100',
        orderId: 'ord-1001',
      })
      .expect(201);

    const result = await jobsService.drainPendingWorkflowEvents();

    expect(result.failed).toBe(0);
    expect(result.processed).toBeGreaterThanOrEqual(4);

    const events = await prisma.workflowEvent.findMany({
      where: {
        entityType: {
          in: ['inventory', 'order', 'payment', 'prescription'],
        },
      },
    });

    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.every((event) => event.status === 'completed')).toBe(true);

    const deliveryAttempts = await prisma.notificationDeliveryAttempt.findMany();
    expect(deliveryAttempts.length).toBeGreaterThanOrEqual(4);
    expect(deliveryAttempts.map((attempt) => attempt.template)).toEqual(
      expect.arrayContaining([
        'inventory-batch-adjusted',
        'order-created',
        'payment-attempt-created',
        'payment-webhook-reconciled',
        'prescription-submitted',
      ]),
    );

    const workerAuditEvents = await prisma.auditEvent.findMany({
      where: {
        actorId: {
          in: ['worker-jobs', 'worker-notification-dispatch'],
        },
      },
    });

    expect(workerAuditEvents.some((event) => event.entityType === 'worker_job')).toBe(true);
    expect(workerAuditEvents.some((event) => event.entityType === 'notification')).toBe(true);
  });
});