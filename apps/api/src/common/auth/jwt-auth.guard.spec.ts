import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const jwtSecret = 'test-secret-that-is-long-enough';

  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: jwtSecret,
        }),
      ],
      providers: [
        JwtAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(jwtSecret),
          },
        },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
    jwtService = module.get(JwtService);
  });

  function createExecutionContext(authorization?: string) {
    const request = {
      headers: authorization ? { authorization } : {},
    } as {
      headers: Record<string, string>;
      user?: {
        sub: string;
        email: string;
        roles: string[];
        branchIds: string[];
      };
    };

    return {
      context: {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext,
      request,
    };
  }

  it('attaches the authenticated user for a valid bearer token', () => {
    const token = jwtService.sign({
      sub: 'cust-100',
      email: 'ada@example.com',
      roles: ['customer'],
      branchIds: [],
    });
    const { context, request } = createExecutionContext(`Bearer ${token}`);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toMatchObject({
      sub: 'cust-100',
      email: 'ada@example.com',
      roles: ['customer'],
      branchIds: [],
    });
  });

  it('throws UnauthorizedException for an expired bearer token', () => {
    const token = jwtService.sign(
      {
        sub: 'cust-100',
        email: 'ada@example.com',
        roles: ['customer'],
        branchIds: [],
      },
      { expiresIn: -1 },
    );
    const { context } = createExecutionContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});