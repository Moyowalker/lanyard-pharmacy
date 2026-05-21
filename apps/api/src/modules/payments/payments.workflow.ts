import { BadRequestException, Injectable } from '@nestjs/common';
import { type PaymentAttemptStatus } from './dto/payment-types';

const PAYMENT_TRANSITIONS: Record<PaymentAttemptStatus, PaymentAttemptStatus[]> = {
  initiated: ['authorized', 'captured', 'failed'],
  authorized: ['captured', 'failed', 'refunded'],
  captured: ['refunded'],
  failed: [],
  refunded: [],
};

@Injectable()
export class PaymentsWorkflow {
  canTransition(from: PaymentAttemptStatus, to: PaymentAttemptStatus) {
    return PAYMENT_TRANSITIONS[from].includes(to);
  }

  requireTransition(from: PaymentAttemptStatus, to: PaymentAttemptStatus) {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`Invalid payment transition from ${from} to ${to}`);
    }

    return { from, to };
  }
}