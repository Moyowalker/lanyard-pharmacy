import { PrismaClient } from '@prisma/client';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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

  it('creates and updates a customer profile with normalized fields', async () => {
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

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(headers)
      .send({
        firstName: 'Kemi',
        lastName: 'Adeyemi',
        email: 'KEMI@example.com',
        phone: '+2348000000099',
        refillReminderOptIn: true,
      })
      .expect(201);

    expect(createResponse.body.email).toBe('kemi@example.com');
    expect(createResponse.body.refillReminderOptIn).toBe(true);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${createResponse.body.id}`)
      .set(headers)
      .send({
        lastName: 'Ogunleye',
        email: 'kemi.ogunleye@example.com',
        refillReminderOptIn: false,
      })
      .expect(200);

    expect(updateResponse.body.lastName).toBe('Ogunleye');
    expect(updateResponse.body.email).toBe('kemi.ogunleye@example.com');
    expect(updateResponse.body.refillReminderOptIn).toBe(false);

    const savedCustomer = await prisma.customer.findUniqueOrThrow({
      where: {
        id: createResponse.body.id,
      },
    });

    expect(savedCustomer.email).toBe('kemi.ogunleye@example.com');
    expect(savedCustomer.lastName).toBe('Ogunleye');
    expect(savedCustomer.refillReminderOptIn).toBe(false);
  });

  it('persists audit events across customer, inventory, order, payment, prescription, and delivery mutations', async () => {
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

    const customerResponse = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(headers)
      .send({
        firstName: 'Amina',
        lastName: 'Okoro',
        email: 'amina.okoro@example.com',
        phone: '+2348000000108',
        refillReminderOptIn: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/v1/inventory/batches/inv-pan-ex-main/adjust')
      .set(headers)
      .send({
        quantityDelta: -1,
        reason: 'Shelf reconciliation',
      })
      .expect(200);

    const orderResponse = await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set(headers)
      .send({
        customerId: customerResponse.body.id,
        branchId: 'branch-main',
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
        orderId: orderResponse.body.order.id,
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
      .patch(`/api/v1/orders/${orderResponse.body.order.id}/status`)
      .set(headers)
      .send({ status: 'ready_for_dispatch' })
      .expect(200);

    const deliveryResponse = await request(app.getHttpServer())
      .post('/api/v1/delivery/jobs')
      .set(headers)
      .send({
        orderId: orderResponse.body.order.id,
        dispatchMode: 'manual_dispatch',
        assignedTo: 'dispatcher-001',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/delivery/jobs/${deliveryResponse.body.deliveryJob.id}/status`)
      .set(headers)
      .send({ status: 'in_transit' })
      .expect(200);

    const prescriptionSubmissionResponse = await request(app.getHttpServer())
      .post('/api/v1/prescriptions')
      .set(headers)
      .send({
        customerId: 'cust-100',
        orderId: 'ord-1001',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${prescriptionSubmissionResponse.body.prescription.id}/start-review`)
      .set(headers)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${prescriptionSubmissionResponse.body.prescription.id}/review`)
      .set(headers)
      .send({ action: 'approve' })
      .expect(201);

    const auditEvents = await prisma.auditEvent.findMany();
    const entityTypes = [...new Set(auditEvents.map((event) => event.entityType))];

    expect(entityTypes).toEqual(
      expect.arrayContaining(['customer', 'inventory', 'order', 'payment', 'prescription', 'delivery']),
    );

    expect(auditEvents.some((event) => event.entityType === 'customer' && event.action === 'created')).toBe(true);
    expect(auditEvents.some((event) => event.entityType === 'inventory' && event.action === 'batch_adjusted')).toBe(
      true,
    );
    expect(auditEvents.some((event) => event.entityType === 'payment' && event.action === 'webhook_reconciled')).toBe(
      true,
    );
    expect(auditEvents.some((event) => event.entityType === 'prescription' && event.action === 'reviewed')).toBe(
      true,
    );
    expect(auditEvents.some((event) => event.entityType === 'delivery' && event.action === 'assigned')).toBe(true);
  });

  it('adjusts inventory batches and opens then resolves low-stock alerts', async () => {
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

    const lowStockResponse = await request(app.getHttpServer())
      .patch('/api/v1/inventory/batches/inv-pan-ex-main/adjust')
      .set(headers)
      .send({
        quantityDelta: -136,
        reason: 'Cycle count shrinkage',
      })
      .expect(200);

    expect(lowStockResponse.body.batch.availableQuantity).toBe(4);
    expect(lowStockResponse.body.lowStockAlertAction).toBe('opened');
    expect(lowStockResponse.body.lowStockAlert.availableQuantity).toBe(4);
    expect(lowStockResponse.body.lowStockAlert.threshold).toBe(5);

    const alertsResponse = await request(app.getHttpServer())
      .get('/api/v1/inventory/branches/branch-main/alerts')
      .set(headers)
      .expect(200);

    expect(alertsResponse.body).toHaveLength(1);
    expect(alertsResponse.body[0].productId).toBe('prod-panadol-extra');

    const replenishmentResponse = await request(app.getHttpServer())
      .patch('/api/v1/inventory/batches/inv-pan-ex-main/adjust')
      .set(headers)
      .send({
        quantityDelta: 6,
        reason: 'Emergency restock',
      })
      .expect(200);

    expect(replenishmentResponse.body.batch.availableQuantity).toBe(10);
    expect(replenishmentResponse.body.lowStockAlertAction).toBe('resolved');
    expect(replenishmentResponse.body.lowStockAlert).toBeNull();

    const savedAlerts = await prisma.lowStockAlert.findMany({
      where: {
        branchId: 'branch-main',
        productId: 'prod-panadol-extra',
      },
    });

    expect(savedAlerts).toHaveLength(0);
  });

  it('rejects invalid customer emails before persistence', async () => {
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

    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(headers)
      .send({
        firstName: 'Kemi',
        lastName: 'Adeyemi',
        email: 'not-an-email',
        phone: '+2348000000099',
      })
      .expect(400);
  });

  it('rejects customer updates when email conflicts with an existing profile', async () => {
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

    const conflictResponse = await request(app.getHttpServer())
      .patch('/api/v1/customers/cust-101')
      .set(headers)
      .send({
        email: 'ada@example.com',
      })
      .expect(409);

    expect(conflictResponse.body.message).toContain('Customer');
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

  it('creates a catalog product without branch assignments when no branches are configured', async () => {
    await prisma.notificationDeliveryAttempt.deleteMany();
    await prisma.workflowEvent.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.lowStockAlert.deleteMany();
    await prisma.deliveryJob.deleteMany();
    await prisma.inventoryReservation.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.paymentAttempt.deleteMany();
    await prisma.prescription.deleteMany();
    await prisma.inventoryBatch.deleteMany();
    await prisma.branchProduct.deleteMany();
    await prisma.pharmacyOrder.deleteMany();
    await prisma.product.deleteMany();
    await prisma.branch.deleteMany();

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

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/catalog/products')
      .set(headers)
      .send({
        name: 'Vitamin C 1000mg',
        category: 'Vitamins',
        dosageForm: 'tablet',
        price: 3500,
        requiresPrescription: false,
        branchIds: [],
      })
      .expect(201);

    expect(createResponse.body.name).toBe('Vitamin C 1000mg');
    expect(createResponse.body.branchIds).toEqual([]);

    const savedProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: createResponse.body.id,
      },
      include: {
        branchProducts: true,
      },
    });

    expect(savedProduct.name).toBe('Vitamin C 1000mg');
    expect(savedProduct.branchProducts).toHaveLength(0);
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

  it('submits, reviews, approves, and fulfills a prescription into ready-for-dispatch', async () => {
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
        customerId: 'cust-100',
        branchId: 'branch-main',
        items: [
          {
            productId: 'prod-amoxicillin-500',
            quantity: 1,
          },
        ],
      })
      .expect(201);

    expect(checkoutResponse.body.order.status).toBe('pending_review');

    const submissionResponse = await request(app.getHttpServer())
      .post('/api/v1/prescriptions')
      .set(headers)
      .send({
        customerId: 'cust-100',
        orderId: checkoutResponse.body.order.id,
      })
      .expect(201);

    expect(submissionResponse.body.prescription.status).toBe('submitted');

    const reviewStartResponse = await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${submissionResponse.body.prescription.id}/start-review`)
      .set(headers)
      .expect(201);

    expect(reviewStartResponse.body.prescription.status).toBe('under_review');

    const approvalResponse = await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${submissionResponse.body.prescription.id}/review`)
      .set(headers)
      .send({ action: 'approve' })
      .expect(201);

    expect(approvalResponse.body.prescription.status).toBe('approved');
    expect(approvalResponse.body.order.status).toBe('awaiting_payment');

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

    const fulfillmentResponse = await request(app.getHttpServer())
      .post(`/api/v1/prescriptions/${submissionResponse.body.prescription.id}/fulfill`)
      .set(headers)
      .expect(201);

    expect(fulfillmentResponse.body.prescription.status).toBe('fulfilled');
    expect(fulfillmentResponse.body.order.status).toBe('ready_for_dispatch');

    const savedPrescription = await prisma.prescription.findUniqueOrThrow({
      where: {
        id: submissionResponse.body.prescription.id,
      },
    });

    expect(savedPrescription.status).toBe('fulfilled');

    const savedOrder = await prisma.pharmacyOrder.findUniqueOrThrow({
      where: {
        id: checkoutResponse.body.order.id,
      },
    });

    expect(savedOrder.status).toBe('ready_for_dispatch');
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

  it('assigns delivery and advances a ready order through in-transit to delivered', async () => {
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

    const assignResponse = await request(app.getHttpServer())
      .post('/api/v1/delivery/jobs')
      .set(headers)
      .send({
        orderId: checkoutResponse.body.order.id,
        dispatchMode: 'courier_dispatch',
        assignedTo: 'rider-001',
        trackingReference: 'WAYBILL-001',
      })
      .expect(201);

    expect(assignResponse.body.deliveryJob.status).toBe('assigned');
    expect(assignResponse.body.deliveryJob.dispatchMode).toBe('courier_dispatch');
    expect(assignResponse.body.order.status).toBe('ready_for_dispatch');

    const transitResponse = await request(app.getHttpServer())
      .patch(`/api/v1/delivery/jobs/${assignResponse.body.deliveryJob.id}/status`)
      .set(headers)
      .send({ status: 'in_transit' })
      .expect(200);

    expect(transitResponse.body.deliveryJob.status).toBe('in_transit');
    expect(transitResponse.body.order.status).toBe('in_transit');

    const deliveredResponse = await request(app.getHttpServer())
      .patch(`/api/v1/delivery/jobs/${assignResponse.body.deliveryJob.id}/status`)
      .set(headers)
      .send({ status: 'delivered' })
      .expect(200);

    expect(deliveredResponse.body.deliveryJob.status).toBe('delivered');
    expect(deliveredResponse.body.order.status).toBe('delivered');

    const savedDeliveryJob = await prisma.deliveryJob.findUniqueOrThrow({
      where: {
        id: assignResponse.body.deliveryJob.id,
      },
    });

    expect(savedDeliveryJob.assignedTo).toBe('rider-001');
    expect(savedDeliveryJob.status).toBe('delivered');

    const savedOrder = await prisma.pharmacyOrder.findUniqueOrThrow({
      where: {
        id: checkoutResponse.body.order.id,
      },
    });

    expect(savedOrder.status).toBe('delivered');
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