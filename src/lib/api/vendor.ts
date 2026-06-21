import { fetchApi } from './client';
import type {
  AuthTokens,
  Campus,
  VendorOnboardBody,
  VendorOnboardResult,
  AvailabilityEntry,
  BatchDetail,
  BatchSummary,
  CreateAdjustmentBody,
  CreateMenuItemBody,
  ItemEnvelope,
  ListEnvelope,
  MenuItemSchedule,
  MenuMetadata,
  NotificationRecord,
  OrderDetail,
  OrderSummary,
  SettlementSummary,
  UpdateInventoryBody,
  UpdateMenuItemBody,
  UpdateVendorProfileBody,
  UpsertPayoutAccountBody,
  VendorInventory,
  VendorMenuItem,
  VendorPayoutAccount,
  VendorProfile,
  VendorReview,
} from './types';

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// fetchApi already unwraps the top-level `{ data }` envelope, so list endpoints
// return the array directly and item endpoints return the object directly.

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<AuthTokens>('/auth/vendor/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    }),
  signup: (email: string, password: string) =>
    fetchApi<AuthTokens>('/auth/vendor/signup', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    }),
  /** Exchange a refresh token for fresh tokens (e.g. after onboarding to pick up vendor_id). */
  refresh: (refreshToken: string) =>
    fetchApi<AuthTokens>('/auth/refresh', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ refreshToken }),
    }),
  logout: () => fetchApi<unknown>('/auth/logout', { method: 'POST' }).catch(() => null),
  me: () => fetchApi<unknown>('/auth/me'),
};

// --- Public campus directory (no auth) ---
export const campusesApi = {
  list: () => fetchApi<Campus[]>('/campuses', { auth: false }),
};

