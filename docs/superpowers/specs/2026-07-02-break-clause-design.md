# Break Clause — Design

**Date:** 2026-07-02
**Status:** Approved (decisions locked with user)

## Goal

Let staff attach an optional break clause to a service agreement. A checkbox
("Add break clause") in the Service Agreement editing surface reveals a text
field; the entered text is rendered as a dedicated **Break Clause** block in the
generated agreement document (PDF, and Word export for ad-hoc).

## Scope

Both flows (user decision):

1. **Proposal flow** — proposal editor's "Service Agreement Document" section →
   `proposals.break_clause` → `ServiceAgreementPDF` (via `ProposalAccept`).
2. **Ad-hoc flow** — Admin Dashboard ad-hoc contract form →
   `adhoc_contracts.break_clause` → `ServiceAgreementPDF` (via `AdhocSign`) and
   the Word export (`adhocWordExport.ts`).

## Data model

- Add nullable `break_clause text` column to `proposals` and `adhoc_contracts`.
- No separate boolean: the checkbox's initial state is derived from whether the
  stored text is non-empty. Unticking the checkbox clears the text (saved as
  null/empty).

## UI

- Checkbox **"Add break clause"** in:
  - `ProposalEditor.tsx` "Service Agreement Document" section (near Pricing
    Footnote / Payment Terms).
  - `AdminDashboard.tsx` ad-hoc contract form (near Additional Terms).
- When ticked → show a `<textarea>` bound to the break-clause field.
- When unticked → hide and clear the field.

## PDF / Word rendering

- New optional prop `breakClauseText?: string` on `ServiceAgreementPDF`.
- Rendered as a dedicated bold-headed **"Break Clause"** block, positioned
  immediately after the **Termination** clause — a break clause is an early-
  termination right, so it belongs with the termination provisions.
  Implementation: find the Termination clause in `templateSections` and render the
  block right after it (fallback: before the Schedules, then the end). Output is
  unchanged when no break clause is set.
- Word export (`adhocWordExport.ts`): mirror with a "Break Clause" heading +
  paragraphs, following the existing `additionalTermsText` handling.

## Wiring

- `Proposal` type (`src/types/proposal.ts`) + `src/integrations/supabase/types.ts`
  (`proposals` and `adhoc_contracts` Row/Insert/Update) gain `break_clause`.
- `ProposalEditor` load (map `data.break_clause`) + save payload.
- `AdminDashboard` ad-hoc form state, load, save, and reset.
- `ProposalAccept` (2 `ServiceAgreementPDF` call sites) and `AdhocSign`
  (preview + signed call sites) pass `breakClauseText`.

## Migrations

Two idempotent migrations (`ADD COLUMN IF NOT EXISTS`). Applied to the live DB
separately (Supabase MCP), as this session cannot apply DB changes.

## Verification

`tsc` typecheck + `vite build`. Manually confirm: ticking the box in each editor
persists text; the generated PDF shows the Break Clause block; unticked → no
block and no regression to existing agreements.
