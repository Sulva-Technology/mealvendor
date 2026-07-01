'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { authApi } from '@/src/lib/api/vendor';
import { useAuthStore } from '@/src/lib/auth/session';
import { ApiError } from '@/src/lib/api/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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
            : err.status === 0
              ? 'Could not reach the server. It may be waking up — please try again.'
              : err.message
          : (err as Error).message || 'An error occurred during login.';
      setError(message);
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
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
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
        </form>

        <p className="text-center text-xs text-[var(--color-muted-foreground)] pt-2">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
