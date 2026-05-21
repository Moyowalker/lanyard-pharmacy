import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import type { OrderStatus } from './dto/order-status';
import { OrdersWorkflow } from './orders.workflow';

@Injectable()
export class OrdersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly ordersWorkflow: OrdersWorkflow,
  ) {}

  listOrders() {
    return this.ordersRepository.list();
  }

  async transitionStatus(orderId: string, nextStatus: OrderStatus, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const order = await this.ordersRepository.findById(orderId, client);

      if (!order) {
        throw new NotFoundException(`Order ${orderId} was not found`);
      }

      this.assertBranchScope(actor, order.branchId);
      this.ordersWorkflow.requireTransition(order.status, nextStatus);

      if (nextStatus === 'processing') {
        await this.inventoryRepository.reserveForOrder(
          {
            orderId: order.id,
            branchId: order.branchId,
            items: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
          client,
        );
      }

      if (nextStatus === 'cancelled') {
        await this.inventoryRepository.releaseForOrder(order.id, client);
      }

      const updatedOrder = await this.ordersRepository.updateStatus(order.id, nextStatus, client);
      const reservations = await this.inventoryRepository.listReservationsForOrder(order.id, client);

      return {
        order: updatedOrder,
        inventoryReservations: reservations,
      };
    });
  }

  private assertBranchScope(actor: AuthenticatedUser, branchId: string) {
    if (actor.branchIds.length > 0 && !actor.branchIds.includes(branchId)) {
      throw new ForbiddenException('User is outside the requested branch scope');
    }
  }
}