import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { seedDatabase } from '../prisma/seed';
import { BranchesRepository } from '../src/database/repositories/branches.repository';
import { CatalogRepository } from '../src/database/repositories/catalog.repository';
import { CustomersRepository } from '../src/database/repositories/customers.repository';
import { InventoryRepository } from '../src/database/repositories/inventory.repository';
import { OrdersRepository } from '../src/database/repositories/orders.repository';
import { PaymentAttemptsRepository } from '../src/database/repositories/payment-attempts.repository';
import { PrescriptionsRepository } from '../src/database/repositories/prescriptions.repository';
import { DatabaseService } from '../src/database/database.service';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/lanyard_pharmacy';

describe('Persistence boundary (db)', () => {
  let prisma: PrismaClient;
  let moduleRef: TestingModule | undefined;
  let database: DatabaseService;
  let branchesRepository: BranchesRepository;
  let catalogRepository: CatalogRepository;
  let customersRepository: CustomersRepository;
  let inventoryRepository: InventoryRepository;
  let ordersRepository: OrdersRepository;
  let paymentAttemptsRepository: PaymentAttemptsRepository;
  let prescriptionsRepository: PrescriptionsRepository;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    await seedDatabase(prisma);

    moduleRef = await Test.createTestingModule({
      providers: [
        DatabaseService,
        BranchesRepository,
        CatalogRepository,
        CustomersRepository,
        InventoryRepository,
        OrdersRepository,
        PaymentAttemptsRepository,
        PrescriptionsRepository,
      ],
    }).compile();

    database = moduleRef.get(DatabaseService);
    await database.onModuleInit();

    branchesRepository = moduleRef.get(BranchesRepository);
    catalogRepository = moduleRef.get(CatalogRepository);
    customersRepository = moduleRef.get(CustomersRepository);
    inventoryRepository = moduleRef.get(InventoryRepository);
    ordersRepository = moduleRef.get(OrdersRepository);
    paymentAttemptsRepository = moduleRef.get(PaymentAttemptsRepository);
    prescriptionsRepository = moduleRef.get(PrescriptionsRepository);
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
      moduleRef = undefined;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads and persists branch-scoped catalog availability from postgres', async () => {
    const branches = await branchesRepository.list();

    expect(branches.map((branch) => branch.id)).toEqual(['branch-airport', 'branch-main']);

    const mainCatalog = await catalogRepository.findByBranchAndIds('branch-main', [
      'prod-panadol-extra',
      'prod-amoxicillin-500',
    ]);

    expect(mainCatalog).toHaveLength(2);
    expect(mainCatalog.find((product) => product.id === 'prod-amoxicillin-500')?.branchIds).toEqual(['branch-main']);

    await catalogRepository.addBranchProduct('prod-amoxicillin-500', 'branch-airport');

    const airportCatalog = await catalogRepository.findByBranchAndIds('branch-airport', ['prod-amoxicillin-500']);

    expect(airportCatalog).toHaveLength(1);
    expect(airportCatalog[0]?.branchIds).toEqual(['branch-airport']);

    await catalogRepository.removeBranchProduct('prod-amoxicillin-500', 'branch-airport');

    const persistedJoin = await prisma.branchProduct.findUnique({
      where: {
        branchId_productId: {
          branchId: 'branch-airport',
          productId: 'prod-amoxicillin-500',
        },
      },
    });

    expect(persistedJoin).toBeNull();
  });

  it('persists customer, order, payment, and prescription records through repositories', async () => {
    const customer = await customersRepository.create({
      id: 'cust-int-001',
      firstName: 'Bola',
      lastName: 'Adeniran',
      email: 'bola.adeniran@example.com',
      phone: '+2348000000199',
      refillReminderOptIn: true,
    });

    const order = await ordersRepository.create({
      id: 'ord-int-001',
      customerId: customer.id,
      branchId: 'branch-main',
      status: 'awaiting_payment',
      total: 12700,
      containsPrescriptionItems: true,
      items: [
        {
          id: 'item-ord-int-001-pan',
          productId: 'prod-panadol-extra',
          quantity: 1,
          unitPrice: 4500,
        },
        {
          id: 'item-ord-int-001-amx',
          productId: 'prod-amoxicillin-500',
          quantity: 1,
          unitPrice: 8200,
        },
      ],
    });

    const paymentAttempt = await paymentAttemptsRepository.create({
      id: 'pay-int-001',
      orderId: order.id,
      provider: 'paystack',
      status: 'initiated',
      providerReference: 'PSTK-INT-001',
      amount: 12700,
    });

    const prescription = await prescriptionsRepository.create({
      id: 'rx-int-001',
      customerId: customer.id,
      orderId: order.id,
      status: 'submitted',
      uploadedAt: new Date('2026-05-23T10:15:00.000Z'),
    });

    await customersRepository.update(customer.id, {
      lastName: 'Adeleke',
    });
    await ordersRepository.updateStatus(order.id, 'pending_review');
    await paymentAttemptsRepository.updateStatus(paymentAttempt.id, 'captured');
    await prescriptionsRepository.updateStatus(prescription.id, 'approved', 'staff-100');

    const savedCustomer = await customersRepository.findById(customer.id);
    const savedOrder = await ordersRepository.findById(order.id);
    const savedPaymentAttempt = await paymentAttemptsRepository.findByProviderReference('PSTK-INT-001');
    const savedPrescription = await prescriptionsRepository.findById(prescription.id);

    expect(savedCustomer?.lastName).toBe('Adeleke');
    expect(savedOrder?.status).toBe('pending_review');
    expect(savedOrder?.items).toHaveLength(2);
    expect(savedPaymentAttempt?.status).toBe('captured');
    expect(savedPrescription?.status).toBe('approved');
    expect(savedPrescription?.reviewedBy).toBe('staff-100');
    expect(savedPrescription?.orderBranchId).toBe('branch-main');

    const persistedOrder = await prisma.pharmacyOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    expect(persistedOrder.status).toBe('pending_review');
    expect(persistedOrder.items).toHaveLength(2);
  });

  it('persists inventory reservations and restores quantities on release', async () => {
    const reservations = await inventoryRepository.reserveForOrder({
      orderId: 'ord-1001',
      branchId: 'branch-main',
      items: [
        {
          productId: 'prod-panadol-extra',
          quantity: 1,
        },
        {
          productId: 'prod-amoxicillin-500',
          quantity: 1,
        },
      ],
    });

    expect(reservations).toHaveLength(2);

    const reservedPanadol = await prisma.inventoryBatch.findUniqueOrThrow({
      where: {
        id: 'inv-pan-ex-main',
      },
    });

    expect(reservedPanadol.availableQuantity).toBe(139);
    expect(reservedPanadol.reservedQuantity).toBe(1);

    const releasedCount = await inventoryRepository.releaseForOrder('ord-1001');

    expect(releasedCount).toBe(2);

    const releasedPanadol = await prisma.inventoryBatch.findUniqueOrThrow({
      where: {
        id: 'inv-pan-ex-main',
      },
    });
    const remainingReservations = await prisma.inventoryReservation.findMany({
      where: {
        orderId: 'ord-1001',
      },
    });

    expect(releasedPanadol.availableQuantity).toBe(140);
    expect(releasedPanadol.reservedQuantity).toBe(0);
    expect(remainingReservations).toHaveLength(0);
  });

  it('rolls back repository writes performed inside a transaction', async () => {
    await expect(
      database.transaction(async (client) => {
        const customer = await customersRepository.create(
          {
            id: 'cust-tx-001',
            firstName: 'Ife',
            lastName: 'Thomas',
            email: 'ife.thomas@example.com',
            phone: '+2348000000299',
          },
          client,
        );

        await ordersRepository.create(
          {
            id: 'ord-tx-001',
            customerId: customer.id,
            branchId: 'branch-main',
            status: 'draft',
            total: 4500,
            containsPrescriptionItems: false,
            items: [
              {
                id: 'item-ord-tx-001-pan',
                productId: 'prod-panadol-extra',
                quantity: 1,
                unitPrice: 4500,
              },
            ],
          },
          client,
        );

        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    const persistedCustomer = await prisma.customer.findUnique({
      where: {
        id: 'cust-tx-001',
      },
    });
    const persistedOrder = await prisma.pharmacyOrder.findUnique({
      where: {
        id: 'ord-tx-001',
      },
    });

    expect(persistedCustomer).toBeNull();
    expect(persistedOrder).toBeNull();
  });
});