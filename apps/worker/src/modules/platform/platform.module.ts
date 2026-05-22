import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { HealthModule } from '../health/health.module';
import { InventorySyncModule } from '../inventory-sync/inventory-sync.module';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationDispatchModule } from '../notification-dispatch/notification-dispatch.module';
import { ObservabilityModule } from '../observability/observability.module';
import { OrderEventsModule } from '../order-events/order-events.module';
import { PrescriptionProcessingModule } from '../prescription-processing/prescription-processing.module';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    ObservabilityModule,
    HealthModule,
    JobsModule,
    NotificationDispatchModule,
    PrescriptionProcessingModule,
    InventorySyncModule,
    OrderEventsModule,
  ],
})
export class PlatformModule {}