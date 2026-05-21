import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';

export type BranchRecord = {
  id: string;
  name: string;
  city: string;
  supportsDelivery: boolean;
};

@Injectable()
export class BranchesRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<BranchRecord[]> {
    return this.database.branch.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        supportsDelivery: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}