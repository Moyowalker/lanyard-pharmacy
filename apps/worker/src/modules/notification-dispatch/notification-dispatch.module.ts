import { Module } from '@nestjs/common';
import { NotificationDeliveryAttemptsRepository } from '../../database/repositories/notification-delivery-attempts.repository';
import { NotificationDispatchService } from './notification-dispatch.service';

@Module({
	providers: [NotificationDispatchService, NotificationDeliveryAttemptsRepository],
	exports: [NotificationDispatchService],
})
export class NotificationDispatchModule {}