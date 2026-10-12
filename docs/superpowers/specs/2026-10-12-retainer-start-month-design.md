# Retainer lines starting in a given month — design

**Date:** 2026-10-12
**Status:** Approved
**Trigger:** 7Video proposal (`/p/8ec326b13e20`) — a 12-month contract where months 1–3 cost
£1,300/month and months 4–12 cost £975/month. Today this is faked with a £3,900 upfront item plus
a 9-month retainer, so the client sees the first quarter as a "one-time investment".

## Goal

Let a proposal express stepped monthly pricing as **separate retainer cards that run
back-to-back** (e.g. "Months 1–3" at £1,300, "Months 4–12" at £975), with correct labels,
headline and totals on the proposal page, proposal PDF, accept page and service agreement.

## Non-goals

- A price schedule inside a single retainer option (rejected: touches every duplicated totals site).
- Reusing SaaS tiers (`pricing_model = 'dual'`) — wrong branding and the Option A/B toggle.
- Consolidating the duplicated ongoing-totals maths across files (separate refactor).

## Existing behaviour we rely on

`RetainerOption.starts_after_months` already exists. Per-year totals in
`ProposalView.tsx` (`ongoingForYear`) and `ProposalAccept.tsx` already handle any month offset
for monthly lines, and `AdhocSign.tsx` (`getFixedOptionContractYearCosts`) walks month by month.
So £1,300×3 + £975×9 = £12,675 is already computed correctly once the data is entered this way.
What's missing is the editor, the labels and the headline.

## Changes

### 1. Editor — `src/components/RetainerOptionsEditor.tsx`

Replace the "Starts in year" `<select>` (Year 1–5, offsets in multiples of 12) with a
**"Starts in month"** number input:

- Value shown = `(starts_after_months ?? 0) + 1`; min 1, max 60.
- On change: `starts_after_months = month === 1 ? undefined : month - 1`.
- Disabled when `rolling_monthly` (as today).
- Helper text below, from the shared helper: "Covers months 4–12" (or "Starts month 4" if no term).

Backwards compatible: an existing Year-2 line (offset 12) displays as month 13. The editor is
shared with the ad-hoc generator in `AdminDashboard.tsx`, which gets the same control.

### 2. Shared helper — new `src/lib/retainerTerm.ts` (+ `retainerTerm.test.ts`)

Pure functions, no React:

- `monthRange(r): { start: number; end: number } | null` — 1-based inclusive months covered
  (`start = offset + 1`, `end = offset + term_months`); `null` for rolling or no term.
- `termLabel(r): string | null`
  - rolling → `Monthly rolling · {notice_days ?? 30} days notice` (unchanged)
  - no term → `null`
  - offset 0 → `{term}-month term` (unchanged)
  - offset > 0 → `Months {start}–{end} · {term}-month term`
- `rateSchedule(options): { fromMonth: number; toMonth: number | null; rate: number }[]` —
  monthly-equivalent rate per contiguous span where the set of active lines is constant, computed
  only for monthly-frequency lines; empty if fewer than two distinct spans.

This replaces the copies of `termLabel` in `ProposalView.tsx`, `ProposalPDF.tsx`, and the inline
"begins after project delivery" strings in `ProposalView.tsx` (headline) and
`ServiceAgreementPDF.tsx` (lines ~333, 559, 565, 571), plus `AdhocSign.tsx` (~691).

**Wording decision:** "begins after project delivery" is dropped everywhere. Existing proposals
with a Year-2 line will now read "Months 13–24 · 12-month term".

### 3. Investment summary headline — `ProposalView.tsx`, `ProposalPDF.tsx`

When `rateSchedule(allSelectedOptions)` has two or more spans:

- Headline figure = rate of the first span (e.g. **£1,300.00**), not the sum of all lines.
- Sub-line: `+ VAT @ 20% /month · Months 1–3, then £975.00/month for months 4–12`
  (spans joined with ", then "; last span with no end reads "from month N").

Otherwise the headline is unchanged. Year-by-year totals and contract total are unchanged.

### 4. Service agreement & accept page

`ServiceAgreementPDF.tsx` and `AdhocSign.tsx` use `termLabel`/`monthRange` for the term text.
Amounts and year subtotals are unchanged (already correct).

## Testing

- Unit tests for `retainerTerm.ts`: offset 0, offset 3/term 9, Year-2 offset 12, rolling, no
  term, `rateSchedule` with back-to-back lines, overlapping lines, a gap, and a single line (empty).
- Existing `ServiceAgreementPDF.test.tsx` updated for the new wording.
- `npm test` and `npm run build` clean.
- Manual check on a draft copy of the 7Video proposal: two cards, headline £1,300 then £975,
  Year 1 = £12,675, PDF and service agreement labels.

## Data change for the 7Video proposal (after deploy, user to confirm first — proposal is `sent` and viewed)

- Remove the £3,900 upfront item and the `upfront_sections` invoicing note.
- Add core retainer "Months 1 to 3: audit, plan and set-up", £1,300/month, `term_months: 3`,
  features from the old upfront description.
- Existing £975 line: `starts_after_months: 3`, fix "dleivery" → "delivery".

No DB migration needed — all fields live in the existing `retainer_options` JSONB.
