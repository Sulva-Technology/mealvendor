'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, KeyRound, Plus, Printer, Trash2, Wifi, WifiOff } from 'lucide-react';
import { TonalCard } from '@/src/components/shared/Cards';
import { Modal } from '@/src/components/shared/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { printingApi, qk } from '@/src/lib/api/vendor';
import type { PaperWidth, PrintJob, PrintJobStatus, PrinterRegistration, VendorPrinter } from '@/src/lib/api/types';
import { formatDateTime, formatRelative } from '@/src/lib/format';
import { FeatureFlag, useFeatureFlag } from '@/src/lib/hooks/useFeatureFlag';

const PAPER_WIDTHS: { value: PaperWidth; label: string }[] = [
  { value: 48, label: '80 mm paper (48 chars)' },
  { value: 42, label: '80 mm, large font (42 chars)' },
  { value: 32, label: '58 mm paper (32 chars)' },
];

const JOB_FILTERS: { value: PrintJobStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'pending', label: 'Waiting' },
  { value: 'printed', label: 'Printed' },
  { value: 'failed', label: 'Failed' },
];

const JOB_CHIP: Record<PrintJobStatus, { status: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  pending: { status: 'info', label: 'Waiting' },
  printing: { status: 'warning', label: 'Printing' },
  printed: { status: 'success', label: 'Printed' },
  failed: { status: 'error', label: 'Failed' },
  cancelled: { status: 'default', label: 'Cancelled' },
};

const MAC_RE = /^([0-9a-f]{2}[:-]?){5}[0-9a-f]{2}$/i;

