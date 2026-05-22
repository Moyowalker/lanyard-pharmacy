import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { BranchScoped } from '../../common/auth/branch-scope.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { AdjustInventoryBatchDto } from './dto/adjust-inventory-batch.dto';
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

  @Roles('pharmacist', 'branch_manager', 'inventory_officer', 'super_admin')
  @BranchScoped()
  @Get('branches/:branchId/alerts')
  listLowStockAlerts(@Param('branchId') branchId: string) {
    return this.inventoryService.listLowStockAlerts(branchId);
  }

  @Roles('pharmacist', 'branch_manager', 'inventory_officer', 'super_admin')
  @Patch('batches/:batchId/adjust')
  adjustBatch(
    @Param('batchId') batchId: string,
    @Body() body: AdjustInventoryBatchDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inventoryService.adjustBatch(batchId, body, actor);
  }
}