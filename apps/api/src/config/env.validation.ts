import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('change-me-in-production'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/lanyard_pharmacy'),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }

  return result.data;
}