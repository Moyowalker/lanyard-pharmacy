import { Injectable } from '@nestjs/common';
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
}