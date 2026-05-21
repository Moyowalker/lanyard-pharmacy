import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { PaymentAttemptsRepository } from '../../database/repositories/payment-attempts.repository';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { OrdersWorkflow } from '../orders/orders.workflow';
import { CreatePaymentAttemptDto } from './dto/create-payment-attempt.dto';
import { ReconcilePaymentWebhookDto } from './dto/reconcile-payment-webhook.dto';
import {
  PAYMENT_PROVIDERS,
  type PaymentAttemptStatus,
  type PaymentProvider,
} from './dto/payment-types';
import { PaymentsWorkflow } from './payments.workflow';

const PAYMENT_PROVIDER_REFERENCE_PREFIX: Record<PaymentProvider, string> = {
  paystack: 'PSTK',
  flutterwave: 'FLW',
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly paymentAttemptsRepository: PaymentAttemptsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly ordersWorkflow: OrdersWorkflow,
    private readonly paymentsWorkflow: PaymentsWorkflow,
  ) {}

  getSupportedProviders() {
    return [...PAYMENT_PROVIDERS];
  }

  async createAttempt(input: CreatePaymentAttemptDto, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const order = await this.ordersRepository.findById(input.orderId, client);

      if (!order) {
        throw new NotFoundException(`Order ${input.orderId} was not found`);
      }

      this.assertBranchScope(actor, order.branchId);

      if (order.status !== 'awaiting_payment') {
        throw new BadRequestException(`Order ${order.id} is not ready for payment attempts`);
      }

      const paymentAttempt = await this.paymentAttemptsRepository.create(
        {
          id: `pay-${randomUUID()}`,
          orderId: order.id,
          provider: input.provider,
          status: 'initiated',
          providerReference: this.buildProviderReference(input.provider),
          amount: order.total,
        },
        client,
      );

      return {
        paymentAttempt,
        order,
      };
    });
  }

  async reconcileWebhook(input: ReconcilePaymentWebhookDto) {
    return this.database.transaction(async (client) => {
      const existingAttempt = await this.paymentAttemptsRepository.findByProviderReference(
        input.providerReference,
        client,
      );

      if (!existingAttempt) {
        throw new NotFoundException(`Payment attempt ${input.providerReference} was not found`);
      }

      if (existingAttempt.provider !== input.provider) {
        throw new BadRequestException(`Provider mismatch for payment attempt ${input.providerReference}`);
      }

      let paymentAttempt = existingAttempt;
      if (existingAttempt.status !== input.status) {
        this.paymentsWorkflow.requireTransition(existingAttempt.status, input.status);
        paymentAttempt = await this.paymentAttemptsRepository.updateStatus(existingAttempt.id, input.status, client);
      }

      let order = await this.ordersRepository.findById(existingAttempt.orderId, client);
      if (!order) {
        throw new NotFoundException(`Order ${existingAttempt.orderId} was not found`);
      }

      order = await this.applyOrderEffects(order, input.status, client);
      const inventoryReservations = await this.inventoryRepository.listReservationsForOrder(order.id, client);

      return {
        paymentAttempt,
        order,
        inventoryReservations,
      };
    });
  }

  private async applyOrderEffects(
    order: Awaited<ReturnType<OrdersRepository['findById']>> extends infer Result
      ? Exclude<Result, null>
      : never,
    paymentStatus: PaymentAttemptStatus,
    client: Prisma.TransactionClient,
  ) {
    if (paymentStatus === 'captured') {
      if (order.status === 'awaiting_payment') {
        this.ordersWorkflow.requireTransition(order.status, 'processing');
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

        return this.ordersRepository.updateStatus(order.id, 'processing', client);
      }

      return order;
    }

    if (paymentStatus === 'refunded') {
      if (order.status !== 'cancelled') {
        await this.inventoryRepository.releaseForOrder(order.id, client);
        this.ordersWorkflow.requireTransition(order.status, 'cancelled');
        return this.ordersRepository.updateStatus(order.id, 'cancelled', client);
      }

      return order;
    }

    return order;
  }

  private buildProviderReference(provider: PaymentProvider) {
    const [referenceSuffix = 'PAY'] = randomUUID().split('-');
    return `${PAYMENT_PROVIDER_REFERENCE_PREFIX[provider]}-${referenceSuffix.toUpperCase()}`;
  }

  private assertBranchScope(actor: AuthenticatedUser, branchId: string) {
    if (actor.branchIds.length > 0 && !actor.branchIds.includes(branchId)) {
      throw new ForbiddenException('User is outside the requested branch scope');
    }
  }
}