import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { WorkflowEventsRepository, type WorkflowEventRecord } from '../../database/repositories/workflow-events.repository';
import { NotificationDispatchService } from '../notification-dispatch/notification-dispatch.service';
import { OrderEventsService } from '../order-events/order-events.service';
import { PrescriptionProcessingService } from '../prescription-processing/prescription-processing.service';
import { InventorySyncService } from '../inventory-sync/inventory-sync.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly workflowEventsRepository: WorkflowEventsRepository,
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly orderEventsService: OrderEventsService,
    private readonly prescriptionProcessingService: PrescriptionProcessingService,
    private readonly inventorySyncService: InventorySyncService,
    private readonly auditService: AuditService,
  ) {}

  async drainPendingWorkflowEvents(limit = 50) {
    const pendingEvents = await this.workflowEventsRepository.listPending(limit);
    let processed = 0;
    let failed = 0;

    for (const pendingEvent of pendingEvents) {
      try {
        await this.database.transaction(async (client) => {
          const event = await this.workflowEventsRepository.markProcessing(pendingEvent.id, client);

          await this.auditService.record(
            {
              actor: { sub: 'worker-jobs', email: 'worker' },
              entityType: 'worker_job',
              entityId: event.id,
              action: 'processing_started',
              payload: {
                eventType: event.eventType,
                entityType: event.entityType,
                entityId: event.entityId,
                attempts: event.attempts,
              },
            },
            client,
          );

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
      } catch (error) {
        failed += 1;
        await this.database.transaction(async (client) => {
          const failedEvent = await this.workflowEventsRepository.markFailed(
            pendingEvent.id,
            error instanceof Error ? error.message : 'Unknown worker processing error',
            client,
          );

          await this.auditService.record(
            {
              actor: { sub: 'worker-jobs', email: 'worker' },
              entityType: 'worker_job',
              entityId: failedEvent.id,
              action: 'processing_failed',
              payload: {
                eventType: failedEvent.eventType,
                entityType: failedEvent.entityType,
                entityId: failedEvent.entityId,
                errorMessage: failedEvent.errorMessage,
              },
            },
            client,
          );
        });
      }
    }

    return {
      processed,
      failed,
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
}