# NDA Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full NDA section to ProposalPal — create, send, and sign NDAs with pre-applied Shoothill signature.

**Architecture:** New `nda_templates` and `ndas` tables parallel the existing ad-hoc agreements pattern but with a simpler schema (no pricing/phases). New `NdaSign.tsx` page for public signing, NDA sub-views in `AdminDashboard.tsx`, and new events in the `notify-proposal` edge function.

**Tech Stack:** React 18 + Vite + TypeScript, Supabase (PostgreSQL + Edge Functions), @react-pdf/renderer, pdf-lib, shadcn/ui, SendGrid, TanStack React Query.

---

## File Structure

**Create:**
- `supabase/migrations/20260416120000_nda_tables.sql` — `nda_templates`, `ndas`, `nda_views` tables + seed Mutual NDA template
- `src/pages/NdaSign.tsx` — Public NDA signing page
- `src/components/NdaPDF.tsx` — NDA PDF renderer

**Modify:**
- `src/components/Sidebar.tsx` — Add top-level "NDAs" tab with sub-items
- `src/pages/AdminDashboard.tsx` — Add NDA state, form, list view, CRUD logic
- `src/App.tsx` — Add `/nda/:slug/sign` route
- `supabase/functions/notify-proposal/index.ts` — Add `nda-viewed` and `nda-signed` events

---

### Task 1: Database Migration — NDA Tables + Seed Template

**Files:**
- Create: `supabase/migrations/20260416120000_nda_tables.sql`

This migration creates three tables and seeds the Mutual NDA template. The NDA text has been cleaned from the source Word document: numbering fixed, all-caps removed, clause 2.3 gap resolved, `{{CONFIDENTIALITY_YEARS}}` token added for dynamic duration.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260416120000_nda_tables.sql` with the following content:

```sql
-- Migration: NDA tables (nda_templates, ndas, nda_views) + seed Mutual NDA
-- Generated: 2026-04-16

-- ─── nda_templates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nda_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nda_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nda_templates"
  ON public.nda_templates FOR SELECT USING (true);

CREATE POLICY "Admin write nda_templates"
  ON public.nda_templates FOR ALL USING (public.is_admin());

-- ─── ndas ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ndas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  status TEXT NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES public.nda_templates(id),

  -- Shoothill party (pre-signed)
  shoothill_signatory TEXT NOT NULL DEFAULT 'Simon Jeavons',
  shoothill_title TEXT NOT NULL DEFAULT 'Group Managing Director',

  -- Counterparty
  company_name TEXT NOT NULL,
  company_reg_number TEXT,
  registered_address_1 TEXT,
  registered_address_2 TEXT,
  registered_city TEXT,
  registered_county TEXT,
  registered_postcode TEXT,
  contact_name TEXT,
  contact_email TEXT,

  -- NDA-specific
  purpose TEXT NOT NULL DEFAULT 'potential business collaboration opportunities',
  confidentiality_years INTEGER DEFAULT 5,
  agreement_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Signature (populated on signing)
  signer_name TEXT,
  signer_title TEXT,
  signed_at TIMESTAMPTZ,
  signed_nda_url TEXT,

  -- Metadata
  prepared_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_view_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ndas ENABLE ROW LEVEL SECURITY;

-- Authenticated users can CRUD
CREATE POLICY "auth_all_ndas" ON public.ndas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public can read by slug (for signing page)
CREATE POLICY "public_read_ndas_by_slug" ON public.ndas
  FOR SELECT USING (true);

