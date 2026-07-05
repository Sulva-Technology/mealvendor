# Vendor staff permissions (frontend gating)

Date: 2026-07-05
Status: Approved

## Problem

The vendor portal grants every signed-in user identical, full access. A vendor
can have two membership roles — `owner` and `staff` — but the frontend never
reads the role, so an admin-invited **staff** account sees and can attempt every
owner-level action (payout/bank account, settlement financials, store profile).

The backend already enforces these limits server-side; this change makes the UI
reflect the boundary so staff aren't shown surfaces they can't use.

## Role source of truth

`GET /v1/me` → `MeSessionEnvelopeDto`:

```
data.vendorMemberships[]: { id, vendorId, campusId, vendorDisplayName,
                            vendorSlug, role: 'owner' | 'staff', active }
```

The current user's role = the membership whose `vendorId` matches the session's
`vendorId` (from the JWT `app_metadata.vendor_id`, already in the zustand store).

The JWT's own `role` claim is the generic `"vendor"` and cannot distinguish
owner from staff — `/v1/me` is the only source. (Note: `authApi.me()` hits
`/auth/me`, a *different* endpoint returning the generic user — do not reuse it.)

## Staff restrictions (owner keeps today's full UI)

| Surface | Owner | Staff |
| --- | --- | --- |
| Dashboard, Orders, Batches, Availability, Menu, Inventory, Reviews | full | full |
| Settlements (nav + `/settlements`, `/settlements/[id]`) | full | hidden + blocked |
| Payout / bank account card (Settings) | full | hidden |
| Store profile, logo, delivery mode, service fee (Settings) | editable | read-only summary |
| Push notifications (own device) | yes | yes |
| Sign out | yes | yes |

## Design

### 1. Role plumbing
- `types.ts`: add `VendorMembership` (`role: 'owner' | 'staff'`) and `MeSession`
  (`vendorMemberships: VendorMembership[]`, plus the fields we use).
- `vendor.ts`: add `meApi.get()` → `fetchApi<MeSession>('/me')` and `qk.me()`.
- `src/lib/hooks/useVendorRole.ts`: React Query on `qk.me()`; derive
  `{ role, isOwner, isStaff, isLoading }` by matching `vendorId`.
  - Helper `deriveVendorRole(session, vendorId)` (pure, unit-tested).
  - **Fallback:** while loading → `isLoading` true (callers render nothing
    sensitive, no flash). If the query errors or no membership matches →
    treat as **staff** (least privilege; the backend enforces the real
    boundary and a genuine owner resolves as soon as `/me` returns).

### 2. Settlements nav + route
- `VendorSidebar`: filter the `Settlements` item when `isStaff`.
- `src/components/shared/OwnerOnly.tsx`: wrapper that shows a spinner while
  `isLoading`, `router.replace('/')` for staff (blocks direct-URL entry), and
  renders children for owners. Wrap `/settlements` and `/settlements/[id]`.

### 3. Settings page
- Branch at the page level to avoid threading `readOnly` through every card
  (lower regression risk for the owner path):
  - **Owner:** unchanged.
  - **Staff:** read-only profile summary (display name, phone, description,
    delivery mode, service fee) + push-notifications card + sign-out card.
    Payout card and all editors omitted. Short note: "Store profile and payouts
    are managed by the store owner."

### 4. Non-goals
- No staff-management UI — staff are admin-invited via
  `/auth/vendor/accept-invite`; there is no vendor-side members endpoint.
- No backend changes (already enforces).

## Testing
- Unit: `deriveVendorRole` — owner match, staff match, no vendorId match,
  empty memberships, undefined session → all non-owner cases resolve to staff.
- Manual: sign in as owner (full UI) and staff (no Settlements nav, `/settlements`
  redirects, Settings read-only + no payout), confirm owner unaffected.
