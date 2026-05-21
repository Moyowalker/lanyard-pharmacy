import { Module } from '@nestjs/common';
import { BranchesRepository } from '../../database/repositories/branches.repository';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
	controllers: [BranchesController],
	providers: [BranchesService, BranchesRepository],
	exports: [BranchesService],
})
export class BranchesModule {}