-- ─── nda_views ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nda_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nda_id UUID NOT NULL REFERENCES public.ndas(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_nda_views_nda_id_viewed_at
  ON public.nda_views (nda_id, viewed_at DESC);

ALTER TABLE public.nda_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_nda_views" ON public.nda_views;
CREATE POLICY "auth_read_nda_views" ON public.nda_views
  FOR SELECT TO authenticated USING (true);

-- ─── Seed: Mutual NDA template ──────────────────────────────────────────────
INSERT INTO public.nda_templates (name, description, sections, sort_order)
VALUES (
  'Mutual NDA',
  'Standard mutual confidentiality agreement. Both parties agree to protect each other''s confidential information disclosed for the purpose of potential business collaboration.',
  '[
    {
      "heading": "1. Definitions and Interpretation",
      "body": "1.1 The following definitions and rules of interpretation apply in this Agreement:\n\nBusiness Day: a day (other than a Saturday, Sunday or public holiday) when banks in London are open for business.\n\nConfidential Information: all confidential information (however recorded, preserved or disclosed) disclosed by a party or its Representatives to the other party and that party''s Representatives including but not limited to:\n\n(a) the fact that discussions and negotiations are taking place concerning the Purpose and the status of those discussions and negotiations;\n\n(b) the terms of this agreement;\n\n(c) any information that would be regarded as confidential by a reasonable business person relating to:\n  (i) the business, affairs, customers, clients, suppliers, plans, intentions, or market opportunities of the Disclosing Party or of the Disclosing Party''s Group; and\n  (ii) the operations, processes, product information, know-how, designs, trade secrets or software of the Disclosing Party or of the Disclosing Party''s Group;\n\n(d) any information or analysis derived from Confidential Information;\n\nbut not including any information that:\n\n(e) is or becomes generally available to the public other than as a result of its disclosure by the Recipient or its Representatives in breach of this agreement or of any other undertaking of confidentiality addressed to the party to whom the information relates (except that any compilation of otherwise public information in a form not publicly known shall nevertheless be treated as Confidential Information); or\n\n(f) was, is or becomes available to the Recipient on a non-confidential basis from a person who, to the Recipient''s knowledge, is not bound by a confidentiality agreement with the Disclosing Party or otherwise prohibited from disclosing the information to the Recipient; or\n\n(g) was lawfully in the possession of the Recipient before the information was disclosed to it by the Disclosing Party; or\n\n(h) the parties agree in writing is not confidential or may be disclosed; or\n\n(i) is developed by or for the Recipient independently of the information disclosed by the Disclosing Party.\n\nDisclosing Party: a party to this agreement which discloses or makes available directly or indirectly Confidential Information.\n\nGroup: in relation to a company, that company, each and any group undertaking, as such term is defined in section 1161 of the Companies Act 2006.\n\nPurpose: as defined in the Background.\n\nRecipient: a party to this agreement which receives or obtains directly or indirectly Confidential Information.\n\nRepresentative: employees, agents, officers, advisers and other representatives of the Disclosing Party or Recipient (as applicable) or their respective Groups.\n\n1.2 Clause, schedule and paragraph headings shall not affect the interpretation of this agreement.\n\n1.3 A person includes a natural person, corporate or unincorporated body (whether or not having separate legal personality).\n\n1.4 The schedules form part of this agreement and shall have effect as if set out in full in the body of this agreement. Any reference to this agreement includes the schedules.\n\n1.5 Unless the context otherwise requires, words in the singular shall include the plural and in the plural include the singular.\n\n1.6 A reference to a statute or statutory provision is a reference to it as it is in force for the time being, taking account of any amendment, extension, or re-enactment, and includes any subordinate legislation for the time being in force made under it.\n\n1.7 Any obligation in this agreement on a person not to do something includes an obligation not to agree or allow that thing to be done.\n\n1.8 References to clauses and schedules are to the clauses and schedules of this agreement; references to paragraphs are to paragraphs of the relevant schedule."
    },
    {
      "heading": "2. Obligations of Confidentiality",
      "body": "2.1 The Recipient shall keep the Disclosing Party''s Confidential Information confidential and, except with the prior written consent of the Disclosing Party, shall:\n\n(a) not use or exploit the Confidential Information in any way except for the Purpose;\n\n(b) not disclose or make available the Confidential Information in whole or in part to any third party, except as expressly permitted by this agreement;\n\n(c) not copy, reduce to writing or otherwise record the Confidential Information except as strictly necessary for the Purpose (and any such copies, reductions to writing and records shall be the property of the Disclosing Party); and\n\n(d) apply the same security measures and degree of care to the Confidential Information as the Recipient applies to its own confidential information, which the Recipient warrants as providing adequate protection from unauthorised disclosure, copying or use.\n\n2.2 The Recipient may disclose the Disclosing Party''s Confidential Information to those of its Representatives who need to know this Confidential Information for the Purpose, provided that:\n\n(a) it informs its Representatives of the confidential nature of the Confidential Information before disclosure; and\n\n(b) it procures that its Representatives shall, in relation to any Confidential Information disclosed to them, comply with this agreement as if they were the Recipient and, if the Disclosing Party so requests, procure that any relevant Representative enters into a confidentiality agreement with the Disclosing Party on terms equivalent to those contained in this agreement,\n\nand it shall at all times be liable for the failure of any Representative to comply with the terms of this agreement.\n\n2.3 A party may disclose Confidential Information to the extent such Confidential Information is required to be disclosed by law, by any governmental or other regulatory authority, or by a court or other authority of competent jurisdiction provided that, to the extent it is legally permitted to do so, it gives the other party as much notice of this disclosure as possible and, where notice of disclosure is not prohibited and is given in accordance with this clause 2.3, it takes into account the reasonable requests of the other party in relation to the content of this disclosure.\n\n2.4 The Recipient shall establish and maintain adequate security measures (including any reasonable security measures proposed by the Disclosing Party from time to time) to safeguard the Confidential Information from unauthorised access or use.\n\n2.5 No party shall make, or permit any person to make, any public announcement concerning this agreement, the Purpose or its prospective interest in the Purpose without the prior written consent of the other party (such consent not to be unreasonably withheld or delayed) except as required by law or any governmental or regulatory authority (including, without limitation, any relevant securities exchange) or by any court or other authority of competent jurisdiction. No party shall make use of the other party''s name or any information acquired through its dealings with the other party for publicity or marketing purposes without the prior written consent of the other party."
    },
    {
      "heading": "3. Return of Information",
      "body": "3.1 At the request of the Disclosing Party, the Recipient shall:\n\n(a) destroy or return to the Disclosing Party all documents and materials (and any copies) containing, reflecting, incorporating, or based on the Disclosing Party''s Confidential Information;\n\n(b) erase all the Disclosing Party''s Confidential Information from its computer systems or which is stored in electronic form (to the extent possible); and\n\n(c) certify in writing to the Disclosing Party that it has complied with the requirements of this clause, provided that a Recipient may retain documents and materials containing, reflecting, incorporating, or based on the Disclosing Party''s Confidential Information to the extent required by law or any applicable governmental or regulatory authority and to the extent reasonable to permit the Recipient to keep evidence that it has performed its obligations under this agreement. The provisions of this agreement shall continue to apply to any documents and materials retained by the Recipient.\n\n3.2 If the Recipient develops or uses a product or a process which, in the reasonable opinion of the Disclosing Party, might have involved the use of any of the Disclosing Party''s Confidential Information, the Recipient shall, at the request of the Disclosing Party, supply to the Disclosing Party information reasonably necessary to establish that the Disclosing Party''s Confidential Information has not been used or disclosed."
    },
    {
      "heading": "4. Reservation of Rights and Acknowledgement",
      "body": "4.1 All Confidential Information shall remain the property of the Disclosing Party. Each party reserves all rights in its Confidential Information. No rights, including, but not limited to, intellectual property rights, in respect of a party''s Confidential Information are granted to the other party and no obligations are imposed on the Disclosing Party other than those expressly stated in this agreement.\n\n4.2 Except as expressly stated in this agreement, no party makes any express or implied warranty or representation concerning its Confidential Information, or the accuracy or completeness of the Confidential Information.\n\n4.3 The disclosure of Confidential Information by the Disclosing Party shall not form any offer by, or representation or warranty on the part of, the Disclosing Party to enter into any further agreement in relation to the Purpose, or the development or supply of any product or service to which the Confidential Information relates.\n\n4.4 The Recipient acknowledges that damages alone would not be an adequate remedy for the breach of any of the provisions of this agreement. Accordingly, without prejudice to any other rights and remedies it may have, the Disclosing Party shall be entitled to the granting of equitable relief (including without limitation injunctive relief) concerning any threatened or actual breach of any of the provisions of this agreement."
    },
    {
      "heading": "5. Warranty and Indemnity",
      "body": "5.1 Each Disclosing Party warrants that it has the right to disclose its Confidential Information to the Recipient and to authorise the Recipient to use such Confidential Information for the Purpose.\n\n5.2 Each Recipient shall indemnify and keep fully indemnified the Disclosing Party and its Group at all times against all liabilities, costs (including legal costs on an indemnity basis), expenses, damages and losses (including any direct, indirect or consequential losses, loss of profit, loss of reputation and all interest, penalties and other reasonable costs and expenses suffered or incurred by the Disclosing Party and/or its Group) arising from any breach of this agreement by the Recipient and from the actions or omissions of any Representative of the Recipient."
    },
    {
      "heading": "6. Term and Termination",
      "body": "6.1 If either party decides not to become or continue to be involved in the Purpose it shall notify the other party in writing immediately. The obligations of each party shall, notwithstanding any earlier termination of negotiations or discussions between the parties in relation to the Purpose, continue for a period of {{CONFIDENTIALITY_YEARS}} from the termination of this agreement.\n\n6.2 Termination of this agreement shall not affect any accrued rights or remedies to which either party is entitled."
    },
    {
      "heading": "7. Entire Agreement and Variation",
      "body": "7.1 This agreement constitutes the entire agreement between the parties and supersedes and extinguishes all previous drafts, agreements, arrangements and understandings between them, whether written or oral, relating to its subject matter.\n\n7.2 Each party agrees that it shall have no remedies in respect of any representation or warranty (whether made innocently or negligently) that is not set out in this agreement. Each party agrees that its only liability in respect of those representations and warranties that are set out in this agreement (whether made innocently or negligently) shall be for breach of contract.\n\n7.3 No variation of this agreement shall be effective unless it is in writing and signed by each of the parties (or their authorised representatives)."
    },
    {
      "heading": "8. No Waiver",
      "body": "8.1 Failure to exercise, or any delay in exercising, any right or remedy provided under this agreement or by law shall not constitute a waiver of that or any other right or remedy, nor shall it preclude or restrict any further exercise of that or any other right or remedy.\n\n8.2 No single or partial exercise of any right or remedy provided under this agreement or by law shall preclude or restrict the further exercise of that or any other right or remedy."
    },
    {
      "heading": "9. Assignment",
      "body": "Except as otherwise provided in this agreement, no party may assign, sub-contract or deal in any way with, any of its rights or obligations under this agreement or any document referred to in it."
    },
    {
      "heading": "10. Notices",
      "body": "10.1 Any notice required to be given under this agreement, shall be in writing and shall be delivered personally, or sent by pre-paid first-class post or recorded delivery or by commercial courier, to each party required to receive the notice at its address as set out below:\n\n(a) Shoothill Ltd:\nFAO: The Group Managing Director\nWillow House East\nShrewsbury Business Park\nShrewsbury\nSY2 6LG\n\n(b) The other party at the address specified in this agreement.\n\n10.2 Or as otherwise specified by the relevant party by notice in writing to each other party.\n\n10.3 Any notice shall be deemed to have been duly received:\n\n(a) if delivered personally, when left at the address and for the contact referred to in this clause; or\n\n(b) if sent by pre-paid first class post or recorded delivery, at 9.00 am on the second Business Day after posting; or\n\n(c) if delivered by commercial courier, on the date and at the time that the courier''s delivery receipt is signed.\n\n10.4 A notice required to be given under this agreement shall not be validly given if sent by e-mail."
    },
    {
      "heading": "11. No Partnership",
      "body": "Nothing in this agreement is intended to, or shall be deemed to, establish any partnership or joint venture between any of the parties, constitute any party the agent of another party, nor authorise any party to make or enter into any commitments for or on behalf of any other party."
    },
    {
      "heading": "12. Third Party Rights",
      "body": "A person who is not a party to this agreement shall not have any rights under or in connection with it."
    },
    {
      "heading": "13. Governing Law and Jurisdiction",
      "body": "13.1 This agreement and any dispute or claim arising out of or in connection with it or its subject matter or formation (including non-contractual disputes or claims) shall be governed by and construed in accordance with English law.\n\n13.2 The parties irrevocably agree that the courts of England and Wales shall have exclusive jurisdiction to settle any dispute or claim that arises out of or in connection with this agreement or its subject matter or formation (including non-contractual disputes or claims)."
    }
  ]'::jsonb,
  1
);
```

- [ ] **Step 2: Apply the migration to Supabase**

Run: `npx supabase db push` (or apply via the Supabase dashboard if using hosted).

Verify: Tables `nda_templates`, `ndas`, and `nda_views` exist. The Mutual NDA template has 13 sections.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260416120000_nda_tables.sql
git commit -m "feat: add NDA database tables and seed Mutual NDA template"
```

