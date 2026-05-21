import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  type PaymentAttemptStatus,
  type PaymentProvider,
} from '../../modules/payments/dto/payment-types';
import { DatabaseService } from '../database.service';

export type PaymentAttemptRecord = {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentAttemptStatus;
  providerReference: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentAttemptInput = {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentAttemptStatus;
  providerReference: string;
  amount: number;
  currency?: string;
};

@Injectable()
export class PaymentAttemptsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(
    input: CreatePaymentAttemptInput,
    client?: Prisma.TransactionClient,
  ): Promise<PaymentAttemptRecord> {
    const attempt = await this.executor(client).paymentAttempt.create({
      data: {
        id: input.id,
        orderId: input.orderId,
        provider: input.provider,
        status: input.status,
        providerReference: input.providerReference,
        amount: input.amount,
        currency: input.currency ?? 'NGN',
      },
    });

    return this.mapAttempt(attempt);
  }

  async findByProviderReference(
    providerReference: string,
    client?: Prisma.TransactionClient,
  ): Promise<PaymentAttemptRecord | null> {
    const attempt = await this.executor(client).paymentAttempt.findUnique({
      where: {
        providerReference,
      },
    });

    return attempt ? this.mapAttempt(attempt) : null;
  }

  async updateStatus(
    paymentAttemptId: string,
    status: PaymentAttemptStatus,
    client?: Prisma.TransactionClient,
  ): Promise<PaymentAttemptRecord> {
    const attempt = await this.executor(client).paymentAttempt.update({
      where: {
        id: paymentAttemptId,
      },
      data: {
        status,
      },
    });

    return this.mapAttempt(attempt);
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }

  private mapAttempt(attempt: {
    id: string;
    orderId: string;
    provider: PaymentProvider;
    status: PaymentAttemptStatus;
    providerReference: string;
    amount: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentAttemptRecord {
    return {
      id: attempt.id,
      orderId: attempt.orderId,
      provider: attempt.provider,
      status: attempt.status,
      providerReference: attempt.providerReference,
      amount: attempt.amount,
      currency: attempt.currency,
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    };
  }
}