export default function PrintersPage() {
  const enabled = useFeatureFlag(FeatureFlag.CLOUD_PRINTING);
  const queryClient = useQueryClient();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [issued, setIssued] = useState<PrinterRegistration | null>(null);
  const [jobFilter, setJobFilter] = useState<PrintJobStatus | undefined>(undefined);

  const printersQ = useQuery({ queryKey: qk.printers(), queryFn: printingApi.list, refetchInterval: 30_000 });
  const jobsQ = useQuery({
    queryKey: qk.printJobs(jobFilter),
    queryFn: () => printingApi.jobs({ status: jobFilter, limit: 50 }),
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.printers() });
    queryClient.invalidateQueries({ queryKey: ['vendor', 'print-jobs'] });
  };

  const rotate = useMutation({
    mutationFn: (id: string) => printingApi.rotateKey(id),
    onSuccess: (reg) => {
      setIssued(reg);
      invalidate();
    },
  });
  const revoke = useMutation({ mutationFn: (id: string) => printingApi.revoke(id), onSuccess: invalidate });
  const testPrint = useMutation({ mutationFn: (id: string) => printingApi.testPrint(id), onSuccess: invalidate });

  const printers = printersQ.data ?? [];
  const actionError = rotate.error ?? revoke.error ?? testPrint.error;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Kitchen printers</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Every paid order prints a kitchen ticket automatically at the slot cutoff. No phone needed.
          </p>
        </div>
        {enabled && (
          <button
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary)]/90"
          >
            <Plus className="h-4 w-4" /> Add printer
          </button>
        )}
      </div>

      {!enabled && (
        <TonalCard className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
          <p className="text-sm text-[var(--color-foreground)]">
            Cloud printing is not switched on for your store yet. Contact Meal Direct support to join the rollout.
          </p>
        </TonalCard>
      )}

      {actionError && (
        <p className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-3 text-sm text-[var(--color-error)]">
          {(actionError as Error).message}
        </p>
      )}
      {testPrint.isSuccess && (
        <p className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-3 text-sm text-[var(--color-success)]">
          Test ticket queued. It prints within a few seconds if the printer is online.
        </p>
      )}

      <TonalCard className="overflow-hidden p-0">
        <div className="border-b border-[var(--color-border)] bg-gray-50 p-4">
          <h2 className="text-base font-semibold">Your printers</h2>
        </div>
        {printersQ.isLoading ? (
          <LoadingState rows={2} />
        ) : printersQ.isError ? (
          <ErrorState error={printersQ.error} onRetry={() => printersQ.refetch()} />
        ) : printers.length === 0 ? (
          <EmptyState title="No printer yet" description="Add a Star CloudPRNT printer (e.g. mC-Print3, TSP143IV) to start printing tickets." />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {printers.map((p) => (
              <PrinterRow
                key={p.id}
                printer={p}
                enabled={enabled}
                busy={rotate.isPending || revoke.isPending || testPrint.isPending}
                onTest={() => testPrint.mutate(p.id)}
                onRotate={() => {
                  if (confirm(`Issue a new server URL for "${p.name}"? The old URL stops working immediately and must be replaced in the printer.`)) rotate.mutate(p.id);
                }}
                onRevoke={() => {
                  if (confirm(`Remove "${p.name}"? It will stop printing tickets.`)) revoke.mutate(p.id);
                }}
              />
            ))}
          </div>
        )}
      </TonalCard>

      <TonalCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold">Recent tickets</h2>
          <div className="flex flex-wrap gap-2">
            {JOB_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setJobFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  jobFilter === f.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-foreground)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {jobsQ.isLoading ? (
          <LoadingState rows={3} />
        ) : jobsQ.isError ? (
          <ErrorState error={jobsQ.error} onRetry={() => jobsQ.refetch()} />
        ) : (jobsQ.data ?? []).length === 0 ? (
          <EmptyState title="No tickets" description="Tickets appear here once orders are paid." />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {(jobsQ.data ?? []).map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </TonalCard>

      <TonalCard>
        <h2 className="mb-3 text-base font-semibold">How printing works</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--color-muted-foreground)]">
          <li>Tickets print at the slot cutoff; orders paid after cutoff print immediately.</li>
          <li>If the printer is offline, tickets wait and print when it reconnects (within 12 hours).</li>
          <li>Paper out or cover open: the ticket retries, and shows as failed after 5 attempts. Use Reprint on the order.</li>
          <li>Cancelled or refunded orders never print.</li>
        </ul>
      </TonalCard>

      <RegisterPrinterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={(reg) => {
          setRegisterOpen(false);
          setIssued(reg);
          invalidate();
        }}
      />
      <ServerUrlModal registration={issued} onClose={() => setIssued(null)} />
    </div>
  );
}

