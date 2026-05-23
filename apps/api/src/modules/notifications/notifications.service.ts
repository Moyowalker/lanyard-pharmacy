import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkflowEventsRepository } from '../../database/repositories/workflow-events.repository';

export type WorkflowNotificationEnvelope = {
  channel: 'email' | 'sms';
  recipient: string;
  template: string;
  provider?: string;
};

export type QueueWorkflowEventInput = {
  eventType: string;
  entityType: string;
  entityId: string;
  notification?: WorkflowNotificationEnvelope;
  data?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly workflowEventsRepository: WorkflowEventsRepository) {}

  async listWorkflowEvents(limit = 100) {
    return this.workflowEventsRepository.findAll(limit);
  }

  async queueWorkflowEvent(input: QueueWorkflowEventInput, client?: Prisma.TransactionClient) {
    return this.workflowEventsRepository.create(
      {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: {
          notification: input.notification
            ? {
                channel: input.notification.channel,
                recipient: input.notification.recipient,
                template: input.notification.template,
                provider: input.notification.provider ?? 'demo',
              }
            : null,
          data: input.data ?? {},
        } satisfies Prisma.InputJsonValue,
      },
      client,
    );
  }
}