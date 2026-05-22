import { Injectable } from '@nestjs/common';
import { type WorkflowEventRecord } from '../../database/repositories/workflow-events.repository';

@Injectable()
export class InventorySyncService {
  supports(event: WorkflowEventRecord) {
    return event.entityType === 'inventory';
  }

  buildNotification(event: WorkflowEventRecord) {
    return event.payload.notification ?? null;
  }
}