export const PAYMENT_PROVIDERS = ['paystack', 'flutterwave'] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_ATTEMPT_STATUSES = [
  'initiated',
  'authorized',
  'captured',
  'failed',
  'refunded',
] as const;

export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];