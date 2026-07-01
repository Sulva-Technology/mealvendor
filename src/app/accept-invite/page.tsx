'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/src/lib/api/vendor';
import { useAuthStore } from '@/src/lib/auth/session';
import { ApiError } from '@/src/lib/api/client';

const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL || '#';
const INVALID_INVITE_MESSAGE = 'Invitation is invalid, expired, or already used.';

type FieldErrors = Partial<Record<'email' | 'password' | 'confirmPassword' | 'fullName', string>>;

/**
 * Landing page for admin-invited vendors. The invite email links here with
 * ?token=... (and optionally ?email=...); the vendor sets a password and is
 * linked/approved in one step (vendor_id + approval already set server-side),
 * so no /onboarding round-trip is needed afterward.
 */
export default function AcceptInvitePage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  // Read query params client-side only (avoids requiring a Suspense boundary
  // for useSearchParams; mirrors the /auth/callback page's approach).
  const [checkedUrl, setCheckedUrl] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
    const prefillEmail = params.get('email');
    if (prefillEmail) setEmail(prefillEmail);
    setCheckedUrl(true);
  }, []);

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email.';
    if (password.length < 6) e.password = 'Must be at least 6 characters.';
    if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!token || !validate()) return;
    setSubmitting(true);
    try {
      const tokens = await authApi.acceptInvite({
        email: email.trim(),
        password,
        token,
        fullName: fullName.trim() || undefined,
      });
      if (!tokens?.accessToken) {
        throw new Error('No access token returned by the server.');
      }
      setSession(tokens);
      router.replace('/');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 400
            ? INVALID_INVITE_MESSAGE
            : err.status === 0
              ? 'Could not reach the server. It may be waking up — please try again.'
              : err.message
          : (err as Error).message || 'An error occurred. Please try again.';
      setSubmitError(message);
      setSubmitting(false);
    }
  };

  if (!checkedUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!token) {
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
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-left text-sm text-[var(--color-error)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This invite link is missing its token. Please use the link from your invitation email.</span>
          </div>
          <Link
            href={SUPPORT_URL}
            target="_blank"
            className="inline-flex w-full justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 transition-all"
          >
            Contact admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-sm space-y-6 glass p-8 rounded-[var(--radius-xl)] shadow-lg">
        <div className="text-center space-y-2">
          <Image
            src="/logo.png"
            alt="Meal Direct"
            width={64}
            height={64}
            priority
            className="mx-auto h-16 w-16 rounded-3xl shadow-sm"
          />
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Accept your invitation
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">Set a password to activate your vendor account.</p>
        </div>

        {submitError && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
            {submitError === INVALID_INVITE_MESSAGE && (
              <Link
                href={SUPPORT_URL}
                target="_blank"
                className="block text-center text-xs text-[var(--color-primary)] hover:underline"
              >
                Contact admin
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoComplete="email"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="vendor@example.com"
            />
            {fieldErrors.email && <p className="text-xs text-[var(--color-error)]">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
              Full name <span className="normal-case font-normal text-[var(--color-muted-foreground)]">(optional)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              autoComplete="name"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="Ada Okafor"
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
              disabled={submitting}
              autoComplete="new-password"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="••••••••"
            />
            {fieldErrors.password && <p className="text-xs text-[var(--color-error)]">{fieldErrors.password}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
              Confirm password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              autoComplete="new-password"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="••••••••"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-[var(--color-error)]">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-all disabled:opacity-50"
          >
            {submitting ? 'Activating…' : 'Activate account'}
          </button>
        </form>
      </div>
    </div>
  );
}
