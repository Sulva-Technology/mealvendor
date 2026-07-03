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

## Missing / expanded contracts needed for launch-ready vendor ops
- `POST /vendor/orders/:id/handoff/confirm`
  - Confirms rider pickup for one ready order.
  - Returns updated `OrderDetail` with `riderPickedUpAt`, `handoffStatus`, rider fields.
- `POST /vendor/batches/:id/orders/ready`
  - Body: `{ orderIds: string[] }`.
  - Marks only valid selected orders ready; invalid transitions rejected.
  - Returns updated `BatchDetail`.
- `GET/PATCH /vendor/availability/state`
  - Controls global `acceptingOrders`, `state` (`open`, `closed`, `paused`, `sold_out_today`), `pauseUntil`, `cutoffTime`, `maxOrdersPerDay`, and `unavailableDates`.
- `POST /vendor/support/issues`
  - Body includes `category`, `subjectType`, `subjectId`, `message`.
  - Categories: payment/order mismatch, rider delay, customer issue, inventory problem, wrong order, settlement concern, app issue, other.
- `GET /vendor/settlements/:id`
  - Should include `orders[]`: order IDs, order dates, item totals, commission, refunds, adjustments, net payable, payment status, admin notes.
- Menu item metadata
  - Optional fields now rendered when present: `prepTimeMinutes`, `dailyQuantityLimit`, `dietaryTags`, `soldOut`, `archivedAt`.
  - Backend must enforce unavailable/sold-out items cannot checkout. Frontend only displays vendor state.
- Rider handoff metadata on orders/batches
  - Optional fields now rendered when present: rider name/contact, assigned pickup time, assignment status, handoff status, handoff code, pickup timestamp.
- Notification event coverage
  - Vendor should receive events for new paid order, order cancelled, rider assigned, rider arrived/pickup pending, settlement generated, review received, inventory low.
