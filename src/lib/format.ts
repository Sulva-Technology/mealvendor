import { format, formatDistanceToNow, parseISO } from 'date-fns';

/** Format kobo as Naira, e.g. 450000 -> "₦4,500". */
export function formatNaira(kobo: number | null | undefined, opts?: { decimals?: boolean }): string {
  const value = (kobo ?? 0) / 100;
  return (
    '₦' +
    value.toLocaleString('en-NG', {
      minimumFractionDigits: opts?.decimals ? 2 : 0,
      maximumFractionDigits: opts?.decimals ? 2 : 0,
    })
  );
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  try {
    return typeof value === 'string' ? parseISO(value) : value;
  } catch {
    return null;
  }
}

/** e.g. "19 Jun 2026, 09:45 AM" */
export function formatDateTime(value?: string | null): string {
  const d = toDate(value);
  return d ? format(d, 'dd MMM yyyy, hh:mm a') : '—';
}

/** e.g. "19 Jun 2026" */
export function formatDate(value?: string | null): string {
  const d = toDate(value);
  return d ? format(d, 'dd MMM yyyy') : '—';
}

/** e.g. "09:45 AM" */
export function formatTime(value?: string | null): string {
  const d = toDate(value);
  return d ? format(d, 'hh:mm a') : '—';
}

/** e.g. "10 minutes ago" */
export function formatRelative(value?: string | null): string {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—';
}

/** Today's date as YYYY-MM-DD (local). */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  confirmed: 'Confirmed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  administratively_completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  refunded: 'Refunded',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? prettifyEnum(status);
}

type ChipStatus = 'success' | 'warning' | 'error' | 'info' | 'default';

export function orderStatusChip(status: string): ChipStatus {
  switch (status) {
    case 'delivered':
    case 'ready':
    case 'administratively_completed':
      return 'success';
    case 'preparing':
    case 'out_for_delivery':
    case 'accepted':
    case 'confirmed':
      return 'info';
    case 'pending_payment':
    case 'paid':
      return 'warning';
    case 'cancelled':
    case 'expired':
    case 'refunded':
      return 'error';
    default:
      return 'default';
  }
}

export function batchStatusChip(status: string): ChipStatus {
  switch (status) {
    case 'completed':
      return 'success';
    case 'open':
    case 'in_progress':
    case 'assigned':
      return 'info';
    case 'closed':
      return 'warning';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

export function settlementStatusChip(status: string): ChipStatus {
  switch (status) {
    case 'paid':
      return 'success';
    case 'approved':
      return 'info';
    case 'draft':
      return 'warning';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

/** "vendor_delivery" -> "Vendor Delivery" */
export function prettifyEnum(value?: string | null): string {
  if (!value) return '—';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
