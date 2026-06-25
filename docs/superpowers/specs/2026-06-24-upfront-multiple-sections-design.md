# Upfront items: multiple sections — design

**Status:** DRAFT — not yet approved. One open question outstanding (see end).
**Date:** 2026-06-24

## Goal
When building a proposal, allow creating **multiple titled upfront sections**, each with its
own child items — instead of today's single section (one `upfront_section_title`, one flat
`upfront_items` list, one `upfront_notes` footnote).

## Decisions captured (from user)
- **Each section carries:** title + items + its own subtotal + its own footnote. A grand total
  stays at the bottom.
- **Optional / choice-group behaviour:** stays **global** (unchanged) — matched across the whole
  proposal, just visually grouped into sections.
- **Customer view + PDF layout:** **stacked tables** — one titled table per section.

## Key constraint (why the model below)
`upfront_items` is the canonical flat array everywhere numeric:
- `ProposalPDF.tsx` iterates it flat (hardcoded "Upfront investment" subhead; does NOT use
  `upfront_section_title`).
- Accept flow stores **indices into it** (`selected_upfront_snapshot`, migration
  `20260623120000_acceptance_selected_upfront.sql`).
- `notify-proposal` only totals it / snapshots names — **unaffected by sections**.
- Only `ProposalView.tsx` (customer view) actually reads `upfront_section_title`.

→ Keep `upfront_items` flat and canonical; layer sections as metadata + a per-item tag.

## 1. Data model (`src/types/proposal.ts`)
- New `UpfrontSection { id: string; title: string; notes?: string }`.
- `UpfrontItem` gains `section_id?: string`.
- `Proposal` gains `upfront_sections?: UpfrontSection[]` (ordered). `upfront_items` shape
  unchanged.
- Items kept contiguous by section in the flat array (display order == array order); `section_id`
  is the grouping authority.
- New helper `computeSectionTotal(allItems, sectionId, selected)`. Grand total stays
  `computeUpfrontTotal(allItems, selected)` unchanged.
- Optional/choice-group stay global; `section_id` travels with the item so a selected optional
  item renders inside its own section's table.

## 2. Editor (`UpfrontItemsEditor.tsx` + `ProposalEditor.tsx`)
- Extract the per-item card (~140 lines) into reusable **`UpfrontItemCard`**.
- New **`UpfrontSectionsEditor`** (ProposalEditor): "Upfront Items" card + **"Add Section"**;
  per section → title input, item cards + "Add Item", section subtotal, section footnote,
  delete-section (also removes that section's items); **grand total** at bottom.
- Flat `UpfrontItemsEditor` stays for the **ad-hoc generator** (`AdminDashboard.tsx`, uses
  `enableServiceTagPicker` / `enableOngoingFlag`, no section title/notes) — reuses `UpfrontItemCard`.
  Sections NOT forced there.

## 3. Customer view + PDF
- **ProposalView**: one titled table per section, each with its own subtotal + footnote; existing
  grand-total band stays.
- **ProposalPDF**: group `allUpfrontItems` by `section_id`; subhead + subtotal per section.
- **Email / accept flow**: no change.

## 4. Migration & back-compat
- DB migration adds `upfront_sections jsonb` (Supabase project ref `uckvtkxicdbdavbwhqky`).
- **Lazy synthesis on load**: if `upfront_sections` empty → one section from legacy
  `upfront_section_title` + `upfront_notes`; items with no `section_id` fall into the first
  section. No bulk backfill.
- **On save**: write `upfront_sections` + per-item `section_id`; mirror first section's
  title/notes back into legacy columns so un-updated readers still render.

## 5. Out of scope (v1)
- Section drag/reorder (render in array order; add/delete only).
- Per-section choice-group scoping.

## OPEN QUESTION (resume here)
v1 = add/delete sections only (no reordering), OR include up/down section reordering now?
After this is answered + design approved → write implementation plan (writing-plans skill).
