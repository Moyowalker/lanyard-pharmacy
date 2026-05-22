import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppLogger } from './app-logger.service';
import { OperationalMetricsService } from './operational-metrics.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

@Global()
@Module({
  providers: [
    AppLogger,
    OperationalMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
  exports: [AppLogger, OperationalMetricsService],
})
export class ObservabilityModule {}