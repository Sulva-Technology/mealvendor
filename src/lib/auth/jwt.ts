/**
 * Minimal JWT payload decoding (no verification — the backend verifies).
 * Used to read the Supabase access token's claims client-side, specifically
 * `app_metadata.vendor_id`, to decide whether a vendor still needs onboarding.
 */

interface JwtPayload {
  app_metadata?: { vendor_id?: string | null;[k: string]: unknown };
  user_metadata?: { vendor_id?: string | null;[k: string]: unknown };
  vendor_id?: string | null;
  exp?: number;
  [k: string]: unknown;
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') return atob(base64);
  // Node fallback (SSR).
  return Buffer.from(base64, 'base64').toString('binary');
}

export function decodeJwt(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = decodeURIComponent(
      base64UrlDecode(parts[1])
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    try {
      return JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
    } catch {
      return null;
    }
  }
}

/** Read the vendor id from a Supabase access token, checking the usual claim locations. */
export function getVendorIdFromToken(token: string | null | undefined): string | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  return (
    payload.app_metadata?.vendor_id ??
    payload.user_metadata?.vendor_id ??
    payload.vendor_id ??
    null
  );
}
