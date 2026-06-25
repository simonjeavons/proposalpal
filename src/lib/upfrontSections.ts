import type { UpfrontItem, UpfrontSection } from "@/types/proposal";

export interface UpfrontModel {
  sections: UpfrontSection[];
  items: UpfrontItem[];
}

export function newSectionId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function addSection(model: UpfrontModel, title = ""): UpfrontModel {
  return { ...model, sections: [...model.sections, { id: newSectionId(), title }] };
}

export function updateSection(model: UpfrontModel, id: string, patch: Partial<UpfrontSection>): UpfrontModel {
  return { ...model, sections: model.sections.map(s => (s.id === id ? { ...s, ...patch } : s)) };
}

export function deleteSection(model: UpfrontModel, id: string): UpfrontModel {
  return {
    sections: model.sections.filter(s => s.id !== id),
    items: model.items.filter(it => it.section_id !== id),
  };
}

export function addItem(model: UpfrontModel, sectionId: string): UpfrontModel {
  const newItem: UpfrontItem = { type: "", name: "", price: 0, description: "", section_id: sectionId };
  return { ...model, items: [...model.items, newItem] };
}

export function updateItem(model: UpfrontModel, index: number, patch: Partial<UpfrontItem>): UpfrontModel {
  return { ...model, items: model.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) };
}

export function deleteItem(model: UpfrontModel, index: number): UpfrontModel {
  return { ...model, items: model.items.filter((_, i) => i !== index) };
}
