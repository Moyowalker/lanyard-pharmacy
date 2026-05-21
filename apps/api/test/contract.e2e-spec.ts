import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CatalogRepository } from '../src/database/repositories/catalog.repository';

describe('API contract surface', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.SKIP_DB_CONNECT = 'true';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CatalogRepository)
      .useValue({
        list: async () => [
          {
            id: 'prod-panadol-extra',
            name: 'Panadol Extra',
            slug: 'panadol-extra',
            requiresPrescription: false,
            category: 'Pain Relief',
            dosageForm: 'tablet',
            price: 4500,
            branchIds: ['branch-main', 'branch-airport'],
          },
        ],
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('exposes catalog and payment surfaces', async () => {
    const catalogResponse = await request(app.getHttpServer()).get('/api/v1/catalog/products').expect(200);
    expect(Array.isArray(catalogResponse.body)).toBe(true);

    const paymentResponse = await request(app.getHttpServer()).get('/api/v1/payments/providers').expect(200);
    expect(paymentResponse.body).toEqual(['paystack', 'flutterwave']);
  });

  afterEach(async () => {
    await app.close();
    delete process.env.SKIP_DB_CONNECT;
  });
});