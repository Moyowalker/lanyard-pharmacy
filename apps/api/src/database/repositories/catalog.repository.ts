import { Injectable } from '@nestjs/common';
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

  async list(): Promise<CatalogProductRecord[]> {
    const products = await this.database.product.findMany({
      include: {
        branchProducts: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      requiresPrescription: product.requiresPrescription,
      category: product.category,
      dosageForm: product.dosageForm,
      price: product.price,
      branchIds: product.branchProducts.map((branchProduct) => branchProduct.branchId),
    }));
  }
}