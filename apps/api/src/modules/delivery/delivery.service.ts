import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BranchesRepository } from '../../database/repositories/branches.repository';
import { DeliveryJobsRepository } from '../../database/repositories/delivery-jobs.repository';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository, type OrderDetailRecord } from '../../database/repositories/orders.repository';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { OrdersWorkflow } from '../orders/orders.workflow';
import { AssignDeliveryJobDto } from './dto/assign-delivery-job.dto';
import { DELIVERY_DISPATCH_MODES, type DeliveryDispatchMode, type DeliveryStatus } from './dto/delivery-types';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { DeliveryWorkflow } from './delivery.workflow';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly ordersRepository: OrdersRepository,
    private readonly branchesRepository: BranchesRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly deliveryJobsRepository: DeliveryJobsRepository,
    private readonly ordersWorkflow: OrdersWorkflow,
    private readonly deliveryWorkflow: DeliveryWorkflow,
    private readonly auditService: AuditService,
  ) {}

  getDispatchModes() {
    return [...DELIVERY_DISPATCH_MODES];
  }

  async assignDelivery(input: AssignDeliveryJobDto, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const order = await this.ordersRepository.findById(input.orderId, client);

      if (!order) {
        throw new NotFoundException(`Order ${input.orderId} was not found`);
      }

      this.assertBranchScope(actor, order.branchId);
      await this.assertBranchSupportsDelivery(order.branchId, client);

      if (order.status !== 'ready_for_dispatch') {
        throw new BadRequestException(`Order ${order.id} is not ready for dispatch assignment`);
      }

      const existingJob = await this.deliveryJobsRepository.findByOrderId(order.id, client);
      if (existingJob) {
        throw new ConflictException(`Order ${order.id} already has a delivery job`);
      }

      const deliveryJob = await this.deliveryJobsRepository.create(
        {
          id: `dlv-${randomUUID()}`,
          orderId: order.id,
          dispatchMode: input.dispatchMode,
          status: 'assigned',
          assignedTo: input.assignedTo,
          assignedBy: actor.sub,
          trackingReference: input.trackingReference,
        },
        client,
      );

      await this.auditService.record(
        {
          actor,
          entityType: 'delivery',
          entityId: deliveryJob.id,
          action: 'assigned',
          payload: {
            orderId: deliveryJob.orderId,
            dispatchMode: deliveryJob.dispatchMode,
            assignedTo: deliveryJob.assignedTo,
            trackingReference: deliveryJob.trackingReference,
          },
        },
        client,
      );

      return {
        deliveryJob,
        order,
      };
    });
  }

  async updateStatus(deliveryJobId: string, input: UpdateDeliveryStatusDto, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const deliveryJob = await this.deliveryJobsRepository.findById(deliveryJobId, client);

      if (!deliveryJob) {
        throw new NotFoundException(`Delivery job ${deliveryJobId} was not found`);
      }

      const order = await this.ordersRepository.findById(deliveryJob.orderId, client);
      if (!order) {
        throw new NotFoundException(`Order ${deliveryJob.orderId} was not found`);
      }

      this.assertBranchScope(actor, order.branchId);
      this.deliveryWorkflow.requireTransition(deliveryJob.status, input.status);

      const previousOrderStatus = order.status;
      const updatedDeliveryJob = await this.deliveryJobsRepository.updateStatus(deliveryJob.id, input.status, client);
      const updatedOrder = await this.applyOrderEffects(order, input.status, client);

      await this.auditService.record(
        {
          actor,
          entityType: 'delivery',
          entityId: updatedDeliveryJob.id,
          action: 'status_changed',
          payload: {
            from: deliveryJob.status,
            to: updatedDeliveryJob.status,
            orderId: updatedDeliveryJob.orderId,
          },
        },
        client,
      );

      if (previousOrderStatus !== updatedOrder.status) {
        await this.auditService.record(
          {
            actor,
            entityType: 'order',
            entityId: updatedOrder.id,
            action: 'status_changed',
            payload: {
              from: previousOrderStatus,
              to: updatedOrder.status,
              source: 'delivery_status',
            },
          },
          client,
        );
      }

      return {
        deliveryJob: updatedDeliveryJob,
        order: updatedOrder,
      };
    });
  }

  private async applyOrderEffects(
    order: OrderDetailRecord,
    deliveryStatus: DeliveryStatus,
    client: Prisma.TransactionClient,
  ) {
    if (deliveryStatus === 'in_transit') {
      this.ordersWorkflow.requireTransition(order.status, 'in_transit');
      return this.ordersRepository.updateStatus(order.id, 'in_transit', client);
    }

    if (deliveryStatus === 'delivered') {
      this.ordersWorkflow.requireTransition(order.status, 'delivered');
      return this.ordersRepository.updateStatus(order.id, 'delivered', client);
    }

    if (deliveryStatus === 'cancelled') {
      if (order.status !== 'cancelled') {
        await this.inventoryRepository.releaseForOrder(order.id, client);
        this.ordersWorkflow.requireTransition(order.status, 'cancelled');
        return this.ordersRepository.updateStatus(order.id, 'cancelled', client);
      }
    }

    return order;
  }

  private assertBranchScope(actor: AuthenticatedUser, branchId: string) {
    if (actor.branchIds.length > 0 && !actor.branchIds.includes(branchId)) {
      throw new ForbiddenException('User is outside the requested branch scope');
    }
  }

  private async assertBranchSupportsDelivery(branchId: string, client: Prisma.TransactionClient) {
    const branch = await this.branchesRepository.findById(branchId, client);

    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} was not found`);
    }

    if (!branch.supportsDelivery) {
      throw new BadRequestException(`Branch ${branchId} does not support delivery`);
    }
  }
}