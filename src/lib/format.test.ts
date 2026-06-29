import { describe, it, expect } from 'vitest';
import {
  formatNaira,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelative,
  orderStatusLabel,
  orderStatusChip,
  batchStatusChip,
  settlementStatusChip,
  prettifyEnum,
} from './format';

describe('formatNaira — kobo → Naira money formatting', () => {
  it('divides kobo by 100 and prefixes the Naira sign', () => {
    expect(formatNaira(450000)).toBe('₦4,500');
  });

  it('groups thousands', () => {
    expect(formatNaira(123456789)).toBe('₦1,234,568'); // 1,234,567.89 rounded, no decimals
  });

  it('treats null/undefined as zero', () => {
    expect(formatNaira(null)).toBe('₦0');
    expect(formatNaira(undefined)).toBe('₦0');
  });

  it('renders exact zero', () => {
    expect(formatNaira(0)).toBe('₦0');
  });

  it('omits decimals by default (rounds to whole Naira)', () => {
    // 4550 kobo = ₦45.50 -> rounds to ₦46 with no fraction digits
    expect(formatNaira(4550)).toBe('₦46');
  });

  it('keeps two decimals when asked', () => {
    expect(formatNaira(4550, { decimals: true })).toBe('₦45.50');
    expect(formatNaira(450000, { decimals: true })).toBe('₦4,500.00');
  });

  it('handles a single kobo with decimals', () => {
    expect(formatNaira(1, { decimals: true })).toBe('₦0.01');
  });
});

describe('date formatters — null/empty handling', () => {
  it('returns an em dash for missing values', () => {
    for (const fn of [formatDate, formatDateTime, formatTime, formatRelative]) {
      expect(fn(null)).toBe('—');
      expect(fn(undefined)).toBe('—');
      expect(fn('')).toBe('—');
    }
  });

  it('formats a valid ISO date (local, no timezone marker is stable)', () => {
    expect(formatDate('2026-06-19T09:45:00')).toBe('19 Jun 2026');
  });

  it('formats date + time', () => {
    expect(formatDateTime('2026-06-19T09:45:00')).toBe('19 Jun 2026, 09:45 AM');
  });

  it('formats time only', () => {
    expect(formatTime('2026-06-19T21:05:00')).toBe('09:05 PM');
  });
});

describe('orderStatusLabel', () => {
  it('maps known statuses to friendly labels', () => {
    expect(orderStatusLabel('pending_payment')).toBe('Pending Payment');
    expect(orderStatusLabel('out_for_delivery')).toBe('Out for Delivery');
    expect(orderStatusLabel('administratively_completed')).toBe('Completed');
  });

  it('falls back to prettified enum for unknown statuses', () => {
    expect(orderStatusLabel('some_new_state')).toBe('Some New State');
  });
});

describe('orderStatusChip — status → chip tone', () => {
  it('success for terminal-good states', () => {
    for (const s of ['delivered', 'ready', 'administratively_completed']) {
      expect(orderStatusChip(s)).toBe('success');
    }
  });

  it('info for in-flight states', () => {
    for (const s of ['preparing', 'out_for_delivery', 'accepted', 'confirmed']) {
      expect(orderStatusChip(s)).toBe('info');
    }
  });

  it('warning for awaiting-action states', () => {
    expect(orderStatusChip('pending_payment')).toBe('warning');
    expect(orderStatusChip('paid')).toBe('warning');
  });

  it('error for failed/reversed states', () => {
    for (const s of ['cancelled', 'expired', 'refunded']) {
      expect(orderStatusChip(s)).toBe('error');
    }
  });

  it('default for anything unknown', () => {
    expect(orderStatusChip('mystery')).toBe('default');
  });
});

describe('batchStatusChip', () => {
  it('maps each known status', () => {
    expect(batchStatusChip('completed')).toBe('success');
    expect(batchStatusChip('open')).toBe('info');
    expect(batchStatusChip('in_progress')).toBe('info');
    expect(batchStatusChip('assigned')).toBe('info');
    expect(batchStatusChip('closed')).toBe('warning');
    expect(batchStatusChip('cancelled')).toBe('error');
    expect(batchStatusChip('unknown')).toBe('default');
  });
});

describe('settlementStatusChip', () => {
  it('maps each known status', () => {
    expect(settlementStatusChip('paid')).toBe('success');
    expect(settlementStatusChip('approved')).toBe('info');
    expect(settlementStatusChip('draft')).toBe('warning');
    expect(settlementStatusChip('cancelled')).toBe('error');
    expect(settlementStatusChip('unknown')).toBe('default');
  });
});

describe('prettifyEnum', () => {
  it('title-cases snake_case', () => {
    expect(prettifyEnum('vendor_delivery')).toBe('Vendor Delivery');
    expect(prettifyEnum('paid')).toBe('Paid');
  });

  it('returns an em dash for empty input', () => {
    expect(prettifyEnum(null)).toBe('—');
    expect(prettifyEnum(undefined)).toBe('—');
    expect(prettifyEnum('')).toBe('—');
  });
});
