import type { OrderStatus, PlatformHealth, PlatformRole, PrescriptionStatus } from './index.js';

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

export type BranchSummary = {
  id: string;
  name: string;
  city: string;
  supportsDelivery: boolean;
};

export type CustomerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  refillReminderOptIn: boolean;
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

export type CreateCatalogProductRequest = {
  name: string;
  slug?: string;
  category: string;
  dosageForm: string;
  price: number;
  requiresPrescription?: boolean;
  branchIds: string[];
};

export type CartLineInput = {
  productId: string;
  quantity: number;
};

export type CartRequest = {
  customerId: string;
  branchId: string;
  items: CartLineInput[];
};

export type CartSummaryItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  requiresPrescription: boolean;
  availableQuantity: number;
};

export type CartSummary = {
  customerId: string;
  customerEmail: string;
  branchId: string;
  itemCount: number;
  total: number;
  containsPrescriptionItems: boolean;
  nextOrderStatus: string;
  items: CartSummaryItem[];
};

export type CheckoutOrder = {
  id: string;
  customerId: string;
  status: string;
  branchId: string;
  total: number;
  containsPrescriptionItems: boolean;
  createdAt: string;
  items: Array<{
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  inventoryReservations: Array<{
    id: string;
    orderId: string;
    inventoryBatchId: string;
    productId: string;
    quantity: number;
  }>;
};

export type CheckoutResponse = {
  order: CheckoutOrder;
  cart: CartSummary;
};

export type CustomerOrderSummary = {
  id: string;
  customerId: string;
  status: OrderStatus;
  branchId: string;
  total: number;
  containsPrescriptionItems: boolean;
  createdAt: string;
};

export type CustomerPrescriptionSummary = {
  id: string;
  customerId: string;
  orderId: string | null;
  status: PrescriptionStatus;
  reviewedBy: string | null;
  uploadedAt: string;
  orderBranchId: string | null;
  orderStatus: OrderStatus | null;
};

export type SubmitPrescriptionRequest = {
  customerId: string;
  orderId?: string;
};

export type SubmitPrescriptionResponse = {
  prescription: CustomerPrescriptionSummary;
  order: CheckoutOrder | null;
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

export type InventoryBatchRecord = {
  id: string;
  branchId: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  batchCode: string;
  expiryDate: string;
};

export type LowStockAlertRecord = {
  id: string;
  branchId: string;
  productId: string;
  threshold: number;
  availableQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type AdjustInventoryBatchRequest = {
  quantityDelta: number;
  reason: string;
};

export type AuditEventRecord = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId: string;
  action: string;
  payload: unknown;
  createdAt: string;
};

export type NotificationDeliveryAttemptRecord = {
  id: string;
  workflowEventId: string;
  channel: string;
  recipient: string;
  template: string;
  provider: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type WorkflowEventRecord = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  payload: unknown;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
  deadLetteredAt: string | null;
  notificationAttempts: NotificationDeliveryAttemptRecord[];
};

export type AdminPrescriptionRecord = {
  id: string;
  customerId: string;
  orderId: string | null;
  status: PrescriptionStatus;
  reviewedBy: string | null;
  uploadedAt: string;
  orderBranchId?: string | null;
  orderStatus?: OrderStatus | null;
};

export type UpdateOrderStatusRequest = {
  status: OrderStatus;
};

export type PlatformUserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: PlatformRole[];
  branchIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlatformUserRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: PlatformRole[];
  branchIds: string[];
  isActive?: boolean;
};

export type UpdatePlatformUserRequest = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  roles?: PlatformRole[];
  branchIds?: string[];
  isActive?: boolean;
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

function inferRenderApiBaseUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  const { hostname, protocol } = window.location;

  if (!hostname.endsWith('.onrender.com')) {
    return null;
  }

  const serviceName = hostname.replace(/\.onrender\.com$/i, '');
  const inferredServiceName = serviceName
    .replace(/-admin$/i, '-api')
    .replace(/-web$/i, '-api');

  if (inferredServiceName === serviceName) {
    return null;
  }

  return `${protocol}//${inferredServiceName}.onrender.com`;
}

