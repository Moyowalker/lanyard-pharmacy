import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { CatalogRepository } from '../../database/repositories/catalog.repository';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly database: DatabaseService,
    private readonly catalogRepository: CatalogRepository,
    private readonly auditService: AuditService,
  ) {}

  listProducts() {
    return this.catalogRepository.list();
  }

  addProductToBranch(productId: string, branchId: string) {
    return this.catalogRepository.addBranchProduct(productId, branchId);
  }

  removeProductFromBranch(productId: string, branchId: string) {
    return this.catalogRepository.removeBranchProduct(productId, branchId);
  }

  async createProduct(input: CreateCatalogProductDto, actor: AuthenticatedUser) {
    const normalizedInput = await this.normalizeCreateInput(input);

    return this.database.transaction(async (client) => {
      try {
        const product = await this.catalogRepository.create(
          {
            id: `prod-${randomUUID()}`,
            name: normalizedInput.name,
            slug: normalizedInput.slug,
            category: normalizedInput.category,
            dosageForm: normalizedInput.dosageForm,
            price: normalizedInput.price,
            requiresPrescription: normalizedInput.requiresPrescription,
            branchIds: normalizedInput.branchIds,
          },
          client,
        );

        await this.auditService.record(
          {
            actor,
            entityType: 'product',
            entityId: product.id,
            action: 'created',
            payload: {
              slug: product.slug,
              category: product.category,
              dosageForm: product.dosageForm,
              price: product.price,
              requiresPrescription: product.requiresPrescription,
              branchIds: product.branchIds,
            },
          },
          client,
        );

        return product;
      } catch (error) {
        this.handlePersistenceError(error);
      }
    });
  }

  private async normalizeCreateInput(input: CreateCatalogProductDto) {
    const name = this.requireText(input.name, 'name');
    const category = this.requireText(input.category, 'category');
    const dosageForm = this.requireText(input.dosageForm, 'dosageForm');
    const branchIds = [...new Set(input.branchIds.map((branchId) => this.requireText(branchId, 'branchIds')))]
      .sort((left, right) => left.localeCompare(right));

    if (branchIds.length === 0) {
      const configuredBranchCount = await this.database.branch.count();

      if (configuredBranchCount > 0) {
        throw new BadRequestException('Catalog product must be assigned to at least one branch');
      }
    }

    return {
      name,
      category,
      dosageForm,
      price: input.price,
      requiresPrescription: input.requiresPrescription ?? false,
      branchIds,
      slug: this.resolveSlug(input.slug, name),
    };
  }

  private resolveSlug(value: string | undefined, fallbackName: string) {
    const source = value?.trim().length ? value : fallbackName;
    const normalizedSlug = source
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalizedSlug) {
      throw new BadRequestException('Catalog product slug must include letters or numbers');
    }

    return normalizedSlug;
  }

  private requireText(value: string, field: string) {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException(`Catalog product ${field} cannot be empty`);
    }

    return normalizedValue;
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Catalog product slug already exists');
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new BadRequestException('One or more selected branches were not found');
    }

    throw error;
  }
}