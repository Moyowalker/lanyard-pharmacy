import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database.service';

export type WorkflowNotificationEnvelope = {
  channel: 'email' | 'sms';
  recipient: string;
  template: string;
  provider: string;
};

export type WorkflowEventPayload = {
  notification?: WorkflowNotificationEnvelope | null;
  data?: Record<string, unknown>;
};

export type WorkflowEventRecord = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  status: 'pending' | 'processing' | 'retrying' | 'completed' | 'failed' | 'dead_lettered';
  attempts: number;
  maxAttempts: number;
  payload: WorkflowEventPayload;
  errorMessage: string | null;
  availableAt: string;
  createdAt: string;
  updatedAt: string;
  lastAttemptedAt: string | null;
  processedAt: string | null;
  deadLetteredAt: string | null;
};

@Injectable()
export class WorkflowEventsRepository {
  constructor(private readonly database: DatabaseService) {}

  async listPending(limit = 50, client?: Prisma.TransactionClient): Promise<WorkflowEventRecord[]> {
    const events = await this.executor(client).workflowEvent.findMany({
      where: {
        status: {
          in: ['pending', 'retrying'],
        },
        availableAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        availableAt: 'asc',
      },
      take: limit,
    });

    return events.map((event) => this.mapEvent(event));
  }

  async markProcessing(eventId: string, client?: Prisma.TransactionClient): Promise<WorkflowEventRecord> {
    const event = await this.executor(client).workflowEvent.update({
      where: { id: eventId },
      data: {
        status: 'processing',
        attempts: {
          increment: 1,
        },
        errorMessage: null,
        lastAttemptedAt: new Date(),
      },
    });

    return this.mapEvent(event);
  }

  async markCompleted(eventId: string, client?: Prisma.TransactionClient): Promise<WorkflowEventRecord> {
    const event = await this.executor(client).workflowEvent.update({
      where: { id: eventId },
      data: {
        status: 'completed',
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    return this.mapEvent(event);
  }

  async markFailed(
    eventId: string,
    errorMessage: string,
    retryDelaySeconds: number,
    client?: Prisma.TransactionClient,
  ): Promise<WorkflowEventRecord> {
    const currentEvent = await this.executor(client).workflowEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    const shouldDeadLetter = currentEvent.attempts >= currentEvent.maxAttempts;
    const retryAt = new Date(Date.now() + Math.max(0, retryDelaySeconds) * 1000);
    const event = await this.executor(client).workflowEvent.update({
      where: { id: eventId },
      data: {
        status: shouldDeadLetter ? 'dead_lettered' : 'retrying',
        errorMessage: errorMessage.slice(0, 512),
        availableAt: shouldDeadLetter ? new Date() : retryAt,
        deadLetteredAt: shouldDeadLetter ? new Date() : null,
        processedAt: shouldDeadLetter ? new Date() : null,
      },
    });

    return this.mapEvent(event);
  }

  private executor(client?: Prisma.TransactionClient) {
    return client ?? this.database;
  }

  private mapEvent(event: {
    id: string;
    eventType: string;
    entityType: string;
    entityId: string;
    status: WorkflowEventRecord['status'];
    attempts: number;
    maxAttempts: number;
    payload: Prisma.JsonValue;
    errorMessage: string | null;
    availableAt: Date;
    createdAt: Date;
    updatedAt: Date;
    lastAttemptedAt: Date | null;
    processedAt: Date | null;
    deadLetteredAt: Date | null;
  }): WorkflowEventRecord {
    return {
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      status: event.status,
      attempts: event.attempts,
      maxAttempts: event.maxAttempts,
      payload: this.mapPayload(event.payload),
      errorMessage: event.errorMessage,
      availableAt: event.availableAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      lastAttemptedAt: event.lastAttemptedAt?.toISOString() ?? null,
      processedAt: event.processedAt?.toISOString() ?? null,
      deadLetteredAt: event.deadLetteredAt?.toISOString() ?? null,
    };
  }

  private mapPayload(value: Prisma.JsonValue): WorkflowEventPayload {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }

    const payload = value as Record<string, unknown>;
    const notification = payload.notification;
    const data = payload.data;

    return {
      notification:
        notification && typeof notification === 'object' && !Array.isArray(notification)
          ? {
              channel: ((notification as Record<string, string>).channel ?? 'email') as 'email' | 'sms',
              recipient: (notification as Record<string, string>).recipient ?? '',
              template: (notification as Record<string, string>).template ?? '',
              provider: (notification as Record<string, string>).provider ?? 'demo',
            }
          : null,
      data: data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {},
    };
  }
}