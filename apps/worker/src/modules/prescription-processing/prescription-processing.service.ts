import { Injectable } from '@nestjs/common';
import { type WorkflowEventRecord } from '../../database/repositories/workflow-events.repository';

@Injectable()
export class PrescriptionProcessingService {
  supports(event: WorkflowEventRecord) {
    return event.entityType === 'prescription';
  }

  buildNotification(event: WorkflowEventRecord) {
    return event.payload.notification ?? null;
  }
}