---

### Task 2: NDA PDF Renderer

**Files:**
- Create: `src/components/NdaPDF.tsx`

This component renders a PDF of the NDA using @react-pdf/renderer. It's much simpler than `ServiceAgreementPDF.tsx` — no pricing tables, just parties, purpose, date, and the NDA sections from the template.

- [ ] **Step 1: Create NdaPDF.tsx**

Create `src/components/NdaPDF.tsx`. This component accepts the NDA data and template sections, renders:
- Cover/header with Shoothill logo and "Mutual Confidentiality Agreement" title
- Parties block (Shoothill + counterparty with address)
- Background paragraph (interpolating the purpose)
- All template sections (with `{{CONFIDENTIALITY_YEARS}}` replaced)
- Signing block (both parties)

Key props interface:

```typescript
export interface NdaPDFProps {
  companyName: string;
  companyRegNumber?: string;
  registeredAddress: string; // pre-formatted
  purpose: string;
  confidentialityYears: number | null; // null = indefinite
  agreementDate: string; // formatted date string
  templateSections: Array<{ heading: string; body: string }>;
  // Signature data (passed at signing time)
  clientSignerName?: string;
  clientSignerTitle?: string;
  clientSignatureUri?: string;
  signingDate?: string;
}
```

Use the same style constants from `ServiceAgreementPDF.tsx`: `NAVY = '#043D5D'`, `BLUE = '#009FE3'`, `MID = '#3A6278'`, `LIGHT = '#AAAAAA'`, `BG = '#F4F7FA'`.

