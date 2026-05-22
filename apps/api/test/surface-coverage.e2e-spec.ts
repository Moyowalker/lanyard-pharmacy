import { PrismaClient } from '@prisma/client';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { seedDatabase } from '../prisma/seed';

describe('API surface coverage (db)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    await seedDatabase(prisma);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('protects authenticated profile access and returns the current user', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@lanyardpharmacy.com',
        password: 'Admin123!',
      })
      .expect(201);

    const profileResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set({
        Authorization: `Bearer ${loginResponse.body.accessToken}`,
      })
      .expect(200);

    expect(profileResponse.body.email).toBe('admin@lanyardpharmacy.com');
    expect(profileResponse.body.roles).toContain('super_admin');
  });

  it('enforces branch scope on inventory and order checkout for branch-scoped pharmacists', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'pharmacist@lanyardpharmacy.com',
        password: 'Pharmacy123!',
      })
      .expect(201);

    const headers = {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    };

    await request(app.getHttpServer())
      .get('/api/v1/inventory/branches/branch-airport/stock')
      .set(headers)
      .expect(403);

    await request(app.getHttpServer())
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
      .expect(403);
  });

  it('covers order, payment, and delivery API surfaces for admin staff', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@lanyardpharmacy.com',
        password: 'Admin123!',
      })
      .expect(201);

    const headers = {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    };

    const checkoutResponse = await request(app.getHttpServer())
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

    const paymentAttemptResponse = await request(app.getHttpServer())
      .post('/api/v1/payments/attempts')
      .set(headers)
      .send({
        orderId: checkoutResponse.body.order.id,
        provider: 'paystack',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks')
      .send({
        provider: 'paystack',
        providerReference: paymentAttemptResponse.body.paymentAttempt.providerReference,
        status: 'captured',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${checkoutResponse.body.order.id}/status`)
      .set(headers)
      .send({ status: 'ready_for_dispatch' })
      .expect(200);

    const deliveryResponse = await request(app.getHttpServer())
      .post('/api/v1/delivery/jobs')
      .set(headers)
      .send({
        orderId: checkoutResponse.body.order.id,
        dispatchMode: 'manual_dispatch',
        assignedTo: 'dispatcher-001',
      })
      .expect(201);

    expect(deliveryResponse.body.deliveryJob.status).toBe('assigned');
  });

  it('covers prescription submission, queue, and review surfaces for pharmacy staff', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'pharmacist@lanyardpharmacy.com',
        password: 'Pharmacy123!',
      })
      .expect(201);

    const headers = {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    };

    const queueResponse = await request(app.getHttpServer())
      .get('/api/v1/prescriptions/queue')
      .set(headers)
      .expect(200);

    expect(Array.isArray(queueResponse.body)).toBe(true);

    const submissionResponse = await request(app.getHttpServer())
      .post('/api/v1/prescriptions')
      .set(headers)
      .send({
        customerId: 'cust-100',
        orderId: 'ord-1001',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${submissionResponse.body.prescription.id}/start-review`)
      .set(headers)
      .expect(201);

    const reviewResponse = await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${submissionResponse.body.prescription.id}/review`)
      .set(headers)
      .send({ action: 'approve' })
      .expect(201);

    expect(reviewResponse.body.prescription.status).toBe('approved');
  });
});