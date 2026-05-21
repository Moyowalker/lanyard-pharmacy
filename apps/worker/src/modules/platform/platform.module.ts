import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { InventorySyncModule } from '../inventory-sync/inventory-sync.module';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationDispatchModule } from '../notification-dispatch/notification-dispatch.module';
import { OrderEventsModule } from '../order-events/order-events.module';
import { PrescriptionProcessingModule } from '../prescription-processing/prescription-processing.module';

@Module({
  imports: [
    HealthModule,
    JobsModule,
    NotificationDispatchModule,
    PrescriptionProcessingModule,
    InventorySyncModule,
    OrderEventsModule,
  ],
})
export class PlatformModule {}