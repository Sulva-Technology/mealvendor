import type { PrintJob } from '@/src/lib/api/types';

/** A ticket still waiting this long after its print time means the printer is offline or jammed. */
const OVERDUE_MS = 5 * 60_000;
/** Backend never auto-prints jobs older than 12 h, so older ones are no longer actionable here. */
const WINDOW_MS = 12 * 60 * 60_000;

export function unprintedTickets(jobs: PrintJob[], now = Date.now()): PrintJob[] {
  return jobs.filter((job) => {
    if (job.kind !== 'order') return false;
    const due = new Date(job.printAfter).getTime();
    if (Number.isNaN(due) || due < now - WINDOW_MS) return false;
    if (job.status === 'failed') return true;
    return (job.status === 'pending' || job.status === 'printing') && due < now - OVERDUE_MS;
  });
}
