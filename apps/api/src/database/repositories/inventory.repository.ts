import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database.service';

export type InventoryBatchRecord = {
  id?: string;
  branchId: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  batchCode: string;
  expiryDate: string;
};

export type InventoryReservationRecord = {
  id: string;
  orderId: string;
  inventoryBatchId: string;
  productId: string;
  quantity: number;
};

export type InventoryReservationRequest = {
  orderId: string;
  branchId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type BranchProductAvailabilityRecord = {
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
};

@Injectable()
export class InventoryRepository {
  constructor(private readonly database: DatabaseService) {}

  async getAvailabilityForProducts(
    branchId: string,
    productIds: string[],
    client?: Prisma.TransactionClient,
  ): Promise<BranchProductAvailabilityRecord[]> {
    if (!productIds.length) {
      return [];
    }

    const inventory = await this.executor(client).inventoryBatch.findMany({
      where: {
        branchId,
        productId: {
          in: [...new Set(productIds)],
        },
      },
      select: {
        productId: true,
        availableQuantity: true,
        reservedQuantity: true,
      },
    });

    const totals = new Map<string, BranchProductAvailabilityRecord>();

    for (const batch of inventory) {
      const current = totals.get(batch.productId) ?? {
        productId: batch.productId,
        availableQuantity: 0,
        reservedQuantity: 0,
      };

      current.availableQuantity += batch.availableQuantity;
      current.reservedQuantity += batch.reservedQuantity;
      totals.set(batch.productId, current);
    }

    return [...totals.values()];
  }

  async findByBranch(branchId: string): Promise<InventoryBatchRecord[]> {
    const inventory = await this.database.inventoryBatch.findMany({
      where: { branchId },
      orderBy: [{ expiryDate: 'asc' }, { batchCode: 'asc' }],
    });

    return inventory.map((record) => ({
      id: record.id,
      branchId: record.branchId,
      productId: record.productId,
      availableQuantity: record.availableQuantity,
      reservedQuantity: record.reservedQuantity,
      batchCode: record.batchCode,
      expiryDate: record.expiryDate.toISOString().slice(0, 10),
    }));
  }

  async listReservationsForOrder(
    orderId: string,
    client?: Prisma.TransactionClient,
  ): Promise<InventoryReservationRecord[]> {
    const reservations = await this.executor(client).inventoryReservation.findMany({
      where: { orderId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return reservations.map((reservation) => ({
      id: reservation.id,
      orderId: reservation.orderId,
      inventoryBatchId: reservation.inventoryBatchId,
      productId: reservation.productId,
      quantity: reservation.quantity,
    }));
  }

  async reserveForOrder(
    request: InventoryReservationRequest,
    client?: Prisma.TransactionClient,
  ): Promise<InventoryReservationRecord[]> {
    if (!request.items.length) {
      throw new BadRequestException('Order has no items to reserve');
    }

    const database = this.executor(client);
    const existingReservations = await this.listReservationsForOrder(request.orderId, client);
    if (existingReservations.length > 0) {
      return existingReservations;
    }

    let reservationIndex = 0;

    for (const item of request.items) {
      let remainingQuantity = item.quantity;

      const batches = await database.inventoryBatch.findMany({
        where: {
          branchId: request.branchId,
          productId: item.productId,
          availableQuantity: {
            gt: 0,
          },
        },
        orderBy: [{ expiryDate: 'asc' }, { batchCode: 'asc' }],
      });

      for (const batch of batches) {
        if (remainingQuantity <= 0) {
          break;
        }

        const quantityToReserve = Math.min(batch.availableQuantity, remainingQuantity);
        if (quantityToReserve <= 0) {
          continue;
        }

        await database.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            availableQuantity: {
              decrement: quantityToReserve,
            },
            reservedQuantity: {
              increment: quantityToReserve,
            },
          },
        });

        reservationIndex += 1;
        await database.inventoryReservation.create({
          data: {
            id: `res-${request.orderId}-${reservationIndex}`,
            orderId: request.orderId,
            inventoryBatchId: batch.id,
            productId: item.productId,
            quantity: quantityToReserve,
          },
        });

        remainingQuantity -= quantityToReserve;
      }

      if (remainingQuantity > 0) {
        throw new ConflictException(`Insufficient inventory to reserve product ${item.productId}`);
      }
    }

    return this.listReservationsForOrder(request.orderId, client);
  }

  async releaseForOrder(orderId: string, client?: Prisma.TransactionClient): Promise<number> {
    const database = this.executor(client);
    const reservations = await database.inventoryReservation.findMany({
      where: { orderId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (const reservation of reservations) {
      await database.inventoryBatch.update({
        where: { id: reservation.inventoryBatchId },
        data: {
          availableQuantity: {
            increment: reservation.quantity,
          },
          reservedQuantity: {
            decrement: reservation.quantity,
          },
        },
      });
    }

    await database.inventoryReservation.deleteMany({
      where: { orderId },
    });

    return reservations.length;
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }
}