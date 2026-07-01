'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { Modal } from '@/src/components/shared/Modal';
import { LoadingState, ErrorState } from '@/src/components/shared/QueryStates';
import { profileApi, authApi, notificationsApi, qk } from '@/src/lib/api/vendor';
import { useAuthStore } from '@/src/lib/auth/session';
import { useVendorApproval } from '@/src/lib/hooks/useVendorApproval';
import type { DeliveryMode, VendorPayoutAccount, VendorProfile } from '@/src/lib/api/types';
import { formatNaira } from '@/src/lib/format';
import {
  Store,
  Truck,
  LogOut,
  Check,
  AlertCircle,
  CreditCard,
  Coins,
  BellRing,
  Loader2,
} from 'lucide-react';
import {
  getBrowserPushReadiness,
  getCurrentPushSubscription,
  requestPushSubscription,
  toPushSubscriptionPayload,
  type PushReadiness,
} from '@/src/lib/push-notifications';

// Platform fallback when a vendor sets no override (kept in sync with backend default).
const DEFAULT_SERVICE_FEE_KOBO = 20000; // ₦200

function PayoutModal({
  existing,
  onClose,
}: {
  existing: VendorPayoutAccount | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    bankName: existing?.bankName ?? '',
    bankCode: existing?.bankCode ?? '',
    accountName: existing?.accountName ?? '',
    accountNumber: '',
  });

  const valid =
    form.bankName.trim() && form.accountName.trim() && form.accountNumber.trim().length >= 6;

  const save = useMutation({
    mutationFn: () =>
      profileApi.updatePayoutAccount({
        bankName: form.bankName.trim(),
        bankCode: form.bankCode.trim() || undefined,
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.payoutAccount() });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Update payout account' : 'Add payout account'}
      description="Settlements are paid here via Paystack. Account details are verified before payout."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Bank name</label>
          <input
            type="text"
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            placeholder="e.g. Guaranty Trust Bank"
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-foreground)]">
              Bank code <span className="text-[var(--color-muted-foreground)] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.bankCode}
              onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))}
              placeholder="e.g. 058"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-foreground)]">Account number</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.accountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/[^0-9]/g, '') }))
              }
              placeholder={existing ? existing.maskedAccountNumber : '0123456789'}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Account name</label>
          <input
            type="text"
            value={form.accountName}
            onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
            placeholder="Account holder name"
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        {save.isError && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(save.error as Error).message}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-foreground)] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || save.isPending}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : existing ? 'Update account' : 'Save account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ServiceFeeCard({ profile }: { profile: VendorProfile }) {
  const queryClient = useQueryClient();
  const hasOverride = profile.serviceFeeKobo != null;
  const [useDefault, setUseDefault] = useState(!hasOverride);
  const [naira, setNaira] = useState(
    hasOverride ? String((profile.serviceFeeKobo as number) / 100) : ''
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const override = profile.serviceFeeKobo != null;
    setUseDefault(!override);
    setNaira(override ? String((profile.serviceFeeKobo as number) / 100) : '');
  }, [profile.serviceFeeKobo]);

  const parsedKobo = useDefault ? null : Math.round((Number(naira) || 0) * 100);
  const inputInvalid = !useDefault && (naira.trim() === '' || Number(naira) < 0 || Number.isNaN(Number(naira)));

  const save = useMutation({
    mutationFn: () => profileApi.update({ serviceFeeKobo: parsedKobo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.profile() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <TonalCard>
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-gray-100 rounded-xl">
          <Coins className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Takeaway / Packaging Fee</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Charged per order to cover packaging. Leave on the default unless you need your own rate.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label
          className={`p-4 border rounded-lg flex items-start gap-3 cursor-pointer ${useDefault ? 'border-[var(--color-primary)]/30 bg-[var(--color-info)]/5' : 'border-[var(--color-border)]'}`}
        >
          <input
            type="radio"
            name="service_fee_mode"
            checked={useDefault}
            onChange={() => setUseDefault(true)}
            className="mt-1 w-4 h-4 text-[var(--color-primary)]"
          />
          <div>
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              Use platform default ({formatNaira(DEFAULT_SERVICE_FEE_KOBO)})
            </span>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              No override — the standard Meal Direct packaging fee applies.
            </p>
          </div>
        </label>

        <label
          className={`p-4 border rounded-lg flex items-start gap-3 cursor-pointer ${!useDefault ? 'border-[var(--color-primary)]/30 bg-[var(--color-info)]/5' : 'border-[var(--color-border)]'}`}
        >
          <input
            type="radio"
            name="service_fee_mode"
            checked={!useDefault}
            onChange={() => setUseDefault(false)}
            className="mt-1 w-4 h-4 text-[var(--color-primary)]"
          />
          <div className="flex-1">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">Set my own fee</span>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1 mb-3">
              Your campus sets a maximum; if you exceed it the save is rejected with the limit.
            </p>
            <div className="relative max-w-[180px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted-foreground)]">
                ₦
              </span>
              <input
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                value={naira}
                disabled={useDefault}
                onFocus={() => setUseDefault(false)}
                onChange={(e) => setNaira(e.target.value)}
                placeholder="150"
                className="w-full pl-7 pr-3 py-2 border border-[var(--color-border)] rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>
          </div>
        </label>

        {save.isError && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(save.error as Error).message}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || inputInvalid}
            className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saved && <Check className="w-4 h-4" />}
            {save.isPending ? 'Saving…' : saved ? 'Saved' : 'Save Fee'}
          </button>
        </div>
      </div>
    </TonalCard>
  );
}

