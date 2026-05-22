import { Module } from '@nestjs/common';
import { InventorySyncService } from './inventory-sync.service';

@Module({
	providers: [InventorySyncService],
	exports: [InventorySyncService],
})
export class InventorySyncModule {}