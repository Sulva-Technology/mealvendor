import { env } from '@/src/lib/env';

/**
 * Client-safe feature flags. These gate UI for backend endpoints that are not
 * live yet, so vendors never see buttons that always error. Flip the matching
 * NEXT_PUBLIC_* env var to "true" once the backend ships the endpoint.
 */
export const features = {
  /** POST /vendor/support/issues */
  supportIssues: env.NEXT_PUBLIC_ENABLE_SUPPORT_ISSUES === 'true',
  /** POST /vendor/orders/:id/handoff/confirm */
  orderHandoffConfirm: env.NEXT_PUBLIC_ENABLE_ORDER_HANDOFF_CONFIRM === 'true',
} as const;
