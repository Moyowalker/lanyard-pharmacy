import { Module } from '@nestjs/common';
import { CatalogRepository } from '../../database/repositories/catalog.repository';
import { IdentityModule } from '../identity/identity.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
	imports: [IdentityModule],
	controllers: [CatalogController],
	providers: [CatalogService, CatalogRepository],
})
export class CatalogModule {}