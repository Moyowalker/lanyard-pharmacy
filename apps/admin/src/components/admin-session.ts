import {
  createPlatformApiClient,
  parsePlatformSession,
  resolveApiBaseUrl,
  type PlatformSession,
} from '@lanyard/api-contracts/client';

export const ADMIN_SESSION_KEY = 'lanyard.admin.session';
export const ADMIN_BRANCH_KEY = 'lanyard.admin.branch';

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function readAdminSession(): PlatformSession | null {
  return parsePlatformSession(readLocalStorage(ADMIN_SESSION_KEY));
}

export function readAdminBranchId(): string | null {
  return readLocalStorage(ADMIN_BRANCH_KEY);
}

export function persistAdminBranchId(branchId: string): void {
  writeLocalStorage(ADMIN_BRANCH_KEY, branchId);
}

export function createAdminApiClient(session: PlatformSession | null) {
  return createPlatformApiClient({
    baseUrl: resolveApiBaseUrl(),
    getAccessToken: () => session?.accessToken ?? null,
  });
}
