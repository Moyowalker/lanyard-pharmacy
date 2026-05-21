import { IsIn, IsString } from 'class-validator';
import { PAYMENT_PROVIDERS, type PaymentProvider } from './payment-types';

export class CreatePaymentAttemptDto {
  @IsString()
  orderId!: string;

  @IsIn(PAYMENT_PROVIDERS)
  provider!: PaymentProvider;
}