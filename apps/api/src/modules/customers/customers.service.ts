import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../../database/database.service';
import {
  CustomersRepository,
  type UpdateCustomerInput,
} from '../../database/repositories/customers.repository';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly customersRepository: CustomersRepository,
    private readonly auditService: AuditService,
  ) {}

  listCustomers() {
    return this.customersRepository.list();
  }

  async getCustomerProfile(actor: AuthenticatedUser) {
    const customer = await this.customersRepository.findById(actor.sub);

    if (!customer) {
      throw new NotFoundException(`Customer ${actor.sub} was not found`);
    }

    return customer;
  }

  async createCustomer(input: CreateCustomerDto, actor: AuthenticatedUser) {
    const normalizedInput = this.normalizeCreateInput(input);

    return this.database.transaction(async (client) => {
      try {
        const customer = await this.customersRepository.create(
          {
            id: `cust-${randomUUID()}`,
            firstName: normalizedInput.firstName,
            lastName: normalizedInput.lastName,
            email: normalizedInput.email,
            phone: normalizedInput.phone,
            refillReminderOptIn: normalizedInput.refillReminderOptIn ?? false,
          },
          client,
        );

        await this.auditService.record(
          {
            actor,
            entityType: 'customer',
            entityId: customer.id,
            action: 'created',
            payload: {
              email: customer.email,
              phone: customer.phone,
              refillReminderOptIn: customer.refillReminderOptIn,
            },
          },
          client,
        );

        return customer;
      } catch (error) {
        this.handlePersistenceError(error);
      }
    });
  }

  async updateCustomer(customerId: string, input: UpdateCustomerDto, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const customer = await this.customersRepository.findById(customerId, client);

      if (!customer) {
        throw new NotFoundException(`Customer ${customerId} was not found`);
      }

      const update = this.buildUpdateInput(input);
      if (Object.keys(update).length === 0) {
        throw new BadRequestException('Customer update payload is empty');
      }

      try {
        const updatedCustomer = await this.customersRepository.update(customerId, update, client);

        await this.auditService.record(
          {
            actor,
            entityType: 'customer',
            entityId: updatedCustomer.id,
            action: 'updated',
            payload: update as Prisma.InputJsonValue,
          },
          client,
        );

        return updatedCustomer;
      } catch (error) {
        this.handlePersistenceError(error);
      }
    });
  }

  private buildUpdateInput(input: UpdateCustomerDto): UpdateCustomerInput {
    const update: UpdateCustomerInput = {};

    if (input.firstName !== undefined) {
      update.firstName = this.requireText(input.firstName, 'firstName');
    }

    if (input.lastName !== undefined) {
      update.lastName = this.requireText(input.lastName, 'lastName');
    }

    if (input.email !== undefined) {
      update.email = this.requireEmail(input.email);
    }

    if (input.phone !== undefined) {
      update.phone = this.requireText(input.phone, 'phone');
    }

    if (input.refillReminderOptIn !== undefined) {
      update.refillReminderOptIn = input.refillReminderOptIn;
    }

    return update;
  }

  private normalizeCreateInput(input: CreateCustomerDto) {
    return {
      firstName: this.requireText(input.firstName, 'firstName'),
      lastName: this.requireText(input.lastName, 'lastName'),
      email: this.requireEmail(input.email),
      phone: this.requireText(input.phone, 'phone'),
      refillReminderOptIn: input.refillReminderOptIn,
    };
  }

  private requireText(value: string, field: string) {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException(`Customer ${field} cannot be empty`);
    }

    return normalizedValue;
  }

  private requireEmail(value: string) {
    return this.requireText(value, 'email').toLowerCase();
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'email or phone';
      throw new ConflictException(`Customer ${target} already exists`);
    }

    throw error;
  }
}