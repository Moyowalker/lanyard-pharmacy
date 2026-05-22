import { Global, Module } from '@nestjs/common';
import { AuditEventsRepository } from '../../database/repositories/audit-events.repository';
import { AuditService } from './audit.service';

@Global()
@Module({
	providers: [AuditService, AuditEventsRepository],
	exports: [AuditService],
})
export class AuditModule {}