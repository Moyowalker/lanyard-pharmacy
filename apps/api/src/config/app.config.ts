export function parseCorsOrigin(value?: string) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || normalizedValue === '*') {
    return '*';
  }

  const origins = Array.from(
    new Set(
      normalizedValue
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean),
    ),
  );

  if (origins.length === 0) {
    return '*';
  }

  return origins.length === 1 ? origins[0] : origins;
}

export const appConfig = () => ({
  app: {
    port: Number.parseInt(process.env.PORT ?? '4000', 10),
    environment: process.env.NODE_ENV ?? 'development',
    corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
    accessTokenTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  },
  database: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/lanyard_pharmacy',
  },
});