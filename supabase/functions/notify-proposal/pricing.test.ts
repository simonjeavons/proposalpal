import { describe, it, expect } from "vitest";
import {
  buildPersonalisation,
  describeTerm,
  normaliseOption,
  getOptionTotal,
  ongoingTotal,
  selectOngoingOptions,
} from "./pricing";

// Fixtures are copied verbatim from production rows in adhoc_contracts, because
// the bug these guard against was a shape mismatch: the notification maths was
// written for a shape the ad-hoc editor stopped writing in April 2026.

// Elite Precast Concrete Ltd — signed 2026-09-01. Rolling monthly, no term.
const ELITE_PRECAST = [{
  name: "",
  type: "Monthly Support Retainer",
  price: 500,
  features: [""],
  quantity: 1,
  frequency: "monthly",
  notice_days: 30,
  option_type: "standard",
  recommended: false,
  rolling_monthly: true,
}];

// Brick and Beyond Ltd — signed 2026-05-14. Fixed 12-month term.
const BRICK_AND_BEYOND = [{
  name: "Monthly Support ",
  type: "",
  price: 150,
  features: ["Helpdesk support/Software updates"],
  quantity: 1,
  frequency: "monthly",
  option_type: "standard",
  recommended: false,
  term_months: 12,
}];

// Aquaforce — signed 2026-03-29. Legacy shape, still present on pre-April rows.
const AQUAFORCE_LEGACY = [{
  name: "Support, hosting, and maintenance ",
  term: 36,
  frequency: "monthly",
  yearlyCosts: [150, 150, 150],
}];

const CC = [
  { email: "sj@shoothill.com", name: "Simon Jeavons" },
  { email: "patrick.howe@shoothill.com", name: "Patrick Howe" },
];

describe("normaliseOption", () => {
  it("annualises a rolling-monthly option at 12 months", () => {
    const opt = normaliseOption(ELITE_PRECAST[0]);
    expect(opt.term).toBe(12);
    expect(opt.yearlyCosts).toEqual([500]);
    expect(opt.rollingMonthly).toBe(true);
    expect(opt.noticeDays).toBe(30);
  });

  it("reads term_months for a fixed-term option", () => {
    const opt = normaliseOption(BRICK_AND_BEYOND[0]);
    expect(opt.term).toBe(12);
    expect(opt.yearlyCosts).toEqual([150]);
    expect(opt.rollingMonthly).toBe(false);
  });

  it("passes the legacy yearlyCosts/term shape through untouched", () => {
    const opt = normaliseOption(AQUAFORCE_LEGACY[0]);
    expect(opt.term).toBe(36);
    expect(opt.yearlyCosts).toEqual([150, 150, 150]);
  });

  it("multiplies unit price by quantity", () => {
    expect(normaliseOption({ price: 100, quantity: 3, term_months: 12 }).yearlyCosts).toEqual([300]);
  });

  it("prefers discounted_price, including a £0 discounted price", () => {
    expect(normaliseOption({ price: 500, discounted_price: 400 }).yearlyCosts).toEqual([400]);
    // £0 is a legitimate price (sponsorship / free items) and must not fall back to price.
    expect(normaliseOption({ price: 500, discounted_price: 0 }).yearlyCosts).toEqual([0]);
  });

  it("falls back to a 12-month term when nothing usable is present", () => {
    const opt = normaliseOption({ price: 10 });
    expect(opt.term).toBe(12);
    expect(Number.isFinite(opt.term)).toBe(true);
  });
});

describe("getOptionTotal", () => {
  it("totals the Elite Precast retainer over 12 months", () => {
    expect(getOptionTotal(normaliseOption(ELITE_PRECAST[0]))).toBe(6000);
  });

  it("totals the Brick and Beyond retainer over its 12-month term", () => {
    expect(getOptionTotal(normaliseOption(BRICK_AND_BEYOND[0]))).toBe(1800);
  });

  it("totals a legacy 36-month option across all three years", () => {
    expect(getOptionTotal(normaliseOption(AQUAFORCE_LEGACY[0]))).toBe(5400);
  });

  it("sums annual-frequency options per year rather than per month", () => {
    expect(getOptionTotal(normaliseOption({ yearlyCosts: [1200, 1200], term: 24, frequency: "annual" }))).toBe(2400);
  });

  it("never returns NaN for a malformed option", () => {
    for (const raw of [{}, { price: null }, { term_months: null }, { yearlyCosts: [] }]) {
      const total = getOptionTotal(normaliseOption(raw as Record<string, unknown>));
      expect(Number.isFinite(total)).toBe(true);
    }
  });
});

