import { Injectable } from '@nestjs/common';
import { type PlatformHealth, type PlatformHealthAlert } from '@lanyard/api-contracts';
import { DatabaseService } from '../../database/database.service';
import { AppLogger } from '../observability/app-logger.service';
import { OperationalMetricsService } from '../observability/operational-metrics.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly metrics: OperationalMetricsService,
    private readonly logger: AppLogger,
  ) {}

  async getHealth(): Promise<PlatformHealth> {
    this.metrics.recordHealthCheck();

    const queueSnapshot = await this.getQueueSnapshot();
    const alerts = this.buildAlerts(queueSnapshot.retryBacklog, queueSnapshot.deadLetterCount);
    const health: PlatformHealth = {
      service: 'worker',
      status: queueSnapshot.deadLetterCount > 0 ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: this.metrics.uptimeSeconds(),
      metrics: this.metrics.snapshot(queueSnapshot),
      alerts,
    };

    this.logger.logEvent('log', 'health', 'health_checked', {
      service: health.service,
      status: health.status,
      alerts: health.alerts.length,
    });

    return health;
  }

  private async getQueueSnapshot() {
    if (process.env.SKIP_DB_CONNECT === 'true') {
      return {
        queueDepth: 0,
        retryBacklog: 0,
        deadLetterCount: 0,
      };
    }

    const [queueDepth, retryBacklog, deadLetterCount] = await Promise.all([
      this.database.workflowEvent.count({
        where: {
          status: {
            in: ['pending', 'processing', 'retrying'],
          },
        },
      }),
      this.database.workflowEvent.count({
        where: {
          status: 'retrying',
        },
      }),
      this.database.workflowEvent.count({
        where: {
          status: 'dead_lettered',
        },
      }),
    ]);

    return {
      queueDepth,
      retryBacklog,
      deadLetterCount,
    };
  }

  private buildAlerts(retryBacklog: number, deadLetterCount: number): PlatformHealthAlert[] {
    const alerts: PlatformHealthAlert[] = [];

    if (retryBacklog > 0) {
      alerts.push({
        code: 'workflow_retry_backlog',
        severity: 'warning',
        count: retryBacklog,
        message: `${retryBacklog} workflow event${retryBacklog === 1 ? ' is' : 's are'} queued for retry.`,
      });
    }

    if (deadLetterCount > 0) {
      alerts.push({
        code: 'workflow_dead_letters_present',
        severity: 'critical',
        count: deadLetterCount,
        message: `${deadLetterCount} workflow event${deadLetterCount === 1 ? ' requires' : 's require'} manual intervention.`,
      });
    }

    return alerts;
  }
}