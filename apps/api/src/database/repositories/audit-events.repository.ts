import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database.service';

export type CreateAuditEventInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditEventsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateAuditEventInput, client?: Prisma.TransactionClient) {
    return this.executor(client).auditEvent.create({
      data: {
        id: `aud-${randomUUID()}`,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        payload: input.payload ?? {},
      },
    });
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }
}