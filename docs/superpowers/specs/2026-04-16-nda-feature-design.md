# NDA Feature Design

## Overview

Add a top-level NDA section to ProposalPal. Users can create NDAs from templates, send signing links to counterparties, and track status (draft/sent/signed). Simon Jeavons' signature is pre-applied; the customer only signs.

## Database Schema

### `nda_templates`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| name | TEXT NOT NULL | e.g. "Mutual NDA" |
| description | TEXT | |
| sections | JSONB NOT NULL | [{heading, body}] |
| sort_order | INT DEFAULT 0 | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

RLS: public read, admin write.

Seeded with **Mutual NDA** template — cleaned-up text from `Blank Mutual NDA NO COMPANY.doc`:
- Fixed inconsistent numbering (section 10 jumps, missing clause 2.3)
- Sentence case for clause openers (remove all-caps)
- Placeholders stripped (variable data stored in `ndas` table)
- Confidentiality duration uses a placeholder token `{{CONFIDENTIALITY_YEARS}}` replaced at render time

### `ndas`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| slug | TEXT UNIQUE NOT NULL | URL-safe identifier |
| status | TEXT DEFAULT 'draft' | 'draft' / 'pending' / 'signed' |
| template_id | UUID FK → nda_templates | |
| shoothill_signatory | TEXT DEFAULT 'Simon Jeavons' | |
| shoothill_title | TEXT DEFAULT 'Group Managing Director' | |
| company_name | TEXT NOT NULL | Counterparty |
| company_reg_number | TEXT | |
| registered_address_1 | TEXT | |
| registered_address_2 | TEXT | |
| registered_city | TEXT | |
| registered_county | TEXT | |
| registered_postcode | TEXT | |
| contact_name | TEXT | Person receiving signing link |
| contact_email | TEXT | |
| purpose | TEXT NOT NULL | Custom purpose description |
| confidentiality_years | INT DEFAULT 5 | 2/3/5 or NULL for indefinite |
| agreement_date | DATE DEFAULT CURRENT_DATE | |
| signer_name | TEXT | Populated on signing |
| signer_title | TEXT | Populated on signing |
| signed_at | TIMESTAMPTZ | Populated on signing |
| signed_nda_url | TEXT | Storage path to signed PDF |
| prepared_by_user_id | UUID FK → profiles | |
| last_view_email_at | TIMESTAMPTZ | Throttle view notifications |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

RLS: authenticated CRUD own rows, public read by slug.

### `nda_views`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| nda_id | UUID FK → ndas ON DELETE CASCADE | |
| viewed_at | TIMESTAMPTZ | |
| user_agent | TEXT | |
| ip | TEXT | |

## Routes

- **Public**: `/nda/:slug/sign` → `NdaSign.tsx`
- **Admin**: Top-level "NDAs" sidebar tab renders NDA sub-views in `AdminDashboard.tsx`

## Components

### Sidebar
- New top-level "NDAs" tab (peer to Dashboard, Proposals, Agreements)
- Sub-items: "New NDA", "All NDAs"

### NDA List View (`ndaView === 'all'`)
- Table: company name, contact, purpose, status badge (draft/pending/signed), date, actions
- Status badges: draft=grey, pending=amber, signed=green
- Click row to edit (if draft) or view details
- Action buttons: Edit (draft), Copy Link (pending), Download PDF (signed), Delete (draft)

### NDA Form (`ndaView === 'new'`)
- Template dropdown (from `nda_templates`)
- Company details: name, reg number, address fields
- Contact: name, email
- Purpose: textarea
- Confidentiality duration: dropdown (2/3/5 years, Indefinite)
- Agreement date: date picker
- Buttons: Save Draft, Send for Signature (sets status='pending', generates slug/link)

### NDA Signing Page (`NdaSign.tsx`)
- Header: Shoothill branding, NDA reference
- Full NDA text rendered on-screen (sections from template, with variable data interpolated)
- Dynamic replacements: company name/address, purpose, date, confidentiality years
- Signature section at bottom:
  - Shoothill side: pre-filled with Simon Jeavons signature (SIMON_SIGNATURE_URI), name, title
  - Customer side: signature canvas, name input, title input, confirmation checkbox
- Submit: generates signed PDF, uploads to storage, updates status to 'signed'

### NDA PDF (`NdaPDF.tsx`)
- @react-pdf/renderer document
- Cover page with parties, date, purpose
- Full NDA sections
- Certificate page with both signatures (same pattern as ad-hoc)

## Email Notifications

Added to existing `notify-proposal` edge function:

### `nda-viewed` event
- Record in `nda_views`
- Throttle: 30 min
- Email to preparer (CC Simon): "NDA viewed: {company_name}"

### `nda-signed` event
- Email to customer (contact_email) with signed PDF attached/linked — CC Simon + preparer
- Subject: "[NDA] Signed: Mutual NDA - {company_name}"
- Customer can also download immediately from the signing page after submitting

## NDA Template Content

The Mutual NDA template sections (cleaned from source doc):

1. Definitions and Interpretation
2. Obligations of Confidentiality
3. Return of Information
4. Reservation of Rights and Acknowledgement
5. Warranty and Indemnity
6. Term and Termination (with `{{CONFIDENTIALITY_YEARS}}` token)
7. Entire Agreement and Variation
8. No Waiver
9. Assignment
10. Notices
11. No Partnership
12. Third Party Rights
13. Governing Law and Jurisdiction

Signing block rendered dynamically (not a template section).

## Pre-signed Signature

Simon Jeavons' signature (existing `SIMON_SIGNATURE_URI` base64 constant) is embedded:
- On the signing page: displayed as an image in the Shoothill signatory section
- In the PDF: embedded on the certificate page via pdf-lib (same as ad-hoc flow)

## Key Differences from Ad-Hoc Agreements

| Aspect | Ad-Hoc | NDA |
|--------|--------|-----|
| Pricing/phases | Yes | No |
| Template sections | Service agreement terms | NDA terms |
| Variable fields | Many (phases, items, retainers) | Few (company, purpose, duration) |
| Form complexity | High | Low |
| PDF content | Pricing tables + legal terms | Legal terms only |
