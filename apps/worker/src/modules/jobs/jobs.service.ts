import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { WorkflowEventsRepository, type WorkflowEventRecord } from '../../database/repositories/workflow-events.repository';
import { NotificationDispatchService } from '../notification-dispatch/notification-dispatch.service';
import { OrderEventsService } from '../order-events/order-events.service';
import { PrescriptionProcessingService } from '../prescription-processing/prescription-processing.service';
import { InventorySyncService } from '../inventory-sync/inventory-sync.service';
import { AuditService } from '../audit/audit.service';
import { AppLogger } from '../observability/app-logger.service';
import { OperationalMetricsService } from '../observability/operational-metrics.service';

@Injectable()
export class JobsService {
  private readonly retryDelaySeconds = this.resolveRetryDelaySeconds();

  constructor(
    private readonly database: DatabaseService,
    private readonly workflowEventsRepository: WorkflowEventsRepository,
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly orderEventsService: OrderEventsService,
    private readonly prescriptionProcessingService: PrescriptionProcessingService,
    private readonly inventorySyncService: InventorySyncService,
    private readonly auditService: AuditService,
    private readonly metrics: OperationalMetricsService,
    private readonly logger: AppLogger,
  ) {}

  async drainPendingWorkflowEvents(limit = 50) {
    const pendingEvents = await this.workflowEventsRepository.listPending(limit);
    let processed = 0;
    let failed = 0;
    let retried = 0;
    let deadLettered = 0;

    for (const pendingEvent of pendingEvents) {
      try {
        const event = await this.database.transaction(async (client) => {
          const processingEvent = await this.workflowEventsRepository.markProcessing(pendingEvent.id, client);

          await this.auditService.record(
            {
              actor: { sub: 'worker-jobs', email: 'worker' },
              entityType: 'worker_job',
              entityId: processingEvent.id,
              action: 'processing_started',
              payload: {
                eventType: processingEvent.eventType,
                entityType: processingEvent.entityType,
                entityId: processingEvent.entityId,
                attempts: processingEvent.attempts,
                maxAttempts: processingEvent.maxAttempts,
              },
            },
            client,
          );

          return processingEvent;
        });

        await this.database.transaction(async (client) => {
          const notification = this.resolveNotification(event);
          if (!notification) {
            throw new Error(`Workflow event ${event.id} is missing notification metadata`);
          }

          await this.notificationDispatchService.dispatch(event, notification, client);
          await this.workflowEventsRepository.markCompleted(event.id, client);

          await this.auditService.record(
            {
              actor: { sub: 'worker-jobs', email: 'worker' },
              entityType: 'worker_job',
              entityId: event.id,
              action: 'processing_completed',
              payload: {
                eventType: event.eventType,
                entityType: event.entityType,
                entityId: event.entityId,
              },
            },
            client,
          );
        });

        processed += 1;
        this.metrics.recordWorkflowProcessed();
        this.logger.logEvent('log', 'jobs', 'workflow_event_completed', {
          workflowEventId: pendingEvent.id,
        });
      } catch (error) {
        failed += 1;
        let failureStatus: 'retrying' | 'dead_lettered' = 'retrying';

        await this.database.transaction(async (client) => {
          const failedEvent = await this.workflowEventsRepository.markFailed(
            pendingEvent.id,
            error instanceof Error ? error.message : 'Unknown worker processing error',
            this.retryDelaySeconds,
            client,
          );
          failureStatus = failedEvent.status === 'dead_lettered' ? 'dead_lettered' : 'retrying';

          if (failedEvent.status === 'dead_lettered') {
            deadLettered += 1;
            this.metrics.recordWorkflowDeadLettered();
          } else {
            retried += 1;
            this.metrics.recordWorkflowRetried();
          }

          await this.auditService.record(
            {
              actor: { sub: 'worker-jobs', email: 'worker' },
              entityType: 'worker_job',
              entityId: failedEvent.id,
              action: failedEvent.status === 'dead_lettered' ? 'processing_dead_lettered' : 'processing_requeued',
              payload: {
                eventType: failedEvent.eventType,
                entityType: failedEvent.entityType,
                entityId: failedEvent.entityId,
                errorMessage: failedEvent.errorMessage,
                attempts: failedEvent.attempts,
                maxAttempts: failedEvent.maxAttempts,
                nextAttemptAt: failedEvent.status === 'retrying' ? failedEvent.availableAt : null,
                deadLetteredAt: failedEvent.deadLetteredAt,
              },
            },
            client,
          );
        });

        this.logger.logEvent(failedEventStatusToLogLevel(failureStatus), 'jobs', 'workflow_event_failed', {
          workflowEventId: pendingEvent.id,
          error: error instanceof Error ? error.message : 'Unknown worker processing error',
          outcome: failureStatus,
        });
      }
    }

    return {
      processed,
      failed,
      retried,
      deadLettered,
    };
  }

  private resolveNotification(event: WorkflowEventRecord) {
    if (this.orderEventsService.supports(event)) {
      return this.orderEventsService.buildNotification(event);
    }

    if (this.inventorySyncService.supports(event)) {
      return this.inventorySyncService.buildNotification(event);
    }

    if (this.prescriptionProcessingService.supports(event)) {
      return this.prescriptionProcessingService.buildNotification(event);
    }

    return null;
  }

  private resolveRetryDelaySeconds() {
    const value = Number.parseInt(process.env.WORKFLOW_EVENT_RETRY_DELAY_SECONDS ?? '60', 10);

    if (!Number.isFinite(value) || value < 0) {
      return 60;
    }

    return value;
  }
}

function failedEventStatusToLogLevel(status: 'retrying' | 'dead_lettered') {
  return status === 'dead_lettered' ? 'error' : 'warn';
}