// --- Vendor onboarding ---
export const onboardingApi = {
  submit: (body: VendorOnboardBody) =>
    fetchApi<VendorOnboardResult>('/vendor/onboard', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// --- Query keys ---
export const qk = {
  campuses: () => ['public', 'campuses'] as const,
  orders: (filters?: Record<string, unknown>) => ['vendor', 'orders', filters ?? {}] as const,
  order: (id: string) => ['vendor', 'order', id] as const,
  menuItems: () => ['vendor', 'menu-items'] as const,
  menuItem: (id: string) => ['vendor', 'menu-item', id] as const,
  menuMetadata: () => ['vendor', 'menu-metadata'] as const,
  menuSchedules: (id: string) => ['vendor', 'menu-item', id, 'schedules'] as const,
  batches: () => ['vendor', 'batches'] as const,
  batch: (id: string) => ['vendor', 'batch', id] as const,
  inventory: (date?: string, slotId?: string) =>
    ['vendor', 'inventory', date ?? '', slotId ?? ''] as const,
  settlements: () => ['vendor', 'settlements'] as const,
  settlement: (id: string) => ['vendor', 'settlement', id] as const,
  reviews: () => ['vendor', 'reviews'] as const,
  availability: () => ['vendor', 'availability'] as const,
  notifications: () => ['vendor', 'notifications'] as const,
  profile: () => ['vendor', 'profile'] as const,
  payoutAccount: () => ['vendor', 'payout-account'] as const,
};

// --- Orders ---
export interface OrderFilters {
  status?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export const ordersApi = {
  list: (filters: OrderFilters = {}) =>
    fetchApi<OrderSummary[]>(`/vendor/orders${qs({ ...filters })}`),
  get: (id: string) => fetchApi<OrderDetail>(`/vendor/orders/${id}`),
  accept: (id: string) => fetchApi<OrderDetail>(`/vendor/orders/${id}/accept`, { method: 'POST' }),
  prepare: (id: string) => fetchApi<OrderDetail>(`/vendor/orders/${id}/prepare`, { method: 'POST' }),
  preparing: (id: string) =>
    fetchApi<OrderDetail>(`/vendor/orders/${id}/preparing`, { method: 'POST' }),
  ready: (id: string) => fetchApi<OrderDetail>(`/vendor/orders/${id}/ready`, { method: 'POST' }),
};

// --- Menu ---
export const menuApi = {
  list: () => fetchApi<VendorMenuItem[]>('/vendor/menu-items'),
  get: (id: string) => fetchApi<VendorMenuItem>(`/vendor/menu-items/${id}`),
  metadata: () => fetchApi<MenuMetadata>('/vendor/menu-metadata'),
  create: (body: CreateMenuItemBody) =>
    fetchApi<VendorMenuItem>('/vendor/menu-items', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: UpdateMenuItemBody) =>
    fetchApi<VendorMenuItem>(`/vendor/menu-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  activate: (id: string) =>
    fetchApi<VendorMenuItem>(`/vendor/menu-items/${id}/activate`, { method: 'POST' }),
  deactivate: (id: string) =>
    fetchApi<VendorMenuItem>(`/vendor/menu-items/${id}/deactivate`, { method: 'POST' }),
  listSchedules: (id: string) =>
    fetchApi<MenuItemSchedule[]>(`/vendor/menu-items/${id}/schedules`),
  replaceSchedules: (id: string, entries: MenuItemSchedule[]) =>
    fetchApi<MenuItemSchedule[]>(`/vendor/menu-items/${id}/schedules`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    }),
};

// --- Batches ---
export const batchesApi = {
  list: () => fetchApi<BatchSummary[]>('/vendor/batches'),
  get: (id: string) => fetchApi<BatchDetail>(`/vendor/batches/${id}`),
  readyForPickup: (id: string) =>
    fetchApi<BatchDetail>(`/vendor/batches/${id}/ready-for-pickup`, { method: 'POST' }),
  pickup: (id: string) => fetchApi<BatchDetail>(`/vendor/batches/${id}/pickup`, { method: 'POST' }),
};

// --- Inventory ---
export const inventoryApi = {
  list: (date?: string, slotId?: string) =>
    fetchApi<VendorInventory[]>(`/vendor/inventory${qs({ date, slotId })}`),
  update: (inventoryId: string, body: UpdateInventoryBody) =>
    fetchApi<VendorInventory>(`/vendor/inventory/${inventoryId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  adjust: (inventoryId: string, body: CreateAdjustmentBody) =>
    fetchApi<VendorInventory>(`/vendor/inventory/${inventoryId}/adjustments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// --- Settlements (read-only for vendors) ---
export const settlementsApi = {
  list: () => fetchApi<SettlementSummary[]>('/vendor/settlements'),
  get: (id: string) => fetchApi<SettlementSummary>(`/vendor/settlements/${id}`),
};

// --- Reviews ---
export const reviewsApi = {
  list: () => fetchApi<VendorReview[]>('/vendor/reviews'),
};

// --- Availability ---
export const availabilityApi = {
  list: () => fetchApi<AvailabilityEntry[]>('/vendor/availability'),
  replace: (entries: AvailabilityEntry[]) =>
    fetchApi<AvailabilityEntry[]>('/vendor/availability', {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    }),
};

// --- Notifications ---
export const notificationsApi = {
  list: () => fetchApi<NotificationRecord[]>('/notifications'),
  markRead: (id: string) =>
    fetchApi<unknown>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => fetchApi<unknown>('/notifications/read-all', { method: 'POST' }),
};

// --- Profile ---
export const profileApi = {
  get: () => fetchApi<VendorProfile>('/vendor/profile'),
  update: (body: UpdateVendorProfileBody) =>
    fetchApi<VendorProfile>('/vendor/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  getPayoutAccount: () =>
    fetchApi<VendorPayoutAccount | null>('/vendor/payout-account').catch(() => null),
  updatePayoutAccount: (body: UpsertPayoutAccountBody) =>
    fetchApi<VendorPayoutAccount>('/vendor/payout-account', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};

// Re-export envelope helpers for any direct callers.
export type { ListEnvelope, ItemEnvelope };
