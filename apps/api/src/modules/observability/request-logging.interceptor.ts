import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { finalize, type Observable } from 'rxjs';
import { AppLogger } from './app-logger.service';
import { OperationalMetricsService } from './operational-metrics.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLogger,
    private readonly metrics: OperationalMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string; url: string; headers: Record<string, unknown> }>();
    const response = http.getResponse<{ statusCode: number; setHeader(name: string, value: string): void }>();
    const startedAt = Date.now();
    const requestId = typeof request.headers['x-request-id'] === 'string' ? request.headers['x-request-id'] : randomUUID();

    response.setHeader('x-request-id', requestId);
    this.metrics.recordHttpRequest();

    return next.handle().pipe(
      finalize(() => {
        this.logger.logEvent('log', 'http', 'request_completed', {
          requestId,
          method: request.method,
          path: request.url,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        });
      }),
    );
  }
}