const PUSH_STATUS_COPY: Record<PushReadiness['reason'], string> = {
  ready: 'Ready on this device',
  feature_disabled: 'Unavailable in this environment',
  missing_vapid_key: 'Waiting for push configuration',
  unsupported_browser: 'Not supported by this browser',
  permission_denied: 'Blocked by browser permission',
};

function PushNotificationsCard() {
  const [readiness, setReadiness] = useState<PushReadiness>({
    ready: false,
    reason: 'unsupported_browser',
  });
  const [enabledOnDevice, setEnabledOnDevice] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    const nextReadiness = getBrowserPushReadiness();
    setReadiness(nextReadiness);
    const subscription = nextReadiness.ready
      ? await getCurrentPushSubscription().catch(() => null)
      : null;
    setEnabledOnDevice(Boolean(subscription));
    setChecking(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const enable = useMutation({
    mutationFn: async () => {
      setMessage(null);
      const subscription = await requestPushSubscription();
      await notificationsApi.registerPushSubscription({
        ...toPushSubscriptionPayload(subscription),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
    },
    onSuccess: () => {
      setMessage('Push notifications enabled for this device.');
      refresh();
    },
    onError: (error) => {
      setMessage((error as Error).message);
      refresh();
    },
  });

  const disable = useMutation({
    mutationFn: async () => {
      setMessage(null);
      const subscription = await getCurrentPushSubscription();
      if (!subscription) return;
      const endpoint = subscription.endpoint;
      if (subscription.unsubscribe) await subscription.unsubscribe();
      await notificationsApi.deletePushSubscription(endpoint);
    },
    onSuccess: () => {
      setMessage('Push notifications disabled for this device.');
      refresh();
    },
    onError: (error) => {
      setMessage((error as Error).message);
      refresh();
    },
  });

  const busy = checking || enable.isPending || disable.isPending;
  const canEnable = readiness.ready && !enabledOnDevice && !busy;
  const canDisable = readiness.ready && enabledOnDevice && !busy;

  return (
    <TonalCard>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-gray-100 p-3">
            <BellRing className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Push Notifications</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              New orders and urgent vendor alerts on this device.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <span
            className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium ${
              enabledOnDevice
                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                : readiness.ready
                  ? 'bg-[var(--color-info)]/10 text-[var(--color-info)]'
                  : 'bg-gray-100 text-[var(--color-muted-foreground)]'
            }`}
          >
            {checking ? 'Checking device' : enabledOnDevice ? 'Enabled' : PUSH_STATUS_COPY[readiness.reason]}
          </span>

          {enabledOnDevice ? (
            <button
              type="button"
              onClick={() => disable.mutate()}
              disabled={!canDisable}
              className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Disable
            </button>
          ) : (
            <button
              type="button"
              onClick={() => enable.mutate()}
              disabled={!canEnable}
              className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Enable
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-gray-50 px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          {message}
        </div>
      )}
    </TonalCard>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  const { isApproved } = useVendorApproval();
  const [signingOut, setSigningOut] = useState(false);
  const [editingPayout, setEditingPayout] = useState(false);

  const profileQ = useQuery({ queryKey: qk.profile(), queryFn: profileApi.get });
  const payoutQ = useQuery({ queryKey: qk.payoutAccount(), queryFn: profileApi.getPayoutAccount });

  const [form, setForm] = useState({
    displayName: '',
    phone: '',
    description: '',
    defaultDeliveryMode: 'vendor_delivery' as DeliveryMode,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = profileQ.data;
    if (p) {
      setForm({
        displayName: p.displayName ?? '',
        phone: p.phone ?? '',
        description: p.description ?? '',
        defaultDeliveryMode: p.defaultDeliveryMode,
      });
    }
  }, [profileQ.data]);

  const save = useMutation({
    mutationFn: () =>
      profileApi.update({
        displayName: form.displayName,
        phone: form.phone || null,
        description: form.description || null,
        defaultDeliveryMode: form.defaultDeliveryMode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.profile() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    await authApi.logout();
    clearSession();
    queryClient.clear();
    router.replace('/login');
  };

  if (profileQ.isLoading) return <LoadingState label="Loading settings…" />;
  if (profileQ.isError) return <ErrorState error={profileQ.error} onRetry={() => profileQ.refetch()} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Store Settings</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Manage your vendor profile and delivery configurations.</p>
      </div>

      <div className="grid gap-6">
        <TonalCard>
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gray-100 rounded-xl">
              <Store className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Basic Profile</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">Your public store identifying details.</p>
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-foreground)]">Display Name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-foreground)]">Contact Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-foreground)]">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {save.isError && (
                <span className="text-xs text-[var(--color-error)] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {(save.error as Error).message}
                </span>
              )}
              <button
                type="submit"
                disabled={save.isPending}
                className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {saved && <Check className="w-4 h-4" />}
                {save.isPending ? 'Saving…' : saved ? 'Saved' : 'Save Changes'}
              </button>
            </div>
          </form>
        </TonalCard>

        <TonalCard>
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gray-100 rounded-xl">
              <Truck className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Delivery Mode</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">Configure how orders are delivered to customers.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className={`p-4 border rounded-lg flex items-start gap-3 cursor-pointer ${form.defaultDeliveryMode === 'vendor_delivery' ? 'border-[var(--color-primary)]/30 bg-[var(--color-info)]/5' : 'border-[var(--color-border)]'}`}>
              <input
                type="radio"
                name="delivery_mode"
                checked={form.defaultDeliveryMode === 'vendor_delivery'}
                onChange={() => setForm((f) => ({ ...f, defaultDeliveryMode: 'vendor_delivery' }))}
                className="mt-1 w-4 h-4 text-[var(--color-primary)]"
              />
              <div>
                <span className="text-sm font-semibold text-[var(--color-foreground)]">Vendor Handled Delivery</span>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">You handle deliveries and receive the delivery share per eligible completed order.</p>
              </div>
            </label>

            <label className={`p-4 border rounded-lg flex items-start gap-3 cursor-pointer ${form.defaultDeliveryMode === 'meal_direct_rider' ? 'border-[var(--color-primary)]/30 bg-[var(--color-info)]/5' : 'border-[var(--color-border)]'}`}>
              <input
                type="radio"
                name="delivery_mode"
                checked={form.defaultDeliveryMode === 'meal_direct_rider'}
                onChange={() => setForm((f) => ({ ...f, defaultDeliveryMode: 'meal_direct_rider' }))}
                className="mt-1 w-4 h-4 text-[var(--color-primary)]"
              />
              <div>
                <span className="text-sm font-semibold text-[var(--color-foreground)]">Meal Direct Riders</span>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Meal Direct riders collect and drop off packages. The delivery share goes to the riders.</p>
              </div>
            </label>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-60"
              >
                Update Delivery Mode
              </button>
            </div>
          </div>
        </TonalCard>

        {profileQ.data && <ServiceFeeCard profile={profileQ.data} />}

        <PushNotificationsCard />

        <TonalCard>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Truck className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Payout Account</h2>
                <p className="text-sm text-[var(--color-muted-foreground)]">Where settlements are paid via Paystack.</p>
              </div>
            </div>
            <button
              onClick={() => setEditingPayout(true)}
              disabled={payoutQ.isLoading || !isApproved}
              title={!isApproved ? 'Available once your vendor account is approved' : undefined}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-foreground)] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              {payoutQ.data ? 'Edit' : 'Add account'}
            </button>
          </div>
          {payoutQ.data ? (
            <div className="grid sm:grid-cols-3 gap-4 text-sm border-t border-[var(--color-border)] pt-4">
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide mb-1">Bank</p>
                <p className="font-medium">{payoutQ.data.bankName}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide mb-1">Account</p>
                <p className="font-medium tabular-nums">{payoutQ.data.maskedAccountNumber}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide mb-1">Name</p>
                <p className="font-medium">{payoutQ.data.accountName}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)] border-t border-[var(--color-border)] pt-4">
              No payout account on file. Add your bank details so Meal Direct can settle your earnings.
            </p>
          )}
        </TonalCard>

        {editingPayout && (
          <PayoutModal existing={payoutQ.data ?? null} onClose={() => setEditingPayout(false)} />
        )}

        <TonalCard className="border-red-100">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-red-600">Session & Security</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">Sign out of the vendor portal.</p>
            </div>
          </div>
          <div className="flex justify-end border-t border-[var(--color-border)] pt-4 mt-2">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center min-w-[120px]"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </TonalCard>
      </div>
    </div>
  );
}
