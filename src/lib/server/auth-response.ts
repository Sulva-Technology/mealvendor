import { NextResponse } from 'next/server';

import { getVendorIdFromToken } from '../auth/jwt';
import { BACKEND_BASE_URL } from './backend';
import { setSessionCookies } from './auth-cookies';

/**
 * Shared handler for the vendor auth routes. Forwards a credential payload to a
 * backend auth endpoint; on success it stores the returned JWTs in httpOnly
 * cookies and returns only non-sensitive session facts (user + vendorId) to the
 * browser — the tokens themselves never reach client JS.
 */
export async function forwardAuth(backendPath: string, payload: unknown): Promise<NextResponse> {
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_BASE_URL}${backendPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'NETWORK_ERROR', message: 'Could not reach the server. Please retry.' } },
      { status: 502 }
    );
  }

  const json = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(json ?? { error: { code: 'AUTH_FAILED', message: 'Login failed.' } }, {
      status: upstream.status
    });
  }

  const tokens = json?.data ?? json;

  // Signup / accept-invite can legitimately return 2xx with no session when the
  // backend requires email confirmation first. Report that as authed:false and
  // set no cookies, rather than treating it as an error.
  if (!tokens?.accessToken) {
    return NextResponse.json({
      data: { authed: false, user: tokens?.user ?? null, vendorId: null }
    });
  }

  const response = NextResponse.json({
    data: {
      authed: true,
      user: tokens.user ?? null,
      vendorId: getVendorIdFromToken(tokens.accessToken)
    }
  });
  setSessionCookies(response, tokens);
  return response;
}
