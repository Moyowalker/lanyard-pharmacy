import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { OrderStatus } from '../../modules/orders/dto/order-status';
import { DatabaseService } from '../database.service';

export type OrderRecord = {
  id: string;
  customerId: string;
  status: OrderStatus;
  branchId: string;
  total: number;
  containsPrescriptionItems: boolean;
  createdAt: string;
};

export type OrderItemRecord = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type OrderReservationRecord = {
  id: string;
  orderId: string;
  inventoryBatchId: string;
  productId: string;
  quantity: number;
};

export type OrderDetailRecord = OrderRecord & {
  items: OrderItemRecord[];
  inventoryReservations: OrderReservationRecord[];
};

export type CreateOrderInput = {
  id: string;
  customerId: string;
  branchId: string;
  status: OrderStatus;
  total: number;
  containsPrescriptionItems: boolean;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
};

type OrderWithRelations = Prisma.PharmacyOrderGetPayload<{
  include: {
    items: true;
    inventoryReservations: true;
  };
}>;

@Injectable()
export class OrdersRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateOrderInput, client?: Prisma.TransactionClient): Promise<OrderDetailRecord> {
    const order = await this.executor(client).pharmacyOrder.create({
      data: {
        id: input.id,
        customerId: input.customerId,
        branchId: input.branchId,
        status: input.status,
        total: input.total,
        containsPrescriptionItems: input.containsPrescriptionItems,
        items: {
          create: input.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
        inventoryReservations: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return this.mapOrder(order);
  }

  async findById(orderId: string, client?: Prisma.TransactionClient): Promise<OrderDetailRecord | null> {
    const order = await this.executor(client).pharmacyOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
        inventoryReservations: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return order ? this.mapOrder(order) : null;
  }

  async list(): Promise<OrderRecord[]> {
    const orders = await this.database.pharmacyOrder.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => ({
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      branchId: order.branchId,
      total: order.total,
      containsPrescriptionItems: order.containsPrescriptionItems,
      createdAt: order.createdAt.toISOString(),
    }));
  }

  async updateStatus(orderId: string, status: OrderStatus, client?: Prisma.TransactionClient): Promise<OrderDetailRecord> {
    const order = await this.executor(client).pharmacyOrder.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
        inventoryReservations: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return this.mapOrder(order);
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }

  private mapOrder(order: OrderWithRelations): OrderDetailRecord {
    return {
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      branchId: order.branchId,
      total: order.total,
      containsPrescriptionItems: order.containsPrescriptionItems,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      inventoryReservations: order.inventoryReservations.map((reservation) => ({
        id: reservation.id,
        orderId: reservation.orderId,
        inventoryBatchId: reservation.inventoryBatchId,
        productId: reservation.productId,
        quantity: reservation.quantity,
      })),
    };
  }
}