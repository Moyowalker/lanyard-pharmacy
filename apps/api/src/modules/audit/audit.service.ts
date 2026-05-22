import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditEventsRepository } from '../../database/repositories/audit-events.repository';

type AuditActor = {
  sub?: string;
  email?: string;
} | null | undefined;

export type RecordAuditEventInput = {
  actor?: AuditActor;
  entityType: string;
  entityId: string;
  action: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly auditEventsRepository: AuditEventsRepository) {}

  async record(input: RecordAuditEventInput, client?: Prisma.TransactionClient) {
    return this.auditEventsRepository.create(
      {
        actorId: input.actor?.sub ?? null,
        actorEmail: input.actor?.email ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        payload: input.payload,
      },
      client,
    );
  }
}