Re-export `SHOOTHILL_LOGO_URI` and `SIMON_SIGNATURE_URI` from `ServiceAgreementPDF.tsx` (import them).

The `{{CONFIDENTIALITY_YEARS}}` token in section bodies should be replaced with either "five (5) years" / "three (3) years" / "two (2) years" or "an indefinite period" depending on `confidentialityYears`.

- [ ] **Step 2: Commit**

```bash
git add src/components/NdaPDF.tsx
git commit -m "feat: add NDA PDF renderer component"
```

---

### Task 3: NDA Signing Page

**Files:**
- Create: `src/pages/NdaSign.tsx`

This is the public page customers visit to read and sign the NDA. Pattern follows `AdhocSign.tsx` but is simpler (no pricing/phases).

- [ ] **Step 1: Create NdaSign.tsx**

Create `src/pages/NdaSign.tsx`. This component:

1. **Extracts slug** from URL params via `useParams<{ slug: string }>()`
2. **Fetches NDA** from `ndas` table by slug (with template sections from `nda_templates`)
3. **Fires view event** — POST to `notify-proposal` with `type: 'nda-viewed'`
4. **Renders full NDA text** on screen:
   - Header: Shoothill branding, "Mutual Confidentiality Agreement"
   - Parties section: Shoothill Ltd details + counterparty details from NDA record
   - Background paragraph with interpolated purpose
   - All template sections (replacing `{{CONFIDENTIALITY_YEARS}}` token)
5. **Pre-signed Shoothill signature** — display Simon's signature image (from `SIMON_SIGNATURE_URI`) with name/title
6. **Signature capture** — reuse the `SignatureCanvas` component pattern from `AdhocSign.tsx` (copy the component inline or extract to shared file)
   - Signer name input (required)
   - Signer title input (optional)
   - "I confirm I have authority to sign" checkbox
