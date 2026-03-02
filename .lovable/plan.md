

## Contract Acceptance Flow

### What We're Building

When a client clicks "Accept & Request SOW" on their proposal, instead of showing an alert, they'll be taken to a dedicated contract/acceptance page. This page will show:

1. **Pricing confirmation** — their selected upfront cost, retainer option, and first-year total
2. **Uploaded contract document** — a PDF/document that admin uploads per-proposal in the editor
3. **Signature capture** — a name, title, and date field (text-based signature) plus a checkbox to confirm acceptance
4. **Submission** — saves the acceptance record to the database

### Database Changes

- **Add `contract_file_url` column** to `proposals` table (text, nullable) — stores the path to the uploaded contract PDF in storage
- **Create `proposal_acceptances` table** — stores acceptance records:
  - `id` (uuid, PK)
  - `proposal_id` (uuid, FK → proposals)
  - `signer_name` (text)
  - `signer_title` (text)
  - `signed_at` (timestamptz)
  - `selected_retainer_index` (integer)
  - `upfront_total` (numeric)
  - `retainer_price` (numeric)
  - `first_year_total` (numeric)
  - `created_at` (timestamptz)
- **Create a storage bucket** `contracts` (public read) for uploaded contract PDFs
- RLS: public read/insert on `proposal_acceptances`, public read on contracts bucket

### Admin Editor Changes

Add a "Contract Document" section to `ProposalEditor.tsx`:
- File upload input for PDF
- Upload to `contracts` storage bucket
- Save the file URL to `contract_file_url` on the proposal
- Show current uploaded file with option to replace/remove

### New Page: `/p/:slug/accept`

- Route added to `App.tsx`
- Receives the selected retainer index via URL query param (e.g. `?retainer=1`)
- Fetches the proposal by slug
- Displays:
  - **Pricing Summary** — upfront cost, selected retainer name/price, 12-month retainer total, first-year total (matching Shoothill styling)
  - **Contract Embed** — renders the uploaded PDF in an iframe/embed viewer
  - **Acceptance Form** — signer name, title, date (auto-filled to today), confirmation checkbox ("I have read and agree to the terms"), and a "Sign & Accept" button
- On submit: inserts into `proposal_acceptances` and updates proposal status to `accepted`
- Shows a confirmation/thank-you state after signing

### ProposalView Changes

Change the "Accept & Request SOW" button from `alert()` to `navigate(`/p/${slug}/accept?retainer=${selectedRetainer}`)`.

### Technical Details

- Storage bucket created via SQL migration
- Contract upload uses `supabase.storage.from('contracts').upload()`
- PDF displayed using `<embed>` or `<iframe>` with the public URL
- Acceptance page styled consistently with the Shoothill proposal theme (navy, blue, Inter font)

