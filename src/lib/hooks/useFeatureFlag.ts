import { useQuery } from '@tanstack/react-query';
import { featureFlagsApi, qk } from '@/src/lib/api/vendor';

/** Backend flag keys (public.feature_flags). */
export const FeatureFlag = {
  CLOUD_PRINTING: 'cloud_printing',
} as const;
export type FeatureFlagKey = (typeof FeatureFlag)[keyof typeof FeatureFlag];

/**
 * Server-driven feature flag for the signed-in vendor. A flag in `test` mode is
 * only true for the admin-managed tester cohort, so unfinished features stay
 * hidden from real vendors. Any failure reads as "off".
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const query = useQuery({
    queryKey: qk.featureFlags(),
    queryFn: featureFlagsApi.mine,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return query.data?.[key] === true;
}
