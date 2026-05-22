import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { BranchesModule } from '../branches/branches.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CustomersModule } from '../customers/customers.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { HealthModule } from '../health/health.module';
import { IdentityModule } from '../identity/identity.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ObservabilityModule } from '../observability/observability.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { appConfig } from '../../config/app.config';
import { validateEnv } from '../../config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    DatabaseModule,
    ObservabilityModule,
    HealthModule,
    IdentityModule,
    CustomersModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    PrescriptionsModule,
    PaymentsModule,
    DeliveryModule,
    NotificationsModule,
    BranchesModule,
    AuditModule,
  ],
})
export class PlatformModule {}