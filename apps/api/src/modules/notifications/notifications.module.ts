import { Global, Module } from '@nestjs/common';
import { WorkflowEventsRepository } from '../../database/repositories/workflow-events.repository';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
	providers: [NotificationsService, WorkflowEventsRepository],
	exports: [NotificationsService],
})
export class NotificationsModule {}