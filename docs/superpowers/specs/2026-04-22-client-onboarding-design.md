# Client Onboarding Module Design

## Overview

Add a structured client onboarding module to ProposalPal. When a proposal or ad-hoc agreement is signed, the system creates a draft onboarding record and notifies the assignee. The assignee picks the applicable service types, splitting the draft into one onboarding record per (contract × service type). Each onboarding progresses through three stages: **(1) Information capture & kick-off** (internally led discovery meeting + service-typed action checklist); **(2) Report delivery** (in-system templated report sent to the client via tokenised link); **(3) Client sign-off** (one-click client confirmation via tokenised link). A new dashboard tab gives the team a single view of all active onboardings, with overdue flags and outstanding-action counts.

Source: `Downloads/onboarding_scope_v2.docx` (Version 1.0 Draft, 22 April 2026), reconciled with the existing in-house signing flow.

## Decisions Locked During Brainstorming

| # | Decision |
|---|----------|
| Q1 | Triggers: signed proposals AND signed ad-hoc agreements (NDAs excluded). |
| Q2 | Stage 1 form is internally led during a discovery meeting (not client-facing). Service-typed action checklist. |
| Q3 | Hybrid: most actions are checkbox + notes; some have structured forms. |
| Q4 (Stage 2) | Report created in the system (like a proposal) and sent to client via tokenised link with view tracking. |
| Q4 (Stage 3) | Client confirms via tokenised link (no manual fallback in v1). |
| Q5 | Templated section structure with auto-pulled Stage 1 actions. Section templates configurable per service type by admin. |
| Q6a | Default assignee inherits from the source contract's `prepared_by_user_id`. |
| Q6b | Sensible default reminder thresholds (per stage), admin-configurable in settings. |
| Q6c | Completed onboardings hidden by default with a filter toggle. |
| Q7 | One onboarding per (contract × service type). Multi-service contracts split into multiple onboardings. |
| Architecture | Approach C — hybrid normalisation. `onboarding_action_instances` is normalised; per-action `form_data` and report `sections` stay JSONB. |

## Database Schema

All tables use `gen_random_uuid()` for `id`, `now()` for default timestamps, and follow existing RLS patterns: logged-in users get full access on transactional tables; admins manage library/settings tables.

### `onboarding_action_library`

Admin-managed catalog of actions per service type.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| service_type_id | UUID NOT NULL FK → service_types | ON DELETE CASCADE |
| name | TEXT NOT NULL | e.g. "New server setup" |
| description | TEXT DEFAULT '' | |
| form_schema | JSONB | NULL = checklist-only; non-NULL = structured form schema (see Form Schema below) |
| sort_order | INT DEFAULT 0 | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | |

RLS: any authenticated user SELECT; admin ALL.

Seeded with the action lists agreed during brainstorming:
- **IT Services** (10 actions): server setup, email migration, endpoint protection, workstation migration, firewall/VPN, backup/DR, AD/Entra, Wi-Fi rollout, patch management, helpdesk onboarding
- **Software Development** (10): source control, CI/CD, environment provisioning, DNS, SSL, monitoring, database, access mgmt, sprint cadence, handover docs
- **AI Consultancy** (10): use-case workshop, data audit, compliance review, LLM API setup, sandbox, KPIs, pilot scope, data labelling plan, model eval framework, stakeholder ID
- **Digital Marketing** (10): GA4 access, Google/Meta Ads, CRM, CMS, brand assets, audience def, conversion goals, UTM strategy, reporting cadence, channel mix
- **Website Design and Development** (10): hosting/DNS, domain, CMS, brand assets, sitemap, wireframes, SEO baseline, GA/Search Console, approval workflow, launch checklist

Service type seed reconciliation: existing `service_types` has *IT Support, Software Development, Marketing Services, Website Development*. Migration adds **AI Consultancy** and renames *IT Support → IT Services* and *Marketing Services → Digital Marketing* to match the agreed labels. *Website Development* stays as-is (semantically equivalent).

### `onboarding_report_section_templates`

