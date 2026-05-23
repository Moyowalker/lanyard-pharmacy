import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
	constructor(
		private readonly auditService: AuditService,
		private readonly notificationsService: NotificationsService,
	) {}

	@Roles('super_admin', 'support_admin', 'pharmacist', 'branch_manager')
	@Get('events')
	listEvents(@Query('limit') limit?: string) {
		return this.auditService.list(limit ? parseInt(limit, 10) : 100);
	}

	@Roles('super_admin', 'support_admin', 'pharmacist', 'branch_manager')
	@Get('notifications')
	listNotifications(@Query('limit') limit?: string) {
		return this.notificationsService.listWorkflowEvents(limit ? parseInt(limit, 10) : 100);
	}
}
