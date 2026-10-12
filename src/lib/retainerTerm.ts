// Term and rate-schedule helpers for retainer lines that may start partway through a contract
// (via starts_after_months), e.g. £1,300/month for months 1–3 then £975/month for months 4–12.

export interface TermFields {
  term_months?: number;
  starts_after_months?: number;
  rolling_monthly?: boolean;
  notice_days?: number;
}

export interface RateFields extends TermFields {
  price: number;
  discounted_price?: number;
  quantity?: number;
  frequency?: 'weekly' | 'monthly' | 'annual';
}

export interface RateSpan {
  fromMonth: number;
  /** Inclusive last month, or null when the span runs on indefinitely (rolling lines). */
  toMonth: number | null;
  rate: number;
}

/** 1-based inclusive months a fixed-term line covers; null for rolling or no term. */
export const monthRange = (r: TermFields): { start: number; end: number } | null => {
  if (r.rolling_monthly || !r.term_months) return null;
  const offset = r.starts_after_months ?? 0;
  return { start: offset + 1, end: offset + r.term_months };
};

/** "months 4–12" for a line that starts after month 1; null otherwise. */
export const delayedRangeNote = (r: TermFields): string | null => {
  const range = monthRange(r);
  return range && range.start > 1 ? `months ${range.start}–${range.end}` : null;
};

export const termLabel = (r: TermFields): string | null => {
  if (r.rolling_monthly) return `Monthly rolling · ${r.notice_days ?? 30} days notice`;
  if (!r.term_months) return null;
  const base = `${r.term_months}-month term`;
  const range = monthRange(r);
  return range && range.start > 1 ? `Months ${range.start}–${range.end} · ${base}` : base;
};

const lineRate = (r: RateFields) => (r.quantity ?? 1) * (r.discounted_price ?? r.price);

/**
 * Monthly rate per contiguous span where the set of active lines is constant.
 * Returns [] unless the rate actually changes over the term, or if any line isn't monthly
 * (a mixed-frequency headline can't be expressed as a single monthly rate).
 */
export const rateSchedule = (options: RateFields[]): RateSpan[] => {
  if (options.length === 0 || options.some(o => (o.frequency ?? 'monthly') !== 'monthly')) return [];

  const windows = options.map(o => o.rolling_monthly
    ? { start: 0, end: Infinity, rate: lineRate(o) }
    : { start: o.starts_after_months ?? 0, end: (o.starts_after_months ?? 0) + (o.term_months ?? 12), rate: lineRate(o) });

  const bounds = [...new Set(windows.flatMap(w => [w.start, w.end]))].sort((a, b) => a - b);
  const spans: RateSpan[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const from = bounds[i];
    const to = bounds[i + 1];
    const rate = windows.filter(w => w.start <= from && w.end >= to).reduce((s, w) => s + w.rate, 0);
    if (rate === 0) continue;
    const prev = spans[spans.length - 1];
    if (prev && prev.rate === rate && prev.toMonth === from) {
      prev.toMonth = to === Infinity ? null : to;
    } else {
      spans.push({ fromMonth: from + 1, toMonth: to === Infinity ? null : to, rate });
    }
  }
  return spans.length > 1 ? spans : [];
};

/** e.g. "Months 1–3, then £975.00/month for months 4–12". Empty for an empty schedule. */
export const describeRateSchedule = (spans: RateSpan[], fmt: (n: number) => string): string => {
  if (spans.length === 0) return '';
  const range = (s: RateSpan) => s.toMonth === null ? `from month ${s.fromMonth}` : `for months ${s.fromMonth}–${s.toMonth}`;
  const [first, ...rest] = spans;
  const head = first.toMonth === null ? `From month ${first.fromMonth}` : `Months ${first.fromMonth}–${first.toMonth}`;
  return [head, ...rest.map(s => `then ${fmt(s.rate)}/month ${range(s)}`)].join(', ');
};

/**
 * Billing for one contract year (0-based), respecting each line's start month and term.
 * Annual lines bill in the year each 12-month period begins. Year 1 can be partial; years 2+
 * bill a full 12 months whenever a line is active at all. Rolling lines bill every year.
 */
export const ongoingForYear = (options: RateFields[], yearIndex: number): number =>
  options.reduce((sum, r) => {
    const freq = r.frequency ?? 'monthly';
    const yearStartMonth = yearIndex * 12;
    const yearEndMonth = (yearIndex + 1) * 12;

    if (freq === 'annual') {
      if (r.rolling_monthly) return sum + lineRate(r);
      const offset = r.starts_after_months ?? 0;
      const term = r.term_months ?? 12;
      let count = 0;
      for (let start = offset; start < offset + term; start += 12) {
        if (start >= yearStartMonth && start < yearEndMonth) count += 1;
      }
      return sum + lineRate(r) * count;
    }

    if (r.rolling_monthly) {
      const periods = freq === 'weekly' ? 12 * 4.33 : 12;
      return sum + lineRate(r) * periods;
    }

    const offset = r.starts_after_months ?? 0;
    const term = r.term_months ?? 12;
    const overlapStart = Math.max(yearStartMonth, offset);
    const overlapEnd = Math.min(yearEndMonth, offset + term);
    if (overlapEnd <= overlapStart) return sum;
    const activeMonths = yearIndex === 0 ? overlapEnd - overlapStart : 12;
    const periods = freq === 'weekly' ? activeMonths * 4.33 : activeMonths;
    return sum + lineRate(r) * periods;
  }, 0);

/** Per-year totals (upfront in year 1) up to 5 years, plus year-1 and whole-contract totals. */
export const contractTotals = (options: RateFields[], upfront: number) => {
  const hasRolling = options.some(r => r.rolling_monthly);
  const maxTermMonths = Math.max(
    ...options.filter(r => !r.rolling_monthly).map(r => (r.term_months ?? 12) + (r.starts_after_months ?? 0)),
    hasRolling ? 36 : 12,
  );
  const totalYears = Math.min(Math.ceil(maxTermMonths / 12), 5);
  const yearTotals = Array.from({ length: totalYears }, (_, y) => ({
    year: y + 1,
    total: (y === 0 ? upfront : 0) + ongoingForYear(options, y),
  }));
  return {
    yearTotals,
    firstYearTotal: yearTotals[0].total,
    contractTotal: yearTotals.reduce((s, y) => s + y.total, 0),
  };
};
