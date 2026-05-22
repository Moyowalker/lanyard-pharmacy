import type { PlatformHealth, PlatformRole } from './index';

export type AuthenticatedPlatformUser = {
  sub: string;
  email: string;
  roles: PlatformRole[];
  branchIds: string[];
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedPlatformUser;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  requiresPrescription: boolean;
  category: string;
  dosageForm: string;
  price: number;
  branchIds: string[];
};

export type PlatformSession = {
  accessToken: string;
  user: AuthenticatedPlatformUser;
  storedAt: string;
};

export type ApiClientResponseLike = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

export type ApiClientFetch = (input: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}) => Promise<ApiClientResponseLike>;

export type PlatformApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: ApiClientFetch;
  getAccessToken?: () => string | null | undefined;
  onUnauthorized?: () => void;
};

export const PLATFORM_SESSION_STORAGE_KEY = 'lanyard.platform.session';

export function resolveApiBaseUrl(value?: string) {
  const configuredValue = value ?? (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : undefined);

  return (configuredValue ?? 'http://localhost:4000').replace(/\/$/, '');
}

export function createPlatformSession(loginResponse: LoginResponse, storedAt = new Date().toISOString()): PlatformSession {
  return {
    accessToken: loginResponse.accessToken,
    user: loginResponse.user,
    storedAt,
  };
}

export function serializePlatformSession(session: PlatformSession) {
  return JSON.stringify(session);
}

export function parsePlatformSession(value: string | null | undefined): PlatformSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PlatformSession>;

    if (!parsed.accessToken || !parsed.user || !parsed.storedAt) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      storedAt: parsed.storedAt,
      user: {
        sub: parsed.user.sub ?? '',
        email: parsed.user.email ?? '',
        roles: Array.isArray(parsed.user.roles) ? parsed.user.roles : [],
        branchIds: Array.isArray(parsed.user.branchIds) ? parsed.user.branchIds : [],
      },
    };
  } catch {
    return null;
  }
}

export function buildAuthorizationHeaders(accessToken?: string | null, headers: Record<string, string> = {}) {
  if (!accessToken) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`,
  };
}

export function createPlatformApiClient(options: PlatformApiClientOptions = {}) {
  const baseUrl = resolveApiBaseUrl(options.baseUrl);

  const request = async <T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
    const fetchImpl = options.fetchImpl ?? ((globalThis.fetch as unknown) as ApiClientFetch | undefined);

    if (!fetchImpl) {
      throw new Error('No fetch implementation is available for PlatformApiClient.');
    }

    const accessToken = options.getAccessToken?.();
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthorizationHeaders(accessToken, init.headers ?? {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        options.onUnauthorized?.();
      }

      throw new Error(await response.text());
    }

    return (await response.json()) as T;
  };

  return {
    baseUrl,
    login: (payload: LoginRequest) => request<LoginResponse>('/api/v1/auth/login', { method: 'POST', body: payload }),
    getProfile: () => request<AuthenticatedPlatformUser>('/api/v1/auth/me'),
    getApiHealth: () => request<PlatformHealth>('/api/v1/health'),
    getWorkerHealth: () => request<PlatformHealth>('/health'),
    listCatalogProducts: () => request<CatalogProduct[]>('/api/v1/catalog/products'),
  };
}