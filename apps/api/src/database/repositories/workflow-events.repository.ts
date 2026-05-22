import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database.service';

export type CreateWorkflowEventInput = {
  eventType: string;
  entityType: string;
  entityId: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class WorkflowEventsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateWorkflowEventInput, client?: Prisma.TransactionClient) {
    return this.executor(client).workflowEvent.create({
      data: {
        id: `evt-${randomUUID()}`,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload ?? {},
      },
    });
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }
}