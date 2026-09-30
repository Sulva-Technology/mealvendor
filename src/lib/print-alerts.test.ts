import { describe, expect, it } from 'vitest';
import type { PrintJob } from '@/src/lib/api/types';
import { unprintedTickets } from './print-alerts';

const NOW = Date.parse('2026-09-30T12:00:00Z');
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

function job(overrides: Partial<PrintJob>): PrintJob {
  return {
    id: 'j',
    vendorId: 'v',
    orderId: 'o',
    orderNumber: 'MD-1',
    kind: 'order',
    status: 'pending',
    printAfter: minsAgo(0),
    attempts: 0,
    printedAt: null,
    lastError: null,
    createdAt: minsAgo(30),
    ...overrides,
  };
}

describe('unprintedTickets', () => {
  it('flags failed jobs and pending jobs overdue by more than 5 minutes', () => {
    const jobs = [
      job({ id: 'failed', status: 'failed', printAfter: minsAgo(1) }),
      job({ id: 'overdue', status: 'pending', printAfter: minsAgo(10) }),
      job({ id: 'stuck-lease', status: 'printing', printAfter: minsAgo(10) }),
    ];
    expect(unprintedTickets(jobs, NOW).map((j) => j.id)).toEqual(['failed', 'overdue', 'stuck-lease']);
  });

  it('ignores fresh, printed, cancelled, test and stale (>12h) jobs', () => {
    const jobs = [
      job({ id: 'fresh', status: 'pending', printAfter: minsAgo(2) }),
      job({ id: 'future', status: 'pending', printAfter: minsAgo(-60) }),
      job({ id: 'printed', status: 'printed', printAfter: minsAgo(30) }),
      job({ id: 'cancelled', status: 'cancelled', printAfter: minsAgo(30) }),
      job({ id: 'test', kind: 'test', orderId: null, status: 'failed', printAfter: minsAgo(30) }),
      job({ id: 'stale', status: 'failed', printAfter: minsAgo(13 * 60) }),
    ];
    expect(unprintedTickets(jobs, NOW)).toEqual([]);
  });
});
