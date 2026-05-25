import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database.service';

export type PlatformUserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  branchIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformUserWithPasswordRecord = PlatformUserRecord & {
  passwordHash: string;
};

export type CreatePlatformUserInput = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  roles: string[];
  branchIds: string[];
  isActive: boolean;
};

export type UpdatePlatformUserInput = Partial<
  Omit<CreatePlatformUserInput, 'id'>
>;

const platformUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  roles: true,
  branchIds: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlatformUserSelect;

const platformUserWithPasswordSelect = {
  ...platformUserSelect,
  passwordHash: true,
} satisfies Prisma.PlatformUserSelect;

@Injectable()
export class PlatformUsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<PlatformUserRecord[]> {
    return this.database.platformUser.findMany({
      select: platformUserSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findByEmail(email: string, client?: Prisma.TransactionClient): Promise<PlatformUserWithPasswordRecord | null> {
    return this.executor(client).platformUser.findUnique({
      where: { email },
      select: platformUserWithPasswordSelect,
    });
  }

  async findById(userId: string, client?: Prisma.TransactionClient): Promise<PlatformUserWithPasswordRecord | null> {
    return this.executor(client).platformUser.findUnique({
      where: { id: userId },
      select: platformUserWithPasswordSelect,
    });
  }

  async create(input: CreatePlatformUserInput, client?: Prisma.TransactionClient): Promise<PlatformUserRecord> {
    return this.executor(client).platformUser.create({
      data: input,
      select: platformUserSelect,
    });
  }

  async update(userId: string, input: UpdatePlatformUserInput, client?: Prisma.TransactionClient): Promise<PlatformUserRecord> {
    return this.executor(client).platformUser.update({
      where: { id: userId },
      data: input,
      select: platformUserSelect,
    });
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }
}
