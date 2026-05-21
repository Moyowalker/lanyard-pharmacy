import { BadRequestException, Injectable } from '@nestjs/common';
import { ORDER_TRANSITIONS, type OrderStatus } from './dto/order-status';

@Injectable()
export class OrdersWorkflow {
  canTransition(from: OrderStatus, to: OrderStatus) {
    return ORDER_TRANSITIONS[from].includes(to);
  }

  requireTransition(from: OrderStatus, to: OrderStatus) {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`Invalid order transition from ${from} to ${to}`);
    }

    return { from, to };
  }
}