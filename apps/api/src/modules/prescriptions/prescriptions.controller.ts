import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { ReviewPrescriptionDto } from './dto/review-prescription.dto';
import { PrescriptionsService } from './prescriptions.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Roles('pharmacist', 'branch_manager', 'support_admin', 'super_admin')
  @Get('queue')
  listQueue() {
    return this.prescriptionsService.listQueue();
  }

  @Roles('pharmacist', 'branch_manager', 'support_admin', 'super_admin')
  @Post(':prescriptionId/review')
  reviewPrescription(
    @Param('prescriptionId') prescriptionId: string,
    @Body() body: ReviewPrescriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.prescriptionsService.reviewPrescription(prescriptionId, body, actor);
  }
}