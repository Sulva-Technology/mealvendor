'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, CheckCircle2, Clock } from 'lucide-react';
import Image from 'next/image';
import { campusesApi, onboardingApi, authApi } from '@/src/lib/api/vendor';
import { useAuthStore } from '@/src/lib/auth/session';
import { ApiError } from '@/src/lib/api/client';
import type { Campus, VendorProfile } from '@/src/lib/api/types';

const PHONE_RE = /^[+0-9][0-9 ()-]{6,24}$/;

type FieldErrors = Partial<Record<'campusId' | 'legalName' | 'displayName' | 'phone', string>>;

export default function OnboardingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const vendorId = useAuthStore((s) => s.vendorId);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setSession = useAuthStore((s) => s.setSession);

  // Start false so server prerender and first client paint agree; the effect
  // flips it once zustand's persisted state has hydrated (client-only).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // Bounce out if not authenticated, or already onboarded.
  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) router.replace('/login');
    else if (vendorId) router.replace('/');
  }, [hydrated, accessToken, vendorId, router]);

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusesError, setCampusesError] = useState<string | null>(null);
  const [loadingCampuses, setLoadingCampuses] = useState(true);

  const [form, setForm] = useState({ campusId: '', legalName: '', displayName: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaiting, setAwaiting] = useState<VendorProfile | null>(null);

  const loadCampuses = async () => {
    setLoadingCampuses(true);
    setCampusesError(null);
    try {
      const list = await campusesApi.list();
      setCampuses(list.filter((c) => c.active));
    } catch (err) {
      setCampusesError(
        err instanceof ApiError ? err.message : 'Could not load campuses. Please retry.'
      );
    } finally {
      setLoadingCampuses(false);
    }
  };

  useEffect(() => {
    loadCampuses();
  }, []);

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!form.campusId) e.campusId = 'Select your campus.';
    if (form.legalName.trim().length < 2 || form.legalName.trim().length > 160)
      e.legalName = 'Must be 2–160 characters.';
    if (form.displayName.trim().length < 2 || form.displayName.trim().length > 160)
      e.displayName = 'Must be 2–160 characters.';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim()))
      e.phone = 'Enter a valid phone number.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  /** Refresh tokens so the new vendor_id lands in the JWT. Mandatory after onboard. */
  const refreshAndContinue = async (vendor?: VendorProfile) => {
    if (!refreshToken) {
      setSubmitError('Your session expired. Please sign in again.');
      router.replace('/login');
      return;
    }
    const fresh = await authApi.refresh(refreshToken);
    if (!fresh?.accessToken) {
      setSubmitError('Could not refresh your session. Please sign in again.');
      return;
    }
    setSession(fresh);
    // Vendors are auto-approved today, but honor status if the backend gates it.
    if (vendor && vendor.status !== 'approved') {
      setAwaiting(vendor);
      return;
    }
    router.replace('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await onboardingApi.submit({
        campusId: form.campusId,
        legalName: form.legalName.trim(),
        displayName: form.displayName.trim(),
        phone: form.phone.trim() || undefined,
      });
      await refreshAndContinue(result?.vendor);
    } catch (err) {
      await handleSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitError = async (err: unknown) => {
    if (!(err instanceof ApiError)) {
      setSubmitError((err as Error).message || 'Something went wrong. Please try again.');
      return;
    }
    const msg = err.message || '';
    // Already onboarded elsewhere — recover by refreshing and continuing.
    if (err.status === 409) {
      try {
        await refreshAndContinue();
        return;
      } catch {
        setSubmitError('Your account is already set up. Please sign in again.');
        router.replace('/login');
        return;
      }
    }
    if (err.status === 401) {
      router.replace('/login');
      return;
    }
    if (err.status === 403) {
      setSubmitError('This account is not a vendor account. Please sign in with a vendor login.');
      return;
    }
    if (err.status === 404) {
      setSubmitError('Onboarding is not available yet. Please try again later or contact support.');
      return;
    }
    if (err.status === 400) {
      if (/campus/i.test(msg)) {
        setFieldErrors((f) => ({ ...f, campusId: 'That campus is no longer available.' }));
        loadCampuses();
        return;
      }
      // Map any field-level details the backend returns.
      const details = err.details ?? [];
      if (Array.isArray(details) && details.length) {
        const fe: FieldErrors = {};
        for (const d of details as any[]) {
          const field = d?.field || d?.path;
          if (field && ['campusId', 'legalName', 'displayName', 'phone'].includes(field)) {
            fe[field as keyof FieldErrors] = d?.message || 'Invalid value.';
          }
        }
        if (Object.keys(fe).length) {
          setFieldErrors((prev) => ({ ...prev, ...fe }));
          return;
        }
      }
      setSubmitError(msg || 'Please check the form and try again.');
      return;
    }
    setSubmitError(msg || 'Something went wrong. Please try again.');
  };

  if (!hydrated || (accessToken && vendorId) || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (awaiting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="w-full max-w-md space-y-4 glass p-8 rounded-[var(--radius-xl)] shadow-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-warning)]/10">
            <Clock className="h-7 w-7 text-[var(--color-warning)]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-foreground)]">
            Awaiting approval
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Thanks, {awaiting.displayName}. Your store has been submitted and is pending review.
            You&apos;ll get access to the dashboard once Meal Direct approves your account.
          </p>
          <button
            onClick={() => router.replace('/')}
            className="w-full py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-md space-y-6 glass p-8 rounded-[var(--radius-xl)] shadow-lg">
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
            Set up your store
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            A few details to finish creating your vendor account.
          </p>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Campus" error={fieldErrors.campusId}>
            {campusesError ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                <span className="text-[var(--color-muted-foreground)]">{campusesError}</span>
                <button type="button" onClick={loadCampuses} className="font-medium text-[var(--color-primary)] hover:underline">
                  Retry
                </button>
              </div>
            ) : (
              <select
                value={form.campusId}
                onChange={(e) => setForm((f) => ({ ...f, campusId: e.target.value }))}
                disabled={loadingCampuses || submitting}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
                <option value="">{loadingCampuses ? 'Loading campuses…' : 'Select your campus'}</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Legal / business name" error={fieldErrors.legalName}>
            <input
              type="text"
              value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              disabled={submitting}
              placeholder="Ada Foods Ltd"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </Field>

          <Field label="Display name" hint="Shown to customers" error={fieldErrors.displayName}>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              disabled={submitting}
              placeholder="Ada's Kitchen"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </Field>

          <Field label="Phone" hint="Optional" error={fieldErrors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              disabled={submitting}
              placeholder="+234 800 000 0000"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Setting up…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Complete setup
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-wider">{label}</label>
        {hint && <span className="text-xs text-[var(--color-muted-foreground)]">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
}
