import { IsIn, IsString } from 'class-validator';
import {
  PAYMENT_ATTEMPT_STATUSES,
  PAYMENT_PROVIDERS,
  type PaymentAttemptStatus,
  type PaymentProvider,
} from './payment-types';

export class ReconcilePaymentWebhookDto {
  @IsIn(PAYMENT_PROVIDERS)
  provider!: PaymentProvider;

  @IsString()
  providerReference!: string;

  @IsIn(PAYMENT_ATTEMPT_STATUSES)
  status!: PaymentAttemptStatus;
}