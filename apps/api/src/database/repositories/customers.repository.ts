import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database.service';

export type CustomerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  refillReminderOptIn: boolean;
};

@Injectable()
export class CustomersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findById(customerId: string, client?: Prisma.TransactionClient): Promise<CustomerRecord | null> {
    const customer = await this.executor(client).customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        refillReminderOptIn: true,
      },
    });

    return customer;
  }

  async list(): Promise<CustomerRecord[]> {
    return this.database.customer.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        refillReminderOptIn: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }
}