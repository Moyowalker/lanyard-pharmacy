import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomersRepository } from '../../database/repositories/customers.repository';
import { DatabaseService } from '../../database/database.service';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { PrescriptionsRepository } from '../../database/repositories/prescriptions.repository';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { OrdersWorkflow } from '../orders/orders.workflow';
import { ReviewPrescriptionDto } from './dto/review-prescription.dto';
import { SubmitPrescriptionDto } from './dto/submit-prescription.dto';
import { PrescriptionsWorkflow } from './prescriptions.workflow';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly prescriptionsRepository: PrescriptionsRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly ordersWorkflow: OrdersWorkflow,
    private readonly prescriptionsWorkflow: PrescriptionsWorkflow,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listQueue() {
    return this.prescriptionsRepository.listQueue();
  }

  async submitPrescription(input: SubmitPrescriptionDto, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const customer = await this.customersRepository.findById(input.customerId, client);

      if (!customer) {
        throw new NotFoundException(`Customer ${input.customerId} was not found`);
      }

      let order = null;

      if (input.orderId) {
        order = await this.ordersRepository.findById(input.orderId, client);

        if (!order) {
          throw new NotFoundException(`Order ${input.orderId} was not found`);
        }

        this.assertBranchScope(actor, order.branchId);

        if (order.customerId !== input.customerId) {
          throw new BadRequestException(`Order ${order.id} does not belong to customer ${input.customerId}`);
        }

        if (!order.containsPrescriptionItems) {
          throw new BadRequestException(`Order ${order.id} does not require prescription review`);
        }
      }

      const prescription = await this.prescriptionsRepository.create(
        {
          id: `rx-${randomUUID()}`,
          customerId: input.customerId,
          orderId: input.orderId ?? null,
          status: 'submitted',
          uploadedAt: new Date(),
        },
        client,
      );

      const notificationRecipient = customer.email;

      await this.auditService.record(
        {
          actor,
          entityType: 'prescription',
          entityId: prescription.id,
          action: 'submitted',
          payload: {
            customerId: prescription.customerId,
            orderId: prescription.orderId,
            status: prescription.status,
          },
        },
        client,
      );

      await this.notificationsService.queueWorkflowEvent(
        {
          eventType: 'prescription.submitted',
          entityType: 'prescription',
          entityId: prescription.id,
          notification: {
            channel: 'email',
            recipient: notificationRecipient,
            template: 'prescription-submitted',
          },
          data: {
            customerId: prescription.customerId,
            orderId: prescription.orderId,
            status: prescription.status,
          },
        },
        client,
      );

      return {
        prescription,
        order,
      };
    });
  }

  async startReview(prescriptionId: string, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const prescription = await this.prescriptionsRepository.findById(prescriptionId, client);

      if (!prescription) {
        throw new NotFoundException(`Prescription ${prescriptionId} was not found`);
      }

      if (prescription.orderBranchId) {
        this.assertBranchScope(actor, prescription.orderBranchId);
      }

      this.prescriptionsWorkflow.requireTransition(prescription.status, 'under_review');

      const updatedPrescription = await this.prescriptionsRepository.updateStatus(
        prescription.id,
        'under_review',
        actor.sub,
        client,
      );

      const customer = await this.customersRepository.findById(updatedPrescription.customerId, client);

      await this.auditService.record(
        {
          actor,
          entityType: 'prescription',
          entityId: updatedPrescription.id,
          action: 'review_started',
          payload: {
            from: prescription.status,
            to: updatedPrescription.status,
          },
        },
        client,
      );

      await this.notificationsService.queueWorkflowEvent(
        {
          eventType: 'prescription.review_started',
          entityType: 'prescription',
          entityId: updatedPrescription.id,
          notification: customer
            ? {
                channel: 'email',
                recipient: customer.email,
                template: 'prescription-review-started',
              }
            : undefined,
          data: {
            from: prescription.status,
            to: updatedPrescription.status,
            orderId: updatedPrescription.orderId,
          },
        },
        client,
      );

      return {
        prescription: updatedPrescription,
      };
    });
  }

  async reviewPrescription(
    prescriptionId: string,
    review: ReviewPrescriptionDto,
    actor: AuthenticatedUser,
  ) {
    return this.database.transaction(async (client) => {
      const prescription = await this.prescriptionsRepository.findById(prescriptionId, client);

      if (!prescription) {
        throw new NotFoundException(`Prescription ${prescriptionId} was not found`);
      }

      if (prescription.orderBranchId) {
        this.assertBranchScope(actor, prescription.orderBranchId);
      }

      const nextStatus = this.toPrescriptionStatus(review.action);
      this.prescriptionsWorkflow.requireTransition(prescription.status, nextStatus);

      const updatedPrescription = await this.prescriptionsRepository.updateStatus(
        prescription.id,
        nextStatus,
        actor.sub,
        client,
      );

      const customer = await this.customersRepository.findById(updatedPrescription.customerId, client);

      let updatedOrder = null;
      let previousOrderStatus: string | null = null;

      if (prescription.orderId) {
        const linkedOrder = await this.ordersRepository.findById(prescription.orderId, client);

        if (linkedOrder) {
          previousOrderStatus = linkedOrder.status;
          if (review.action === 'approve' && linkedOrder.status === 'pending_review') {
            this.ordersWorkflow.requireTransition(linkedOrder.status, 'awaiting_payment');
            updatedOrder = await this.ordersRepository.updateStatus(linkedOrder.id, 'awaiting_payment', client);
          }

          if (review.action === 'reject' && linkedOrder.status !== 'cancelled') {
            this.ordersWorkflow.requireTransition(linkedOrder.status, 'cancelled');
            await this.inventoryRepository.releaseForOrder(linkedOrder.id, client);
            updatedOrder = await this.ordersRepository.updateStatus(linkedOrder.id, 'cancelled', client);
          }
        }
      }

      await this.auditService.record(
        {
          actor,
          entityType: 'prescription',
          entityId: updatedPrescription.id,
          action: 'reviewed',
          payload: {
            action: review.action,
            from: prescription.status,
            to: updatedPrescription.status,
            reviewedBy: actor.sub,
          },
        },
        client,
      );

      await this.notificationsService.queueWorkflowEvent(
        {
          eventType: 'prescription.reviewed',
          entityType: 'prescription',
          entityId: updatedPrescription.id,
          notification: customer
            ? {
                channel: 'email',
                recipient: customer.email,
                template: 'prescription-reviewed',
              }
            : undefined,
          data: {
            action: review.action,
            from: prescription.status,
            to: updatedPrescription.status,
            orderId: updatedPrescription.orderId,
          },
        },
        client,
      );

      if (updatedOrder && previousOrderStatus !== updatedOrder.status) {
        await this.auditService.record(
          {
            actor,
            entityType: 'order',
            entityId: updatedOrder.id,
            action: 'status_changed',
            payload: {
              from: previousOrderStatus,
              to: updatedOrder.status,
              source: 'prescription_review',
            },
          },
          client,
        );
      }

      return {
        prescription: updatedPrescription,
        order: updatedOrder,
      };
    });
  }

  async fulfillPrescription(prescriptionId: string, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const prescription = await this.prescriptionsRepository.findById(prescriptionId, client);

      if (!prescription) {
        throw new NotFoundException(`Prescription ${prescriptionId} was not found`);
      }

      if (prescription.orderBranchId) {
        this.assertBranchScope(actor, prescription.orderBranchId);
      }

      this.prescriptionsWorkflow.requireTransition(prescription.status, 'fulfilled');

      let updatedOrder = null;
      let previousOrderStatus: string | null = null;
      if (prescription.orderId) {
        const linkedOrder = await this.ordersRepository.findById(prescription.orderId, client);

        if (linkedOrder) {
          previousOrderStatus = linkedOrder.status;
          if (linkedOrder.status !== 'processing') {
            throw new BadRequestException(`Order ${linkedOrder.id} is not ready for prescription fulfillment`);
          }

          this.ordersWorkflow.requireTransition(linkedOrder.status, 'ready_for_dispatch');
          updatedOrder = await this.ordersRepository.updateStatus(linkedOrder.id, 'ready_for_dispatch', client);
        }
      }

      const updatedPrescription = await this.prescriptionsRepository.updateStatus(
        prescription.id,
        'fulfilled',
        undefined,
        client,
      );

      const customer = await this.customersRepository.findById(updatedPrescription.customerId, client);

      await this.auditService.record(
        {
          actor,
          entityType: 'prescription',
          entityId: updatedPrescription.id,
          action: 'fulfilled',
          payload: {
            from: prescription.status,
            to: updatedPrescription.status,
          },
        },
        client,
      );

      await this.notificationsService.queueWorkflowEvent(
        {
          eventType: 'prescription.fulfilled',
          entityType: 'prescription',
          entityId: updatedPrescription.id,
          notification: customer
            ? {
                channel: 'email',
                recipient: customer.email,
                template: 'prescription-fulfilled',
              }
            : undefined,
          data: {
            from: prescription.status,
            to: updatedPrescription.status,
            orderId: updatedPrescription.orderId,
          },
        },
        client,
      );

      if (updatedOrder && previousOrderStatus !== updatedOrder.status) {
        await this.auditService.record(
          {
            actor,
            entityType: 'order',
            entityId: updatedOrder.id,
            action: 'status_changed',
            payload: {
              from: previousOrderStatus,
              to: updatedOrder.status,
              source: 'prescription_fulfillment',
            },
          },
          client,
        );
      }

      return {
        prescription: updatedPrescription,
        order: updatedOrder,
      };
    });
  }

  private assertBranchScope(actor: AuthenticatedUser, branchId: string) {
    if (actor.branchIds.length > 0 && !actor.branchIds.includes(branchId)) {
      throw new ForbiddenException('User is outside the requested branch scope');
    }
  }

  private toPrescriptionStatus(action: ReviewPrescriptionDto['action']) {
    switch (action) {
      case 'approve':
        return 'approved' as const;
      case 'reject':
        return 'rejected' as const;
      case 'request_clarification':
        return 'clarification_requested' as const;
    }
  }
}