describe("selectOngoingOptions", () => {
  it("prefers retainer_options when populated, matching the Word export", () => {
    expect(selectOngoingOptions(BRICK_AND_BEYOND, ELITE_PRECAST)).toBe(BRICK_AND_BEYOND);
  });

  it("falls back to ongoing_options for pre-April rows with no retainer_options", () => {
    expect(selectOngoingOptions([], AQUAFORCE_LEGACY)).toBe(AQUAFORCE_LEGACY);
  });

  it("returns an empty list when neither column holds anything", () => {
    expect(selectOngoingOptions(null, undefined)).toEqual([]);
  });
});

describe("ongoingTotal", () => {
  const totalFor = (retainer: unknown, ongoing: unknown) =>
    ongoingTotal(selectOngoingOptions(retainer, ongoing).map(normaliseOption));

  it("is non-zero for the contract whose notification reported £0.00", () => {
    expect(totalFor(ELITE_PRECAST, ELITE_PRECAST)).toBe(6000);
  });

  it("sums across multiple options", () => {
    expect(totalFor([...BRICK_AND_BEYOND, ...ELITE_PRECAST], [])).toBe(7800);
  });

  it("is zero when a contract has no ongoing options at all", () => {
    expect(totalFor([], [])).toBe(0);
  });
});

describe("describeTerm", () => {
  it("describes a rolling option by its notice period, not a month count", () => {
    expect(describeTerm(normaliseOption(ELITE_PRECAST[0]))).toBe("monthly rolling, 30 days notice");
  });

  it("describes a fixed term in months", () => {
    expect(describeTerm(normaliseOption(BRICK_AND_BEYOND[0]))).toBe("over 12 months");
  });

  it("never renders the word undefined", () => {
    expect(describeTerm(normaliseOption({ price: 10 }))).not.toContain("undefined");
  });
});

describe("buildPersonalisation", () => {
  it("addresses the contract owner and copies the contact", () => {
    const p = buildPersonalisation(
      { email: "claire.critchell@shoothill.com", name: "Claire Critchell" },
      [{ email: "ops@shoothill.com", name: "Ops" }],
      CC,
    );
    expect(p.to.map(t => t.email)).toEqual(["claire.critchell@shoothill.com", "ops@shoothill.com"]);
    expect(p.cc.map(c => c.email)).toEqual(["sj@shoothill.com", "patrick.howe@shoothill.com"]);
  });

  it("still sends to the CC list when the contract has no recipient at all", () => {
    // This is the Elite Precast failure: a blank contact_email meant nobody was
    // told the contract had been signed.
    const p = buildPersonalisation(null, [], CC);
    expect(p.to.map(t => t.email)).toEqual(["sj@shoothill.com", "patrick.howe@shoothill.com"]);
    expect(p.cc).toEqual([]);
  });

  it("treats a blank or malformed address as absent", () => {
    expect(buildPersonalisation({ email: "   ", name: "x" }, [], CC).to.map(t => t.email))
      .toEqual(["sj@shoothill.com", "patrick.howe@shoothill.com"]);
    expect(buildPersonalisation({ email: "not-an-email", name: "x" }, [], CC).to.map(t => t.email))
      .toEqual(["sj@shoothill.com", "patrick.howe@shoothill.com"]);
  });

  it("never lists the same address in both to and cc", () => {
    const p = buildPersonalisation({ email: "SJ@shoothill.com", name: "Simon" }, [], CC);
    expect(p.to.map(t => t.email)).toEqual(["SJ@shoothill.com"]);
    expect(p.cc.map(c => c.email)).toEqual(["patrick.howe@shoothill.com"]);
  });

  it("de-duplicates a contact that is also the owner", () => {
    const p = buildPersonalisation(
      { email: "claire.critchell@shoothill.com", name: "Claire" },
      [{ email: "Claire.Critchell@shoothill.com", name: "Claire" }],
      CC,
    );
    expect(p.to).toHaveLength(1);
  });

  it("reports no recipients rather than inventing one when even the CC list is empty", () => {
    // Unreachable while CC_RECIPIENTS is a non-empty constant, but the caller
    // must be able to tell that there is nobody to send to.
    expect(buildPersonalisation(null, [], []).to).toEqual([]);
  });
});
