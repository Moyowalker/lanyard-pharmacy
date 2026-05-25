import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../../database/database.service';
import {
  PlatformUsersRepository,
  type UpdatePlatformUserInput,
} from '../../database/repositories/platform-users.repository';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { hashPassword } from '../identity/password-hash';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly platformUsersRepository: PlatformUsersRepository,
    private readonly auditService: AuditService,
  ) {}

  listUsers() {
    return this.platformUsersRepository.list();
  }

  async createUser(input: CreatePlatformUserDto, actor: AuthenticatedUser) {
    const normalizedInput = this.normalizeCreateInput(input);

    return this.database.transaction(async (client) => {
      try {
        const user = await this.platformUsersRepository.create(
          {
            id: `usr-${randomUUID()}`,
            firstName: normalizedInput.firstName,
            lastName: normalizedInput.lastName,
            email: normalizedInput.email,
            passwordHash: hashPassword(normalizedInput.password),
            roles: normalizedInput.roles,
            branchIds: normalizedInput.branchIds,
            isActive: normalizedInput.isActive,
          },
          client,
        );

        await this.auditService.record(
          {
            actor,
            entityType: 'platform_user',
            entityId: user.id,
            action: 'created',
            payload: {
              email: user.email,
              roles: user.roles,
              branchIds: user.branchIds,
              isActive: user.isActive,
            },
          },
          client,
        );

        return user;
      } catch (error) {
        this.handlePersistenceError(error);
      }
    });
  }

  async updateUser(userId: string, input: UpdatePlatformUserDto, actor: AuthenticatedUser) {
    return this.database.transaction(async (client) => {
      const existingUser = await this.platformUsersRepository.findById(userId, client);

      if (!existingUser) {
        throw new NotFoundException(`User ${userId} was not found`);
      }

      const update = this.buildUpdateInput(input);

      if (Object.keys(update).length === 0) {
        throw new BadRequestException('User update payload is empty');
      }

      if (actor.sub === userId && update.isActive === false) {
        throw new BadRequestException('You cannot deactivate your own account');
      }

      try {
        const updatedUser = await this.platformUsersRepository.update(userId, update, client);

        await this.auditService.record(
          {
            actor,
            entityType: 'platform_user',
            entityId: updatedUser.id,
            action: 'updated',
            payload: update as Prisma.InputJsonValue,
          },
          client,
        );

        return updatedUser;
      } catch (error) {
        this.handlePersistenceError(error);
      }
    });
  }

  private normalizeCreateInput(input: CreatePlatformUserDto) {
    const roles = this.normalizeRoles(input.roles);

    if (!roles.length) {
      throw new BadRequestException('At least one role is required');
    }

    return {
      firstName: this.requireText(input.firstName, 'firstName'),
      lastName: this.requireText(input.lastName, 'lastName'),
      email: this.requireEmail(input.email),
      password: input.password,
      roles,
      branchIds: this.normalizeBranchIds(input.branchIds),
      isActive: input.isActive ?? true,
    };
  }

  private buildUpdateInput(input: UpdatePlatformUserDto): UpdatePlatformUserInput {
    const update: UpdatePlatformUserInput = {};

    if (input.firstName !== undefined) {
      update.firstName = this.requireText(input.firstName, 'firstName');
    }

    if (input.lastName !== undefined) {
      update.lastName = this.requireText(input.lastName, 'lastName');
    }

    if (input.email !== undefined) {
      update.email = this.requireEmail(input.email);
    }

    if (input.password !== undefined) {
      update.passwordHash = hashPassword(input.password);
    }

    if (input.roles !== undefined) {
      const roles = this.normalizeRoles(input.roles);
      if (!roles.length) {
        throw new BadRequestException('At least one role is required');
      }
      update.roles = roles;
    }

    if (input.branchIds !== undefined) {
      update.branchIds = this.normalizeBranchIds(input.branchIds);
    }

    if (input.isActive !== undefined) {
      update.isActive = input.isActive;
    }

    return update;
  }

  private normalizeRoles(roles: string[]) {
    return [...new Set(roles.map((role) => this.requireText(role, 'roles')))].sort((left, right) => left.localeCompare(right));
  }

  private normalizeBranchIds(branchIds: string[]) {
    return [...new Set(branchIds.map((branchId) => this.requireText(branchId, 'branchIds')))].sort((left, right) => left.localeCompare(right));
  }

  private requireText(value: string, field: string) {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException(`User ${field} cannot be empty`);
    }

    return normalizedValue;
  }

  private requireEmail(value: string) {
    return this.requireText(value, 'email').toLowerCase();
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('User email already exists');
    }

    throw error;
  }
}
