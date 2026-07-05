import { describe, it, expect } from 'vitest';
import { deriveVendorRole } from './useVendorRole';
import type { MeSession, VendorMembership } from '@/src/lib/api/types';

function membership(over: Partial<VendorMembership>): VendorMembership {
  return {
    id: 'm1',
    vendorId: 'v1',
    campusId: 'c1',
    vendorDisplayName: 'Test Kitchen',
    vendorSlug: 'test-kitchen',
    role: 'staff',
    active: true,
    ...over,
  };
}

function session(memberships: VendorMembership[]): MeSession {
  return { vendorMemberships: memberships };
}

describe('deriveVendorRole', () => {
  it('returns owner when the matching membership is owner', () => {
    const s = session([membership({ vendorId: 'v1', role: 'owner' })]);
    expect(deriveVendorRole(s, 'v1')).toBe('owner');
  });

  it('returns staff when the matching membership is staff', () => {
    const s = session([membership({ vendorId: 'v1', role: 'staff' })]);
    expect(deriveVendorRole(s, 'v1')).toBe('staff');
  });

  it('matches on vendorId, ignoring memberships for other vendors', () => {
    const s = session([
      membership({ vendorId: 'other', role: 'owner' }),
      membership({ vendorId: 'v1', role: 'staff' }),
    ]);
    expect(deriveVendorRole(s, 'v1')).toBe('staff');
  });

  it('falls back to staff when no membership matches the vendorId', () => {
    const s = session([membership({ vendorId: 'other', role: 'owner' })]);
    expect(deriveVendorRole(s, 'v1')).toBe('staff');
  });

  it('falls back to staff for empty memberships', () => {
    expect(deriveVendorRole(session([]), 'v1')).toBe('staff');
  });

  it('falls back to staff when there is no vendorId', () => {
    const s = session([membership({ vendorId: 'v1', role: 'owner' })]);
    expect(deriveVendorRole(s, null)).toBe('staff');
  });

  it('falls back to staff when the session is undefined', () => {
    expect(deriveVendorRole(undefined, 'v1')).toBe('staff');
  });
});
