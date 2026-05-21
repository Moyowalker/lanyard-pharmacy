import { Module } from '@nestjs/common';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { OrdersRepository } from '../../database/repositories/orders.repository';
import { PaymentAttemptsRepository } from '../../database/repositories/payment-attempts.repository';
import { IdentityModule } from '../identity/identity.module';
import { OrdersWorkflow } from '../orders/orders.workflow';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWorkflow } from './payments.workflow';

@Module({
	imports: [IdentityModule],
	controllers: [PaymentsController],
	providers: [
		PaymentsService,
		PaymentsWorkflow,
		PaymentAttemptsRepository,
		OrdersRepository,
		InventoryRepository,
		OrdersWorkflow,
	],
})
export class PaymentsModule {}