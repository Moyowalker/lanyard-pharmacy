import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  async findById(branchId: string, client?: Prisma.TransactionClient): Promise<BranchRecord | null> {
    const branch = await this.executor(client).branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        city: true,
        supportsDelivery: true,
      },
    });

    return branch;
  }

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

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }
}