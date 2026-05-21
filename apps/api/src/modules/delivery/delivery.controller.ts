import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { AssignDeliveryJobDto } from './dto/assign-delivery-job.dto';
import { DeliveryService } from './delivery.service';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('dispatch-modes')
  listDispatchModes() {
    return this.deliveryService.getDispatchModes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dispatcher', 'branch_manager', 'support_admin', 'super_admin')
  @Post('jobs')
  assignDelivery(@Body() body: AssignDeliveryJobDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.deliveryService.assignDelivery(body, actor);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dispatcher', 'branch_manager', 'support_admin', 'super_admin')
  @Patch('jobs/:deliveryJobId/status')
  updateStatus(
    @Param('deliveryJobId') deliveryJobId: string,
    @Body() body: UpdateDeliveryStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.deliveryService.updateStatus(deliveryJobId, body, actor);
  }
}