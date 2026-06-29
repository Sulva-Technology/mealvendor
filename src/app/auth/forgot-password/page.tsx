'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { authApi } from '@/src/lib/api/vendor';
import { ApiError } from '@/src/lib/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      // Don't leak whether an account exists — only surface real failures
      // (network / server), and treat a 4xx the same as success privacy-wise.
      if (err instanceof ApiError && err.status === 0) {
        setError(
          'Could not reach the server. It may be waking up — please try again.'
        );
      } else {
        // For any other response, show the neutral confirmation.
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

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
            Reset password
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 p-3 text-sm text-[var(--color-success)]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                If an account exists for <strong>{email}</strong>, a reset link
                is on its way. Check your inbox and spam folder.
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
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
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-all disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
