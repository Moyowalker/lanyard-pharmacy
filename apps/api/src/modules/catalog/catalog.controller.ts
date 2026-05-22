import { Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CatalogService } from './catalog.service';

@Controller('catalog/products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  listProducts() {
    return this.catalogService.listProducts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('branch_manager', 'inventory_officer', 'super_admin')
  @Put(':productId/branches/:branchId')
  addProductToBranch(
    @Param('productId') productId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.catalogService.addProductToBranch(productId, branchId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('branch_manager', 'inventory_officer', 'super_admin')
  @Delete(':productId/branches/:branchId')
  removeProductFromBranch(
    @Param('productId') productId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.catalogService.removeProductFromBranch(productId, branchId);
  }
}