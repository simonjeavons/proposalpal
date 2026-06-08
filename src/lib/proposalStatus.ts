import type { Proposal } from '@/types/proposal';

/**
 * Single source of truth for whether a proposal is expired.
 *
 * A proposal is expired when EITHER:
 *  - it has been explicitly marked `status === 'expired'`, OR
 *  - its `valid_until` date has passed.
 *
 * Accepted proposals are won deals and never expire by date.
 * Computed on read — opening an expired proposal never mutates the row.
 */
export function isProposalExpired(
  p: Pick<Proposal, 'status' | 'valid_until'>
): boolean {
  if (p.status === 'expired') return true;
  if (p.status === 'accepted') return false;
  if (!p.valid_until) return false;
  // valid_until is a DATE string (YYYY-MM-DD); expired once the day has fully passed.
  return new Date(p.valid_until + 'T23:59:59').getTime() < Date.now();
}

/**
 * The status to display for a proposal, accounting for date-based expiry.
 * Returns 'expired' for a proposal past its valid_until even if the stored
 * status is still 'sent'/'draft'; otherwise the stored status.
 */
export function effectiveStatus(
  p: Pick<Proposal, 'status' | 'valid_until'>
): Proposal['status'] {
  return isProposalExpired(p) ? 'expired' : p.status;
}
