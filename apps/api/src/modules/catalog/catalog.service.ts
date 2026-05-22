import { Injectable } from '@nestjs/common';
import { CatalogRepository } from '../../database/repositories/catalog.repository';

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  listProducts() {
    return this.catalogRepository.list();
  }

  addProductToBranch(productId: string, branchId: string) {
    return this.catalogRepository.addBranchProduct(productId, branchId);
  }

  removeProductFromBranch(productId: string, branchId: string) {
    return this.catalogRepository.removeBranchProduct(productId, branchId);
  }
}