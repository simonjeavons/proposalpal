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
