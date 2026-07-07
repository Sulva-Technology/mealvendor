import { fetchApi } from './client';
import type {
  AcceptInviteBody,
  AuthTokens,
  Campus,
  VendorOnboardBody,
  VendorOnboardResult,
  AvailabilityEntry,
  ConfirmLogoBody,
  ConfirmMenuItemImageBody,
  LogoUploadTarget,
  LogoUploadUrlBody,
  BatchDetail,
  BatchSummary,
  CreateAdjustmentBody,
  CreateMenuCategoryBody,
  CreateMenuItemBody,
  MenuCategory,
  MenuItemImageUploadTarget,
  MenuItemImageUploadUrlBody,
  DeliverySlot,
  ItemEnvelope,
  ListEnvelope,
  MeSession,
  MenuItemSchedule,
  MenuMetadata,
  NotificationRecord,
  OrderDetail,
  OrderSummary,
  DeviceTokenBody,
  SettlementSummary,
  SettlementDetail,
  StoreAvailabilityState,
  SupportIssue,
  SupportIssueBody,
  UpdateInventoryBody,
  UpdateMenuItemBody,
  UpdateStoreAvailabilityBody,
  UpdateVendorProfileBody,
  CreateVendorSoupOptionBody,
  UpdateVendorSoupOptionBody,
  UpsertPayoutAccountBody,
  VendorInventory,
  VendorMenuItem,
  VendorPayoutAccount,
  VendorProfile,
  VendorReview,
  VendorSoupOption,
} from './types';

// Availability + menu-item schedule share the same write DTO: ONLY
// deliverySlotId/dayOfWeek/available (+ optional valid window) are accepted.
// GET responses include extra props (id, menuItemId); echoing them back trips
// the backend's strict validation ("property id should not exist"), so strip
// every payload down to the allowed fields before sending.
function toSlotDayEntry(e: AvailabilityEntry | MenuItemSchedule) {
  const out: {
    deliverySlotId: string;
    dayOfWeek: number;
    available: boolean;
    validFrom?: string | null;
    validUntil?: string | null;
  } = { deliverySlotId: e.deliverySlotId, dayOfWeek: e.dayOfWeek, available: e.available };
  if (e.validFrom !== undefined) out.validFrom = e.validFrom;
  if (e.validUntil !== undefined) out.validUntil = e.validUntil;
  return out;
}

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

// Where Supabase should send the vendor after they click a link in an auth email
// (confirm signup, and any future reset/resend flows). Sent to OUR backend as
// `redirectTo`; the backend forwards it to `supabase.auth.*` as `emailRedirectTo`.
// Must be allow-listed in the Supabase auth settings; otherwise Supabase falls
// back to its configured site URL. The field is optional — when omitted the
// backend uses a per-role default. Override per deploy via NEXT_PUBLIC_AUTH_REDIRECT_URL.
export const AUTH_REDIRECT_URL =
  process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || 'https://vendor.mealdirectly.com/auth/callback';

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
      body: JSON.stringify({ email, password, redirectTo: AUTH_REDIRECT_URL }),
    }),
  /**
   * Send a password-reset email. The backend (which brokers Supabase) emails a
   * recovery link that lands on /auth/callback. Body is `{email, portal}` only —
   * `portal: 'vendor'` scopes the reset to this portal; the endpoint whitelists
   * strictly, so no `redirectTo` here (per-role default used). Returns 200
   * non-enumerating regardless of whether the account exists.
   */
  requestPasswordReset: (email: string) =>
    fetchApi<unknown>('/auth/password-reset', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, portal: 'vendor' }),
    }),
  /**
   * Re-send the signup confirmation email for a vendor account that hasn't
   * verified yet. Body is `{email, portal}`. Like password-reset, returns 200
   * non-enumerating — surface a neutral message either way.
   */
  resendConfirmation: (email: string) =>
    fetchApi<unknown>('/auth/resend-confirmation', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, portal: 'vendor' }),
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
  /** Admin-invited vendor sets a password and links their account in one step. */
  acceptInvite: (body: AcceptInviteBody) =>
    fetchApi<AuthTokens>('/auth/vendor/accept-invite', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(body),
    }),
};

// --- Public campus directory (no auth) ---
export const campusesApi = {
  list: () => fetchApi<Campus[]>('/campuses', { auth: false }),
  // Delivery slots are configured per-campus (by admin); vendors read them to
  // know which slots exist before toggling per-day availability.
  deliverySlots: (campusId: string) =>
    fetchApi<DeliverySlot[]>(`/campuses/${campusId}/delivery-slots`, { auth: false }),
};