7. **handleSubmit** — on submission:
   - Generate PDF using `NdaPDF` component via `@react-pdf/renderer`'s `pdf()` function
   - Append certificate page using `pdf-lib` (same pattern as `AdhocSign.tsx:438-503`)
   - Upload signed PDF to `contracts` storage bucket as `nda-{id}-signed-{timestamp}.pdf`
   - Update `ndas` row: `status='signed'`, `signer_name`, `signer_title`, `signed_at`, `signed_nda_url`
   - POST to `notify-proposal` with `type: 'nda-signed'`
8. **Post-submit state** — show success message with download link for the signed PDF

The `confidentialityYears` replacement logic:
- `null` → "an indefinite period"
- `2` → "two (2) years"
- `3` → "three (3) years"
- `5` → "five (5) years"

Helper function:

```typescript
function formatConfidentialityDuration(years: number | null): string {
  if (years === null) return 'an indefinite period';
  const words: Record<number, string> = { 2: 'two', 3: 'three', 5: 'five' };
  return `${words[years] || years} (${years}) years`;
}
```

Use this same helper in both `NdaSign.tsx` (for on-screen rendering) and pass the value through to `NdaPDF.tsx`.

- [ ] **Step 2: Commit**

```bash
git add src/pages/NdaSign.tsx
git commit -m "feat: add NDA public signing page"
```

---

### Task 4: Add Route for NDA Signing

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the NDA signing route**

In `src/App.tsx`, add the import and route:

Import at top (after the `AdhocSign` import on line 12):
```typescript
import NdaSign from "./pages/NdaSign";
```

Add route (after line 33 — the `AdhocSign` route):
```tsx
<Route path="/nda/:slug/sign" element={<NdaSign />} />
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add NDA signing route"
```

---

### Task 5: Update Sidebar — Add NDAs Top-Level Tab

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Update Tab type and add NDA sub-items**

In `src/components/Sidebar.tsx`:

1. Update the `Tab` type (line 5) to include `"ndas"`:
```typescript
type Tab = "dashboard" | "proposals" | "users" | "team" | "solutions" | "services" | "agreements" | "ndas";
```

2. Add `NdaView` type after line 6:
```typescript
type NdaView = "new" | "all";
```

3. Add `NDA_SUBS` array (after `AGREEMENT_SUBS` on line 29):
```typescript
const NDA_SUBS: { view: NdaView; label: string; icon: React.ElementType }[] = [
  { view: "new", label: "New NDA", icon: Plus },
  { view: "all", label: "All NDAs", icon: FolderOpen },
];
```

4. Update `SidebarProps` to include NDA props:
```typescript
interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onServicesClick: () => void;
  userEmail?: string;
  onSignOut: () => void;
  adhocView?: AdhocView;
  onAdhocViewChange?: (view: AdhocView) => void;
  ndaView?: NdaView;
  onNdaViewChange?: (view: NdaView) => void;
}
```

5. Destructure new props in `Sidebar` function signature (line 68):
```typescript
export function Sidebar({ ..., ndaView = 'all', onNdaViewChange }: SidebarProps) {
```

6. Add NDA sub-click handler (after `handleAdhocSubClick` around line 80):
```typescript
const handleNdaSubClick = (view: NdaView) => {
  onTabChange("ndas");
  onNdaViewChange?.(view);
  setMobileOpen(false);
};
```

7. Add the `ndasActive` flag:
```typescript
const ndasActive = activeTab === "ndas";
```

8. Add the NDAs nav section in the JSX (after the Agreements collapsible section, before the Admin group around line 148). Import the `FileSignature` icon from lucide-react (or use `Scale` — but `FileSignature` is more appropriate if available; otherwise use `FileText`):

```tsx
{/* NDAs with sub-items */}
<NavItem
  label="NDAs"
  icon={FileText}
  active={ndasActive}
  onClick={() => handleNdaSubClick(ndaView)}
  extra={ndasActive ? <ChevronDown className="w-3 h-3 text-white/30" /> : undefined}
/>
{ndasActive && (
  <div className="space-y-0.5 pb-1">
    {NDA_SUBS.map(sub => (
      <SubNavItem
        key={sub.view}
        label={sub.label}
        icon={sub.icon}
        active={ndaView === sub.view}
        onClick={() => handleNdaSubClick(sub.view)}
      />
    ))}
  </div>
)}
```

