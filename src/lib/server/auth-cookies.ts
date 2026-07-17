import type { NextResponse } from 'next/server';

/**
 * httpOnly session cookies for the vendor portal.
 *
 * The backend issues its own access/refresh JWTs (it brokers Supabase). We keep
 * them in httpOnly cookies so browser JS — and therefore any XSS — can never read
 * them. All authenticated calls go through /api/proxy, which reads these cookies
 * server-side and injects the bearer.
 */
export const ACCESS_COOKIE = 'md_vendor_access';
export const REFRESH_COOKIE = 'md_vendor_refresh';

// Fallback only — the backend's expiresIn wins when present. Keep this short so a
// stolen access cookie without a refresh cookie ages out quickly.
const ACCESS_MAX_AGE_FALLBACK_S = 15 * 60; // 15m
const REFRESH_MAX_AGE_S = 30 * 24 * 60 * 60; // 30d

const isProd = process.env.NODE_ENV === 'production';

function baseOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/'
  };
}

export function setSessionCookies(
  response: NextResponse,
  tokens: { accessToken?: string; refreshToken?: string; expiresIn?: number }
): void {
  if (tokens.accessToken) {
    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
      ...baseOptions(),
      maxAge: tokens.expiresIn && tokens.expiresIn > 0 ? tokens.expiresIn : ACCESS_MAX_AGE_FALLBACK_S
    });
  }
  if (tokens.refreshToken) {
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      ...baseOptions(),
      maxAge: REFRESH_MAX_AGE_S
    });
  }
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, '', { ...baseOptions(), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { ...baseOptions(), maxAge: 0 });
}
