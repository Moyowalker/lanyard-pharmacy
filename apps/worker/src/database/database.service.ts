import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    if (this.shouldSkipConnection()) {
      return;
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    if (this.shouldSkipConnection()) {
      return;
    }

    await this.$disconnect();
  }

  async transaction<T>(work: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction((client) => work(client));
  }

  private shouldSkipConnection() {
    return process.env.SKIP_DB_CONNECT === 'true';
  }
}