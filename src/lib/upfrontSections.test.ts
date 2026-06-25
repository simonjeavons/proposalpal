import { describe, it, expect } from "vitest";
import {
  addSection, updateSection, deleteSection,
  addItem, updateItem, deleteItem,
  type UpfrontModel,
} from "./upfrontSections";
import type { UpfrontItem } from "@/types/proposal";

const item = (over: Partial<UpfrontItem>): UpfrontItem => ({ type: "", name: "", price: 0, ...over });

const base: UpfrontModel = {
  sections: [{ id: "a", title: "A" }],
  items: [item({ name: "a1", section_id: "a" })],
};

describe("addSection", () => {
  it("appends a new section with a unique id and given title", () => {
    const out = addSection(base, "B");
    expect(out.sections).toHaveLength(2);
    expect(out.sections[1].title).toBe("B");
    expect(out.sections[1].id).not.toBe("a");
    expect(out.items).toBe(base.items); // items untouched
  });
});

describe("updateSection", () => {
  it("patches the matching section only", () => {
    const out = updateSection(base, "a", { title: "A2", notes: "n" });
    expect(out.sections[0]).toEqual({ id: "a", title: "A2", notes: "n" });
  });
});

describe("deleteSection", () => {
  it("removes the section and its items", () => {
    const model: UpfrontModel = {
      sections: [{ id: "a", title: "A" }, { id: "b", title: "B" }],
      items: [item({ name: "a1", section_id: "a" }), item({ name: "b1", section_id: "b" })],
    };
    const out = deleteSection(model, "a");
    expect(out.sections.map(s => s.id)).toEqual(["b"]);
    expect(out.items.map(i => i.name)).toEqual(["b1"]);
  });
});

describe("addItem", () => {
  it("appends a blank item tagged with the section id", () => {
    const out = addItem(base, "a");
    expect(out.items).toHaveLength(2);
    expect(out.items[1]).toMatchObject({ type: "", name: "", price: 0, section_id: "a" });
  });
});

describe("updateItem", () => {
  it("patches the item at the given index", () => {
    const out = updateItem(base, 0, { name: "renamed", price: 99 });
    expect(out.items[0]).toMatchObject({ name: "renamed", price: 99, section_id: "a" });
  });
});

describe("deleteItem", () => {
  it("removes the item at the given index", () => {
    const out = deleteItem(base, 0);
    expect(out.items).toHaveLength(0);
  });
});
