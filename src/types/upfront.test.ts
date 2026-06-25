import { describe, it, expect } from "vitest";
import {
  computeUpfrontTotal,
  isChoiceGroupItem,
  isUpfrontItemIncluded,
  type UpfrontItem,
} from "./proposal";

const item = (over: Partial<UpfrontItem>): UpfrontItem => ({ type: "", name: "", price: 0, ...over });

describe("isChoiceGroupItem", () => {
  it("treats blank/whitespace choice_group as not grouped", () => {
    expect(isChoiceGroupItem(item({ choice_group: "" }))).toBe(false);
    expect(isChoiceGroupItem(item({ choice_group: "   " }))).toBe(false);
    expect(isChoiceGroupItem(item({}))).toBe(false);
    expect(isChoiceGroupItem(item({ choice_group: "Website" }))).toBe(true);
  });
});

describe("computeUpfrontTotal", () => {
  const items = [
    item({ name: "Always", price: 1000 }),
    item({ name: "Optional add-on", price: 500, optional: true }),
    item({ name: "Stabilise", price: 2425, choice_group: "Website" }),
    item({ name: "Rebuild", price: 10175, choice_group: "Website" }),
  ];

  it("includes only always-included items when nothing is selected", () => {
    expect(computeUpfrontTotal(items)).toBe(1000);
  });

  it("adds a selected optional add-on", () => {
    expect(computeUpfrontTotal(items, new Set([1]))).toBe(1500);
  });

  it("adds the chosen group option (the £2,425 path)", () => {
    expect(computeUpfrontTotal(items, new Set([2]))).toBe(3425);
  });

  it("adds the other chosen group option (the £10,175 path)", () => {
    expect(computeUpfrontTotal(items, new Set([3]))).toBe(11175);
  });

  it("honours discounted_price over price", () => {
    const discounted = [item({ price: 1000, discounted_price: 800 })];
    expect(computeUpfrontTotal(discounted)).toBe(800);
  });

  it("handles null/undefined item lists", () => {
    expect(computeUpfrontTotal(null)).toBe(0);
    expect(computeUpfrontTotal(undefined)).toBe(0);
  });
});

describe("isUpfrontItemIncluded", () => {
  it("always includes plain items regardless of selection", () => {
    expect(isUpfrontItemIncluded(item({ price: 1 }), 0, new Set())).toBe(true);
  });

  it("includes optional/grouped items only when selected", () => {
    expect(isUpfrontItemIncluded(item({ optional: true }), 0, new Set())).toBe(false);
    expect(isUpfrontItemIncluded(item({ optional: true }), 0, new Set([0]))).toBe(true);
    expect(isUpfrontItemIncluded(item({ choice_group: "g" }), 1, new Set())).toBe(false);
    expect(isUpfrontItemIncluded(item({ choice_group: "g" }), 1, new Set([1]))).toBe(true);
  });
});

import {
  resolveUpfrontSections,
  groupItemsBySection,
  computeSectionTotal,
  DEFAULT_UPFRONT_SECTION_TITLE,
  type UpfrontSection,
} from "./proposal";

const section = (over: Partial<UpfrontSection>): UpfrontSection => ({ id: "s", title: "", ...over });

describe("resolveUpfrontSections", () => {
  it("returns stored sections when present", () => {
    const secs = [section({ id: "a", title: "A" })];
    expect(resolveUpfrontSections(secs, "Legacy", "note")).toBe(secs);
  });

  it("synthesizes one section from the legacy title/notes when none stored", () => {
    const out = resolveUpfrontSections([], "Legacy title", "Legacy note");
    expect(out).toEqual([{ id: "default", title: "Legacy title", notes: "Legacy note" }]);
  });

  it("falls back to the default title when legacy title is blank", () => {
    const out = resolveUpfrontSections(null, "", null);
    expect(out[0].title).toBe(DEFAULT_UPFRONT_SECTION_TITLE);
    expect(out[0].notes).toBeUndefined();
  });
});

describe("groupItemsBySection", () => {
  const secs = [section({ id: "a" }), section({ id: "b" })];

  it("groups items by section_id, preserving global index", () => {
    const items = [
      item({ name: "0", section_id: "a" }),
      item({ name: "1", section_id: "b" }),
      item({ name: "2", section_id: "a" }),
    ];
    const g = groupItemsBySection(items, secs);
    expect(g.get("a")!.map(x => x.i)).toEqual([0, 2]);
    expect(g.get("b")!.map(x => x.i)).toEqual([1]);
  });

  it("puts items with missing/unknown section_id into the first section", () => {
    const items = [item({ name: "0" }), item({ name: "1", section_id: "zzz" })];
    const g = groupItemsBySection(items, secs);
    expect(g.get("a")!.map(x => x.i)).toEqual([0, 1]);
    expect(g.get("b")).toEqual([]);
  });
});

describe("computeSectionTotal", () => {
  const secs = [section({ id: "a" }), section({ id: "b" })];
  const items = [
    item({ name: "A-always", price: 1000, section_id: "a" }),
    item({ name: "A-optional", price: 500, optional: true, section_id: "a" }),
    item({ name: "B-always", price: 200, section_id: "b" }),
  ];

  it("sums always-included items in the section", () => {
    expect(computeSectionTotal(items, secs, "a")).toBe(1000);
    expect(computeSectionTotal(items, secs, "b")).toBe(200);
  });

  it("adds a selected optional item in the section", () => {
    expect(computeSectionTotal(items, secs, "a", new Set([1]))).toBe(1500);
  });
});
