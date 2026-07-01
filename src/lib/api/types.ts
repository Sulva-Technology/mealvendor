/**
 * Types derived from the Meal Direct backend OpenAPI spec (vendor surface).
 * Source: https://mealdirectbackend.onrender.com/docs
 * All monetary values are in kobo (₦1 = 100 kobo).
 */

// --- Auth ---
export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
  message?: string;
}

export interface AcceptInviteBody {
  email: string;
  password: string;
  token: string;
  fullName?: string;
  redirectTo?: string;
}

// --- Orders ---
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'confirmed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'administratively_completed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerId: string;
  campusId: string;
  vendorId: string;
  vendorDisplayName: string;
  serviceDate: string;
  deliverySlotId: string;
  deliverySlotName: string;
  locationId: string;
  locationName: string;
  orderStatus: OrderStatus;
  deliveryMode: string;
  foodSubtotalKobo: number;
  deliveryFeeKobo: number;
  discountKobo: number;
  totalKobo: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  deliveredAt?: string | null;
  confirmedAt?: string | null;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  itemName: string;
  unitType: string;
  unitPriceKobo: number;
  quantity: number;
  lineTotalKobo: number;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItem[];
  latestPayment?: Record<string, unknown> | null;
}

// --- Menu ---
export interface VendorMenuItem {
  id: string;
  vendorId: string;
  categoryId?: string | null;
  categoryName?: string | null;
  unitTypeId: string;
  unitCode: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceKobo: number;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  active: boolean;
  displayOrder: number;
}

export interface UnitType {
  id: string;
  code: string;
  displayName: string;
  countsTowardSpoonLimit: boolean;
  active: boolean;
}

export interface MenuMetadata {
  categories: MenuCategory[];
  unitTypes: UnitType[];
}

export interface CreateMenuItemBody {
  categoryId?: string;
  unitTypeId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceKobo: number;
  displayOrder?: number;
}

export type UpdateMenuItemBody = Partial<CreateMenuItemBody>;

export interface CreateMenuCategoryBody {
  name: string;
  displayOrder?: number;
}

export interface MenuItemSchedule {
  id?: string;
  deliverySlotId: string;
  dayOfWeek: number;
  available: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
}

// --- Batches ---
export type BatchStatus =
  | 'open'
  | 'closed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface BatchSummary {
  id: string;
  campusId: string;
  vendorId: string;
  serviceDate: string;
  deliverySlotId: string;
  zoneId: string;
  batchNumber: string;
  status: BatchStatus;
  deliveryMode: string;
  orderCount: number;
  deliveryEarningsKobo: number;
  cutoffAt: string;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchDetail extends BatchSummary {
  orders: OrderSummary[];
}

// --- Inventory ---
export interface InventoryAdjustment {
  id: string;
  inventoryId: string;
  adjustmentQuantity: number;
  reason: string;
  actorUserId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface VendorInventory {
  id: string;
  vendorId: string;
  menuItemId: string;
  menuItemName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  unitTypeId: string;
  unitCode: string;
  serviceDate: string;
  deliverySlotId: string;
  deliverySlotName: string;
  quantityTotal: number;
  quantityReserved: number;
  quantitySold: number;
  quantityAdjusted: number;
  remainingQuantity: number;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  adjustments: InventoryAdjustment[];
}

export interface UpdateInventoryBody {
  quantityTotal: number;
  expectedVersion?: number;
}

export interface CreateAdjustmentBody {
  adjustmentQuantity: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

// --- Settlements ---
export type SettlementStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface SettlementSummary {
  id: string;
  campusId: string;
  vendorId?: string | null;
  riderId?: string | null;
  settlementDate: string;
  status: SettlementStatus;
  grossFoodAmountKobo: number;
  deliveryEarningsKobo: number;
  refundsKobo: number;
  adjustmentsKobo: number;
  payableKobo: number;
  paidAt?: string | null;
  externalReference?: string | null;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}

// --- Reviews ---
export interface VendorReview {
  id: string;
  orderId: string;
  orderNumber?: string | null;
  menuItemId?: string | null;
  menuItemName?: string | null;
  vendorId?: string | null;
  deliveryBatchId?: string | null;
  foodRating?: number | null;
  vendorRating?: number | null;
  deliveryRating?: number | null;
  comment?: string | null;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// --- Notifications ---
export interface NotificationRecord {
  id: string;
  recipientUserId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  title: string;
  body: string;
  linkPath?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscriptionBody {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

// --- Profile ---
export type DeliveryMode = 'meal_direct_rider' | 'vendor_delivery';

export interface VendorProfile {
  id: string;
  campusId: string;
  legalName: string;
  displayName: string;
  slug: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  kitchenLocation?: string | null;
  status: 'pending' | 'approved' | 'suspended' | 'deactivated';
  active: boolean;
  defaultDeliveryMode: DeliveryMode;
  /**
   * Vendor's own takeaway/packaging fee in kobo. `null` = no override → the
   * platform global default (₦200) applies. Must be ≤ the campus's
   * `maxServiceFeeKobo` ceiling (enforced backend-side).
   */
  serviceFeeKobo?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateVendorProfileBody {
  displayName?: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  kitchenLocation?: string | null;
  defaultDeliveryMode?: DeliveryMode;
  /** ₦ takeaway fee in kobo; `null` clears the override (falls back to default). */
  serviceFeeKobo?: number | null;
}

export interface VendorPayoutAccount {
  id: string;
  vendorId: string;
  paystackRecipientCode?: string | null;
  bankName: string;
  bankCode?: string | null;
  maskedAccountNumber: string;
  accountName: string;
  verifiedAt?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPayoutAccountBody {
  bankName: string;
  bankCode?: string;
  accountName: string;
  accountNumber: string;
  paystackRecipientCode?: string;
}

// --- Delivery slots (campus-configured; read-only for vendors) ---
export interface DeliverySlot {
  id: string;
  campusId: string;
  name: string;
  deliveryTime: string;
  cutoffMinutes: number;
  active: boolean;
  displayOrder: number;
  orderingCutoffAt?: string | null;
  acceptingOrders?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

// --- Availability ---
export interface AvailabilityEntry {
  id?: string;
  deliverySlotId: string;
  dayOfWeek: number;
  available: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
}

// --- Campuses (public directory) ---
export interface Campus {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  countryCode: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Vendor onboarding ---
export interface VendorOnboardBody {
  campusId: string;
  legalName: string;
  displayName: string;
  phone?: string;
}

export interface VendorOnboardResult {
  vendor: VendorProfile;
  /** Backend signals the access token must be refreshed to pick up the new vendor_id. */
  tokenRefreshRequired?: boolean;
}

// --- Envelope ---
export interface ListEnvelope<T> {
  data: T[];
}
export interface ItemEnvelope<T> {
  data: T;
}
