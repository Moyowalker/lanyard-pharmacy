import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { OrderStatus } from '../../modules/orders/dto/order-status';
import type { PrescriptionStatus } from '../../modules/prescriptions/dto/prescription-status';
import { DatabaseService } from '../database.service';

export type PrescriptionRecord = {
  id: string;
  customerId: string;
  orderId: string | null;
  status: PrescriptionStatus;
  reviewedBy: string | null;
  uploadedAt: string;
};

export type PrescriptionDetailRecord = PrescriptionRecord & {
  orderBranchId: string | null;
  orderStatus: OrderStatus | null;
};

type PrescriptionWithOrder = Prisma.PrescriptionGetPayload<{
  include: {
    order: true;
  };
}>;

export type CreatePrescriptionInput = {
  id: string;
  customerId: string;
  orderId?: string | null;
  status: PrescriptionStatus;
  uploadedAt: Date;
};

@Injectable()
export class PrescriptionsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(
    input: CreatePrescriptionInput,
    client?: Prisma.TransactionClient,
  ): Promise<PrescriptionDetailRecord> {
    const prescription = await this.executor(client).prescription.create({
      data: {
        id: input.id,
        customerId: input.customerId,
        orderId: input.orderId ?? null,
        status: input.status,
        uploadedAt: input.uploadedAt,
      },
      include: {
        order: true,
      },
    });

    return this.mapPrescription(prescription);
  }

  async findById(
    prescriptionId: string,
    client?: Prisma.TransactionClient,
  ): Promise<PrescriptionDetailRecord | null> {
    const prescription = await this.executor(client).prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        order: true,
      },
    });

    return prescription ? this.mapPrescription(prescription) : null;
  }

  async listQueue(): Promise<PrescriptionRecord[]> {
    const prescriptions = await this.database.prescription.findMany({
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return prescriptions.map((prescription) => ({
      id: prescription.id,
      customerId: prescription.customerId,
      orderId: prescription.orderId,
      status: prescription.status,
      reviewedBy: prescription.reviewedBy,
      uploadedAt: prescription.uploadedAt.toISOString(),
    }));
  }

  async updateStatus(
    prescriptionId: string,
    status: PrescriptionStatus,
    reviewedBy?: string,
    client?: Prisma.TransactionClient,
  ): Promise<PrescriptionDetailRecord> {
    const prescription = await this.executor(client).prescription.update({
      where: { id: prescriptionId },
      data: {
        status,
        ...(reviewedBy !== undefined ? { reviewedBy } : {}),
      },
      include: {
        order: true,
      },
    });

    return this.mapPrescription(prescription);
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }

  private mapPrescription(prescription: PrescriptionWithOrder): PrescriptionDetailRecord {
    return {
      id: prescription.id,
      customerId: prescription.customerId,
      orderId: prescription.orderId,
      status: prescription.status,
      reviewedBy: prescription.reviewedBy,
      uploadedAt: prescription.uploadedAt.toISOString(),
      orderBranchId: prescription.order?.branchId ?? null,
      orderStatus: prescription.order?.status ?? null,
    };
  }
}