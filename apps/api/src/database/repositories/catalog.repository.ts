import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database.service';

export type CatalogProductRecord = {
  id: string;
  name: string;
  slug: string;
  requiresPrescription: boolean;
  category: string;
  dosageForm: string;
  price: number;
  branchIds: string[];
};

@Injectable()
export class CatalogRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByBranchAndIds(
    branchId: string,
    productIds: string[],
    client?: Prisma.TransactionClient,
  ): Promise<CatalogProductRecord[]> {
    if (!productIds.length) {
      return [];
    }

    const products = await this.executor(client).product.findMany({
      where: {
        id: {
          in: [...new Set(productIds)],
        },
        branchProducts: {
          some: {
            branchId,
          },
        },
      },
      include: {
        branchProducts: {
          where: {
            branchId,
          },
        },
      },
    });

    return products.map((product) => this.mapProduct(product));
  }

  async list(): Promise<CatalogProductRecord[]> {
    const products = await this.database.product.findMany({
      include: {
        branchProducts: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products.map((product) => this.mapProduct(product));
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }

  private mapProduct(product: {
    id: string;
    name: string;
    slug: string;
    requiresPrescription: boolean;
    category: string;
    dosageForm: string;
    price: number;
    branchProducts: Array<{
      branchId: string;
    }>;
  }): CatalogProductRecord {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      requiresPrescription: product.requiresPrescription,
      category: product.category,
      dosageForm: product.dosageForm,
      price: product.price,
      branchIds: product.branchProducts.map((branchProduct) => branchProduct.branchId),
    };
  }
}