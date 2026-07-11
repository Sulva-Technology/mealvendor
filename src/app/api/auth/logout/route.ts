import { NextRequest, NextResponse } from 'next/server';

import { BACKEND_BASE_URL } from '@/src/lib/server/backend';
import { ACCESS_COOKIE, clearSessionCookies } from '@/src/lib/server/auth-cookies';

/** Revokes the backend session (best-effort) and clears the httpOnly cookies. */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    try {
      await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        cache: 'no-store'
      });
    } catch {
      // Clearing cookies below is what matters; backend revocation is best-effort.
    }
  }
  const response = NextResponse.json({ data: { success: true } });
  clearSessionCookies(response);
  return response;
}
