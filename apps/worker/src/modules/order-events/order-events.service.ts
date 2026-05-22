import { Injectable } from '@nestjs/common';
import { type WorkflowEventRecord } from '../../database/repositories/workflow-events.repository';

@Injectable()
export class OrderEventsService {
  supports(event: WorkflowEventRecord) {
    return event.entityType === 'order' || event.entityType === 'payment';
  }

  buildNotification(event: WorkflowEventRecord) {
    return event.payload.notification ?? null;
  }
}