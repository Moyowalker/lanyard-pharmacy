import { Injectable } from '@nestjs/common';
import { BranchesRepository } from '../../database/repositories/branches.repository';

@Injectable()
export class BranchesService {
  constructor(private readonly branchesRepository: BranchesRepository) {}

  listBranches() {
    return this.branchesRepository.list();
  }
}