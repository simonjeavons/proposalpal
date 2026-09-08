// Pure helpers for the notification emails, kept free of Deno APIs so they can
// be unit-tested by vitest (see pricing.test.ts) -- the function entrypoint
// itself is not importable outside the edge runtime.
//
// Ad-hoc contracts store their ongoing options in two shapes. Rows created
// before April 2026 carry { yearlyCosts, term }; everything since carries the
// editor's shape, { price, discounted_price, quantity, term_months,
// rolling_monthly }, mirrored into both retainer_options and ongoing_options.
// The maths below normalises the second into the first, the same way
// AdminDashboard does before handing a contract to the Word export.

export interface RawOngoingOption {
  name?: unknown;
  type?: unknown;
  price?: unknown;
  discounted_price?: unknown;
  quantity?: unknown;
  term_months?: unknown;
  rolling_monthly?: unknown;
  notice_days?: unknown;
  yearlyCosts?: unknown;
  term?: unknown;
  frequency?: unknown;
}

export interface NormalisedOption {
  name: string;
  yearlyCosts: number[];
  term: number;
  frequency: string;
  rollingMonthly: boolean;
  noticeDays: number | null;
}

export interface Addressee {
  email: string;
  name: string;
}

// A rolling option has no committed term, so it is annualised for the purpose
// of quoting a total -- the same 12 months the Word export assumes.
const DEFAULT_TERM_MONTHS = 12;
const DEFAULT_NOTICE_DAYS = 30;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function normaliseOption(raw: RawOngoingOption | null | undefined): NormalisedOption {
  const r = (raw ?? {}) as RawOngoingOption;
  const frequency = str(r.frequency) || "monthly";
  const rollingMonthly = r.rolling_monthly === true;
  const noticeDays = num(r.notice_days);
  const name = str(r.name) || str(r.type) || "Ongoing";

  const legacyCosts = Array.isArray(r.yearlyCosts)
    ? (r.yearlyCosts as unknown[]).map((c) => num(c) ?? 0)
    : [];
  if (legacyCosts.length > 0) {
    return {
      name,
      yearlyCosts: legacyCosts,
      term: num(r.term) ?? DEFAULT_TERM_MONTHS,
      frequency,
      rollingMonthly,
      noticeDays,
    };
  }

  // ?? rather than || throughout: a £0 price or discount is legitimate
  // (sponsored or bundled items) and must not fall back to the undiscounted
  // figure.
  const unit = num(r.discounted_price) ?? num(r.price) ?? 0;
  const quantity = num(r.quantity) ?? 1;
  const term = rollingMonthly ? DEFAULT_TERM_MONTHS : (num(r.term_months) ?? DEFAULT_TERM_MONTHS);
  return {
    name,
    yearlyCosts: [quantity * unit],
    term,
    frequency,
    rollingMonthly,
    noticeDays,
  };
}

export function getOptionTotal(opt: NormalisedOption): number {
  const term = Number.isFinite(opt.term) && opt.term > 0 ? opt.term : DEFAULT_TERM_MONTHS;
  const numYears = Math.max(1, Math.ceil(term / 12));
  const costs: number[] = Array.from({ length: numYears }, (_, y) =>
    opt.yearlyCosts[y] ?? opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0
  );
  if (opt.frequency === "annual") return costs.reduce((s, c) => s + c, 0);
  return costs.reduce((s, c, idx) => {
    const months = idx === numYears - 1 ? (term % 12 || 12) : 12;
    // Only 'weekly' bills more often than monthly; an unrecognised frequency
    // is treated as monthly rather than silently inflating the total ~4.3x.
    const periods = opt.frequency === "weekly" ? Math.round((months * 52) / 12) : months;
    return s + c * periods;
  }, 0);
}

// retainer_options is the column the editor and the Word export treat as
// authoritative; ongoing_options is its mirror and the only one populated on
// pre-April rows.
export function selectOngoingOptions(
  retainerOptions: unknown,
  ongoingOptions: unknown,
): RawOngoingOption[] {
  if (Array.isArray(retainerOptions) && retainerOptions.length > 0) {
    return retainerOptions as RawOngoingOption[];
  }
  if (Array.isArray(ongoingOptions) && ongoingOptions.length > 0) {
    return ongoingOptions as RawOngoingOption[];
  }
  return [];
}

export function ongoingTotal(options: NormalisedOption[]): number {
  return options.reduce((sum, opt) => sum + getOptionTotal(opt), 0);
}

export function describeTerm(opt: NormalisedOption): string {
  if (opt.rollingMonthly) {
    return "monthly rolling, " + (opt.noticeDays ?? DEFAULT_NOTICE_DAYS) + " days notice";
  }
  return "over " + opt.term + " months";
}

function isEmail(v: unknown): boolean {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// Works out who a notification is addressed to. Every recipient on a contract
// is optional free text or a nullable FK, so the standing CC list is the
// backstop: a signature notification must never be dropped because a field was
// left blank.
export function buildPersonalisation(
  primary: Addressee | null | undefined,
  extras: (Addressee | null | undefined)[],
  ccRecipients: Addressee[],
): { to: Addressee[]; cc: Addressee[] } {
  const to: Addressee[] = [];
  const claimed = new Set<string>();

  for (const candidate of [primary, ...(extras ?? [])]) {
    if (!candidate || !isEmail(candidate.email)) continue;
    const email = candidate.email.trim();
    const key = email.toLowerCase();
    if (claimed.has(key)) continue;
    claimed.add(key);
    to.push({ email, name: str(candidate.name) || email });
  }

  const cc = (ccRecipients ?? []).filter(
    (c) => isEmail(c.email) && !claimed.has(c.email.trim().toLowerCase()),
  );

  if (to.length === 0) {
    // Nobody named on the record. Promote the CC list to the audience so the
    // event is still reported to someone.
    return { to: cc, cc: [] };
  }
  return { to, cc };
}
