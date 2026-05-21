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