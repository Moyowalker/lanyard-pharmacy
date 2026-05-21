import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { DeliveryDispatchMode, DeliveryStatus } from '../../modules/delivery/dto/delivery-types';
import { DatabaseService } from '../database.service';

export type DeliveryJobRecord = {
  id: string;
  orderId: string;
  dispatchMode: DeliveryDispatchMode;
  status: DeliveryStatus;
  assignedTo: string;
  assignedBy: string;
  trackingReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDeliveryJobInput = {
  id: string;
  orderId: string;
  dispatchMode: DeliveryDispatchMode;
  status: DeliveryStatus;
  assignedTo: string;
  assignedBy: string;
  trackingReference?: string;
};

@Injectable()
export class DeliveryJobsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateDeliveryJobInput, client?: Prisma.TransactionClient): Promise<DeliveryJobRecord> {
    const job = await this.executor(client).deliveryJob.create({
      data: {
        id: input.id,
        orderId: input.orderId,
        dispatchMode: input.dispatchMode,
        status: input.status,
        assignedTo: input.assignedTo,
        assignedBy: input.assignedBy,
        trackingReference: input.trackingReference,
      },
    });

    return this.mapJob(job);
  }

  async findById(deliveryJobId: string, client?: Prisma.TransactionClient): Promise<DeliveryJobRecord | null> {
    const job = await this.executor(client).deliveryJob.findUnique({
      where: { id: deliveryJobId },
    });

    return job ? this.mapJob(job) : null;
  }

  async findByOrderId(orderId: string, client?: Prisma.TransactionClient): Promise<DeliveryJobRecord | null> {
    const job = await this.executor(client).deliveryJob.findUnique({
      where: { orderId },
    });

    return job ? this.mapJob(job) : null;
  }

  async updateStatus(
    deliveryJobId: string,
    status: DeliveryStatus,
    client?: Prisma.TransactionClient,
  ): Promise<DeliveryJobRecord> {
    const job = await this.executor(client).deliveryJob.update({
      where: { id: deliveryJobId },
      data: { status },
    });

    return this.mapJob(job);
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }

  private mapJob(job: {
    id: string;
    orderId: string;
    dispatchMode: DeliveryDispatchMode;
    status: DeliveryStatus;
    assignedTo: string;
    assignedBy: string;
    trackingReference: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): DeliveryJobRecord {
    return {
      id: job.id,
      orderId: job.orderId,
      dispatchMode: job.dispatchMode,
      status: job.status,
      assignedTo: job.assignedTo,
      assignedBy: job.assignedBy,
      trackingReference: job.trackingReference,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}