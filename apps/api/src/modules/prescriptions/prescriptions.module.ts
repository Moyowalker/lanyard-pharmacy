import { Module } from '@nestjs/common';
import { CustomersRepository } from '../../database/repositories/customers.repository';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { PrescriptionsRepository } from '../../database/repositories/prescriptions.repository';
import { IdentityModule } from '../identity/identity.module';
import { OrdersWorkflow } from '../orders/orders.workflow';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsWorkflow } from './prescriptions.workflow';

@Module({
	imports: [IdentityModule],
	controllers: [PrescriptionsController],
	providers: [
		PrescriptionsService,
		PrescriptionsWorkflow,
		PrescriptionsRepository,
		CustomersRepository,
		OrdersRepository,
		OrdersWorkflow,
		InventoryRepository,
	],
})
export class PrescriptionsModule {}