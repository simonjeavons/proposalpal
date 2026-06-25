# Add "Bi-annual" (every 6 months) billing frequency

**Date:** 2026-06-25
**Status:** Approved (design)

## Goal

Ad-hoc agreements (and proposals generally) currently support ongoing/retainer
options billed `weekly`, `monthly`, or `annual`. Add a fourth frequency,
**Bi-annual** — billed once every 6 months, in advance.

## Decisions

- **Enum key:** `biannual` (single word, consistent with `weekly`/`monthly`/`annual`).
- **Display label:** `Bi-annual`.
- **Price semantics:** the entered `price` (and `discounted_price`) is the amount
  billed *each 6-month period*, in advance — exactly analogous to `annual` being a
  per-year amount.
- **Partial periods:** bill per *started* 6-month block. A term that is not a
  multiple of 6 rounds **up** (e.g. a 9-month term bills 2 blocks).

## Math rules

Applied at every site that currently branches on frequency. `rate` / `price` is
the per-6-month amount.

| Quantity                         | weekly       | monthly | annual          | **biannual**            |
|----------------------------------|--------------|---------|-----------------|-------------------------|
| Monthly-equivalent               | `rate*52/12` | `rate`  | `rate/12`       | **`rate/6`**            |
| Annualised multiplier            | `×52`        | `×12`   | `×1`            | **`×2`**                |
| Periods within a year (`months`) | `months*52/12` (or `*4.33`) | `months` | 1/year | **`Math.ceil(months/6)`** |
| Contract-term periods            | `term*4.33`  | `term`  | `term/12`       | **`Math.ceil(term_months/6)`** |

- **Per-year billing walk** (`ongoingForYear` in ProposalView / ProposalAccept):
  treat biannual like the annual branch but step the billing-period loop by **6**
  instead of 12 — bill the full per-period amount each time a 6-month period
  *starts* within the year. The `start += 6` loop yields started-block semantics
  with no extra rounding.
- **Fixed-term contract-year walk** (`getFixedOptionContractYearCosts` in
  AdhocSign): bill when `optionMonth % 6 === 0` (annual uses `% 12`).
- **Year-bucketed total reducers** (`getOptionTotal` in adhocWordExport,
  notify-proposal, ServiceAgreementPDF, AdhocSign): do **not** use the annual
  short-circuit; instead `periods = Math.ceil(months / 6)` so each 12-month year
  contributes 2 blocks and partial years round up.

## Labels & suffixes

- Dropdown (`RetainerOptionsEditor`): add `<option value="biannual">Bi-annual</option>`
  between Monthly and Annual.
- Suffix maps gain a `biannual` entry:
  - Long form (`/week`, `/month`, `/year`) → **`/6 months`**
    (ProposalView `FREQ_LABEL`, ProposalPDF `FREQ_SUFFIX`, RetainerOptionsEditor `FREQ_LABEL`).
  - Short form (`/wk`, `/mo`, `/yr`) → **`/6mo`**
    (ProposalAccept, AdhocSign, ServiceAgreementPDF inline labels, adhocWordExport inline labels).
- Dominant-frequency display labels (ProposalView `ongoingLabel`, ProposalAccept
  `ongoingLabel`) gain a `biannual` → `'Bi-annual ongoing'` / `'Bi-annual Ongoing'` case.
- Inline ternaries of the form
  `freq === 'annual' ? '/yr' : freq === 'weekly' ? '/wk' : '/mo'`
  (AdhocSign, ServiceAgreementPDF, adhocWordExport) extend to add the biannual arm.

## Files touched (10)

1. `src/types/proposal.ts` — extend the `frequency` union with `'biannual'`.
2. `src/components/RetainerOptionsEditor.tsx` — dropdown option, `FREQ_LABEL`, `freqLabel`.
3. `src/pages/ProposalView.tsx` — `FREQ_LABEL`, `optionContractTotal`,
   `annualMultiplier`, `ongoingForYear` (step-6 branch), `ongoingLabel`/`ongoingFreqSuffix`.
4. `src/pages/ProposalAccept.tsx` — `FREQ_LABEL`, `ongoingForYear` (step-6 branch),
   the two annualised reducers (`r.frequency === 'weekly' ? 52 : 'annual' ? 1 : 12`),
   `ongoingLabel`.
5. `src/pages/AdhocSign.tsx` — local `OngoingOption.frequency` type, `FREQ_LABEL`,
   `getOptionMonthlyEquivalent`, `getOptionTotal`, `getFixedOptionContractYearCosts`,
   `getRetainerAnnualTotal`, and the inline freq label/rate block (~L760-780).
6. `src/components/ProposalPDF.tsx` — `optionContractTotal`, `FREQ_SUFFIX`.
7. `src/components/ServiceAgreementPDF.tsx` — local type, `getTotal`, `fixedMonthly`,
   inline freq labels (~L450, L516).
8. `src/lib/adhocWordExport.ts` — local `WordOngoingOption.frequency` type,
   `getOptionTotal`, inline freq labels (~L200, L222).
9. `supabase/functions/notify-proposal/index.ts` — `getOptionTotal` math branch
   (frequency typed as `string`, so only the math needs the biannual arm).
10. `src/pages/AdminDashboard.tsx` — verify the pass-through (`frequency: o.frequency || 'monthly'`)
    carries `biannual` unchanged; no edit expected.

## Data / migration

None. `retainer_options` (proposals) and `ongoing_options` (contracts) are JSONB
columns with no CHECK constraint on `frequency`. Existing records remain valid;
all read sites already default missing/unknown values to `monthly` via `?? 'monthly'`,
so the change is backward-compatible.

## Testing / verification

- Type-check / build passes (`npm run build` or equivalent) after the union change —
  the compiler will surface any frequency `switch`/ternary that still omits `biannual`.
- Manual: create an ad-hoc agreement with a bi-annual option (e.g. £600 / 6 months,
  18-month term) and verify:
  - Editor field label reads `Price (£/6 months)`.
  - Monthly-equivalent shows £100/mo.
  - Year-1 total = £1,200 (2 blocks); 18-month total = £1,800 (3 blocks).
  - Web view, accept page, PDF, Word export, and the signed Service Agreement PDF
    all show `/6 months` or `/6mo` and matching totals.
- Confirm a partial term (e.g. 9 months) bills 2 blocks (rounds up).

## Out of scope

- No "every 2 years" frequency (the other reading of "bi-annual") — explicitly
  means *every 6 months* here.
- No change to billing-date scheduling or invoicing systems; this is presentation
  and totals math only.
