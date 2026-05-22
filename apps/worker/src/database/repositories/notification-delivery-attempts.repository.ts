import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database.service';

export type CreateNotificationDeliveryAttemptInput = {
  workflowEventId: string;
  channel: 'email' | 'sms';
  recipient: string;
  template: string;
  provider: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationDeliveryAttemptsRepository {
  constructor(private readonly database: DatabaseService) {}

  async createSent(input: CreateNotificationDeliveryAttemptInput, client?: Prisma.TransactionClient) {
    return this.executor(client).notificationDeliveryAttempt.create({
      data: {
        id: `nda-${randomUUID()}`,
        workflowEventId: input.workflowEventId,
        channel: input.channel,
        recipient: input.recipient,
        template: input.template,
        provider: input.provider,
        status: 'sent',
        payload: input.payload ?? {},
        sentAt: new Date(),
      },
    });
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }
}