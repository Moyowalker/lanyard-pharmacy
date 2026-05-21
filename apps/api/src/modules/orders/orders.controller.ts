import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles('pharmacist', 'branch_manager', 'dispatcher', 'support_admin', 'super_admin')
  @Get()
  listOrders() {
    return this.ordersService.listOrders();
  }

  @Roles('pharmacist', 'branch_manager', 'dispatcher', 'support_admin', 'super_admin')
  @Patch(':orderId/status')
  transitionStatus(
    @Param('orderId') orderId: string,
    @Body() body: UpdateOrderStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ordersService.transitionStatus(orderId, body.status, actor);
  }
}