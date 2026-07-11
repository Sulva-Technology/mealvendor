/**
 * Server-only base URL for the real Meal Direct backend. The browser never sees
 * this — it talks to same-origin /api routes, which forward here. Prefer a
 * server-only API_BASE_URL; fall back to the public var, then the prod default.
 */
export const BACKEND_BASE_URL = (
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://mealdirectbackend.onrender.com/v1'
).replace(/\/$/, '');
