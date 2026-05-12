# Editable NDA Copy — Design

## Background

Customers sometimes suggest wording changes to their NDA before signing. Today the legal text lives only on the shared `nda_templates` row; there is no per-NDA way to edit it. This design adds per-NDA copy editing and a separate Template Editor for evergreen wording changes.

## Goals

1. Edit any section's heading and body on a draft or pending NDA without touching the template.
2. Resend the (unchanged) signing link to the contact with a "the NDA has been updated" email.
3. Edit `nda_templates` directly in-app so future NDAs pick up evergreen wording.
4. Lock each NDA's text in at creation time so template edits never silently change in-flight NDAs.

## Non-goals

- Version history / diff between revisions.
- Re-signing a *signed* NDA (would require a separate legal flow).
- Switching template mid-edit.
- Collaborative editing.

## Data model

Add `sections JSONB NULL` on `public.ndas` with the same shape as `nda_templates.sections`: `[{heading, body}]`.

On NDA insert, the React app copies the current `nda_templates.sections` into `nda.sections`. From then on, `nda.sections` is the source of truth for that NDA. The column stays nullable so the DB migration is safe ahead of the code release — renderers fall back to template fetch if null.

Body content moves from plain text to HTML. A migration converts existing seed bodies and any existing `ndas` rows in one pass.

## Sanitiser allow-list

Tags: `p`, `br`, `strong`, `em`, `u`, `ul`, `ol`, `li`. Everything else stripped. `{{CONFIDENTIALITY_YEARS}}` token is plain text and passes through unchanged.

## UI

### Per-NDA copy editor

Lives on the existing NDA form in `AdminDashboard.tsx`, visible when `editingNdaId` is set and status ≠ 'signed'. An accordion of all sections, each expanding to a heading input + TipTap rich editor with toolbar (Bold, Italic, Underline, Bullet list, Numbered list, Undo/Redo). Per-section "Reset to template" and a panel-level "Reset all to template".

Save piggybacks on the existing Save Draft / Send for Signature buttons. No separate save for copy edits.

For pending NDAs (signing link already out), a **Resend for signature** button appears once edits are saved. It calls `notify-proposal { type: 'nda-resent', ndaId }`. Same slug — customer sees the latest text when they reopen the link.

Signed NDAs: read-only.

### Template editor

New sub-view `ndaView === 'templates'` under the NDAs tab. Lists `nda_templates`. Click to edit name, description, sort_order, and the section array (same `RichSectionEditor`, with add / delete / reorder). Save shows confirmation: *"This affects new NDAs only — existing NDAs keep the text they were created with."* Admin-only via existing `is_admin()` RLS.

## Components & files

New:
- `src/components/RichSectionEditor.tsx`
- `src/components/nda/htmlToPdf.tsx`
- `src/lib/sanitizeNdaHtml.ts`
- `src/lib/plainToNdaHtml.ts`

Modified:
- `src/pages/AdminDashboard.tsx`
- `src/components/Sidebar.tsx`
- `src/pages/NdaSign.tsx`
- `src/components/NdaPDF.tsx`
- `supabase/functions/notify-proposal/index.ts`

New deps: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `isomorphic-dompurify`.

## Migration

`supabase/migrations/20260512120000_nda_sections_per_row.sql`:

1. `ALTER TABLE public.ndas ADD COLUMN sections JSONB`.
2. Re-encode `nda_templates.sections[].body` in place: `\n\n` → `</p><p>`, single `\n` → `<br/>`, wrap in `<p>…</p>`.
3. Backfill `ndas.sections` from each row's `template_id` using the same transform.

## Rendering

`NdaSign.tsx`: source from `nda.sections` (fallback to template fetch if null), replace `{{CONFIDENTIALITY_YEARS}}` in body, render via `dangerouslySetInnerHTML` with sanitised HTML. Add Tailwind `prose`-style overrides so `<p>` / `<ul>` / `<ol>` look right.

`NdaPDF.tsx`: same source-of-truth swap. Replace plain-text `<Text>` rendering with `htmlToPdf(body)` returning react-pdf primitives.

## Email

`nda-resent` event in `notify-proposal`:
- To: `contact_email`
- Subject: `[NDA] Updated for signature: {company_name}`
- Body: short note that the NDA has been updated and link to sign
- CC rules match the existing `nda-sent` event (preparer + Patrick per existing CC config).

## Testing

- Unit: `plainToNdaHtml`, `sanitizeNdaHtml`, `htmlToPdf` map of supported tags.
- Manual: create new NDA → template sections snapshot into `nda.sections`; edit a section → save → re-open shows edits; resend triggers email with same link; signing produces PDF matching edited copy.
- Regression: existing pending NDA after migration renders identically.

## Open risks

- `@react-pdf/renderer` text wrapping with nested inline tags can be finicky. The `htmlToPdf` walker keeps the inline tree flat (one `<Text>` per paragraph with nested `<Text>` for bold/italic) to stay within the library's reliable subset.
- DOMPurify in SSR / edge contexts isn't needed here — only used in the browser. `isomorphic-dompurify` keeps the import safe regardless.
