'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/src/lib/api/vendor';
import { useAuthStore } from '@/src/lib/auth/session';
import { ApiError } from '@/src/lib/api/client';

const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL || 'https://mealdirectly.com/terms';
const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL || 'https://mealdirectly.com/privacy';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unregisteredHint, setUnregisteredHint] = useState(false);
  const [slow, setSlow] = useState(false);
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  React.useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [loading]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnregisteredHint(false);

    try {
      const tokens = await authApi.login(email, password);
      if (!tokens?.accessToken) {
        throw new Error('No access token returned by the server.');
      }
      setSession(tokens);
      router.replace('/');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? 'Invalid email or password.'
            : err.status === 403
              ? // Portal/permission block — the backend's message is the source
                // of truth (e.g. "Your account is not permitted to sign in to
                // this portal."). Show it verbatim.
                err.message
              : err.status === 0
                ? 'Could not reach the server. It may be waking up — please try again.'
                : err.message
          : (err as Error).message || 'An error occurred during login.';
      setError(message);
      // A 401 here can also mean an admin added this email as vendor staff/owner
      // but the person never actually signed up (no password set). Nudge them to
      // register — login won't work until the account exists.
      setUnregisteredHint(err instanceof ApiError && err.status === 401);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-sm space-y-6 glass p-8 rounded-[var(--radius-xl)] shadow-lg">
        <div className="text-center space-y-2">
          <Image
            src="/icon-192.png"
            alt="Meal Direct"
            width={64}
            height={64}
            priority
            className="mx-auto h-16 w-16 rounded-2xl shadow-sm"
          />
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Meal Direct
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">Vendor Portal</p>
        </div>

        {error && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            {unregisteredHint && (
              <p className="px-1 text-xs text-[var(--color-muted-foreground)]">
                If an admin recently added you as vendor staff or owner, you still
                need to finish signing up first — this email won&apos;t work until
                the account has a password set. Use your invitation link to set one.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="vendor@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          {loading && slow && (
            <p className="text-center text-xs text-[var(--color-muted-foreground)]">
              Waking up the server — the first sign-in after a pause can take ~30s.
            </p>
          )}
          <Link
            href="/auth/forgot-password"
            className="block text-center text-xs text-[var(--color-primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </form>

        <p className="text-center text-sm text-[var(--color-muted-foreground)]">
          New vendor?{' '}
          <Link href="/signup" className="font-medium text-[var(--color-primary)] hover:underline">
            Create an account
          </Link>
        </p>

        <p className="text-center text-xs text-[var(--color-muted-foreground)] pt-2">
          By signing in, you agree to our{' '}
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
