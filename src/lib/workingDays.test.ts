import { describe, it, expect } from "vitest";
import { addWorkingDays, isOverdueWorkingDays, isWeekend } from "./workingDays";

// Helper to build dates in UTC so weekday calc is deterministic.
const utc = (y: number, mo: number, d: number, h = 12) =>
  new Date(Date.UTC(y, mo - 1, d, h, 0, 0));

describe("isWeekend", () => {
  it("flags Saturday as weekend", () => {
    expect(isWeekend(utc(2026, 4, 25))).toBe(true); // Saturday
  });
  it("flags Sunday as weekend", () => {
    expect(isWeekend(utc(2026, 4, 26))).toBe(true); // Sunday
  });
  it("does not flag Monday as weekend", () => {
    expect(isWeekend(utc(2026, 4, 27))).toBe(false); // Monday
  });
});

describe("addWorkingDays", () => {
  it("returns the start date unchanged when days is 0", () => {
    const start = utc(2026, 4, 22); // Wednesday
    expect(addWorkingDays(start, 0).toISOString()).toBe(start.toISOString());
  });

  it("adds within a single working week", () => {
    // Monday 2026-04-20 + 3 working days = Thursday 2026-04-23
    expect(addWorkingDays(utc(2026, 4, 20), 3).toISOString())
      .toBe(utc(2026, 4, 23).toISOString());
  });

  it("skips the weekend when crossing it", () => {
    // Friday 2026-04-24 + 1 working day = Monday 2026-04-27
    expect(addWorkingDays(utc(2026, 4, 24), 1).toISOString())
      .toBe(utc(2026, 4, 27).toISOString());
  });

  it("handles a full working week (5 days = same weekday next week)", () => {
    // Friday + 5 working days = next Friday
    expect(addWorkingDays(utc(2026, 4, 24), 5).toISOString())
      .toBe(utc(2026, 5, 1).toISOString());
  });

  it("handles starting on a Saturday", () => {
    // Saturday + 1 = Monday
    expect(addWorkingDays(utc(2026, 4, 25), 1).toISOString())
      .toBe(utc(2026, 4, 27).toISOString());
  });

  it("handles starting on a Sunday", () => {
    // Sunday + 1 = Monday
    expect(addWorkingDays(utc(2026, 4, 26), 1).toISOString())
      .toBe(utc(2026, 4, 27).toISOString());
  });

  it("handles spanning multiple weekends", () => {
    // Monday + 10 working days = Monday two weeks later
    expect(addWorkingDays(utc(2026, 4, 20), 10).toISOString())
      .toBe(utc(2026, 5, 4).toISOString());
  });

  it("throws on a negative days arg", () => {
    expect(() => addWorkingDays(utc(2026, 4, 22), -1)).toThrow();
  });
});

describe("isOverdueWorkingDays", () => {
  it("is false right at the deadline (not strictly past)", () => {
    const start = utc(2026, 4, 20); // Monday
    const deadline = utc(2026, 4, 23); // Mon + 3 working days = Thursday
    expect(isOverdueWorkingDays(start, 3, deadline)).toBe(false);
  });

  it("is true one second past the deadline", () => {
    const start = utc(2026, 4, 20);
    const onePastDeadline = new Date(utc(2026, 4, 23).getTime() + 1000);
    expect(isOverdueWorkingDays(start, 3, onePastDeadline)).toBe(true);
  });

  it("is false before the deadline", () => {
    const start = utc(2026, 4, 20);
    const halfway = utc(2026, 4, 22);
    expect(isOverdueWorkingDays(start, 3, halfway)).toBe(false);
  });

  it("counts weekends as non-working when computing deadlines", () => {
    // Friday + 1 working day = Monday. Anything before Monday is not overdue.
    const start = utc(2026, 4, 24); // Friday
    const sundayCheck = utc(2026, 4, 26); // Sunday — still before Monday
    expect(isOverdueWorkingDays(start, 1, sundayCheck)).toBe(false);
  });
});
