import type { BatchDetail, BatchSummary, OrderStatus, OrderSummary } from './api/types';

export type VendorOrderStage =
  | 'new'
  | 'ready_for_pickup'
  | 'picked_up_by_rider'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'blocked';

// v2 order-status collapse: vendor path is paid -> ready in one tap. The
// accept/prepare steps (and their endpoints) were removed backend-side.
export type VendorOrderAction = 'ready' | 'confirm_pickup';

export const SUPPORT_CATEGORIES = [
  'payment_order_mismatch',
  'rider_delay',
  'customer_issue',
  'inventory_problem',
  'wrong_order',
  'settlement_concern',
  'app_issue',
  'other',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export function supportCategoryLabel(category: SupportCategory): string {
  switch (category) {
    case 'payment_order_mismatch':
      return 'Payment/order mismatch';
    case 'rider_delay':
      return 'Rider delay';
    case 'customer_issue':
      return 'Customer issue';
    case 'inventory_problem':
      return 'Inventory problem';
    case 'wrong_order':
      return 'Wrong order';
    case 'settlement_concern':
      return 'Settlement concern';
    case 'app_issue':
      return 'App issue';
    case 'other':
      return 'Other';
  }
}

export function vendorOrderStage(status: OrderStatus | string): VendorOrderStage {
  switch (status) {
    case 'paid':
      return 'new';
    case 'ready':
    case 'ready_for_pickup':
      return 'ready_for_pickup';
    case 'out_for_delivery':
    case 'picked_up_by_rider':
      return 'picked_up_by_rider';
    case 'delivered':
    case 'administratively_completed':
    case 'completed':
      return 'completed';
    case 'cancelled':
    case 'expired':
    case 'refunded':
      return 'cancelled';
    case 'disputed':
      return 'disputed';
    default:
      return 'blocked';
  }
}

export function vendorOrderStageLabel(stage: VendorOrderStage): string {
  switch (stage) {
    case 'new':
      return 'New order';
    case 'ready_for_pickup':
      return 'Ready for pickup';
    case 'picked_up_by_rider':
      return 'Picked up by rider';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'disputed':
      return 'Disputed';
    case 'blocked':
      return 'No vendor action';
  }
}

export function nextOrderAction(status: OrderStatus | string): VendorOrderAction | null {
  switch (vendorOrderStage(status)) {
    case 'new':
      return 'ready';
    case 'ready_for_pickup':
      return 'confirm_pickup';
    default:
      return null;
  }
}

export function orderActionLabel(action: VendorOrderAction): string {
  switch (action) {
    case 'ready':
      return 'Mark ready for pickup';
    case 'confirm_pickup':
      return 'Confirm rider pickup';
  }
}

export function canRunOrderAction(order: OrderSummary, action: VendorOrderAction): boolean {
  return nextOrderAction(order.orderStatus) === action;
}

export function customerSafeId(customerId?: string | null): string {
  if (!customerId) return 'Customer unavailable';
  return `Customer ${customerId.slice(0, 8).toUpperCase()}`;
}

export function paymentStatusLabel(order: OrderSummary): string {
  if (order.paidAt || !['pending_payment', 'expired'].includes(order.orderStatus)) return 'Paid';
  if (order.orderStatus === 'expired') return 'Expired';
  return 'Pending payment';
}

export function riderAssignmentLabel(order: Partial<OrderSummary>): string {
  if (order.riderAssignmentStatus) return order.riderAssignmentStatus;
  if (order.riderName) return 'Assigned';
  if (vendorOrderStage(order.orderStatus ?? '') === 'ready_for_pickup') return 'Awaiting rider';
  if (vendorOrderStage(order.orderStatus ?? '') === 'picked_up_by_rider') return 'Picked up';
  return 'Not assigned';
}

export function handoffStatusLabel(order: Partial<OrderSummary>): string {
  if (order.handoffStatus) return order.handoffStatus;
  if (order.riderPickedUpAt || vendorOrderStage(order.orderStatus ?? '') === 'picked_up_by_rider') return 'Confirmed';
  if (vendorOrderStage(order.orderStatus ?? '') === 'ready_for_pickup') return 'Pickup pending';
  return 'Not ready';
}

export function batchReadyCounts(batch: BatchDetail | BatchSummary): { ready: number; notReady: number } {
  const orders = 'orders' in batch ? batch.orders ?? [] : [];
  if (!orders.length) return { ready: 0, notReady: batch.orderCount };
  const ready = orders.filter((order) =>
    ['ready_for_pickup', 'picked_up_by_rider', 'completed'].includes(vendorOrderStage(order.orderStatus))
  ).length;
  return { ready, notReady: Math.max(orders.length - ready, 0) };
}

export function canMarkReady(order: OrderSummary): boolean {
  return vendorOrderStage(order.orderStatus) === 'new';
}

export function canBatchMoveToReady(batch: BatchDetail | BatchSummary): boolean {
  return ['open', 'assigned', 'in_progress'].includes(batch.status);
}

/**
 * Human-readable delivery location for a batch, derived from its orders (batch
 * summaries carry no location). One location -> its name; several -> "First +N".
 * Returns null when no orders are loaded (caller falls back to the batch number).
 */
export function batchLocationLabel(batch: BatchDetail | BatchSummary): string | null {
  const orders = 'orders' in batch ? batch.orders ?? [] : [];
  const names = Array.from(
    new Set(orders.map((o) => o.locationName).filter((n): n is string => Boolean(n)))
  );
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}
