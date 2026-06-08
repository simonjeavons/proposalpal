# Proposal Expiry — Design

**Date:** 2026-06-08
**Status:** Approved

## Goal

Let admins mark a proposal as **expired**, and show customers who open an
expired proposal link a clear "expired" message with the proposal owner's
contact details (name, email, phone, mobile) instead of the proposal content.

## Behaviour summary

- A proposal is treated as expired when **either**:
  - its `status` is explicitly set to `'expired'`, **or**
  - its `valid_until` date is before today.
- Expiry is computed on read — there is no cron/background job, and opening an
  expired proposal never mutates the row.
- Marking a proposal expired is fully reversible (pick another status).

## Single source of truth

A helper determines expiry everywhere:

```ts
// e.g. src/lib/proposalStatus.ts
export function isProposalExpired(p: Pick<Proposal, 'status' | 'valid_until'>): boolean {
  if (p.status === 'expired') return true;
  if (!p.valid_until) return false;
  // valid_until is a DATE string (YYYY-MM-DD); expired once the day has passed.
  const validUntil = new Date(p.valid_until + 'T23:59:59');
  return validUntil.getTime() < Date.now();
}
```

This helper is used by both the customer view and the admin dashboard so the two
never disagree.

## Changes

### 1. Status model
- **DB migration:** drop and re-add the `proposals.status` CHECK constraint to
  include `'expired'`:
  `CHECK (status IN ('draft', 'sent', 'accepted', 'expired'))`.
- **TS type** (`src/types/proposal.ts`): widen
  `status: 'draft' | 'sent' | 'accepted'` to include `'expired'`.

### 2. Admin control
- **ProposalEditor.tsx** (status button row, ~line 504): add an `expired`
  button alongside `draft` / `sent` / `accepted`. Clicking sets
  `status='expired'`.
- **AdminDashboard.tsx**:
  - Status filter dropdown (~line 1583): add `<option value="expired">Expired</option>`.
  - Status colour map (~lines 1277–1283): add an entry for `expired`
    (e.g. red/grey) so it renders distinctly.
  - Status badge / display: compute the displayed status via
    `isProposalExpired(p)` so a `sent` proposal past `valid_until` shows as
    **Expired** in the list, matching what the customer sees. (The stored
    `status` value is unchanged; this is display-only.)

### 3. Customer-facing guard (ProposalView.tsx, route `/p/:slug`)
After the proposal loads successfully, if `isProposalExpired(proposal)` is true,
render an **Expired** screen instead of the proposal body:

- Heading / message: this proposal has expired.
- "Please get in touch with **{contact_name}**" block showing:
  - **Email:** `contact_email` as a `mailto:` link.
  - **Phone:** `contact_phone`.
  - **Mobile:** `contact_mobile` (only if present).
- Styling consistent with the existing not-found / view screens (same palette,
  e.g. `#3A6278`).

Not-found behaviour ("Proposal not found.") is unchanged. The expired screen is
distinct from not-found.

## Out of scope (YAGNI)
- No cron/background job to flip status automatically — expiry is computed on read.
- No email notification when a proposal expires.
- No change to view-tracking events for expired opens (existing tracking fires as-is).

## Files touched
- New: `supabase/migrations/<timestamp>_proposals_status_expired.sql`
- New: `src/lib/proposalStatus.ts` (the `isProposalExpired` helper)
- Edit: `src/types/proposal.ts`
- Edit: `src/pages/ProposalEditor.tsx`
- Edit: `src/pages/AdminDashboard.tsx`
- Edit: `src/pages/ProposalView.tsx`
