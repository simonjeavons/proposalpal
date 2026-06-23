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
