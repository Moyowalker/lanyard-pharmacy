import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

export type LowStockAlertRecord = {
  id: string;
  branchId: string;
  productId: string;
  threshold: number;
  availableQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryBatchAdjustmentResult = {
  batch: InventoryBatchRecord;
  lowStockAlert: LowStockAlertRecord | null;
  lowStockAlertAction: 'opened' | 'updated' | 'resolved' | 'none';
};

type LowStockAlertSyncResult = {
  alert: LowStockAlertRecord | null;
  action: InventoryBatchAdjustmentResult['lowStockAlertAction'];
};

@Injectable()
export class InventoryRepository {
  constructor(private readonly database: DatabaseService) {}

  async adjustBatchQuantity(
    batchId: string,
    quantityDelta: number,
    client?: Prisma.TransactionClient,
  ): Promise<InventoryBatchAdjustmentResult> {
    const database = this.executor(client);
    const batch = await database.inventoryBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Inventory batch ${batchId} was not found`);
    }

    const nextAvailableQuantity = batch.availableQuantity + quantityDelta;
    if (nextAvailableQuantity < 0) {
      throw new BadRequestException(`Inventory batch ${batchId} cannot go below zero available units`);
    }

    const updatedBatch = await database.inventoryBatch.update({
      where: { id: batchId },
      data: {
        availableQuantity: nextAvailableQuantity,
      },
    });

    const lowStockAlert = await this.syncLowStockAlert(batch.branchId, batch.productId, client);

    return {
      batch: this.mapBatch(updatedBatch),
      lowStockAlert: lowStockAlert.alert,
      lowStockAlertAction: lowStockAlert.action,
    };
  }

  async findBatchById(batchId: string, client?: Prisma.TransactionClient): Promise<InventoryBatchRecord | null> {
    const batch = await this.executor(client).inventoryBatch.findUnique({
      where: { id: batchId },
    });

    return batch ? this.mapBatch(batch) : null;
  }

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

    return inventory.map((record) => this.mapBatch(record));
  }

  async listLowStockAlerts(branchId: string, client?: Prisma.TransactionClient): Promise<LowStockAlertRecord[]> {
    const alerts = await this.executor(client).lowStockAlert.findMany({
      where: {
        branchId,
      },
      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    return alerts.map((alert) => this.mapLowStockAlert(alert));
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

      await this.syncLowStockAlert(request.branchId, item.productId, client);
    }

    return this.listReservationsForOrder(request.orderId, client);
  }

  async releaseForOrder(orderId: string, client?: Prisma.TransactionClient): Promise<number> {
    const database = this.executor(client);
    const reservations = await database.inventoryReservation.findMany({
      where: { orderId },
      include: {
        inventoryBatch: {
          select: {
            branchId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const touchedBranchProducts = new Map<string, { branchId: string; productId: string }>();

    for (const reservation of reservations) {
      touchedBranchProducts.set(`${reservation.inventoryBatch.branchId}:${reservation.productId}`, {
        branchId: reservation.inventoryBatch.branchId,
        productId: reservation.productId,
      });

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

    for (const entry of touchedBranchProducts.values()) {
      await this.syncLowStockAlert(entry.branchId, entry.productId, client);
    }

    return reservations.length;
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }

  private mapBatch(record: {
    id: string;
    branchId: string;
    productId: string;
    availableQuantity: number;
    reservedQuantity: number;
    batchCode: string;
    expiryDate: Date;
  }): InventoryBatchRecord {
    return {
      id: record.id,
      branchId: record.branchId,
      productId: record.productId,
      availableQuantity: record.availableQuantity,
      reservedQuantity: record.reservedQuantity,
      batchCode: record.batchCode,
      expiryDate: record.expiryDate.toISOString().slice(0, 10),
    };
  }

  private mapLowStockAlert(alert: {
    id: string;
    branchId: string;
    productId: string;
    threshold: number;
    availableQuantity: number;
    createdAt: Date;
    updatedAt: Date;
  }): LowStockAlertRecord {
    return {
      id: alert.id,
      branchId: alert.branchId,
      productId: alert.productId,
      threshold: alert.threshold,
      availableQuantity: alert.availableQuantity,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    };
  }

  private async syncLowStockAlert(
    branchId: string,
    productId: string,
    client?: Prisma.TransactionClient,
  ): Promise<LowStockAlertSyncResult> {
    const database = this.executor(client);
    const branchProduct = await database.branchProduct.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
      select: {
        lowStockThreshold: true,
      },
    });

    if (!branchProduct) {
      return {
        alert: null,
        action: 'none',
      };
    }

    const [availability] = await this.getAvailabilityForProducts(branchId, [productId], client);
    const availableQuantity = availability?.availableQuantity ?? 0;
    const existingAlert = await database.lowStockAlert.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    if (availableQuantity <= branchProduct.lowStockThreshold) {
      if (existingAlert) {
        const updatedAlert = await database.lowStockAlert.update({
          where: {
            branchId_productId: {
              branchId,
              productId,
            },
          },
          data: {
            threshold: branchProduct.lowStockThreshold,
            availableQuantity,
          },
        });

        return {
          alert: this.mapLowStockAlert(updatedAlert),
          action: 'updated',
        };
      }

      const createdAlert = await database.lowStockAlert.create({
        data: {
          id: `lsa-${randomUUID()}`,
          branchId,
          productId,
          threshold: branchProduct.lowStockThreshold,
          availableQuantity,
        },
      });

      return {
        alert: this.mapLowStockAlert(createdAlert),
        action: 'opened',
      };
    }

    if (existingAlert) {
      await database.lowStockAlert.delete({
        where: {
          branchId_productId: {
            branchId,
            productId,
          },
        },
      });

      return {
        alert: null,
        action: 'resolved',
      };
    }

    return {
      alert: null,
      action: 'none',
    };
  }
}