Note: Import `FileText` is already imported. Import `Plus` and `FolderOpen` are already imported.

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add NDAs top-level tab to sidebar"
```

---

### Task 6: AdminDashboard — NDA State, Form, and List

**Files:**
- Modify: `src/pages/AdminDashboard.tsx`

This is the largest task. It adds NDA state management, form, list view, and CRUD operations to AdminDashboard.

- [ ] **Step 1: Update the Tab type**

In `AdminDashboard.tsx` line 30, update:
```typescript
type Tab = "dashboard" | "proposals" | "users" | "team" | "solutions" | "services" | "agreements" | "ndas";
```

- [ ] **Step 2: Add NDA-related interfaces and state**

After the existing ad-hoc state (around line 189), add:

```typescript
// NDA tab state
type NdaView = 'new' | 'all';
const [ndaView, setNdaView] = useState<NdaView>('all');
const [ndaTemplates, setNdaTemplates] = useState<AgreementTemplate[]>([]);
const [ndaTemplatesLoading, setNdaTemplatesLoading] = useState(true);
const [allNdas, setAllNdas] = useState<any[]>([]);
const [allNdasLoading, setAllNdasLoading] = useState(false);
const [savingNda, setSavingNda] = useState(false);
const [savingNdaDraft, setSavingNdaDraft] = useState(false);
const [editingNdaId, setEditingNdaId] = useState<string | null>(null);
const [ndaLink, setNdaLink] = useState<string | null>(null);
const [ndaForm, setNdaForm] = useState({
  companyName: '',
  companyRegNumber: '',
  registeredAddress1: '',
  registeredAddress2: '',
  registeredCity: '',
  registeredCounty: '',
  registeredPostcode: '',
  contactName: '',
  contactEmail: '',
  purpose: 'potential business collaboration opportunities',
  confidentialityYears: 5 as number | null,
  agreementDate: new Date().toISOString().split('T')[0],
  templateId: '',
  preparedByUserId: '',
});
```

- [ ] **Step 3: Add NDA fetch functions**

Add these functions after the existing fetch functions:

```typescript
const fetchNdaTemplates = async () => {
  setNdaTemplatesLoading(true);
  const { data } = await supabase
    .from('nda_templates' as any)
    .select('id, name, description, sections, sort_order')
    .order('sort_order');
  if (data) setNdaTemplates((data as any[]).map(t => ({
    id: t.id, name: t.name, description: t.description || '',
    sections: Array.isArray(t.sections) ? t.sections : [],
    sort_order: t.sort_order,
  })));
  setNdaTemplatesLoading(false);
};

const fetchAllNdas = async () => {
  setAllNdasLoading(true);
  const { data } = await supabase
    .from('ndas' as any)
    .select('id, slug, status, company_name, contact_name, contact_email, purpose, confidentiality_years, agreement_date, signer_name, signer_title, signed_at, signed_nda_url, created_at, template_id, prepared_by_user_id')
    .order('created_at', { ascending: false });
  setAllNdas(data || []);
  setAllNdasLoading(false);
};
```

- [ ] **Step 4: Add NDA useEffect triggers**

In the useEffect block that fetches data when tabs change, add logic for the "ndas" tab:

```typescript
useEffect(() => {
  if (activeTab === 'ndas') {
    fetchNdaTemplates();
    fetchAllNdas();
  }
}, [activeTab]);
```

Also set the user's ID when fetching NDA templates (same pattern as ad-hoc):
```typescript
// Inside the effect that sets preparedByUserId for adhoc, also set for ndas:
if (user?.id && !ndaForm.preparedByUserId) {
  setNdaForm(f => ({ ...f, preparedByUserId: user.id }));
}
```

- [ ] **Step 5: Add NDA CRUD functions**

```typescript
const ndaFormPayload = (status: 'draft' | 'pending') => ({
  status,
  company_name: ndaForm.companyName,
  company_reg_number: ndaForm.companyRegNumber || null,
  registered_address_1: ndaForm.registeredAddress1 || null,
  registered_address_2: ndaForm.registeredAddress2 || null,
  registered_city: ndaForm.registeredCity || null,
  registered_county: ndaForm.registeredCounty || null,
  registered_postcode: ndaForm.registeredPostcode || null,
  contact_name: ndaForm.contactName || null,
  contact_email: ndaForm.contactEmail || null,
  purpose: ndaForm.purpose,
  confidentiality_years: ndaForm.confidentialityYears,
  agreement_date: ndaForm.agreementDate,
  template_id: ndaForm.templateId || null,
  prepared_by_user_id: ndaForm.preparedByUserId || null,
});

const resetNdaForm = () => {
  setNdaForm({
    companyName: '', companyRegNumber: '', registeredAddress1: '', registeredAddress2: '',
    registeredCity: '', registeredCounty: '', registeredPostcode: '',
    contactName: '', contactEmail: '',
    purpose: 'potential business collaboration opportunities',
    confidentialityYears: 5,
    agreementDate: new Date().toISOString().split('T')[0],
    templateId: '', preparedByUserId: user?.id || '',
  });
  setEditingNdaId(null);
  setNdaLink(null);
};

const saveDraftNda = async () => {
  if (!ndaForm.companyName.trim()) { toast.error('Enter a company name first'); return; }
  setSavingNdaDraft(true);
  if (editingNdaId) {
    const { error } = await supabase.from('ndas' as any).update(ndaFormPayload('draft')).eq('id', editingNdaId);
    setSavingNdaDraft(false);
    if (error) { toast.error('Failed to update draft'); return; }
    toast.success('Draft updated');
  } else {
    const { data, error } = await supabase.from('ndas' as any).insert(ndaFormPayload('draft')).select('id').single();
    setSavingNdaDraft(false);
    if (error) { toast.error('Failed to save draft'); return; }
    if (data) setEditingNdaId((data as any).id);
    toast.success('Draft saved');
  }
};

