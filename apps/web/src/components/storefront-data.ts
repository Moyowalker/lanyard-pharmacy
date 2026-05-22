import { createPlatformSession, type BranchSummary, type CatalogProduct, type LoginRequest, type PlatformSession } from '@lanyard/api-contracts/client';
import {
  PLATFORM_SESSION_STORAGE_KEY,
  createPlatformApiClient,
  parsePlatformSession,
  resolveApiBaseUrl,
  serializePlatformSession,
} from '@lanyard/api-contracts/client';

export type ServiceMode = 'pickup' | 'delivery';

export type BranchPlanner = {
  branchId: string;
  serviceMode: ServiceMode;
  deliveryArea: string;
  basketIntent: string;
};

export type StorefrontCartItem = {
  productId: string;
  quantity: number;
};

export const STOREFRONT_CART_STORAGE_KEY = 'lanyard.storefront.cart';
export const STOREFRONT_PLANNER_STORAGE_KEY = 'lanyard.storefront.planner';
export const DEMO_STOREFRONT_CUSTOMER_ID = 'cust-100';
export const DEMO_STOREFRONT_LOGIN: LoginRequest = {
  email: 'ada@example.com',
  password: 'Customer123!',
};

export const fallbackBranches: BranchSummary[] = [
  {
    id: 'branch-main',
    name: 'Main Branch',
    city: 'Lagos',
    supportsDelivery: true,
  },
  {
    id: 'branch-airport',
    name: 'Airport Branch',
    city: 'Lagos',
    supportsDelivery: true,
  },
];

export const fallbackCatalogProducts: CatalogProduct[] = [
  {
    id: 'prod-panadol-extra',
    name: 'Panadol Extra',
    slug: 'panadol-extra',
    requiresPrescription: false,
    category: 'Pain Relief',
    dosageForm: 'tablet',
    price: 4500,
    branchIds: ['branch-main', 'branch-airport'],
  },
  {
    id: 'prod-amoxicillin-500',
    name: 'Amoxicillin 500mg',
    slug: 'amoxicillin-500mg',
    requiresPrescription: true,
    category: 'Antibiotics',
    dosageForm: 'capsule',
    price: 8200,
    branchIds: ['branch-main'],
  },
];

export const DEFAULT_PLANNER: BranchPlanner = {
  branchId: fallbackBranches[0]?.id ?? '',
  serviceMode: 'pickup',
  deliveryArea: '',
  basketIntent: '',
};

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export function createStorefrontClient(accessToken?: string | null, onUnauthorized?: () => void) {
  return createPlatformApiClient({
    baseUrl: resolveApiBaseUrl(),
    getAccessToken: () => accessToken ?? null,
    onUnauthorized,
  });
}

export async function getOrCreateDemoCustomerSession() {
  const storedSession = readStoredSession();

  if (storedSession?.user.roles.includes('customer')) {
    return storedSession;
  }

  const loginResponse = await createStorefrontClient().login(DEMO_STOREFRONT_LOGIN);
  const session = createPlatformSession(loginResponse);
  persistSession(session);

  return session;
}

export function formatPrice(value: number) {
  return currencyFormatter.format(value);
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function readStoredPlanner(): BranchPlanner | null {
  const value = safeLocalStorageGet(STOREFRONT_PLANNER_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<BranchPlanner>;

    return {
      branchId: typeof parsed.branchId === 'string' ? parsed.branchId : DEFAULT_PLANNER.branchId,
      serviceMode: parsed.serviceMode === 'delivery' ? 'delivery' : 'pickup',
      deliveryArea: typeof parsed.deliveryArea === 'string' ? parsed.deliveryArea : '',
      basketIntent: typeof parsed.basketIntent === 'string' ? parsed.basketIntent : '',
    };
  } catch {
    return null;
  }
}

export function persistPlanner(planner: BranchPlanner) {
  safeLocalStorageSet(STOREFRONT_PLANNER_STORAGE_KEY, JSON.stringify(planner));
}

export function readStoredCart(): StorefrontCartItem[] {
  const value = safeLocalStorageGet(STOREFRONT_CART_STORAGE_KEY);

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Array<Partial<StorefrontCartItem>>;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => typeof item.productId === 'string' && typeof item.quantity === 'number' && item.quantity > 0)
      .map((item) => ({
        productId: item.productId as string,
        quantity: Math.floor(item.quantity as number),
      }));
  } catch {
    return [];
  }
}

export function persistCart(items: StorefrontCartItem[]) {
  safeLocalStorageSet(STOREFRONT_CART_STORAGE_KEY, JSON.stringify(items));
}

export function readStoredSession(): PlatformSession | null {
  return parsePlatformSession(safeLocalStorageGet(PLATFORM_SESSION_STORAGE_KEY));
}

export function persistSession(session: PlatformSession) {
  safeLocalStorageSet(PLATFORM_SESSION_STORAGE_KEY, serializePlatformSession(session));
}

export function clearStoredSession() {
  safeLocalStorageRemove(PLATFORM_SESSION_STORAGE_KEY);
}

function safeLocalStorageGet(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in private or restricted browser contexts.
  }
}

function safeLocalStorageRemove(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures in private or restricted browser contexts.
  }
}