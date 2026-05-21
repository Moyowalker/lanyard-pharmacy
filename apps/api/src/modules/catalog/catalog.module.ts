import { Module } from '@nestjs/common';
import { CatalogRepository } from '../../database/repositories/catalog.repository';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
	controllers: [CatalogController],
	providers: [CatalogService, CatalogRepository],
})
export class CatalogModule {}