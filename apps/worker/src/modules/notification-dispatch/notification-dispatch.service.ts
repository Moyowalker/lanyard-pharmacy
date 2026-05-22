import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationDeliveryAttemptsRepository } from '../../database/repositories/notification-delivery-attempts.repository';
import { type WorkflowEventPayload, type WorkflowEventRecord } from '../../database/repositories/workflow-events.repository';
import { AuditService } from '../audit/audit.service';
import { AppLogger } from '../observability/app-logger.service';
import { OperationalMetricsService } from '../observability/operational-metrics.service';

export type NotificationDispatchRequest = NonNullable<WorkflowEventPayload['notification']>;

@Injectable()
export class NotificationDispatchService {
  constructor(
    private readonly notificationDeliveryAttemptsRepository: NotificationDeliveryAttemptsRepository,
    private readonly auditService: AuditService,
    private readonly metrics: OperationalMetricsService,
    private readonly logger: AppLogger,
  ) {}

  async dispatch(
    event: WorkflowEventRecord,
    notification: NotificationDispatchRequest,
    client: Prisma.TransactionClient,
  ) {
    const attempt = await this.notificationDeliveryAttemptsRepository.createSent(
      {
        workflowEventId: event.id,
        channel: notification.channel,
        recipient: notification.recipient,
        template: notification.template,
        provider: notification.provider,
        payload: (event.payload.data ?? {}) as Prisma.InputJsonValue,
      },
      client,
    );

    await this.auditService.record(
      {
        actor: { sub: 'worker-notification-dispatch', email: 'worker' },
        entityType: 'notification',
        entityId: attempt.id,
        action: 'dispatched',
        payload: {
          workflowEventId: event.id,
          template: notification.template,
          channel: notification.channel,
          recipient: notification.recipient,
        },
      },
      client,
    );

    this.metrics.recordNotificationDispatch();
    this.logger.logEvent('log', 'notification-dispatch', 'notification_dispatched', {
      workflowEventId: event.id,
      notificationAttemptId: attempt.id,
      template: notification.template,
      channel: notification.channel,
    });

    return attempt;
  }
}