function PrinterRow({
  printer,
  enabled,
  busy,
  onTest,
  onRotate,
  onRevoke,
}: {
  printer: VendorPrinter;
  enabled: boolean;
  busy: boolean;
  onTest: () => void;
  onRotate: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
          <Printer className="h-5 w-5 text-gray-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{printer.name}</p>
            {printer.online ? (
              <StatusChip status="success" label="Online" />
            ) : (
              <StatusChip status="default" label="Offline" />
            )}
          </div>
          <p className="font-mono text-xs text-[var(--color-muted-foreground)]">{printer.macAddress}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
            {printer.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {printer.lastSeenAt ? `Last seen ${formatRelative(printer.lastSeenAt)}` : 'Never connected — paste the server URL into the printer'}
            {' · '}
            {printer.paperWidthChars} chars
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {enabled && (
          <RowButton onClick={onTest} disabled={busy} icon={Printer} label="Test print" />
        )}
        <RowButton onClick={onRotate} disabled={busy} icon={KeyRound} label="New URL" />
        <RowButton onClick={onRevoke} disabled={busy} icon={Trash2} label="Remove" danger />
      </div>
    </div>
  );
}

function RowButton({
  onClick,
  disabled,
  icon: Icon,
  label,
  danger,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${
        danger
          ? 'border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/5'
          : 'border-[var(--color-border)] bg-white hover:bg-gray-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function JobRow({ job }: { job: PrintJob }) {
  const chip = JOB_CHIP[job.status];
  const title = job.kind === 'test' ? 'Test ticket' : `Order ${job.orderNumber ?? ''}`.trim();
  return (
    <div className="flex items-center justify-between gap-4 p-4 text-sm">
      <div>
        {job.orderId ? (
          <Link href={`/orders/${job.orderId}`} className="font-medium text-[var(--color-primary)] hover:underline">
            {title}
          </Link>
        ) : (
          <p className="font-medium">{title}</p>
        )}
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {job.printedAt ? `Printed ${formatDateTime(job.printedAt)}` : `Prints ${formatDateTime(job.printAfter)}`}
          {job.attempts > 0 && ` · ${job.attempts} attempt(s)`}
        </p>
        {job.lastError && <p className="text-xs text-[var(--color-error)]">{job.lastError}</p>}
      </div>
      <StatusChip status={chip.status} label={chip.label} />
    </div>
  );
}

function RegisterPrinterModal({
  open,
  onClose,
  onRegistered,
}: {
  open: boolean;
  onClose: () => void;
  onRegistered: (reg: PrinterRegistration) => void;
}) {
  const [name, setName] = useState('Kitchen printer');
  const [mac, setMac] = useState('');
  const [width, setWidth] = useState<PaperWidth>(48);
  const register = useMutation({
    mutationFn: () => printingApi.register({ name: name.trim(), macAddress: mac.trim(), paperWidthChars: width }),
    onSuccess: (reg) => {
      setMac('');
      onRegistered(reg);
    },
  });
  const macValid = MAC_RE.test(mac.trim());

  return (
    <Modal open={open} onClose={onClose} title="Add printer" description="Find the MAC address on the printer's self-test page (hold FEED while powering on).">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (macValid && name.trim()) register.mutate();
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">MAC address</span>
          <input
            value={mac}
            onChange={(e) => setMac(e.target.value)}
            placeholder="00:11:62:AA:BB:CC"
            required
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 font-mono"
          />
          {mac && !macValid && <span className="mt-1 block text-xs text-[var(--color-error)]">Enter 12 hex characters, e.g. 00:11:62:AA:BB:CC</span>}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Paper</span>
          <select
            value={width}
            onChange={(e) => setWidth(Number(e.target.value) as PaperWidth)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
          >
            {PAPER_WIDTHS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        {register.isError && <p className="text-sm text-[var(--color-error)]">{(register.error as Error).message}</p>}
        <button
          type="submit"
          disabled={!macValid || !name.trim() || register.isPending}
          className="w-full rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {register.isPending ? 'Adding…' : 'Add printer'}
        </button>
      </form>
    </Modal>
  );
}

function ServerUrlModal({ registration, onClose }: { registration: PrinterRegistration | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!registration) return;
    try {
      await navigator.clipboard.writeText(registration.serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the URL is selectable below */
    }
  };

  return (
    <Modal
      open={!!registration}
      onClose={onClose}
      title="Connect your printer"
      description="This URL is shown only once. Copy it now — if you lose it, use “New URL”."
      size="lg"
    >
      {registration && (
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-[var(--color-border)] bg-gray-50 p-3">
            <p className="break-all font-mono text-xs select-all">{registration.serverUrl}</p>
          </div>
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy URL'}
          </button>
          <ol className="list-decimal space-y-1.5 pl-5 text-[var(--color-muted-foreground)]">
            <li>Connect the printer to Wi-Fi or Ethernet and print a self-test page to get its IP address.</li>
            <li>Open <span className="font-mono">http://&lt;printer-ip&gt;</span> in a browser on the same network and log in.</li>
            <li>Go to CloudPRNT settings, enable CloudPRNT and paste this URL as the Server URL. Set polling to 5 seconds.</li>
            <li>Save and restart the printer. It shows as Online here within a minute — then tap Test print.</li>
          </ol>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
