import { Module } from '@nestjs/common';
import { BranchesRepository } from '../../database/repositories/branches.repository';
import { CatalogRepository } from '../../database/repositories/catalog.repository';
import { CustomersRepository } from '../../database/repositories/customers.repository';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { IdentityModule } from '../identity/identity.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersWorkflow } from './orders.workflow';

@Module({
	imports: [IdentityModule],
	controllers: [OrdersController],
	providers: [
		OrdersService,
		OrdersWorkflow,
		OrdersRepository,
		InventoryRepository,
		BranchesRepository,
		CustomersRepository,
		CatalogRepository,
	],
})
export class OrdersModule {}