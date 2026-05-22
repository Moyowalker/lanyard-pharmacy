import { Injectable } from '@nestjs/common';
import { type PlatformMetrics } from '@lanyard/api-contracts';

type QueueSnapshot = Pick<PlatformMetrics, 'queueDepth' | 'retryBacklog' | 'deadLetterCount'>;

@Injectable()
export class OperationalMetricsService {
  private readonly startedAt = Date.now();
  private httpRequestsTotal = 0;
  private healthChecksTotal = 0;
  private workflowEventsProcessedTotal = 0;
  private workflowEventsRetriedTotal = 0;
  private workflowEventsDeadLetteredTotal = 0;
  private notificationDispatchesTotal = 0;

  recordHttpRequest() {
    this.httpRequestsTotal += 1;
  }

  recordHealthCheck() {
    this.healthChecksTotal += 1;
  }

  recordWorkflowProcessed(count = 1) {
    this.workflowEventsProcessedTotal += count;
  }

  recordWorkflowRetried(count = 1) {
    this.workflowEventsRetriedTotal += count;
  }

  recordWorkflowDeadLettered(count = 1) {
    this.workflowEventsDeadLetteredTotal += count;
  }

  recordNotificationDispatch(count = 1) {
    this.notificationDispatchesTotal += count;
  }

  snapshot(queueSnapshot: QueueSnapshot): PlatformMetrics {
    return {
      httpRequestsTotal: this.httpRequestsTotal,
      healthChecksTotal: this.healthChecksTotal,
      workflowEventsProcessedTotal: this.workflowEventsProcessedTotal,
      workflowEventsRetriedTotal: this.workflowEventsRetriedTotal,
      workflowEventsDeadLetteredTotal: this.workflowEventsDeadLetteredTotal,
      notificationDispatchesTotal: this.notificationDispatchesTotal,
      queueDepth: queueSnapshot.queueDepth,
      retryBacklog: queueSnapshot.retryBacklog,
      deadLetterCount: queueSnapshot.deadLetterCount,
    };
  }

  uptimeSeconds() {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }
}