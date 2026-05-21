import { Injectable } from '@nestjs/common';

export type PaymentProvider = 'paystack' | 'flutterwave';

@Injectable()
export class PaymentsService {
  getSupportedProviders() {
    return ['paystack', 'flutterwave'] as PaymentProvider[];
  }
}