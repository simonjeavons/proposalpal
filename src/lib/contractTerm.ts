// Contract term helpers — shared by the ad-hoc generator, signing page, PDF and Word export.

/**
 * End date of a fixed-term contract = agreement date + termMonths, minus one day
 * (the last day of the term). e.g. 12 months from 2026-06-01 -> 2027-05-31.
 * Returns an ISO date string (YYYY-MM-DD), or null if inputs are missing/invalid.
 */
export function contractEndDateISO(
  agreementDateIso: string | null | undefined,
  termMonths: number | null | undefined,
): string | null {
  if (!agreementDateIso || !termMonths || termMonths <= 0) return null;
  const d = new Date(agreementDateIso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + termMonths);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formats an ISO date (YYYY-MM-DD) as "31 May 2027". Returns '' for empty input. */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
