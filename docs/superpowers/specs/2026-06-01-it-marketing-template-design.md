# IT Services & Marketing Support — Combined Contract Template

**Date:** 2026-06-01
**Status:** Approved (design)

## Goal

Add one reusable service-agreement template covering both IT services and
marketing support for a new customer, using a single merged hybrid IP clause and
the SLA schedule. Delivered as a versioned migration, with `seed_templates.cjs`
kept as the complete source of truth.

## Background

Contract templates live in the `service_agreement_templates` Postgres table
(`supabase/migrations/20260303110000_service_agreement_templates.sql`): columns
`id`, `name`, `description`, `sections` (JSONB array of `{heading, body}`),
`sort_order`, timestamps. RLS: public `SELECT`, writes gated by
`public.is_admin()` (migrations run as superuser, so the insert is unaffected).

The 7 existing templates are defined **in two places that duplicate each other**:
- `seed_templates.cjs` — dev seeding via the Supabase anon key (`npm run seed`).
- `gen_migration.cjs` — embeds its own full copy of `COMMON` / `IP_CLAUSES` /
  `templates` / `buildSections` and writes the combined table-creation + 7-seed
  migration `20260303110000_service_agreement_templates.sql`.

Both must be kept in sync. The `20260303110000` migration is **already applied**
and must not be regenerated/overwritten. The composition helper (identical in
both files) is:

```js
function buildSections(ipClause, includeSched3 = false) { /* s1–s6, ipClause, s8–s19, [sched3], sched4, sched5 */ }
```

Two existing templates are relevant:
- **IT Support** — `IP_CLAUSES.itSupport`, `includeSched3 = true` (no bespoke dev IP; config/scripts/runbooks retained by Supplier; third-party software licensed).
- **Marketing Services** — `IP_CLAUSES.marketing`, no SLA (creative deliverables assigned to customer on full payment).

A combined contract cannot carry clause "7" twice, so it needs one merged IP
clause. The customer here needs both work streams under a single agreement.

## Approach

Reuse the existing pattern — no new mechanism, no schema change, no PDF/Word/
editor change. `ServiceAgreementPDF.tsx` and the admin/proposal template
selectors already read any template row generically.

### 1. New IP clause — `IP_CLAUSES.itAndMarketing` (in BOTH `.cjs` files)

Add the identical clause object to `IP_CLAUSES` in `seed_templates.cjs` **and**
`gen_migration.cjs`. Merge of the `marketing` and `itSupport` clauses,
renumbered 7.1–7.7:

- **7.1** — Subject to full payment, Supplier assigns to the Customer all IP in
  creative deliverables produced specifically for the Customer: (a) marketing
  campaigns and campaign materials; (b) copywriting and editorial content;
  (c) bespoke graphic design and artwork. *(from `marketing` 7.1)*
- **7.2** — The IT services do not involve creation of bespoke software or
  development Deliverables; no assignment of IP is made or implied in respect of
  them. Configuration files, scripts, runbooks and documentation produced in the
  course of support Services remain the Supplier's unless expressly agreed
  otherwise in writing. *(from `itSupport` 7.1–7.2)*
- **7.3** — The following are not assigned and remain subject to their own
  licence terms: (a) third-party stock images, footage, music or other licensed
  media; (b) third-party software, tools, platforms, operating systems and
  applications. *(merge of `marketing` 7.2 + `itSupport` 7.3)*
- **7.4** — Supplier retains ownership of its creative methodologies, strategic
  frameworks and any generic or reusable elements not created specifically for
  the Customer. *(from `marketing` 7.3)*
- **7.5** — The Customer is responsible for: (a) ensuring it has all necessary
  rights, consents and clearances for materials supplied to the Supplier; and
  (b) holding valid licences for all software deployed within its environment.
  The Supplier has no liability arising from the Customer's failure to maintain
  appropriate software licences. *(merge of `marketing` 7.4 + `itSupport` 7.4)*
- **7.6** — The Customer grants the Supplier a non-exclusive, royalty-free
  licence to access the Customer's systems and data and to use the Customer's
  materials, solely to the extent necessary to provide the Services.
  *(merge of `marketing` 7.5 + `itSupport` 7.5)*
- **7.7** — Supplier retains the right to reference the Customer as a client and
  to include anonymised or attributed descriptions of campaigns or projects in
  its portfolio and marketing materials, unless the Customer objects in writing.
  *(from `marketing` 7.6, renumbered)*

Heading stays `"7. Intellectual Property"`.

### 2. New template entry (in BOTH `.cjs` files)

Append to the `templates` array in `seed_templates.cjs` **and**
`gen_migration.cjs`:

```js
{
  name: "IT Services & Marketing Support",
  description: "Combined engagement covering ongoing IT services (with SLA) and marketing support. Marketing creative deliverables assigned to the customer on payment; IT configuration and support materials retained by the Supplier.",
  sections: buildSections(IP_CLAUSES.itAndMarketing, true),
  sort_order: 8
}
```

`includeSched3 = true` appends Schedule 3 (SLA) for the IT side.

### 3. New migration (do NOT regenerate the applied one)

Create a **separate, new** migration
`supabase/migrations/<timestamp>_add_it_marketing_template.sql` containing one
idempotent insert. The existing `20260303110000` migration stays untouched.

```sql
INSERT INTO public.service_agreement_templates (name, description, sections, sort_order)
SELECT '<name>', '<description>', '<sections-json>'::jsonb, 8
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_agreement_templates WHERE name = 'IT Services & Marketing Support'
);
```

The `<sections-json>` must be **generated programmatically** (not hand-typed) so
it is byte-identical to `buildSections(IP_CLAUSES.itAndMarketing, true)`.
Approach: write a tiny one-off node helper (or a focused tweak to
`gen_migration.cjs` that emits only this single INSERT to the new file) that
requires the shared definitions and prints the JSON. Escape single quotes via
the existing `sqlStr` pattern.

## Out of scope

- No schema change.
- No changes to PDF (`ServiceAgreementPDF.tsx`), Word export
  (`adhocWordExport.ts`), admin editor, or proposal selector — all read rows
  generically.
- No changes to the other 7 templates.

## Verification

1. Run the migration (or `npm run seed`) against the DB.
2. Confirm exactly one new row `name = 'IT Services & Marketing Support'` with
   `sort_order = 8` and **22 sections** (6 + IP + 12 + sched3 + sched4 + sched5).
3. Confirm clause 7 body shows merged 7.1–7.7 and Schedule 3 (SLA) is present.
4. Confirm the template appears in the proposal editor template dropdown and
   renders end-to-end in a generated PDF.