Admin-managed default sections per service type. Cloned into `onboarding_reports.sections` when a report is first opened.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| service_type_id | UUID NOT NULL FK → service_types | ON DELETE CASCADE |
| heading | TEXT NOT NULL | |
| body_template | TEXT DEFAULT '' | Supports `{{recommended_actions}}` placeholder |
| sort_order | INT DEFAULT 0 | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | |

RLS: any authenticated user SELECT; admin ALL.

Seed (per service type): *Discovery Summary, Recommended Actions (with `{{recommended_actions}}` placeholder), Scope Agreed, Timeline, Team & Contacts, Next Steps.*

### `onboarding_settings`

Single-row table for admin-configurable thresholds.

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK CHECK (id = 1) | Singleton |
| reminder_stage1_days | INT DEFAULT 5 | Working days from configuration to Stage 1 completion |
| reminder_stage2_days | INT DEFAULT 10 | Working days from Stage 1 completion to report sent |
| reminder_stage3_days | INT DEFAULT 5 | Working days from report sent to client sign-off |
| updated_at | TIMESTAMPTZ | |

Note: with internally-led discovery (Stage 1 done by us during a meeting), the source doc's separate "form" / "kick-off" thresholds collapse into a single Stage 1 threshold.

Seeded with one row. RLS: any authenticated user SELECT; admin UPDATE.

### `client_onboardings`

One row per (signed contract × service type). Created as a single draft on signing; split into N rows on configuration.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| source_type | TEXT NOT NULL CHECK IN ('proposal', 'adhoc') | |
| source_id | UUID NOT NULL | Refers to `proposals.id` or `adhoc_contracts.id` (no FK — soft reference, polymorphic) |
| service_type_id | UUID FK → service_types | NULL while in draft state, NOT NULL after split |
| status | TEXT NOT NULL DEFAULT 'draft' CHECK IN ('draft', 'active', 'complete') | `draft` = pre-split, `active` = stages 1–3, `complete` = signed off |
| current_stage | INT NOT NULL DEFAULT 1 CHECK BETWEEN 1 AND 3 | Reset to 1 when split from draft |
| assigned_to_user_id | UUID FK → profiles | Defaults from source contract's `prepared_by_user_id` |
| client_name, organisation, contact_name, contact_email | TEXT | Snapshotted from source at trigger time |
| triggered_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| kickoff_meeting_at | TIMESTAMPTZ | When the kick-off meeting is scheduled |
| kickoff_held | BOOLEAN DEFAULT false | Manually flipped after meeting |
| configured_at | TIMESTAMPTZ | Set when draft is split into active rows (clock starts for Stage 1 overdue) |
| stage1_completed_at, stage2_completed_at, stage3_completed_at | TIMESTAMPTZ | |
| archived_at | TIMESTAMPTZ | NULL = visible by default; set = hidden |
| last_reminder_at | TIMESTAMPTZ | For reminder de-duping |
| last_reminder_stage | INT | Tracks which stage the last reminder was for |
| created_at, updated_at | TIMESTAMPTZ | |

Indexes: `(assigned_to_user_id, current_stage)`, `(source_type, source_id)`, `(status)`.

RLS: any authenticated user ALL (matches existing permissive pattern in proposals/adhoc).

### `onboarding_action_instances`

