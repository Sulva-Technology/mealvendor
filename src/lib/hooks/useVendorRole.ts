import { useQuery } from '@tanstack/react-query';
import { meApi, qk } from '@/src/lib/api/vendor';
import { useAuthStore } from '@/src/lib/auth/session';
import type { MeSession } from '@/src/lib/api/types';

export type VendorRole = 'owner' | 'staff';

/**
 * Resolve the current user's role at the given vendor from a `/v1/me` session.
 *
 * Pure + exported so it can be unit-tested. Fails to LEAST privilege: any case
 * we can't positively confirm as owner (no session, no vendorId, no matching
 * membership) resolves to `staff`. The backend enforces the real boundary — a
 * genuine owner resolves to `owner` as soon as `/me` returns.
 */
export function deriveVendorRole(
  session: MeSession | undefined,
  vendorId: string | null
): VendorRole {
  if (!session || !vendorId) return 'staff';
  const membership = session.vendorMemberships?.find((m) => m.vendorId === vendorId);
  return membership?.role === 'owner' ? 'owner' : 'staff';
}

/**
 * Current user's role in their vendor. Backs role-gated UI (Settlements nav,
 * payout account, Settings editability). While `isLoading`, callers should
 * render nothing role-sensitive to avoid flashing owner-only surfaces to staff.
 */
export function useVendorRole() {
  const vendorId = useAuthStore((s) => s.vendorId);
  const query = useQuery({
    queryKey: qk.me(),
    queryFn: meApi.get,
    staleTime: 5 * 60_000,
  });

  const role = deriveVendorRole(query.data, vendorId);
  return {
    role,
    isOwner: role === 'owner',
    isStaff: role === 'staff',
    isLoading: query.isLoading,
  };
}
