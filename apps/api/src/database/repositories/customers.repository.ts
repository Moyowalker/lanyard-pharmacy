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

export type CreateCustomerInput = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  refillReminderOptIn?: boolean;
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'id'>>;

const customerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  refillReminderOptIn: true,
} satisfies Prisma.CustomerSelect;

@Injectable()
export class CustomersRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateCustomerInput, client?: Prisma.TransactionClient): Promise<CustomerRecord> {
    return this.executor(client).customer.create({
      data: {
        id: input.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        refillReminderOptIn: input.refillReminderOptIn,
      },
      select: customerSelect,
    });
  }

  async findById(customerId: string, client?: Prisma.TransactionClient): Promise<CustomerRecord | null> {
    const customer = await this.executor(client).customer.findUnique({
      where: { id: customerId },
      select: customerSelect,
    });

    return customer;
  }

  async list(): Promise<CustomerRecord[]> {
    return this.database.customer.findMany({
      select: customerSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async update(
    customerId: string,
    input: UpdateCustomerInput,
    client?: Prisma.TransactionClient,
  ): Promise<CustomerRecord> {
    return this.executor(client).customer.update({
      where: { id: customerId },
      data: input,
      select: customerSelect,
    });
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }
}