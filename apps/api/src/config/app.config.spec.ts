import { appConfig, parseCorsOrigin } from './app.config';

describe('appConfig', () => {
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  afterEach(() => {
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
      return;
    }

    process.env.CORS_ORIGIN = originalCorsOrigin;
  });

  it('keeps wildcard CORS when no origin is configured', () => {
    delete process.env.CORS_ORIGIN;

    expect(appConfig().app.corsOrigin).toBe('*');
  });

  it('parses comma-separated deployed origins for multiple frontends', () => {
    process.env.CORS_ORIGIN = ' https://lanyard-pharmacy-web.onrender.com/ , https://lanyard-pharmacy-admin.onrender.com ';

    expect(appConfig().app.corsOrigin).toEqual([
      'https://lanyard-pharmacy-web.onrender.com',
      'https://lanyard-pharmacy-admin.onrender.com',
    ]);
  });
});

describe('parseCorsOrigin', () => {
  it('deduplicates repeated origins after normalization', () => {
    expect(
      parseCorsOrigin('https://lanyard-pharmacy-web.onrender.com/, https://lanyard-pharmacy-web.onrender.com'),
    ).toBe('https://lanyard-pharmacy-web.onrender.com');
  });
});