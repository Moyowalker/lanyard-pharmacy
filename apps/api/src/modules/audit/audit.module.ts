import { Global, Module } from '@nestjs/common';
import { AuditEventsRepository } from '../../database/repositories/audit-events.repository';
import { IdentityModule } from '../identity/identity.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Global()
@Module({
	imports: [IdentityModule],
	controllers: [AuditController],
	providers: [AuditService, AuditEventsRepository],
	exports: [AuditService],
})
export class AuditModule {}