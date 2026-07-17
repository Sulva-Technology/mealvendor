import { NextRequest, NextResponse } from 'next/server';

import { BACKEND_BASE_URL } from '@/src/lib/server/backend';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setSessionCookies,
  clearSessionCookies
} from '@/src/lib/server/auth-cookies';
import { isSafeProxyPath } from '@/src/lib/proxy-guard';

/**
 * Authenticated proxy to the Meal Direct backend.
 *
 *   Browser -> /api/proxy/<path> -> <BACKEND_BASE_URL>/<path>
 *
 * - Injects the Authorization bearer from the httpOnly access cookie, so the
 *   token never lives in browser-readable JS.
 * - On a 401 it transparently refreshes using the refresh cookie and retries
 *   once, re-issuing rotated cookies on the response.
 * - Forwards Idempotency-Key on mutations (backend requires it for order/payment
 *   mutations); generates one if the client didn't supply it.
 */

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defense-in-depth on top of SameSite=Lax cookies: browsers always attach
 * Origin to cross-site fetches, so a mutating request whose Origin does not match
 * this deployment is rejected before it can reach the backend with our bearer.
 * Requests without an Origin header (same-origin navigations, server-side tools
 * that never carry the victim's cookies) pass through.
 */
function isForeignOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.nextUrl.host;
  } catch {
    return true;
  }
}

async function callBackend(
  method: string,
  url: string,
  accessToken: string,
  body: string | undefined,
  idempotencyKey: string | null
): Promise<Response> {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Accept', 'application/json');
  if (body) headers.set('Content-Type', 'application/json');
  if (MUTATING.has(method)) {
    headers.set('Idempotency-Key', idempotencyKey ?? crypto.randomUUID());
  }
  return fetch(url, { method, headers, body, cache: 'no-store' });
}

async function refreshTokens(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
  const res = await fetch(`${BACKEND_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store'
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const tokens = json?.data ?? json;
  if (!tokens?.accessToken) return null;
  return tokens;
}

async function handle(request: NextRequest, path: string[]) {
  if (!isSafeProxyPath(path)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN_PATH', message: 'Path not allowed through this proxy.' } },
      { status: 403 }
    );
  }

  if (MUTATING.has(request.method.toUpperCase()) && isForeignOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'CSRF_REJECTED', message: 'Cross-origin mutation rejected.' } },
      { status: 403 }
    );
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'No active session.' } },
      { status: 401 }
    );
  }

  const method = request.method.toUpperCase();
  const url = `${BACKEND_BASE_URL}/${path.join('/')}${request.nextUrl.search}`;
  const body = MUTATING.has(method) ? await request.text() : undefined;
  const idempotencyKey = request.headers.get('Idempotency-Key');

  let rotated: Awaited<ReturnType<typeof refreshTokens>> = null;
  let upstream: Response | null = null;

  if (accessToken) {
    upstream = await callBackend(method, url, accessToken, body || undefined, idempotencyKey);
  }

  // Refresh-and-retry once on a missing/expired access token.
  if ((!upstream || upstream.status === 401) && refreshToken) {
    rotated = await refreshTokens(refreshToken);
    if (rotated) {
      upstream = await callBackend(method, url, rotated.accessToken, body || undefined, idempotencyKey);
    }
  }

  if (!upstream) {
    const res = NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Session could not be refreshed.' } },
      { status: 401 }
    );
    // Refresh failed for good — delete the stale cookies so the middleware stops
    // treating this as a live session and bouncing /login back to the dashboard.
    clearSessionCookies(res);
    return res;
  }

  const text = await upstream.text();
  const response = new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' }
  });
  if (rotated) {
    setSessionCookies(response, rotated);
  }
  return response;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return handle(request, (await ctx.params).path);
}
export async function POST(request: NextRequest, ctx: Ctx) {
  return handle(request, (await ctx.params).path);
}
export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handle(request, (await ctx.params).path);
}
export async function PUT(request: NextRequest, ctx: Ctx) {
  return handle(request, (await ctx.params).path);
}
export async function DELETE(request: NextRequest, ctx: Ctx) {
  return handle(request, (await ctx.params).path);
}
