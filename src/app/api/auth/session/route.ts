import { NextRequest, NextResponse } from 'next/server';

import { getVendorIdFromToken } from '@/src/lib/auth/jwt';
import { BACKEND_BASE_URL } from '@/src/lib/server/backend';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setSessionCookies,
  clearSessionCookies
} from '@/src/lib/server/auth-cookies';

/**
 * Reports the current session to the browser without exposing tokens.
 *
 *   GET /api/auth/session            -> { authed, vendorId, user }
 *   GET /api/auth/session?refresh=1  -> forces a token refresh first, so a newly
 *                                       onboarded vendor picks up its vendor_id claim.
 */
export async function GET(request: NextRequest) {
  const wantRefresh = request.nextUrl.searchParams.get('refresh') === '1';
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  let effectiveAccess = accessToken;
  let rotated: { accessToken: string; refreshToken?: string; expiresIn?: number } | null = null;

  if ((wantRefresh || !effectiveAccess) && refreshToken) {
    const res = await fetch(`${BACKEND_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store'
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      const tokens = json?.data ?? json;
      if (tokens?.accessToken) {
        rotated = tokens;
        effectiveAccess = tokens.accessToken;
      }
    }
  }

  if (!effectiveAccess) {
    const response = NextResponse.json({ data: { authed: false, vendorId: null, user: null } });
    // No usable access token and refresh (if any) failed — drop stale cookies so
    // the middleware no longer sees a phantom session.
    clearSessionCookies(response);
    return response;
  }

  // Best-effort user fetch so the UI can show identity; never fail the session on it.
  let user: unknown = null;
  try {
    const meRes = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${effectiveAccess}`, Accept: 'application/json' },
      cache: 'no-store'
    });
    if (meRes.ok) {
      const meJson = await meRes.json().catch(() => null);
      // GET /auth/me returns { actor } unwrapped (no success envelope).
      user = meJson?.actor ?? meJson?.data?.actor ?? meJson?.data ?? null;
    }
  } catch {
    // ignore
  }

  const response = NextResponse.json({
    data: { authed: true, vendorId: getVendorIdFromToken(effectiveAccess), user }
  });
  if (rotated) {
    setSessionCookies(response, rotated);
  }
  return response;
}
