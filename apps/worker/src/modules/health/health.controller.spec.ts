import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const healthPayload = {
    service: 'worker' as const,
    status: 'ok' as const,
    timestamp: '2026-05-22T00:00:00.000Z',
    uptimeSeconds: 12,
    metrics: {
      httpRequestsTotal: 1,
      healthChecksTotal: 1,
      workflowEventsProcessedTotal: 0,
      workflowEventsRetriedTotal: 0,
      workflowEventsDeadLetteredTotal: 0,
      notificationDispatchesTotal: 0,
      queueDepth: 0,
      retryBacklog: 0,
      deadLetterCount: 0,
    },
    alerts: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getHealth: jest.fn().mockResolvedValue(healthPayload),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns the worker health payload', async () => {
    await expect(controller.getHealth()).resolves.toEqual(healthPayload);
  });
});