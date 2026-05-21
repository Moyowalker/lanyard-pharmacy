import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { PrescriptionsRepository } from '../../database/repositories/prescriptions.repository';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { OrdersWorkflow } from '../orders/orders.workflow';
import { ReviewPrescriptionDto } from './dto/review-prescription.dto';
import { PrescriptionsWorkflow } from './prescriptions.workflow';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly prescriptionsRepository: PrescriptionsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly ordersWorkflow: OrdersWorkflow,
    private readonly prescriptionsWorkflow: PrescriptionsWorkflow,
  ) {}

  listQueue() {
    return this.prescriptionsRepository.listQueue();
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

      let updatedOrder = null;

      if (prescription.orderId) {
        const linkedOrder = await this.ordersRepository.findById(prescription.orderId, client);

        if (linkedOrder) {
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