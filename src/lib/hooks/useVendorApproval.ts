import { useQuery } from '@tanstack/react-query';
import { profileApi, qk } from '@/src/lib/api/vendor';

const POLL_MS = 20_000;

/**
 * Shared vendor-profile query (same queryKey as every other profile fetch, so
 * react-query dedupes the network call). While the vendor isn't approved yet
 * we poll so an admin approval elsewhere is picked up without a manual refresh.
 */
export function useVendorApproval() {
  const query = useQuery({
    queryKey: qk.profile(),
    queryFn: profileApi.get,
    refetchInterval: (q) => (q.state.data?.status === 'approved' ? false : POLL_MS),
  });

  const status = query.data?.status;
  return {
    profile: query.data,
    status,
    isApproved: status === 'approved',
    isLoading: query.isLoading,
  };
}
