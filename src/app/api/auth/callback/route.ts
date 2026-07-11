import { NextRequest, NextResponse } from 'next/server';

import { getVendorIdFromToken } from '@/src/lib/auth/jwt';
import { setSessionCookies } from '@/src/lib/server/auth-cookies';

/**
 * Receives the access/refresh tokens that Supabase places in the URL fragment of
 * an email-link redirect (magic link, recovery, email confirmation). The fragment
 * is readable only client-side, so the callback page POSTs the tokens here; we
 * move them into httpOnly cookies and hand back only non-sensitive session facts.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : '';
  const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';
  const expiresIn = typeof body?.expiresIn === 'number' ? body.expiresIn : undefined;

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: { code: 'MISSING_TOKENS', message: 'Callback is missing session tokens.' } },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    data: { authed: true, vendorId: getVendorIdFromToken(accessToken) }
  });
  setSessionCookies(response, { accessToken, refreshToken, expiresIn });
  return response;
}
