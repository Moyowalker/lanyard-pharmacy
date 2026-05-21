import { PrismaClient } from '@prisma/client';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { seedDatabase } from '../prisma/seed';

describe('Workflow writes (db)', () => {
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
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('transitions an order into processing and reserves inventory across line items', async () => {
    const loginBody = {
      email: 'admin@lanyardpharmacy.com',
      password: 'Admin123!',
    };

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(loginBody)
      .expect(201);

    const headers = {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    };

    await request(app.getHttpServer())
      .patch('/api/v1/orders/ord-1001/status')
      .set(headers)
      .send({ status: 'awaiting_payment' })
      .expect(200);

    const processingResponse = await request(app.getHttpServer())
      .patch('/api/v1/orders/ord-1001/status')
      .set(headers)
      .send({ status: 'processing' })
      .expect(200);

    expect(processingResponse.body.order.status).toBe('processing');
    expect(processingResponse.body.inventoryReservations).toHaveLength(2);

    const mainPanadol = await prisma.inventoryBatch.findUniqueOrThrow({
      where: { id: 'inv-pan-ex-main' },
    });
    const mainAmoxicillin = await prisma.inventoryBatch.findUniqueOrThrow({
      where: { id: 'inv-amx-main' },
    });

    expect(mainPanadol.availableQuantity).toBe(139);
    expect(mainPanadol.reservedQuantity).toBe(1);
    expect(mainAmoxicillin.availableQuantity).toBe(31);
    expect(mainAmoxicillin.reservedQuantity).toBe(1);
  });

  it('previews a cart and creates an order with persisted line items', async () => {
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

    const body = {
      customerId: 'cust-100',
      branchId: 'branch-main',
      items: [
        {
          productId: 'prod-panadol-extra',
          quantity: 2,
        },
        {
          productId: 'prod-amoxicillin-500',
          quantity: 1,
        },
      ],
    };

    const previewResponse = await request(app.getHttpServer())
      .post('/api/v1/orders/cart/preview')
      .set(headers)
      .send(body)
      .expect(201);

    expect(previewResponse.body.total).toBe(17200);
    expect(previewResponse.body.containsPrescriptionItems).toBe(true);
    expect(previewResponse.body.nextOrderStatus).toBe('pending_review');
    expect(previewResponse.body.items).toHaveLength(2);

    const checkoutResponse = await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set(headers)
      .send(body)
      .expect(201);

    expect(checkoutResponse.body.order.status).toBe('pending_review');
    expect(checkoutResponse.body.order.total).toBe(17200);
    expect(checkoutResponse.body.order.containsPrescriptionItems).toBe(true);
    expect(checkoutResponse.body.order.items).toHaveLength(2);

    const savedItems = await prisma.orderItem.findMany({
      where: {
        orderId: checkoutResponse.body.order.id,
      },
      orderBy: {
        id: 'asc',
      },
    });

    expect(savedItems).toHaveLength(2);
    expect(savedItems.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })))
      .toEqual([
        {
          productId: 'prod-panadol-extra',
          quantity: 2,
          unitPrice: 4500,
        },
        {
          productId: 'prod-amoxicillin-500',
          quantity: 1,
          unitPrice: 8200,
        },
      ]);
  });

  it('creates payment attempts, handles failed retries, and reconciles captured payments into processing', async () => {
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
            quantity: 2,
          },
        ],
      })
      .expect(201);

    expect(checkoutResponse.body.order.status).toBe('awaiting_payment');

    const failedAttemptResponse = await request(app.getHttpServer())
      .post('/api/v1/payments/attempts')
      .set(headers)
      .send({
        orderId: checkoutResponse.body.order.id,
        provider: 'paystack',
      })
      .expect(201);

    expect(failedAttemptResponse.body.paymentAttempt.status).toBe('initiated');
    expect(failedAttemptResponse.body.paymentAttempt.amount).toBe(9000);

    const failedWebhookResponse = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks')
      .send({
        provider: 'paystack',
        providerReference: failedAttemptResponse.body.paymentAttempt.providerReference,
        status: 'failed',
      })
      .expect(201);

    expect(failedWebhookResponse.body.paymentAttempt.status).toBe('failed');
    expect(failedWebhookResponse.body.order.status).toBe('awaiting_payment');
    expect(failedWebhookResponse.body.inventoryReservations).toHaveLength(0);

    const capturedAttemptResponse = await request(app.getHttpServer())
      .post('/api/v1/payments/attempts')
      .set(headers)
      .send({
        orderId: checkoutResponse.body.order.id,
        provider: 'flutterwave',
      })
      .expect(201);

    const capturedWebhookResponse = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks')
      .send({
        provider: 'flutterwave',
        providerReference: capturedAttemptResponse.body.paymentAttempt.providerReference,
        status: 'captured',
      })
      .expect(201);

    expect(capturedWebhookResponse.body.paymentAttempt.status).toBe('captured');
    expect(capturedWebhookResponse.body.order.status).toBe('processing');
    expect(capturedWebhookResponse.body.inventoryReservations).toHaveLength(1);

    const savedAttempt = await prisma.paymentAttempt.findUniqueOrThrow({
      where: {
        id: capturedAttemptResponse.body.paymentAttempt.id,
      },
    });

    expect(savedAttempt.status).toBe('captured');

    const airportPanadol = await prisma.inventoryBatch.findUniqueOrThrow({
      where: { id: 'inv-pan-ex-airport' },
    });

    expect(airportPanadol.availableQuantity).toBe(17);
    expect(airportPanadol.reservedQuantity).toBe(3);
  });

  it('reconciles refund webhooks and cancels the linked order', async () => {
    const refundResponse = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks')
      .send({
        provider: 'paystack',
        providerReference: 'PSTK-1002',
        status: 'refunded',
      })
      .expect(201);

    expect(refundResponse.body.paymentAttempt.status).toBe('refunded');
    expect(refundResponse.body.order.status).toBe('cancelled');
    expect(refundResponse.body.inventoryReservations).toHaveLength(0);

    const savedAttempt = await prisma.paymentAttempt.findUniqueOrThrow({
      where: {
        id: 'pay-1002',
      },
    });

    expect(savedAttempt.status).toBe('refunded');

    const airportPanadol = await prisma.inventoryBatch.findUniqueOrThrow({
      where: { id: 'inv-pan-ex-airport' },
    });

    expect(airportPanadol.availableQuantity).toBe(20);
    expect(airportPanadol.reservedQuantity).toBe(0);
  });

  it('rejects a prescription and cancels the linked order', async () => {
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

    const reviewResponse = await request(app.getHttpServer())
      .post('/api/v1/prescriptions/rx-1001/review')
      .set(headers)
      .send({ action: 'reject' })
      .expect(201);

    expect(reviewResponse.body.prescription.status).toBe('rejected');
    expect(reviewResponse.body.prescription.reviewedBy).toBe('staff-001');
    expect(reviewResponse.body.order.status).toBe('cancelled');

    const linkedOrder = await prisma.pharmacyOrder.findUniqueOrThrow({
      where: { id: 'ord-1001' },
    });

    expect(linkedOrder.status).toBe('cancelled');
  });

  it('releases reserved stock when a processing order is cancelled', async () => {
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

    const cancelResponse = await request(app.getHttpServer())
      .patch('/api/v1/orders/ord-1002/status')
      .set(headers)
      .send({ status: 'cancelled' })
      .expect(200);

    expect(cancelResponse.body.order.status).toBe('cancelled');
    expect(cancelResponse.body.inventoryReservations).toHaveLength(0);

    const airportPanadol = await prisma.inventoryBatch.findUniqueOrThrow({
      where: { id: 'inv-pan-ex-airport' },
    });

    expect(airportPanadol.availableQuantity).toBe(20);
    expect(airportPanadol.reservedQuantity).toBe(0);
  });
});