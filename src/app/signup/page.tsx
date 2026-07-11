'use client';

import React, { useState } from 'react';
import { AlertCircle, MailCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/src/lib/api/vendor';
import { useAuthStore } from '@/src/lib/auth/session';
import { ApiError } from '@/src/lib/api/client';

const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL || 'https://mealdirectly.com/terms';
const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL || 'https://mealdirectly.com/privacy';

type FieldErrors = Partial<Record<'email' | 'password' | 'confirmPassword', string>>;

/**
 * Self-serve vendor signup. Creates the account via POST /auth/vendor/signup.
 * The backend emails a confirmation link (landing on /auth/callback) and does
 * NOT issue a session until the vendor confirms, so we show a check-your-email
 * state. A freshly confirmed vendor has no vendor_id yet — VendorGuard routes
 * them to /onboarding on first sign-in.
 */
export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

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
    if (!validate()) return;
    setSubmitting(true);
    try {
      const session = await authApi.signup(email.trim(), password);
      if (!session?.authed) {
        // No session issued — email confirmation required first.
        setConfirmSent(true);
        setSubmitting(false);
        return;
      }
      setSession(session);
      router.replace('/');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? 'An account with this email already exists. Try signing in instead.'
            : err.status === 0
              ? 'Could not reach the server. It may be waking up — please try again.'
              : err.message
          : (err as Error).message || 'An error occurred. Please try again.';
      setSubmitError(message);
      setSubmitting(false);
    }
  };

  // Re-send confirmation. Endpoint is 200 non-enumerating; treat any non-network
  // response as success and show a neutral acknowledgement.
  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendConfirmation(email.trim());
      setResent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setSubmitError('Could not reach the server. It may be waking up — please try again.');
      } else {
        setResent(true);
      }
    } finally {
      setResending(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="w-full max-w-sm space-y-6 glass p-8 rounded-[var(--radius-xl)] shadow-lg text-center">
          <Image
            src="/icon-192.png"
            alt="Meal Direct"
            width={64}
            height={64}
            priority
            className="mx-auto h-16 w-16 rounded-2xl shadow-sm"
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
            <MailCheck className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              Check your email
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              We&apos;ve sent a confirmation link to{' '}
              <span className="font-medium text-[var(--color-foreground)]">{email}</span>. Click it to
              verify your email, then sign in to finish setting up your store.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex w-full justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 transition-all"
          >
            Go to sign in
          </Link>
          {resent ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              A new link is on its way. Check your inbox and spam folder.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
            >
              {resending ? 'Resending…' : "Didn't get it? Resend confirmation email"}
            </button>
          )}
        </div>
      </div>
    );
  }

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
            Create your vendor account
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">Sell on Meal Direct.</p>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
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
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-muted-foreground)]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-[var(--color-muted-foreground)]">
          By creating an account, you agree to our{' '}
          <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
