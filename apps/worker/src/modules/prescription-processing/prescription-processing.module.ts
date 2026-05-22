import { Module } from '@nestjs/common';
import { PrescriptionProcessingService } from './prescription-processing.service';

@Module({
	providers: [PrescriptionProcessingService],
	exports: [PrescriptionProcessingService],
})
export class PrescriptionProcessingModule {}