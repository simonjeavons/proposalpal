import { describe, it, expect } from "vitest";
import { monthRange, delayedRangeNote, termLabel, rateSchedule, describeRateSchedule, contractTotals } from "./retainerTerm";

describe("monthRange", () => {
  it("covers months 1..term when starting immediately", () => {
    expect(monthRange({ term_months: 12 })).toEqual({ start: 1, end: 12 });
  });
  it("shifts by starts_after_months", () => {
    expect(monthRange({ term_months: 9, starts_after_months: 3 })).toEqual({ start: 4, end: 12 });
  });
  it("is null for rolling or no term", () => {
    expect(monthRange({ rolling_monthly: true, term_months: 12 })).toBeNull();
    expect(monthRange({})).toBeNull();
  });
});

describe("delayedRangeNote", () => {
  it("is null for lines starting in month 1, rolling or no term", () => {
    expect(delayedRangeNote({ term_months: 12 })).toBeNull();
    expect(delayedRangeNote({ rolling_monthly: true, starts_after_months: 3 })).toBeNull();
    expect(delayedRangeNote({ starts_after_months: 3 })).toBeNull();
  });
  it("gives the month range for delayed lines", () => {
    expect(delayedRangeNote({ term_months: 9, starts_after_months: 3 })).toBe("months 4–12");
  });
});

describe("termLabel", () => {
  it("keeps the plain term label for lines starting in month 1", () => {
    expect(termLabel({ term_months: 12 })).toBe("12-month term");
  });
  it("labels delayed lines with their month range", () => {
    expect(termLabel({ term_months: 9, starts_after_months: 3 })).toBe("Months 4–12 · 9-month term");
  });
  it("labels a Year-2 line by months", () => {
    expect(termLabel({ term_months: 12, starts_after_months: 12 })).toBe("Months 13–24 · 12-month term");
  });
  it("describes rolling lines", () => {
    expect(termLabel({ rolling_monthly: true })).toBe("Monthly rolling · 30 days notice");
    expect(termLabel({ rolling_monthly: true, notice_days: 60 })).toBe("Monthly rolling · 60 days notice");
  });
  it("is null with no term", () => {
    expect(termLabel({})).toBeNull();
  });
});

const line = (price: number, term_months: number, starts_after_months?: number) =>
  ({ price, quantity: 1, term_months, starts_after_months, frequency: "monthly" as const });

describe("rateSchedule", () => {
  it("returns back-to-back spans", () => {
    expect(rateSchedule([line(1300, 3), line(975, 9, 3)])).toEqual([
      { fromMonth: 1, toMonth: 3, rate: 1300 },
      { fromMonth: 4, toMonth: 12, rate: 975 },
    ]);
  });
  it("sums overlapping lines within a span", () => {
    expect(rateSchedule([line(1000, 12), line(500, 3)])).toEqual([
      { fromMonth: 1, toMonth: 3, rate: 1500 },
      { fromMonth: 4, toMonth: 12, rate: 1000 },
    ]);
  });
  it("skips gaps where nothing is billed", () => {
    expect(rateSchedule([line(100, 2), line(200, 2, 4)])).toEqual([
      { fromMonth: 1, toMonth: 2, rate: 100 },
      { fromMonth: 5, toMonth: 6, rate: 200 },
    ]);
  });
  it("uses discounted price and quantity", () => {
    expect(rateSchedule([
      { ...line(100, 3), discounted_price: 80, quantity: 2 },
      line(50, 3, 3),
    ])[0].rate).toBe(160);
  });
  it("treats rolling lines as active throughout with an open end", () => {
    expect(rateSchedule([line(300, 3), { price: 100, quantity: 1, rolling_monthly: true }])).toEqual([
      { fromMonth: 1, toMonth: 3, rate: 400 },
      { fromMonth: 4, toMonth: null, rate: 100 },
    ]);
  });
  it("is empty when the rate never changes", () => {
    expect(rateSchedule([line(1000, 12)])).toEqual([]);
    expect(rateSchedule([line(1000, 12), line(500, 12)])).toEqual([]);
    expect(rateSchedule([])).toEqual([]);
  });
  it("is empty when any line is not monthly", () => {
    expect(rateSchedule([line(1300, 3), { ...line(975, 9, 3), frequency: "annual" }])).toEqual([]);
  });
});

describe("describeRateSchedule", () => {
  const fmt = (n: number) => `£${n}`;
  it("describes the spans after the first", () => {
    expect(describeRateSchedule(rateSchedule([line(1300, 3), line(975, 9, 3)]), fmt))
      .toBe("Months 1–3, then £975/month for months 4–12");
  });
  it("uses 'from month N' for an open-ended span", () => {
    expect(describeRateSchedule([
      { fromMonth: 1, toMonth: 3, rate: 400 },
      { fromMonth: 4, toMonth: null, rate: 100 },
    ], fmt)).toBe("Months 1–3, then £100/month from month 4");
  });
  it("is empty for an empty schedule", () => {
    expect(describeRateSchedule([], fmt)).toBe("");
  });
});

describe("contractTotals", () => {
  it("prices back-to-back lines by their own months (7Video: 1,300×3 + 975×9)", () => {
    const out = contractTotals([line(1300, 3), line(975, 9, 3)], 0);
    expect(out.yearTotals).toEqual([{ year: 1, total: 12675 }]);
    expect(out.firstYearTotal).toBe(12675);
    expect(out.contractTotal).toBe(12675);
  });
  it("adds upfront to year 1 only", () => {
    const out = contractTotals([line(100, 24)], 500);
    expect(out.yearTotals).toEqual([{ year: 1, total: 1700 }, { year: 2, total: 1200 }]);
    expect(out.contractTotal).toBe(2900);
  });
  it("bills a Year-2 line only in year 2", () => {
    const out = contractTotals([line(100, 12), line(50, 12, 12)], 0);
    expect(out.yearTotals).toEqual([{ year: 1, total: 1200 }, { year: 2, total: 600 }]);
  });
  it("bills annual lines in the year each period starts", () => {
    const out = contractTotals([{ price: 1000, quantity: 1, term_months: 24, frequency: "annual" }], 0);
    expect(out.yearTotals).toEqual([{ year: 1, total: 1000 }, { year: 2, total: 1000 }]);
  });
  it("shows 3 years for rolling lines", () => {
    const out = contractTotals([{ price: 100, quantity: 1, rolling_monthly: true }], 0);
    expect(out.yearTotals.map(y => y.total)).toEqual([1200, 1200, 1200]);
  });
  it("treats no options as a 1-year upfront-only contract", () => {
    expect(contractTotals([], 900).yearTotals).toEqual([{ year: 1, total: 900 }]);
  });
});