const saveNda = async () => {
  if (!ndaForm.companyName.trim()) { toast.error('Enter a company name first'); return; }
  if (!ndaForm.contactEmail.trim()) { toast.error('Enter a contact email — they need to receive the signing link'); return; }
  setSavingNda(true);
  if (editingNdaId) {
    const { data, error } = await supabase.from('ndas' as any).update(ndaFormPayload('pending')).eq('id', editingNdaId).select('slug').single();
    setSavingNda(false);
    if (error) { toast.error('Failed to generate signing link'); return; }
    setNdaLink(`${window.location.origin}/nda/${(data as any).slug}/sign`);
    toast.success('NDA finalised — share the signing link below');
  } else {
    const { data, error } = await supabase.from('ndas' as any).insert(ndaFormPayload('pending')).select('id, slug').single();
    setSavingNda(false);
    if (error) { toast.error('Failed to create NDA'); return; }
    setEditingNdaId((data as any).id);
    setNdaLink(`${window.location.origin}/nda/${(data as any).slug}/sign`);
    toast.success('NDA created — share the signing link below');
  }
};

const loadNdaForEditing = async (id: string) => {
  const { data, error } = await supabase.from('ndas' as any).select('*').eq('id', id).single();
  if (error || !data) { toast.error('Could not load NDA'); return; }
  const d = data as any;
  setNdaForm({
    companyName: d.company_name || '',
    companyRegNumber: d.company_reg_number || '',
    registeredAddress1: d.registered_address_1 || '',
    registeredAddress2: d.registered_address_2 || '',
    registeredCity: d.registered_city || '',
    registeredCounty: d.registered_county || '',
    registeredPostcode: d.registered_postcode || '',
    contactName: d.contact_name || '',
    contactEmail: d.contact_email || '',
    purpose: d.purpose || 'potential business collaboration opportunities',
    confidentialityYears: d.confidentiality_years,
    agreementDate: d.agreement_date || new Date().toISOString().split('T')[0],
    templateId: d.template_id || '',
    preparedByUserId: d.prepared_by_user_id || '',
  });
  setEditingNdaId(id);
  setNdaLink(null);
  setNdaView('new');
};

const deleteNda = async (id: string, status: string) => {
  const label = status === 'draft' ? 'draft' : 'NDA';
  if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
  const { error } = await supabase.from('ndas' as any).delete().eq('id', id);
  if (error) { toast.error('Failed to delete'); return; }
  toast.success('Deleted');
  setAllNdas(prev => prev.filter((n: any) => n.id !== id));
  if (editingNdaId === id) resetNdaForm();
};
```

- [ ] **Step 6: Pass NDA props to Sidebar**

Where the `<Sidebar>` component is rendered, add the NDA props:
```tsx
<Sidebar
  activeTab={activeTab}
  onTabChange={setActiveTab}
  onServicesClick={() => { /* existing */ }}
  userEmail={user?.email}
  onSignOut={signOut}
  adhocView={adhocView}
  onAdhocViewChange={setAdhocView}
  ndaView={ndaView}
  onNdaViewChange={setNdaView}