// --- Vendor onboarding ---
export const onboardingApi = {
  submit: (body: VendorOnboardBody) =>
    fetchApi<VendorOnboardResult>('/vendor/onboard', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// --- Current session (role-aware) ---
export const meApi = {
  /**
   * Role-aware session: `GET /v1/me` → `{ vendorMemberships: [...] }`. Used to
   * tell an `owner` from a `staff` member (the JWT role claim is the generic
   * "vendor"). NOTE: distinct from `authApi.me()` (`/auth/me`, generic user).
   */
  get: () => fetchApi<MeSession>('/me'),
};

// --- Query keys ---
export const qk = {
  me: () => ['me'] as const,
  campuses: () => ['public', 'campuses'] as const,
  deliverySlots: (campusId: string) => ['public', 'campuses', campusId, 'delivery-slots'] as const,
  orders: (filters?: Record<string, unknown>) => ['vendor', 'orders', filters ?? {}] as const,
  order: (id: string) => ['vendor', 'order', id] as const,
  menuItems: () => ['vendor', 'menu-items'] as const,
  menuItem: (id: string) => ['vendor', 'menu-item', id] as const,
  menuMetadata: () => ['vendor', 'menu-metadata'] as const,
  soupOptions: () => ['vendor', 'soup-options'] as const,
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
  // Expired orders are unpaid orders whose payment window lapsed — they never
  // reach the vendor for fulfilment, so hide them from every vendor-facing list
  // (dashboard + orders board). Filtered here so all consumers stay consistent.
  list: async (filters: OrderFilters = {}) => {
    const orders = await fetchApi<OrderSummary[]>(`/vendor/orders${qs({ ...filters })}`);
    return orders.filter((order) => order.orderStatus !== 'expired');
  },
  get: (id: string) => fetchApi<OrderDetail>(`/vendor/orders/${id}`),
  accept: (id: string) => fetchApi<OrderDetail>(`/vendor/orders/${id}/accept`, { method: 'POST' }),
  prepare: (id: string) => fetchApi<OrderDetail>(`/vendor/orders/${id}/prepare`, { method: 'POST' }),
  preparing: (id: string) =>
    fetchApi<OrderDetail>(`/vendor/orders/${id}/preparing`, { method: 'POST' }),
  ready: (id: string) => fetchApi<OrderDetail>(`/vendor/orders/${id}/ready`, { method: 'POST' }),
  /**
   * TODO backend contract: POST /vendor/orders/:id/handoff/confirm
   * Confirms rider pickup for one ready order and returns updated OrderDetail.
   */
  confirmRiderPickup: (id: string) =>
    fetchApi<OrderDetail>(`/vendor/orders/${id}/handoff/confirm`, { method: 'POST' }),
};

// --- Menu ---
export const menuApi = {
  list: () => fetchApi<VendorMenuItem[]>('/vendor/menu-items'),
  get: (id: string) => fetchApi<VendorMenuItem>(`/vendor/menu-items/${id}`),
  metadata: () => fetchApi<MenuMetadata>('/vendor/menu-metadata'),
  createCategory: (body: CreateMenuCategoryBody) =>
    fetchApi<MenuCategory>('/vendor/menu-categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
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
  /**
   * TODO backend contract: DELETE /vendor/menu-items/:id
   * Hard-deletes a menu item. Backend endpoint not yet confirmed — added per REST
   * convention; may 404 until the backend ships it. Historical orders keep their
   * snapshot, so this only affects future ordering.
   */
  remove: (id: string) =>
    fetchApi<void>(`/vendor/menu-items/${id}`, { method: 'DELETE' }),
  requestImageUploadUrl: (id: string, body: MenuItemImageUploadUrlBody) =>
    fetchApi<MenuItemImageUploadTarget>(`/vendor/menu-items/${id}/image/upload-url`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  confirmImage: (id: string, body: ConfirmMenuItemImageBody) =>
    fetchApi<VendorMenuItem>(`/vendor/menu-items/${id}/image/confirm`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listSchedules: (id: string) =>
    fetchApi<MenuItemSchedule[]>(`/vendor/menu-items/${id}/schedules`),
  replaceSchedules: (id: string, entries: MenuItemSchedule[]) =>
    fetchApi<MenuItemSchedule[]>(`/vendor/menu-items/${id}/schedules`, {
      method: 'PUT',
      body: JSON.stringify({ entries: entries.map(toSlotDayEntry) }),
    }),
};

// --- Soup options (shared per-vendor list reused by requiresSoup menu items) ---
export const soupApi = {
  list: () => fetchApi<VendorSoupOption[]>('/vendor/soup-options'),
  create: (body: CreateVendorSoupOptionBody) =>
    fetchApi<VendorSoupOption>('/vendor/soup-options', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: UpdateVendorSoupOptionBody) =>
    fetchApi<VendorSoupOption>(`/vendor/soup-options/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

// --- Batches ---
export const batchesApi = {
  list: () => fetchApi<BatchSummary[]>('/vendor/batches'),
  get: (id: string) => fetchApi<BatchDetail>(`/vendor/batches/${id}`),
  readyForPickup: (id: string) =>
    fetchApi<BatchDetail>(`/vendor/batches/${id}/ready-for-pickup`, { method: 'POST' }),
  pickup: (id: string) => fetchApi<BatchDetail>(`/vendor/batches/${id}/pickup`, { method: 'POST' }),
  /**
   * TODO backend contract: POST /vendor/batches/:id/orders/ready
   * Body: { orderIds: string[] }. Returns updated BatchDetail.
   */
  markOrdersReady: (id: string, orderIds: string[]) =>
    fetchApi<BatchDetail>(`/vendor/batches/${id}/orders/ready`, {
      method: 'POST',
      body: JSON.stringify({ orderIds }),
    }),
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
  get: (id: string) => fetchApi<SettlementDetail>(`/vendor/settlements/${id}`),
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
      body: JSON.stringify({ entries: entries.map(toSlotDayEntry) }),
    }),
  /**
   * TODO backend contract: GET/PATCH /vendor/availability/state
   * Controls open/closed/paused/sold-out, cutoff, max daily orders, unavailable dates.
   */
  getState: () => fetchApi<StoreAvailabilityState>('/vendor/availability/state'),
  updateState: (body: UpdateStoreAvailabilityBody) =>
    fetchApi<StoreAvailabilityState>('/vendor/availability/state', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

// --- Support / escalation ---
export const supportApi = {
  /**
   * TODO backend contract: POST /vendor/support/issues
   * Creates an issue visible to vendor support/admin, linked to order/batch/settlement/inventory/handoff.
   */
  createIssue: (body: SupportIssueBody) =>
    fetchApi<SupportIssue>('/vendor/support/issues', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// --- Notifications ---
export const notificationsApi = {
  list: () => fetchApi<NotificationRecord[]>('/notifications'),
  markRead: (id: string) =>
    fetchApi<unknown>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => fetchApi<unknown>('/notifications/read-all', { method: 'POST' }),
  /** Register this device's FCM token. Backend responds 204. */
  registerDeviceToken: (body: DeviceTokenBody) =>
    fetchApi<void>('/me/device-tokens', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  /** Unregister an FCM token (e.g. on logout). Backend responds 204. */
  deleteDeviceToken: (token: string) =>
    fetchApi<void>(`/me/device-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    }),
  /**
   * Update notification preferences. The backend only sends pushes when
   * push_enabled is true (defaults to false), so enabling push on a device
   * must also flip this account-level flag.
   */
  updatePreferences: (body: { pushEnabled?: boolean; emailEnabled?: boolean }) =>
    fetchApi<unknown>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};

// --- Profile ---
export const profileApi = {
  get: () => fetchApi<VendorProfile>('/vendor/profile'),
  update: (body: UpdateVendorProfileBody) =>
    fetchApi<VendorProfile>('/vendor/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  // --- Logo upload (3-step signed-upload flow) ---
  // 1) ask backend for a signed upload target
  requestLogoUploadUrl: (body: LogoUploadUrlBody) =>
    fetchApi<LogoUploadTarget>('/vendor/profile/logo/upload-url', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  // 3) confirm — backend swaps in the new object (removing the old one) and
  // returns the updated profile with a fresh short-lived signed `logoUrl`.
  confirmLogo: (body: ConfirmLogoBody) =>
    fetchApi<VendorProfile>('/vendor/profile/logo/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getPayoutAccount: () =>
    fetchApi<VendorPayoutAccount | null>('/vendor/payout-account').catch(() => null),
  updatePayoutAccount: (body: UpsertPayoutAccountBody) =>
    fetchApi<VendorPayoutAccount>('/vendor/payout-account', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};

async function uploadBinaryToSignedUrl(label: string, uploadUrl: string, file: File | Blob): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${label} upload failed (${res.status}). ${detail}`.trim());
  }
}

/**
 * Step 2 of signed upload flows: direct PUT to Supabase Storage. Do not use
 * `fetchApi`; the signed `uploadUrl` carries storage auth, not the vendor JWT.
 */
export async function uploadLogoBinary(uploadUrl: string, file: File | Blob): Promise<void> {
  await uploadBinaryToSignedUrl('Logo', uploadUrl, file);
}

export async function uploadMenuItemImageBinary(uploadUrl: string, file: File | Blob): Promise<void> {
  await uploadBinaryToSignedUrl('Menu item image', uploadUrl, file);
}

// Re-export envelope helpers for any direct callers.
export type { ListEnvelope, ItemEnvelope };
