import { Injectable, type LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'verbose';

@Injectable()
export class AppLogger implements LoggerService {
  log(message: unknown, context?: string) {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace ? { trace } : undefined, process.stderr);
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('verbose', message, context);
  }

  logEvent(level: LogLevel, context: string, message: string, metadata?: Record<string, unknown>) {
    this.write(level, message, context, metadata);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    metadata?: Record<string, unknown>,
    stream: NodeJS.WriteStream = process.stdout,
  ) {
    const payload = {
      timestamp: new Date().toISOString(),
      service: 'worker',
      level,
      context,
      message: this.normalizeMessage(message),
      ...(metadata ? { metadata } : {}),
    };

    stream.write(`${JSON.stringify(payload)}\n`);
  }

  private normalizeMessage(message: unknown) {
    if (typeof message === 'string') {
      return message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}