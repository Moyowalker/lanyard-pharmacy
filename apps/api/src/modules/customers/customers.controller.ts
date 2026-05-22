import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Roles('pharmacist', 'support_admin', 'super_admin')
  @Post()
  createCustomer(@Body() body: CreateCustomerDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.customersService.createCustomer(body, actor);
  }

  @Roles('pharmacist', 'support_admin', 'super_admin')
  @Get()
  listCustomers() {
    return this.customersService.listCustomers();
  }

  @Roles('pharmacist', 'support_admin', 'super_admin')
  @Patch(':customerId')
  updateCustomer(
    @Param('customerId') customerId: string,
    @Body() body: UpdateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.customersService.updateCustomer(customerId, body, actor);
  }
}