import { PrismaClient } from '@prisma/client';

export async function seedDatabase(prisma: PrismaClient) {
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
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.branch.deleteMany();

  await prisma.branch.createMany({
    data: [
      {
        id: 'branch-main',
        name: 'Main Branch',
        city: 'Lagos',
        supportsDelivery: true,
      },
      {
        id: 'branch-airport',
        name: 'Airport Branch',
        city: 'Lagos',
        supportsDelivery: true,
      },
    ],
  });

  await prisma.customer.createMany({
    data: [
      {
        id: 'cust-100',
        firstName: 'Ada',
        lastName: 'Okafor',
        email: 'ada@example.com',
        phone: '+2348000000001',
        refillReminderOptIn: true,
      },
      {
        id: 'cust-101',
        firstName: 'Tunde',
        lastName: 'Balogun',
        email: 'tunde@example.com',
        phone: '+2348000000002',
        refillReminderOptIn: false,
      },
      {
        id: 'cust-090',
        firstName: 'Zainab',
        lastName: 'Musa',
        email: 'zainab@example.com',
        phone: '+2348000000003',
        refillReminderOptIn: true,
      },
    ],
  });

  await prisma.product.createMany({
    data: [
      {
        id: 'prod-panadol-extra',
        name: 'Panadol Extra',
        slug: 'panadol-extra',
        requiresPrescription: false,
        category: 'Pain Relief',
        dosageForm: 'tablet',
        price: 4500,
      },
      {
        id: 'prod-amoxicillin-500',
        name: 'Amoxicillin 500mg',
        slug: 'amoxicillin-500mg',
        requiresPrescription: true,
        category: 'Antibiotics',
        dosageForm: 'capsule',
        price: 8200,
      },
    ],
  });

  await prisma.branchProduct.createMany({
    data: [
      { branchId: 'branch-main', productId: 'prod-panadol-extra' },
      { branchId: 'branch-airport', productId: 'prod-panadol-extra' },
      { branchId: 'branch-main', productId: 'prod-amoxicillin-500' },
    ],
  });

  await prisma.inventoryBatch.createMany({
    data: [
      {
        id: 'inv-pan-ex-main',
        branchId: 'branch-main',
        productId: 'prod-panadol-extra',
        availableQuantity: 140,
        reservedQuantity: 0,
        batchCode: 'PAN-EX-202607',
        expiryDate: new Date('2027-07-31'),
      },
      {
        id: 'inv-amx-main',
        branchId: 'branch-main',
        productId: 'prod-amoxicillin-500',
        availableQuantity: 32,
        reservedQuantity: 0,
        batchCode: 'AMX-500-202612',
        expiryDate: new Date('2026-12-31'),
      },
      {
        id: 'inv-pan-ex-airport',
        branchId: 'branch-airport',
        productId: 'prod-panadol-extra',
        availableQuantity: 19,
        reservedQuantity: 1,
        batchCode: 'PAN-EX-202608',
        expiryDate: new Date('2027-08-31'),
      },
    ],
  });

  await prisma.pharmacyOrder.createMany({
    data: [
      {
        id: 'ord-1001',
        customerId: 'cust-100',
        branchId: 'branch-main',
        status: 'pending_review',
        total: 12700,
        containsPrescriptionItems: true,
        createdAt: new Date('2026-05-20T11:45:00.000Z'),
      },
      {
        id: 'ord-1002',
        customerId: 'cust-101',
        branchId: 'branch-airport',
        status: 'processing',
        total: 4500,
        containsPrescriptionItems: false,
        createdAt: new Date('2026-05-21T08:15:00.000Z'),
      },
    ],
  });

  await prisma.orderItem.createMany({
    data: [
      {
        id: 'item-ord-1001-pan',
        orderId: 'ord-1001',
        productId: 'prod-panadol-extra',
        quantity: 1,
        unitPrice: 4500,
      },
      {
        id: 'item-ord-1001-amx',
        orderId: 'ord-1001',
        productId: 'prod-amoxicillin-500',
        quantity: 1,
        unitPrice: 8200,
      },
      {
        id: 'item-ord-1002-pan',
        orderId: 'ord-1002',
        productId: 'prod-panadol-extra',
        quantity: 1,
        unitPrice: 4500,
      },
    ],
  });

  await prisma.prescription.createMany({
    data: [
      {
        id: 'rx-1001',
        customerId: 'cust-100',
        orderId: 'ord-1001',
        status: 'under_review',
        reviewedBy: null,
        uploadedAt: new Date('2026-05-20T11:30:00.000Z'),
      },
      {
        id: 'rx-1002',
        customerId: 'cust-090',
        orderId: null,
        status: 'approved',
        reviewedBy: 'staff-001',
        uploadedAt: new Date('2026-05-19T10:10:00.000Z'),
      },
    ],
  });

  await prisma.paymentAttempt.createMany({
    data: [
      {
        id: 'pay-1002',
        orderId: 'ord-1002',
        provider: 'paystack',
        status: 'captured',
        providerReference: 'PSTK-1002',
        amount: 4500,
      },
    ],
  });

  await prisma.inventoryReservation.createMany({
    data: [
      {
        id: 'res-ord-1002-1',
        orderId: 'ord-1002',
        inventoryBatchId: 'inv-pan-ex-airport',
        productId: 'prod-panadol-extra',
        quantity: 1,
      },
    ],
  });
}

const prisma = new PrismaClient();

async function main() {
  await seedDatabase(prisma);
}

if (/prisma[\\/]seed\.(ts|js)$/.test(process.argv[1] ?? '')) {
  void main()
    .catch(async (error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}