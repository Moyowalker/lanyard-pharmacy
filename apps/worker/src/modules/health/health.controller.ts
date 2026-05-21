import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: 'worker' as const,
      status: 'ok' as const,
    };
  }
}