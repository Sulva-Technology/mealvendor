# API Contract Notes

Backend boundaries and frontend conventions for the Meal Direct Vendor Portal.
There is no mock layer — every screen reads live data from the backend.

## Backend-owned (read-only here)
- **Authentication**: Email/password against `/auth/vendor/login`. The frontend
  never talks to Supabase directly; the backend brokers auth and any email
  redirect (`redirectTo` / `NEXT_PUBLIC_AUTH_REDIRECT_URL`).
- **Settlements & payouts**: Settled amounts are computed backend-side from
  Paystack webhooks. Vendors can read settlements and edit their payout account,
  but cannot mutate settled figures.

## Frontend conventions
- Financial and inventory mutations are **network-only** — no offline optimistic
  UI. Mutations carry an `Idempotency-Key`.
- The PWA service worker serves the `/offline` route as the navigation fallback.
