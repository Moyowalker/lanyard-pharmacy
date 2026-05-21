import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BranchScoped } from '../../common/auth/branch-scope.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles('pharmacist', 'branch_manager', 'inventory_officer', 'super_admin')
  @BranchScoped()
  @Get('branches/:branchId/stock')
  getBranchInventory(@Param('branchId') branchId: string) {
    return this.inventoryService.getBranchInventory(branchId);
  }
}