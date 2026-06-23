# Upfront "Choose One" Item Groups — Design

**Date:** 2026-06-23
**Status:** Approved (design), pending implementation plan

## Problem

Proposals frequently need to offer the client a **mutually exclusive choice** between
upfront delivery options — e.g. on the AccXel proposal (`slug 7f7edfce326e`):

- Stabilise & improve the existing site — £2,425
- Full site re-build — £10,175

The client should pick **one or neither**, and the chosen option must flow through to the
signed agreement, PDF/Word, email and persisted acceptance record.

### Current behaviour and two pre-existing bugs

The only existing mechanism is the per-item `optional` flag, which renders items as
**additive checkboxes** (tick none / one / both). This is unsuitable for an either/or
choice, and the existing flow is broken in two ways:

1. **Selection lost at signing.** `ProposalView` carries the customer's choice nowhere:
   the navigate to `/p/:slug/accept` only passes `standard`, `extras`, `pricing`
   (`ProposalView.tsx:1458`). `ProposalAccept` has no upfront param, so the PDF, email
   and `proposal_acceptances` row all use the unmodified base list/total.
2. **Double-counted total.** The editor computes `upfront_total` as the sum of **all**
   items including optional ones (`ProposalEditor.tsx:326`), then the view adds the
   selected optional items **again** on top (`ProposalView.tsx:294-299`,
   `displayUpfrontTotal = upfront_total + optionalUpfrontAddOn`). On AccXel both items are
   `optional`, so the base already reads £12,600 (= 2,425 + 10,175) before anything is
   chosen, and ticking one would push it higher.

This feature fixes both bugs as a necessary part of wiring choice selection end-to-end.

## Decisions (from brainstorming)

- **Reusable feature**, not a one-off data reshape — any proposal can define choice groups.
- **Pick one or none** — a group is never forced; default selection is none.
- **Grouping model:** a per-item "choice group" label. Items sharing a non-empty label are
  one mutually-exclusive group. Supports multiple groups + always-included + optional
  add-ons in the same section.
- **View style:** radio cards, reusing the existing standard-retainer picker style.
- Fixing the two pre-existing bugs above is in scope.

## Data model

Add one optional field to `UpfrontItem` (`src/types/proposal.ts`):

```ts
choice_group?: string; // items sharing a non-empty value are mutually exclusive (pick one or none)
```

Each upfront item is then exactly one kind:

| Kind | Condition | Selection UI | In total? |
|------|-----------|--------------|-----------|
| Always included | no `choice_group`, `optional` falsy | none (plain row) | always |
| Optional add-on | `optional: true`, no `choice_group` | checkbox | when selected |
| Choice-group member | `choice_group` set | radio card | when selected (≤1 per group) |

`choice_group` takes precedence over `optional`: if a group is set, the item is a group
member regardless of `optional`.

## Unified total rule

Replaces the `base + addon` arithmetic everywhere (view, accept, PDF, Word, email):

> Upfront total = Σ `(discounted_price ?? price)` over every item that is
> **always-included OR currently selected**.

A small shared helper computes this from `(items, selectedIndices)` so all consumers agree.
`upfront_total` stored on the proposal row becomes "total with nothing optional/grouped
selected" (i.e. always-included items only), recomputed on save in the editor. It is a
denormalised convenience (admin list/preview); the authoritative total is always recomputed
from items + selection.

## Components to change

### 1. `src/types/proposal.ts`
Add `choice_group?: string` to `UpfrontItem`. Add a shared total helper (e.g.
`computeUpfrontTotal(items, selectedIndices: Set<number>): number`) co-located with the
type or in a small util the view/accept/PDF can import.

### 2. `src/components/UpfrontItemsEditor.tsx`
- Add a **"Choice group"** text input per item (empty = normal).
- When a choice group is set, hide that item's "Optional" checkbox.
- Helper text: *"Items sharing a choice group are shown to the client as 'pick one'."*
- Running total in the editor uses the unified rule (always-included only, since editor has
  no selection context) — i.e. excludes optional and grouped items from the displayed base.

### 3. `src/pages/ProposalEditor.tsx`
- `buildPayload` `upfront_total` (line ~326) recomputed as **always-included items only**
  (exclude `optional` and any item with a `choice_group`).

### 4. `src/pages/ProposalView.tsx`
- Rename/generalise `selectedOptionalItems` → a single "selected upfront indices" `Set`.
- Render order within the upfront section: always-included rows, then optional add-on
  checkboxes (unchanged), then each choice group as **radio cards** (reuse standard-retainer
  card style). Selecting a card selects that item and deselects the group's other indices;
  clicking the selected card again clears the group (the "or none" path).
- `displayUpfrontTotal` computed via the unified helper.
- Navigate to accept with an added param: `&upfront=<comma-separated selected indices>`.
- Align the inline PDF preview (`ProposalView.tsx:1420-1429`) with the unified selection.

### 5. `src/pages/ProposalAccept.tsx`
- Read `upfront` query param → `Set<number>` of selected indices.
- Recompute upfront total via the unified helper (no longer trust raw `proposal.upfront_total`).
- Pass the **filtered** item list (always-included + selected) and the recomputed total to
  `ServiceAgreementPDF`.
- On acceptance insert, persist selection (see §7).

### 6. PDF / Word
`ServiceAgreementPDF.tsx`, `ProposalPDF.tsx`, `src/lib/adhocWordExport.ts`: render only
always-included + selected items, and use the total passed in (recompute with the helper for
the Word path which builds its own total).

### 7. Persistence + email
- **Migration** (new file in `supabase/migrations/`):
  ```sql
  ALTER TABLE public.proposal_acceptances
    ADD COLUMN IF NOT EXISTS selected_upfront_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS selected_upfront_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;
  ```
  - `selected_upfront_items` = chosen indices.
  - `selected_upfront_snapshot` = `[{name, price}]` of the chosen/always-included items so
    the record is self-describing even if the proposal later changes.
- `ProposalAccept` insert writes the correct computed `upfront_total` plus the two new columns.
- `supabase/functions/notify-proposal/index.ts`: the acceptance email already reads
  `upfront_total` from the acceptance row → correct automatically once we store the computed
  figure. Additionally list the chosen upfront item name(s) from the snapshot.

## AccXel proposal (manual follow-up, post-deploy)

Set both items' **Choice group** = `"Website option"`, untick "Optional". Base upfront total
becomes £0 until the client picks the £2,425 or the £10,175.

## Out of scope (YAGNI)

- A per-item "recommended/default" pre-selection within a group (default is none).
- Reordering UI for groups; group order follows item order.
- Migrating/auto-fixing historical accepted proposals' stored totals (self-heals on resave).

## Testing

- Editor: setting a choice group hides Optional; base total excludes grouped/optional items.
- View: radio behaviour (one per group, re-click clears); total matches unified rule for
  none / each option selected; optional checkboxes still additive; always-included unaffected.
- Accept: `upfront` param round-trips; PDF shows only chosen + always-included; total correct.
- Persistence: acceptance row stores indices, snapshot and correct total; email lists choice.
- Regression: proposals with no optional/grouped items show identical totals to before.
