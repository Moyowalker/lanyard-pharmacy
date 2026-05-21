import { Injectable } from '@nestjs/common';
import { CustomersRepository } from '../../database/repositories/customers.repository';

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  listCustomers() {
    return this.customersRepository.list();
  }
}