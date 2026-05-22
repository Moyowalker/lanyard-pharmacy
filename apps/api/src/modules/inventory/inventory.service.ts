import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../../database/database.service';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { AdjustInventoryBatchDto } from './dto/adjust-inventory-batch.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getBranchInventory(branchId: string) {
    return this.inventoryRepository.findByBranch(branchId);
  }

  listLowStockAlerts(branchId: string) {
    return this.inventoryRepository.listLowStockAlerts(branchId);
  }

  async adjustBatch(batchId: string, input: AdjustInventoryBatchDto, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const batch = await this.inventoryRepository.findBatchById(batchId, client);

      if (!batch) {
        throw new NotFoundException(`Inventory batch ${batchId} was not found`);
      }

      this.assertBranchScope(actor, batch.branchId);

      const adjustment = await this.inventoryRepository.adjustBatchQuantity(batchId, input.quantityDelta, client);

      await this.auditService.record(
        {
          actor,
          entityType: 'inventory',
          entityId: batchId,
          action: 'batch_adjusted',
          payload: {
            branchId: adjustment.batch.branchId,
            productId: adjustment.batch.productId,
            quantityDelta: input.quantityDelta,
            reason: input.reason,
            availableQuantity: adjustment.batch.availableQuantity,
            reservedQuantity: adjustment.batch.reservedQuantity,
          },
        },
        client,
      );

      if (adjustment.lowStockAlertAction !== 'none') {
        await this.auditService.record(
          {
            actor,
            entityType: 'inventory',
            entityId: `${adjustment.batch.branchId}:${adjustment.batch.productId}`,
            action: `low_stock_alert_${adjustment.lowStockAlertAction}`,
            payload: {
              branchId: adjustment.batch.branchId,
              productId: adjustment.batch.productId,
              threshold: adjustment.lowStockAlert?.threshold ?? null,
              availableQuantity: adjustment.lowStockAlert?.availableQuantity ?? adjustment.batch.availableQuantity,
            },
          },
          client,
        );

        await this.notificationsService.queueWorkflowEvent(
          {
            eventType: `inventory.low_stock_alert_${adjustment.lowStockAlertAction}`,
            entityType: 'inventory',
            entityId: `${adjustment.batch.branchId}:${adjustment.batch.productId}`,
            notification: {
              channel: 'email',
              recipient: 'ops@lanyardpharmacy.com',
              template: `inventory-low-stock-${adjustment.lowStockAlertAction}`,
            },
            data: {
              branchId: adjustment.batch.branchId,
              productId: adjustment.batch.productId,
              threshold: adjustment.lowStockAlert?.threshold ?? null,
              availableQuantity: adjustment.lowStockAlert?.availableQuantity ?? adjustment.batch.availableQuantity,
            },
          },
          client,
        );
      }

      await this.notificationsService.queueWorkflowEvent(
        {
          eventType: 'inventory.batch_adjusted',
          entityType: 'inventory',
          entityId: batchId,
          notification: {
            channel: 'email',
            recipient: 'ops@lanyardpharmacy.com',
            template: 'inventory-batch-adjusted',
          },
          data: {
            branchId: adjustment.batch.branchId,
            productId: adjustment.batch.productId,
            quantityDelta: input.quantityDelta,
            reason: input.reason,
            availableQuantity: adjustment.batch.availableQuantity,
            reservedQuantity: adjustment.batch.reservedQuantity,
          },
        },
        client,
      );

      return adjustment;
    });
  }

  private assertBranchScope(actor: AuthenticatedUser, branchId: string) {
    if (actor.branchIds.length > 0 && !actor.branchIds.includes(branchId)) {
      throw new ForbiddenException('User is outside the requested branch scope');
    }
  }
}