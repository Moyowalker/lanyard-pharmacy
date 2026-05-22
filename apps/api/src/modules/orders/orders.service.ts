import { randomUUID } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BranchesRepository } from '../../database/repositories/branches.repository';
import { CatalogRepository, type CatalogProductRecord } from '../../database/repositories/catalog.repository';
import { CustomersRepository } from '../../database/repositories/customers.repository';
import { DatabaseService } from '../../database/database.service';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { CheckoutOrderDto, PreviewCartDto } from './dto/checkout-order.dto';
import type { OrderStatus } from './dto/order-status';
import { OrdersWorkflow } from './orders.workflow';

type OrderRequestInput = Pick<PreviewCartDto, 'customerId' | 'branchId' | 'items'>;

type CartSummaryItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  requiresPrescription: boolean;
  availableQuantity: number;
};

type CartSummary = {
  customerId: string;
  customerEmail: string;
  branchId: string;
  itemCount: number;
  total: number;
  containsPrescriptionItems: boolean;
  nextOrderStatus: OrderStatus;
  items: CartSummaryItem[];
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly branchesRepository: BranchesRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly catalogRepository: CatalogRepository,
    private readonly ordersWorkflow: OrdersWorkflow,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listOrders() {
    return this.ordersRepository.list();
  }

  async previewCart(input: PreviewCartDto, actor: AuthenticatedUser) {
    return this.buildCartSummary(input, actor);
  }

  async checkout(input: CheckoutOrderDto, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const cart = await this.buildCartSummary(input, actor, client);
      const orderId = `ord-${randomUUID()}`;

      const order = await this.ordersRepository.create(
        {
          id: orderId,
          customerId: cart.customerId,
          branchId: cart.branchId,
          status: cart.nextOrderStatus,
          total: cart.total,
          containsPrescriptionItems: cart.containsPrescriptionItems,
          items: cart.items.map((item, index) => ({
            id: `item-${orderId}-${index + 1}`,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
        client,
      );

      await this.auditService.record(
        {
          actor,
          entityType: 'order',
          entityId: order.id,
          action: 'created',
          payload: {
            branchId: order.branchId,
            customerId: order.customerId,
            status: order.status,
            total: order.total,
            itemCount: order.items.length,
          },
        },
        client,
      );

      await this.notificationsService.queueWorkflowEvent(
        {
          eventType: 'order.created',
          entityType: 'order',
          entityId: order.id,
          notification: {
            channel: 'email',
            recipient: cart.customerEmail,
            template: 'order-created',
          },
          data: {
            branchId: order.branchId,
            customerId: order.customerId,
            status: order.status,
            total: order.total,
            containsPrescriptionItems: order.containsPrescriptionItems,
          },
        },
        client,
      );

      return {
        order,
        cart,
      };
    });
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

      await this.auditService.record(
        {
          actor,
          entityType: 'order',
          entityId: updatedOrder.id,
          action: 'status_changed',
          payload: {
            from: order.status,
            to: updatedOrder.status,
            inventoryReservationCount: reservations.length,
          },
        },
        client,
      );

      await this.notificationsService.queueWorkflowEvent(
        {
          eventType: 'order.status_changed',
          entityType: 'order',
          entityId: updatedOrder.id,
          notification: {
            channel: 'email',
            recipient: 'support@lanyardpharmacy.com',
            template: 'order-status-changed',
          },
          data: {
            from: order.status,
            to: updatedOrder.status,
            branchId: updatedOrder.branchId,
            customerId: updatedOrder.customerId,
            inventoryReservationCount: reservations.length,
          },
        },
        client,
      );

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

  private async buildCartSummary(
    input: OrderRequestInput,
    actor: AuthenticatedUser,
    client?: Prisma.TransactionClient,
  ): Promise<CartSummary> {
    const normalizedItems = this.normalizeItems(input.items);

    const [branch, customer, products, inventory] = await Promise.all([
      this.branchesRepository.findById(input.branchId, client),
      this.customersRepository.findById(input.customerId, client),
      this.catalogRepository.findByBranchAndIds(
        input.branchId,
        normalizedItems.map((item) => item.productId),
        client,
      ),
      this.inventoryRepository.getAvailabilityForProducts(
        input.branchId,
        normalizedItems.map((item) => item.productId),
        client,
      ),
    ]);

    if (!branch) {
      throw new NotFoundException(`Branch ${input.branchId} was not found`);
    }

    if (!customer) {
      throw new NotFoundException(`Customer ${input.customerId} was not found`);
    }

    this.assertBranchScope(actor, input.branchId);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const availabilityMap = new Map(inventory.map((record) => [record.productId, record.availableQuantity]));
    const missingProductIds = normalizedItems
      .map((item) => item.productId)
      .filter((productId) => !productMap.has(productId));

    if (missingProductIds.length > 0) {
      throw new NotFoundException(
        `Products are not available at branch ${input.branchId}: ${missingProductIds.join(', ')}`,
      );
    }

    const items = normalizedItems.map((item) => this.buildCartLine(item, productMap, availabilityMap));
    const containsPrescriptionItems = items.some((item) => item.requiresPrescription);
    const nextOrderStatus: OrderStatus = containsPrescriptionItems ? 'pending_review' : 'awaiting_payment';

    return {
      customerId: input.customerId,
      customerEmail: customer.email,
      branchId: input.branchId,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      total: items.reduce((total, item) => total + item.lineTotal, 0),
      containsPrescriptionItems,
      nextOrderStatus,
      items,
    };
  }

  private buildCartLine(
    item: { productId: string; quantity: number },
    productMap: Map<string, CatalogProductRecord>,
    availabilityMap: Map<string, number>,
  ): CartSummaryItem {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new NotFoundException(`Product ${item.productId} was not found`);
    }

    const availableQuantity = availabilityMap.get(item.productId) ?? 0;
    if (availableQuantity < item.quantity) {
      throw new ConflictException(`Insufficient stock for product ${item.productId}`);
    }

    return {
      productId: item.productId,
      name: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal: product.price * item.quantity,
      requiresPrescription: product.requiresPrescription,
      availableQuantity,
    };
  }

  private normalizeItems(items: Array<{ productId: string; quantity: number }>) {
    const aggregatedItems = new Map<string, number>();

    for (const item of items) {
      aggregatedItems.set(item.productId, (aggregatedItems.get(item.productId) ?? 0) + item.quantity);
    }

    return [...aggregatedItems.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }
}