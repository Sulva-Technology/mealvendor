'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/lib/auth/session';
import type { AuthTokens, AuthUser } from '@/src/lib/api/types';

/**
 * Landing page for Supabase auth-email links (confirm signup, recovery,
 * magic link, invite). The backend forwards our `redirectTo` to Supabase as
 * `emailRedirectTo`, and Supabase sends the vendor here.
 *
 * The frontend does not run supabase-js, so we handle the implicit (hash)
 * redirect shape Supabase uses by default:
 *   #access_token=…&refresh_token=…&expires_in=…&token_type=bearer&type=signup
 * or an error:
 *   #error=access_denied&error_code=otp_expired&error_description=…
 *
 * On success we hydrate the existing auth store and hand off to the dashboard;
 * VendorGuard then routes to /onboarding if the token lacks a vendor_id.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Supabase puts the session in the URL fragment; some flows use the query.
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash || window.location.search);

    const errCode = params.get('error') || params.get('error_code');
    const errDesc = params.get('error_description');
    if (errCode) {
      setError(
        (errDesc || errCode).replace(/\+/g, ' ') ||
          'This link is invalid or has expired. Please request a new one.'
      );
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const expiresIn = Number(params.get('expires_in')) || 0;
      const tokens: AuthTokens = {
        accessToken,
        refreshToken,
        expiresIn,
        // The backend's login response carries a user object; the hash flow does
        // not, so leave a minimal placeholder — claims are read from the JWT.
        user: {} as AuthUser,
      };
      setSession(tokens);
      // Strip the tokens from the URL so they aren't left in history.
      window.history.replaceState(null, '', window.location.pathname);
      router.replace('/');
      return;
    }

    setError('No sign-in information was found in this link. Please sign in again.');
  }, [router, setSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-sm space-y-6 glass p-8 rounded-[var(--radius-xl)] shadow-lg text-center">
        <Image
          src="/logo.png"
          alt="Meal Direct"
          width={64}
          height={64}
          priority
          className="mx-auto h-16 w-16 rounded-3xl shadow-sm"
        />
        {error ? (
          <>
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-left text-sm text-[var(--color-error)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Link
              href="/login"
              className="inline-flex w-full justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 transition-all"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-[var(--color-muted-foreground)]">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
            <p className="text-sm">Signing you in…</p>
          </div>
        )}
      </div>
    </div>
  );
}
