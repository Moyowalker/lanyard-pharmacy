import { Module } from '@nestjs/common';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { IdentityModule } from '../identity/identity.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersWorkflow } from './orders.workflow';

@Module({
	imports: [IdentityModule],
	controllers: [OrdersController],
	providers: [OrdersService, OrdersWorkflow, OrdersRepository, InventoryRepository],
})
export class OrdersModule {}