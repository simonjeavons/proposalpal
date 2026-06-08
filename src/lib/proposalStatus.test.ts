import { describe, it, expect, vi, afterEach } from "vitest";
import { isProposalExpired, effectiveStatus } from "./proposalStatus";

// Pin "now" to 2026-06-08T12:00:00Z for deterministic date comparisons.
const NOW = new Date("2026-06-08T12:00:00Z");

const at = (status: string, valid_until: string | null) =>
  ({ status, valid_until } as any);

describe("isProposalExpired", () => {
  afterEach(() => vi.useRealTimers());

  const withNow = (fn: () => void) => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    fn();
  };

  it("is expired when status is explicitly 'expired'", () => {
    withNow(() => {
      // valid_until far in the future should not matter
      expect(isProposalExpired(at("expired", "2099-01-01"))).toBe(true);
    });
  });

  it("is expired when valid_until is in the past", () => {
    withNow(() => {
      expect(isProposalExpired(at("sent", "2026-06-01"))).toBe(true);
    });
  });

  it("is not expired when valid_until is today", () => {
    withNow(() => {
      // valid_until covers the whole day (until 23:59:59)
      expect(isProposalExpired(at("sent", "2026-06-08"))).toBe(false);
    });
  });

  it("is not expired when valid_until is in the future", () => {
    withNow(() => {
      expect(isProposalExpired(at("sent", "2026-07-01"))).toBe(false);
    });
  });

  it("accepted proposals never expire by date", () => {
    withNow(() => {
      expect(isProposalExpired(at("accepted", "2026-06-01"))).toBe(false);
    });
  });

  it("is not expired when valid_until is missing", () => {
    withNow(() => {
      expect(isProposalExpired(at("sent", null))).toBe(false);
    });
  });
});

describe("effectiveStatus", () => {
  afterEach(() => vi.useRealTimers());

  it("reports 'expired' for a sent proposal past valid_until", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(effectiveStatus(at("sent", "2026-06-01"))).toBe("expired");
  });

  it("reports the stored status when not expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(effectiveStatus(at("sent", "2026-07-01"))).toBe("sent");
  });
});
