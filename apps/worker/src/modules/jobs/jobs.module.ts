import { Module } from '@nestjs/common';
import { WorkflowEventsRepository } from '../../database/repositories/workflow-events.repository';
import { InventorySyncModule } from '../inventory-sync/inventory-sync.module';
import { NotificationDispatchModule } from '../notification-dispatch/notification-dispatch.module';
import { OrderEventsModule } from '../order-events/order-events.module';
import { PrescriptionProcessingModule } from '../prescription-processing/prescription-processing.module';
import { JobsService } from './jobs.service';

@Module({
	imports: [NotificationDispatchModule, OrderEventsModule, PrescriptionProcessingModule, InventorySyncModule],
	providers: [JobsService, WorkflowEventsRepository],
	exports: [JobsService],
})
export class JobsModule {}