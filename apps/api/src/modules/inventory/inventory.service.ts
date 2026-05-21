import { Injectable } from '@nestjs/common';
import { InventoryRepository } from '../../database/repositories/inventory.repository';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  getBranchInventory(branchId: string) {
    return this.inventoryRepository.findByBranch(branchId);
  }
}