import { Module } from '@nestjs/common';
import { BranchesRepository } from '../../database/repositories/branches.repository';
import { DeliveryJobsRepository } from '../../database/repositories/delivery-jobs.repository';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { IdentityModule } from '../identity/identity.module';
import { OrdersWorkflow } from '../orders/orders.workflow';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryWorkflow } from './delivery.workflow';

@Module({
	imports: [IdentityModule],
	controllers: [DeliveryController],
	providers: [
		DeliveryService,
		DeliveryWorkflow,
		OrdersRepository,
		OrdersWorkflow,
		InventoryRepository,
		BranchesRepository,
		DeliveryJobsRepository,
	],
})
export class DeliveryModule {}