function normalizeApiBaseUrl(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function resolveApiBaseUrl(value?: string) {
  const configuredValue = normalizeApiBaseUrl(
    value ?? (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : undefined),
  );
  const browserFallback = inferRenderApiBaseUrl();

  return (configuredValue ?? browserFallback ?? 'http://localhost:4000').replace(/\/$/, '');
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
    getCustomerProfile: () => request<CustomerProfile>('/api/v1/customers/me'),
    getApiHealth: () => request<PlatformHealth>('/api/v1/health'),
    getWorkerHealth: () => request<PlatformHealth>('/health'),
    listBranches: () => request<BranchSummary[]>('/api/v1/branches'),
    listCatalogProducts: () => request<CatalogProduct[]>('/api/v1/catalog/products'),
    listCustomers: () => request<CustomerProfile[]>('/api/v1/customers'),
    listMyOrders: () => request<CustomerOrderSummary[]>('/api/v1/orders/me'),
    getMyOrder: (orderId: string) => request<CheckoutOrder>(`/api/v1/orders/${orderId}`),
    listMyPrescriptions: () => request<CustomerPrescriptionSummary[]>('/api/v1/prescriptions/me'),
    submitPrescription: (payload: SubmitPrescriptionRequest) => request<SubmitPrescriptionResponse>('/api/v1/prescriptions', { method: 'POST', body: payload }),
    previewCart: (payload: CartRequest) => request<CartSummary>('/api/v1/orders/cart/preview', { method: 'POST', body: payload }),
    checkout: (payload: CartRequest) => request<CheckoutResponse>('/api/v1/orders/checkout', { method: 'POST', body: payload }),
    // Admin order management
    listAdminOrders: () => request<CustomerOrderSummary[]>('/api/v1/orders'),
    getAdminOrder: (orderId: string) => request<CheckoutOrder>(`/api/v1/orders/${orderId}`),
    updateOrderStatus: (orderId: string, payload: UpdateOrderStatusRequest) =>
      request<CustomerOrderSummary>(`/api/v1/orders/${orderId}/status`, { method: 'PATCH', body: payload }),
    // Admin prescription management
    listPrescriptionQueue: () => request<AdminPrescriptionRecord[]>('/api/v1/prescriptions/queue'),
    startPrescriptionReview: (prescriptionId: string) =>
      request<AdminPrescriptionRecord>(`/api/v1/prescriptions/${prescriptionId}/start-review`, { method: 'POST' }),
    reviewPrescription: (prescriptionId: string, action: 'approve' | 'reject' | 'request_clarification') =>
      request<AdminPrescriptionRecord>(`/api/v1/prescriptions/${prescriptionId}/review`, { method: 'POST', body: { action } }),
    fulfillPrescription: (prescriptionId: string) =>
      request<AdminPrescriptionRecord>(`/api/v1/prescriptions/${prescriptionId}/fulfill`, { method: 'POST' }),
    // Admin inventory management
    getBranchInventory: (branchId: string) =>
      request<InventoryBatchRecord[]>(`/api/v1/inventory/branches/${branchId}/stock`),
    listLowStockAlerts: (branchId: string) =>
      request<LowStockAlertRecord[]>(`/api/v1/inventory/branches/${branchId}/alerts`),
    adjustInventoryBatch: (batchId: string, payload: AdjustInventoryBatchRequest) =>
      request<InventoryBatchRecord>(`/api/v1/inventory/batches/${batchId}/adjust`, { method: 'PATCH', body: payload }),
    // Admin catalog management
    createCatalogProduct: (payload: CreateCatalogProductRequest) =>
      request<CatalogProduct>('/api/v1/catalog/products', { method: 'POST', body: payload }),
    setBranchProductAvailability: (productId: string, branchId: string, available: boolean) =>
      available
        ? request<void>(`/api/v1/catalog/products/${productId}/branches/${branchId}`, { method: 'PUT' })
        : request<void>(`/api/v1/catalog/products/${productId}/branches/${branchId}`, { method: 'DELETE' }),
    // Admin user management
    listPlatformUsers: () => request<PlatformUserRecord[]>('/api/v1/users'),
    createPlatformUser: (payload: CreatePlatformUserRequest) =>
      request<PlatformUserRecord>('/api/v1/users', { method: 'POST', body: payload }),
    updatePlatformUser: (userId: string, payload: UpdatePlatformUserRequest) =>
      request<PlatformUserRecord>(`/api/v1/users/${userId}`, { method: 'PATCH', body: payload }),
    // Audit & notifications
    listAuditEvents: (limit?: number) =>
      request<AuditEventRecord[]>(`/api/v1/audit/events${limit ? `?limit=${limit}` : ''}`),
    listNotificationEvents: (limit?: number) =>
      request<WorkflowEventRecord[]>(`/api/v1/audit/notifications${limit ? `?limit=${limit}` : ''}`),
  };
}