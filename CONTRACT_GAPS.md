# API Contract Gaps & Mock Data Acknowledgement

This file tracks the missing backend endpoints and data models for the Meal Direct Vendor Portal MVP.

## Currently Mocked / Gaps
- **Authentication**: Supabase OAuth is configured but the preview environment might not have valid Redirect URIs. A mocked bypass for the preview environment is available in the login page.
- **Paystack Webhooks**: Settled amounts are read-only and backend processes webhooks from Paystack.

## Frontend Offline Rules Applied
- Financial and inventory mutations are treated as **network-only** (no offline optimistic UI).
- The PWA Service Worker handles navigation fallbacks using the `/offline` route.