/>
```

- [ ] **Step 7: Add NDA tab UI**

Add the NDAs tab content in the main render area (after the agreements tab section). This has two sub-views: `new` (form) and `all` (list).

**NDA Form (ndaView === 'new'):**
- Template dropdown (from `ndaTemplates`)
- Company details: name (required), reg number, address fields
- Contact: name, email
- Purpose: textarea
- Confidentiality duration: select dropdown (2 years, 3 years, 5 years, Indefinite)
- Agreement date: date input
- Editing draft banner (when `editingNdaId` is set)
- Buttons: Save Draft, Send for Signature
- Signing link display (when `ndaLink` is set)

**NDA List (ndaView === 'all'):**
- Uses `DocumentListRow` for each NDA
- Status badges: draft (grey), pending (amber), signed (green)
- Actions per status:
  - draft: Edit, Delete
  - pending: Copy Link, Delete
  - signed: Download PDF

Follow the exact same patterns used in the existing ad-hoc agreement form and list UI.

- [ ] **Step 8: Commit**

```bash
git add src/pages/AdminDashboard.tsx
git commit -m "feat: add NDA management to admin dashboard"
```

---

### Task 7: Notify-Proposal Edge Function — NDA Events

**Files:**
- Modify: `supabase/functions/notify-proposal/index.ts`

- [ ] **Step 1: Add nda-viewed event handler**

After the `adhoc-signed` handler block (after line 220), add the `nda-viewed` handler. This follows the exact same pattern as `adhoc-viewed` but queries the `ndas` and `nda_views` tables:

```typescript
// NDA VIEWED
if (type === "nda-viewed") {
  const ndaId = body.ndaId;
  if (!ndaId) {
    return new Response(JSON.stringify({ error: "ndaId required for nda-viewed" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  await supabase.from("nda_views").insert({
    nda_id: ndaId,
    user_agent: userAgent ?? null,
    ip: clientIp,
  });
  const { data: nda } = await supabase
    .from("ndas")
    .select("id, company_name, last_view_email_at, profiles:prepared_by_user_id (email, full_name)")
    .eq("id", ndaId)
    .single();
  if (!nda) {
    return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "nda-not-found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const lastEmailAt = (nda as any).last_view_email_at as string | null;
  if (lastEmailAt && (Date.now() - new Date(lastEmailAt).getTime() < VIEW_EMAIL_THROTTLE_MS)) {
    return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "throttled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const profile = (nda as any).profiles as { email: string; full_name: string } | null;
  if (!profile?.email) {
    return new Response(JSON.stringify({ ok: true, recorded: true, emailSkipped: "no-owner" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  await supabase.from("ndas").update({ last_view_email_at: new Date().toISOString() }).eq("id", ndaId);
  const companyName = (nda as any).company_name || "(Unknown)";
  const subject = "NDA viewed: Mutual NDA - " + companyName;
  const emailBody = [
    "Hi " + (profile.full_name || "Team") + ",",
    "",
    "A customer has just opened an NDA.",
    "",
    "Company: " + companyName,
    "",
    "You'll receive another notification when they sign it.",
    "(Further view notifications are throttled to once every 30 minutes.)",
    "",
    "- Shoothill Proposal Manager",
  ].join("\n");
  await sendSendgrid(profile.email, profile.full_name || "Team", subject, emailBody);
  return new Response(JSON.stringify({ ok: true, recorded: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Add nda-signed event handler**

After the `nda-viewed` handler, add:

```typescript
// NDA SIGNED
if (type === "nda-signed") {
  const ndaId = body.ndaId;
  if (!ndaId) {
    return new Response(JSON.stringify({ error: "ndaId required for nda-signed" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: nda } = await supabase
    .from("ndas")
    .select("id, company_name, contact_name, contact_email, signer_name, signer_title, signed_at, purpose, profiles:prepared_by_user_id (email, full_name)")
    .eq("id", ndaId)
    .single();
  if (!nda) {
    return new Response(JSON.stringify({ error: "NDA not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const companyName = (nda as any).company_name || "(Unknown)";
  const signerName = (nda as any).signer_name || "Unknown";
  const signerTitle = (nda as any).signer_title || "";
  const signedAt = (nda as any).signed_at
    ? new Date((nda as any).signed_at).toLocaleString("en-GB", { timeZone: "Europe/London" })
    : new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

  // Email to customer
  const customerEmail = (nda as any).contact_email as string | null;
  const customerName = (nda as any).contact_name || "Team";
  if (customerEmail) {
    const subject = "[NDA] Signed: Mutual NDA - " + companyName;
    const emailBody = [
      "Hi " + customerName + ",",
      "",
      "A Mutual Non-Disclosure Agreement has been signed.",
      "",
      "Company:    " + companyName,
      "Signed by:  " + signerName + (signerTitle ? ", " + signerTitle : ""),
      "Signed at:  " + signedAt,
      "",
      "A copy of the signed NDA is attached to this agreement.",
      "You can also download it from the signing page.",
      "",
      "- Shoothill Proposal Manager",
    ].join("\n");
    await sendSendgrid(customerEmail, customerName, subject, emailBody);
  }

  // Email to preparer
  const profile = (nda as any).profiles as { email: string; full_name: string } | null;
  if (profile?.email) {
    const subject = "[NDA] Signed: Mutual NDA - " + companyName;
    const emailBody = [
      "Hi " + (profile.full_name || "Team") + ",",
      "",
      "An NDA has been signed.",
      "",
      "Company:    " + companyName,
      "Signed by:  " + signerName + (signerTitle ? ", " + signerTitle : ""),
      "Signed at:  " + signedAt,
      "",
      "Log in to Shoothill Proposal Manager to view the signed NDA.",
      "",
      "- Shoothill Proposal Manager",
    ].join("\n");
    await sendSendgrid(profile.email, profile.full_name || "Team", subject, emailBody);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 3: Update the error message at the bottom**

Update the final error response (line 356) to include the new event types:

```typescript
return new Response(JSON.stringify({ error: "type must be 'viewed', 'signed', 'adhoc-viewed', 'adhoc-signed', 'nda-viewed', or 'nda-signed'" }), {
  status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
```

- [ ] **Step 4: Update the initial validation**

Update the validation at line 77 to accept `ndaId` as well:

```typescript
const { type, proposalId, contractId, ndaId, userAgent } = body;

if (!type || (!proposalId && !contractId && !ndaId)) {
  return new Response(JSON.stringify({ error: "type and one of proposalId, contractId, or ndaId required" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/notify-proposal/index.ts
git commit -m "feat: add nda-viewed and nda-signed events to notify-proposal"
```

---

### Task 8: Integration Testing and Polish

- [ ] **Step 1: Start the dev server and verify**

Run `npm run dev` and test the full flow:
1. Navigate to the NDAs tab in the sidebar
2. Create a new NDA: fill in company details, purpose, select template, choose duration
3. Save as draft — verify it appears in All NDAs list
4. Edit the draft — verify form pre-fills
5. Send for signature — verify signing link is generated
6. Open the signing link in a new incognito tab
7. Verify full NDA text renders on-screen with correct company details and purpose
8. Verify Simon's pre-signed signature appears
9. Draw a signature, fill in name, check the confirmation box
10. Submit — verify PDF generates, uploads, and status updates to 'signed'
11. Verify download link works after signing
12. Check email notifications fire (or at least the POST requests to notify-proposal)

- [ ] **Step 2: Fix any issues found during testing**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete NDA feature — create, send, sign with pre-applied Shoothill signature"
```