Selected actions per onboarding. Pre-populated from the library on configuration (one row per active library action for the onboarding's service type). Team can also add ad-hoc actions inline.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| onboarding_id | UUID NOT NULL FK → client_onboardings | ON DELETE CASCADE |
| action_library_id | UUID FK → onboarding_action_library | NULL for ad-hoc actions |
| name_override | TEXT | NULL when action_library_id is set; populated for ad-hoc actions |
| status | TEXT NOT NULL DEFAULT 'pending' CHECK IN ('pending', 'in_progress', 'done', 'na') | |
| notes | TEXT DEFAULT '' | |
| form_data | JSONB | Captured against `form_schema` if present |
| sort_order | INT DEFAULT 0 | |
| completed_at | TIMESTAMPTZ | |
| completed_by_user_id | UUID FK → profiles | |
| created_at, updated_at | TIMESTAMPTZ | |

Indexes: `(onboarding_id, status)`.

RLS: any authenticated user ALL.

### `onboarding_reports`

Stage 2 report per onboarding (one-to-one).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| onboarding_id | UUID NOT NULL UNIQUE FK → client_onboardings | ON DELETE CASCADE |
| version | INT NOT NULL DEFAULT 1 | Bumped on revise-and-resend |
| sections | JSONB NOT NULL DEFAULT '[]'::jsonb | Array of `{heading, body}` |
| view_token | TEXT UNIQUE | Random hex; minted at first send |
| signoff_token | TEXT UNIQUE | Random hex; minted at first send |
| sent_at | TIMESTAMPTZ | First send timestamp |
| viewed_at | TIMESTAMPTZ | First view timestamp |
| last_view_email_at | TIMESTAMPTZ | View-notification throttle (mirrors existing pattern) |
| signed_off_at | TIMESTAMPTZ | |
| signed_off_ip | TEXT | |
| signed_off_user_agent | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

RLS: any authenticated user ALL. Public access only via the edge function using `view_token`/`signoff_token` (token-gated, not direct row read).

### `onboarding_report_views`

Per-view tracking, mirrors `proposal_views`/`nda_views`.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| report_id | UUID NOT NULL FK → onboarding_reports | ON DELETE CASCADE |
| user_agent | TEXT | |
| ip | TEXT | |
| viewed_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |

Indexes: `(report_id, viewed_at)`.

RLS: any authenticated user SELECT; INSERT only by edge function (service role).

## Form Schema (for `onboarding_action_library.form_schema`)

JSON shape for structured action forms:

```jsonc
{
  "fields": [
    { "key": "hostname", "label": "Hostname", "type": "text", "required": true },
    { "key": "ip", "label": "IP address", "type": "text", "required": false },
    { "key": "os", "label": "OS", "type": "select", "options": ["Ubuntu 24.04", "Windows Server 2022"], "required": true },
    { "key": "go_live", "label": "Go-live date", "type": "date", "required": false },
    { "key": "monitored", "label": "Monitored", "type": "checkbox", "required": false }
  ]
}
```

Supported `type` values: `text`, `textarea`, `number`, `date`, `select`, `checkbox`. Renderer uses shadcn primitives (no new deps). `form_data` on `onboarding_action_instances` stores `{ key: value }`.

## Trigger Flow

Extend `supabase/functions/notify-proposal/index.ts`. After the existing `signed` (proposal) and `adhoc-signed` (ad-hoc) handlers complete:

1. Insert one **draft** `client_onboardings` row:
   - `source_type` = `'proposal'` or `'adhoc'`, `source_id` = the contract id
   - `service_type_id` = NULL, `status` = `'draft'`
   - `assigned_to_user_id` = source contract's `prepared_by_user_id`
   - Snapshot client/org/contact fields from the contract
2. Send `onboarding-created` email to assignee: *"New onboarding to configure for [client] — open the dashboard to select service types and start Stage 1."*
3. Wrap in try/catch. If trigger fails for any reason, log via `console.error` and let the sign event succeed — the contract is signed; an admin can use the manual "Create onboarding" button as a fallback.

### Configuration step (admin UI)

When the assignee opens a draft onboarding:
- Multi-select picker for service types (defaults to all configured types, no preselection)
- On confirm: insert N new `client_onboardings` rows (one per selected service type) with `status = 'active'`, `current_stage = 1`, copying the snapshotted fields from the draft. Pre-populate `onboarding_action_instances` for each from the active library actions for that service type.
- Delete the draft row.
- Send `onboarding-configured` email to assignee summarising the new active records.

### Manual creation fallback

A **"Create onboarding"** button on the dashboard opens a small dialog: pick source contract (search proposals + ad-hoc), pick service type(s), pick assignee. Creates active rows directly (skips the draft phase). Used when the trigger has failed or for back-filling.

## UI Components

### `AdminDashboard.tsx` — new "Onboarding" tab

Extends the existing `Tab` enum. Two sub-views switched in-tab:

- **Active onboardings dashboard** (default sub-view)
- **Onboarding admin** (action library, report section templates, settings) — a separate sub-tab

### Onboarding dashboard (sub-view)

Top filter bar: Stage filter (All / 1 / 2 / 3 / Complete), Assignee (All / Me / dropdown), Service type, Search, "Show completed" toggle (off by default), "Show overdue only" toggle.

Top summary cards: Active count, Overdue count, Stage breakdown (1: N, 2: M, 3: K).

**Drafts callout** (above the main table, only visible when N > 0): "**N onboardings awaiting configuration**" with inline list of draft rows (client name + source contract + "Configure" button → opens `/onboarding/:id` with the configuration prompt). Drafts never appear in the main table — they have no service type yet, so stage tracking and overdue logic don't apply.

Main table — one row per active or complete `client_onboardings`:
- Client + organisation (linked to source contract via small icon)
- Service type pill
- Stage stepper (1→2→3 with active highlighted; "Complete" pill if signed off)
- Assignee (avatar + name; click to reassign)
- Triggered date (relative)
- Outstanding actions count for current stage (linked to detail page)
- Overdue indicator (red dot + tooltip) when current stage exceeds threshold
- Row click → `/onboarding/:id`

Sort default: overdue first, then `triggered_at` desc.

Outstanding-actions logic per stage:
- **Stage 1:** count of `onboarding_action_instances` with `status IN ('pending', 'in_progress')`, plus 1 if `kickoff_meeting_at IS NULL`, plus 1 if `kickoff_held = false`
- **Stage 2:** 1 if `onboarding_reports.sent_at IS NULL` else 0
- **Stage 3:** 1 if `signed_off_at IS NULL` else 0

Overdue logic (working days, Mon–Fri only — UK bank holidays out of scope for v1):
- Stage 1: `(configured_at ?? triggered_at)` + `reminder_stage1_days` < now AND `stage1_completed_at IS NULL`
- Stage 2: `stage1_completed_at` + `reminder_stage2_days` < now AND `sent_at IS NULL`
- Stage 3: `sent_at` + `reminder_stage3_days` < now AND `signed_off_at IS NULL`

(Drafts have no overdue state — they're tracked in the drafts callout, not the main table.)

### `src/pages/OnboardingDetail.tsx` — `/onboarding/:id`

Admin-only. Layout:

- Header: client + organisation, contract reference (link), service type, assignee picker, current stage badge
- For drafts: large prompt with multi-select service-type picker and "Configure" button
- For active rows:
  - **Stage 1 panel** (always visible; collapsed when complete):
    - Discovery meeting sub-section: kick-off date/time picker, "meeting held" checkbox
    - Action checklist grouped by sort order. Each row: status dropdown, notes textarea, "Capture data" button (when `form_schema` present) opens a side sheet rendering the schema
    - "Add ad-hoc action" button → inline form for `name_override`
    - "Complete Stage 1" button — enabled when kick-off date set + meeting held + every action `done` or `na`. Captures `stage1_completed_at`, advances `current_stage` to 2.
  - **Stage 2 panel** (visible when stage ≥ 2): summary of report status (Draft / Sent / Viewed / Signed off) with "Open report editor" button
  - **Stage 3 panel** (visible when stage ≥ 3): summary of sign-off status with link to client signoff page
- **History panel** (right side, mirrors `ViewHistoryPanel.tsx`): chronological events — triggered, configured, stage 1 complete, report sent, viewed (each), signed off, reminders sent

### `src/pages/OnboardingReportEditor.tsx` — `/onboarding/:id/report`

Admin-only. Mirrors `ProposalEditor.tsx` patterns.

- On first open: clones active templates from `onboarding_report_section_templates` for the onboarding's service type into `onboarding_reports.sections`. `{{recommended_actions}}` substituted with formatted action list (status grouped, name + notes per action).
- Add / remove / reorder / edit sections (heading + body markdown via existing `AgreementSection` editor pattern)
- "Preview PDF" button (existing pattern using `@react-pdf/renderer`)
- "Send to client" button:
  - Confirms via dialog
  - Mints `view_token` and `signoff_token` if not present
  - Sets `sent_at = now()`, advances `current_stage` to 3
  - Calls `notify-proposal` with `onboarding-report-sent` (sends client email with view link)
  - Locks editor (read-only mode)
- "Revise & resend" button (visible after send): increments `version`, clears `sent_at`/`viewed_at`/`last_view_email_at`, returns editor to editable state, prompts to re-send

### `src/components/OnboardingReportPDF.tsx`

`@react-pdf/renderer` component, branded consistently with `ProposalPDF.tsx` and `ServiceAgreementPDF.tsx`. Renders sections array.

### `src/pages/OnboardingReportView.tsx` — `/onboarding/report/:view_token`

Public route (no login). Read-only render of `sections`. Includes:
- Download-as-PDF button
- "Confirm onboarding complete" CTA at the bottom → `/onboarding/signoff/:signoff_token`

On load: calls `notify-proposal` with `onboarding-report-viewed` (records view, throttled email to assignee).

### `src/pages/OnboardingSignoff.tsx` — `/onboarding/signoff/:signoff_token`

Public route. Confirmation statement + single "Confirm onboarding complete" button.

On click: writes `signed_off_at`, `signed_off_ip`, `signed_off_user_agent` (via edge function — token-gated). `client_onboardings.status` → `'complete'`, `stage3_completed_at` set, `current_stage` reaches "Complete".

Calls `notify-proposal` with `onboarding-signed-off`. Idempotent: re-visits show the confirmation state without re-recording.

### Onboarding admin sub-tab (within the Onboarding tab)

Three management surfaces, all admin-only:

1. **Action library** — table grouped by service type. Inline create/edit/delete. "Has structured form?" toggle opens the **form-schema editor** (small custom field-builder UI: list of fields with key/label/type/required/options, drag-to-reorder via `@dnd-kit` already in deps).
2. **Report section templates** — table grouped by service type. Inline create/edit/delete of `heading` + `body_template`.
3. **Settings** — form for the four reminder thresholds.

## Edge Function Changes

### Extensions to `supabase/functions/notify-proposal/index.ts`

Add new `type` values, each following the existing handler pattern (lookup, business logic, email via `sendSendgrid`):

| Type | Trigger | Email recipient(s) |
|------|---------|--------------------|
| `onboarding-created` | After draft row insert (chained off `signed`/`adhoc-signed`) | Assignee (CC `CC_EMAIL`) |
| `onboarding-configured` | After draft → split | Assignee (CC `CC_EMAIL`) |
| `onboarding-report-sent` | "Send to client" in report editor | Client `contact_email` (CC `CC_EMAIL`) |
| `onboarding-report-viewed` | View page load | Assignee (throttled via `last_view_email_at`, 30-min window per existing constant) |
| `onboarding-signed-off` | Sign-off page click | Assignee + client (separate emails) |

### New edge function: `supabase/functions/onboarding-reminders/index.ts`

Daily cron (Supabase `pg_cron` schedule at 09:00 Europe/London). For each active onboarding:

1. Read thresholds from `onboarding_settings`
2. Determine current stage's deadline timestamp
3. If overdue AND no reminder sent in last 48h for the same stage:
   - Send chase email to assignee (Stage 1 reminder includes "form not started" / "kickoff not booked" specifics; Stage 2 / 3 reminders include direct links)
   - Update `last_reminder_at` and `last_reminder_stage`

Working-day calc: small helper, Mon–Fri only. UK bank holidays out of scope for v1 (flagged for v2).

### `pg_cron` schedule (in migration)

```sql
SELECT cron.schedule(
  'onboarding-reminders-daily',
  '0 8 * * *',  -- 08:00 UTC = 09:00 BST / 08:00 GMT (close enough)
  $$
    SELECT net.http_post(
      url := '<SUPABASE_URL>/functions/v1/onboarding-reminders',
      headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
    );
  $$
);
```

Service role key + URL injected at deploy time, not committed.

## Routing

New routes added to `src/App.tsx`:

| Route | Component | Auth |
|-------|-----------|------|
| `/onboarding/:id` | `OnboardingDetail` | `ProtectedRoute` |
| `/onboarding/:id/report` | `OnboardingReportEditor` | `ProtectedRoute` |
| `/onboarding/report/:view_token` | `OnboardingReportView` | Public |
| `/onboarding/signoff/:signoff_token` | `OnboardingSignoff` | Public |

The dashboard tab is reached via the existing `/admin` route's tab system, not a separate URL.

## Permissions Summary

| Table | SELECT | INSERT/UPDATE/DELETE |
|-------|--------|----------------------|
| `onboarding_action_library` | authenticated | admin |
| `onboarding_report_section_templates` | authenticated | admin |
| `onboarding_settings` | authenticated | admin |
| `client_onboardings` | authenticated | authenticated |
| `onboarding_action_instances` | authenticated | authenticated |
| `onboarding_reports` | authenticated | authenticated |
| `onboarding_report_views` | authenticated | service role only |

Public token-gated access (view + signoff) handled in the edge function — never via direct table reads from anon.

## Error Handling

- **Trigger failure on signing:** caught in `notify-proposal`, logged, sign event still succeeds. Manual "Create onboarding" button in dashboard is the fallback.
- **SendGrid failure:** logged via `console.error` (existing pattern). UI toast on user-initiated send actions.
- **Invalid / expired token (view or signoff):** edge function returns 404; client page renders friendly "this link is no longer valid" message.
- **Concurrent sign-off:** idempotent — repeat clicks on the signoff token surface the existing confirmation state without re-writing.
- **Concurrent send:** "Send to client" button disabled during request; `sent_at` write is the source of truth (re-clicks no-op).
- **Reminder duplication:** `last_reminder_at` + `last_reminder_stage` + 48h check in the reminder function.

## Testing

- **Vitest unit tests:**
  - Working-day threshold calculation
  - Stage completion derivation (Stage 1 readiness, dashboard outstanding-actions count)
  - Report template substitution (`{{recommended_actions}}` → formatted string)
  - Reminder de-dupe logic
- **Component tests (React Testing Library — already in devDependencies):**
  - `OnboardingDetail` Stage 1 panel: status changes, ad-hoc action creation, "Complete Stage 1" enablement
  - Form-schema editor: field add/remove/reorder, persisted JSON shape
  - Onboarding dashboard: filter behaviour, overdue rendering
- **Integration tests** for trigger flow: synthetic signed event → verify draft row + email payload (mocked SendGrid)
- **Manual test checklist** in this spec — included in the Manual Test Checklist section below
- No E2E framework introduction in v1 (no Playwright/Cypress in current deps)

## Manual Test Checklist

End-to-end happy path:

1. Sign a proposal as a customer → confirm draft `client_onboardings` row appears for the assignee
2. Assignee opens the draft, picks 2 service types → confirm 2 active onboardings created and draft removed
3. Open one active onboarding, set kick-off date, mark held, work through actions (mix of checklist + structured form), complete Stage 1 → confirm `current_stage` advances to 2
4. Open report editor → confirm sections cloned from templates and `{{recommended_actions}}` populated
5. Edit sections, send report → confirm client email arrives with view link, `sent_at` set, current stage advances to 3
6. Open the view link as the client → confirm view tracked, throttled email to assignee
7. Click "Confirm onboarding complete" on signoff page → confirm `signed_off_at` set, status `complete`, both notifications sent
8. Refresh dashboard → confirm onboarding hidden by default, visible when "Show completed" toggled
9. Wait through (or simulate) overdue threshold → confirm reminder email sent, `last_reminder_at` updated, no duplicate within 48h

Repeat steps 1–7 for an ad-hoc agreement signing.

## Out of Scope

- Information capture form template content (per source doc — defined separately by stakeholders)
- Client login or portal (per source doc — clients interact via tokenised links only)
- Calendar integration for kick-off booking (phase 2)
- UK bank-holiday awareness in working-day calc (v2 — Mon–Fri only for v1)
- Multi-language report rendering
- Bulk dashboard operations (assign many at once, etc.)
- E-sign integration with external providers (the platform IS the e-sign provider)
- Inbound email parsing for the trigger (sign events are in-process; no email to parse)

## Open Questions Resolved from Source Doc

| Source Q | Resolution |
|----------|------------|
| 1. Reminder thresholds | 5 / 5 / 10 / 5 working days, admin-configurable via `onboarding_settings` |
| 2. How to detect signed contract email | Moot — platform is the e-sign provider; sign events are in-process. Trigger chained off existing `signed`/`adhoc-signed` handlers in `notify-proposal` |
| 3. Completed records visibility | Hidden by default with "Show completed" filter toggle (Q6c-i) |
| 4. Default assigned team member | Inherits from source contract's `prepared_by_user_id`, editable later (Q6a-i) |
