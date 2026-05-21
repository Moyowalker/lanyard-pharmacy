import { Module } from '@nestjs/common';
import { InventoryRepository } from '../../database/repositories/inventory.repository';
import { IdentityModule } from '../identity/identity.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
	imports: [IdentityModule],
	controllers: [InventoryController],
	providers: [InventoryService, InventoryRepository],
})
export class InventoryModule {}