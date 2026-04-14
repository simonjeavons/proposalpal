# Adhoc Retainer — Display Year per Option

## Problem

In the adhoc contract flow, when a user creates multiple ongoing options to represent successive years of a retainer (e.g. "Paid media support — year one" and "Paid media support — year two"), every option's cost is rendered under a hardcoded "Year 1" label on the customer-facing view and the signed PDF. The year is encoded only in the description text, not the data, so the layout looks wrong when there are sequential years.

## Goal

Let each ongoing option declare which year of the engagement it represents, and have both the customer view (`AdhocSign.tsx`) and the service agreement PDF (`ServiceAgreementPDF.tsx`) label it accordingly.

## Non-goals

- Combining sequential year-options into a single multi-year column.
- Changing the storage shape of `RetainerOption`.
- Touching the standard proposal flow (`ProposalView` / `ProposalEditor`) — those use a different multi-year mechanism.

## Design

### Data model

No new field. Reuse the existing `RetainerOption.starts_after_months`. Display year is derived:

```
displayYear = Math.floor((starts_after_months ?? 0) / 12) + 1
```

Year 1 = 0 months, Year 2 = 12, Year 3 = 24, Year 4 = 36, Year 5 = 48.

### Editor — `src/components/RetainerOptionsEditor.tsx`

Replace the existing "Starts after (months)" numeric input (lines 333–345) with a **"Starts in year"** select offering Year 1 through Year 5. Selecting Year N writes `starts_after_months = (N - 1) * 12`. Reading existing data uses the derivation above, so any value already saved displays as the year it falls in.

The helper text under the field is updated to: "Pick the year of the contract this option represents."

### Customer view — `src/pages/AdhocSign.tsx`

Two changes:

1. **Conversion (lines ~182–196):** when mapping `retainer_options → ongoing_options` for display, copy `starts_after_months` onto the `OngoingOption`. Add `starts_after_months?: number` to the `OngoingOption` interface (line 12).

2. **Render (lines ~602–620):** each option card iterates `costs` with index `y` and labels each row `Year ${y + 1}`. Add a per-option offset:

   ```
   const startYear = Math.floor((opt.starts_after_months ?? 0) / 12) + 1;
   // row label becomes: `Year ${startYear + y}`
   ```

   Since adhoc options today only carry one entry in `yearlyCosts`, each card just renders one row labeled with its correct year.

### PDF — `src/components/ServiceAgreementPDF.tsx`

The PDF receives the same `OngoingOption` shape via the existing prop. Add `starts_after_months?: number` to its local type (line 41) and apply the same offset when rendering the `Year {y + 1}` label (line 415).

### AdminDashboard draft loader

`src/pages/AdminDashboard.tsx` lines 501–510 fall back to building `retainerOptions` from legacy `ongoing_options` rows. Those rows have no `starts_after_months`, so the fallback continues to default to undefined (Year 1). No change needed.

## Acceptance

- In the editor, each ongoing option has a "Starts in year" select with Year 1–5; default Year 1.
- An option with Year 2 selected appears under a "Year 2" label on the customer view and in the signed PDF.
- Existing adhoc drafts (which have `starts_after_months = undefined` or `0`) continue to display as Year 1 with no migration.
- Total-cost calculations are unaffected: `getOptionTotal` still annualises each option's `yearlyCosts[0]` over its term.
