# Upfront Multiple Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let proposal authors create multiple titled upfront sections, each with its own child items, subtotal, and footnote — instead of today's single upfront section.

**Architecture:** `upfront_items` stays a single flat, ordered array (canonical for totals, accept-flow selection indices, PDF and email — all of which depend on it). Sections are layered on top as a new `upfront_sections` metadata array plus a per-item `section_id` tag. Rendering groups items by `section_id`; everything numeric keeps using the flat array. Backward compatibility is handled by lazily synthesizing a single section from the legacy `upfront_section_title`/`upfront_notes` when no sections are stored.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + Testing Library, Supabase (Postgres, jsonb columns), @react-pdf/renderer.

**Design spec:** `docs/superpowers/specs/2026-06-24-upfront-multiple-sections-design.md`

**Scope (v1):** Add / edit / delete sections only. No section reordering. Choice-groups and optional items stay global (matched across the whole proposal). Ad-hoc generator (`AdminDashboard`) keeps its flat single-list editor unchanged.

---

## File Structure

- `src/types/proposal.ts` (modify) — `UpfrontSection` type, `section_id` on `UpfrontItem`, `upfront_sections` on `Proposal`, and pure helpers `resolveUpfrontSections`, `groupItemsBySection`, `computeSectionTotal`.
- `src/types/upfront.test.ts` (modify) — tests for the new helpers.
- `src/lib/upfrontSections.ts` (create) — pure model operations (add/update/delete section + item) used by the editor.
- `src/lib/upfrontSections.test.ts` (create) — tests for the model operations.
- `supabase/migrations/20260625120000_upfront_sections.sql` (create) — add `upfront_sections jsonb` column.
- `src/integrations/supabase/types.ts` (modify) — add `upfront_sections` to the `proposals` Row/Insert/Update.
- `src/components/UpfrontItemCard.tsx` (create) — the per-item editor card, extracted from `UpfrontItemsEditor` so both editors reuse it.
- `src/components/UpfrontItemsEditor.tsx` (modify) — flat editor now renders `UpfrontItemCard`; unchanged public API (still used by the ad-hoc generator).
- `src/components/UpfrontSectionsEditor.tsx` (create) — multi-section editor used by `ProposalEditor`.
- `src/pages/ProposalEditor.tsx` (modify) — form field, load synthesis, save mirror, swap editor component.
- `src/pages/ProposalView.tsx` (modify) — render one titled table + subtotal + footnote per section.
- `src/components/ProposalPDF.tsx` (modify) — group upfront rows by section.

---

## Task 1: Types and section-total helpers

**Files:**
- Modify: `src/types/proposal.ts:1-20` (UpfrontItem), `:125-169` (Proposal)
- Test: `src/types/upfront.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/types/upfront.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/types/upfront.test.ts`
Expected: FAIL — `resolveUpfrontSections is not exported` / not a function.

- [ ] **Step 3: Add the types and helpers**

In `src/types/proposal.ts`, add `section_id` to `UpfrontItem` (after `service_type_id`, around line 19):

```ts
  // Which upfront section this item belongs to. Items with a missing or unknown
  // section_id render in the first section. The flat upfront_items array stays
  // canonical for totals/selection; section_id is only a grouping tag.
  section_id?: string;
```

Add after the `UpfrontItem` interface / its helper functions (after line 58):

```ts
export const DEFAULT_UPFRONT_SECTION_TITLE = 'Part 1: One-time project delivery';

export interface UpfrontSection {
  id: string;
  title: string;
  notes?: string;
}

/**
 * Sections to render for a proposal. Falls back to a single synthesized section
 * built from the legacy upfront_section_title / upfront_notes when no explicit
 * sections are stored (backward compatibility with pre-sections proposals).
 */
export function resolveUpfrontSections(
  sections: UpfrontSection[] | null | undefined,
  legacyTitle?: string | null,
  legacyNotes?: string | null,
): UpfrontSection[] {
  if (sections && sections.length > 0) return sections;
  return [{
    id: 'default',
    title: (legacyTitle && legacyTitle.trim()) ? legacyTitle : DEFAULT_UPFRONT_SECTION_TITLE,
    notes: legacyNotes || undefined,
  }];
}

/**
 * Group flat upfront items by section, preserving each item's global index.
 * Items whose section_id is missing or matches no section fall into the first section.
 */
export function groupItemsBySection(
  items: UpfrontItem[] | null | undefined,
  sections: UpfrontSection[],
): Map<string, { item: UpfrontItem; i: number }[]> {
  const byId = new Map<string, { item: UpfrontItem; i: number }[]>();
  sections.forEach(s => byId.set(s.id, []));
  const firstId = sections[0]?.id;
  (items || []).forEach((item, i) => {
    const target = item.section_id && byId.has(item.section_id) ? item.section_id : firstId;
    if (target != null) byId.get(target)!.push({ item, i });
  });
  return byId;
}

/** Subtotal of included items (always-included + selected) within one section. */
export function computeSectionTotal(
  items: UpfrontItem[] | null | undefined,
  sections: UpfrontSection[],
  sectionId: string,
  selected: Set<number> = new Set(),
): number {
  const grouped = groupItemsBySection(items, sections);
  return (grouped.get(sectionId) || []).reduce(
    (sum, { item, i }) => (isUpfrontItemIncluded(item, i, selected) ? sum + upfrontItemPrice(item) : sum),
    0,
  );
}
```

Add `upfront_sections` to the `Proposal` interface (after `upfront_total` around line 143):

```ts
  upfront_sections?: UpfrontSection[];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/types/upfront.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/types/proposal.ts src/types/upfront.test.ts
git commit -m "feat(proposals): upfront section types and total helpers"
```

---

## Task 2: Pure section/item model operations

**Files:**
- Create: `src/lib/upfrontSections.ts`
- Test: `src/lib/upfrontSections.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/upfrontSections.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/upfrontSections.test.ts`
Expected: FAIL — cannot find module `./upfrontSections`.

- [ ] **Step 3: Implement the operations**

Create `src/lib/upfrontSections.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/upfrontSections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/upfrontSections.ts src/lib/upfrontSections.test.ts
git commit -m "feat(proposals): pure model ops for upfront sections"
```

---

## Task 3: Database column + Supabase types

**Files:**
- Create: `supabase/migrations/20260625120000_upfront_sections.sql`
- Modify: `src/integrations/supabase/types.ts` (proposals Row ~405, Insert ~461, Update ~517)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260625120000_upfront_sections.sql`:

```sql
-- Multiple titled upfront sections. Each section: { id, title, notes? }.
-- Items remain in the flat proposals.upfront_items array, tagged with section_id.
-- Legacy upfront_section_title / upfront_notes are retained; a single section is
-- synthesized from them at read time when upfront_sections is empty.
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS upfront_sections JSONB NOT NULL DEFAULT '[]'::jsonb;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Apply to project ref `uckvtkxicdbdavbwhqky` (NOT the stale ref in `config.toml`). Use the Supabase MCP `apply_migration` tool with name `upfront_sections` and the SQL above.
Expected: success; `proposals.upfront_sections` exists with default `[]`.

- [ ] **Step 3: Add the column to the generated types**

In `src/integrations/supabase/types.ts`, in the `proposals` table block, add a line next to each existing `upfront_section_title` entry:

- Row (after `upfront_section_title: string | null` ~line 407): `          upfront_sections: Json`
- Insert (after `upfront_section_title?: string | null` ~line 463): `          upfront_sections?: Json`
- Update (after `upfront_section_title?: string | null` ~line 519): `          upfront_sections?: Json`

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: build succeeds (no type errors from the new column).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260625120000_upfront_sections.sql src/integrations/supabase/types.ts
git commit -m "feat(proposals): add upfront_sections column"
```

---

## Task 4: Extract UpfrontItemCard

Mechanical refactor: move the per-item card out of `UpfrontItemsEditor` into a reusable component. No behavior change.

**Files:**
- Create: `src/components/UpfrontItemCard.tsx`
- Modify: `src/components/UpfrontItemsEditor.tsx`

- [ ] **Step 1: Create the card component**

Create `src/components/UpfrontItemCard.tsx` with the full content below. (`CurrencyField` and `Grid` move here from `UpfrontItemsEditor`; the `effectiveTag`/`solutionUnder`/`changeTag` logic moves in from the old `.map`.)

```tsx
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, BookmarkPlus } from "lucide-react";
import type { UpfrontItem } from "@/types/proposal";
import { isChoiceGroupItem } from "@/types/proposal";

export interface Product {
  id: string;
  name: string;
  default_price: number;
  description: string;
  is_upfront: boolean;
  is_ongoing: boolean;
  service_type_id: string | null;
}

// Sentinel <select> value representing the explicit "Universal" tag (service_type_id = null).
const UNIVERSAL = '__universal__';

function CurrencyField({ label, value, onChange }: { label: string; value: number | ''; onChange: (v: number | '') => void }) {
  const fmt = (v: number | '') => (v === '' ? '' : (v || 0).toFixed(2));
  const [display, setDisplay] = useState(fmt(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplay(fmt(value));
  }, [value, focused]);

  return (
    <div>
      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{label}</Label>
      <Input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={e => setDisplay(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          if (display === '') {
            onChange('');
          } else {
            const num = parseFloat(display) || 0;
            setDisplay(num.toFixed(2));
            onChange(num);
          }
          setFocused(false);
        }}
        className="text-sm"
      />
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

export interface UpfrontItemCardProps {
  item: UpfrontItem;
  onChange: (patch: Partial<UpfrontItem>) => void;
  onDelete: () => void;
  products: Product[];
  currentServiceTypeId: string | null;
  enableServiceTagPicker?: boolean;
  serviceTypes?: { id: string; name: string }[];
  enableOngoingFlag?: boolean;
  showDiscountControls?: boolean;
  hideDiscountPrice?: boolean;
  onSaveToLibrary?: (name: string, price: number, description: string) => void;
}

export function UpfrontItemCard({
  item,
  onChange,
  onDelete,
  products,
  currentServiceTypeId,
  enableServiceTagPicker = false,
  serviceTypes = [],
  enableOngoingFlag = false,
  showDiscountControls = true,
  hideDiscountPrice = false,
  onSaveToLibrary,
}: UpfrontItemCardProps) {
  const effectiveTag: string | null | undefined = enableServiceTagPicker
    ? (item.service_type_id !== undefined
        ? item.service_type_id
        : (item.type ? (products.find(p => p.name === item.type)?.service_type_id ?? null) : undefined))
    : currentServiceTypeId;
  const solutionUnder = (p: Product) => {
    if (!p.is_upfront) return false;
    if (!enableServiceTagPicker) return !p.service_type_id || p.service_type_id === currentServiceTypeId;
    if (effectiveTag === undefined) return false;
    if (effectiveTag === null) return !p.service_type_id;
    return p.service_type_id === effectiveTag || !p.service_type_id;
  };
  const solutionOptions = products.filter(solutionUnder);
  const changeTag = (v: string) => {
    const newTag = v === '' ? undefined : (v === UNIVERSAL ? null : v);
    const cur = item.type ? products.find(p => p.name === item.type) : undefined;
    const keep = !cur ? true
      : newTag === undefined ? false
      : newTag === null ? !cur.service_type_id
      : (cur.service_type_id === newTag || !cur.service_type_id);
    const patch: Partial<UpfrontItem> = { service_type_id: newTag };
    if (!keep) { patch.type = ''; patch.description = ''; }
    onChange(patch);
  };

  return (
    <div className="bg-muted p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">{item.name || item.type || 'Untitled'}</span>
          {isChoiceGroupItem(item) && <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5">CHOICE: {item.choice_group!.trim().toUpperCase()}</span>}
          {item.optional && !isChoiceGroupItem(item) && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5">OPTIONAL</span>}
          {enableOngoingFlag && item.ongoing && <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5">ONGOING</span>}
        </div>
        <div className="flex items-center gap-2">
          {enableOngoingFlag && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!item.ongoing}
                onChange={e => onChange({ ongoing: e.target.checked || undefined } as any)}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs text-muted-foreground">Ongoing</span>
            </label>
          )}
          {!isChoiceGroupItem(item) && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!item.optional}
                onChange={e => onChange({ optional: e.target.checked || undefined } as any)}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs text-muted-foreground">Optional</span>
            </label>
          )}
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Grid>
        {enableServiceTagPicker && (
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Service</Label>
            <select
              value={effectiveTag === undefined ? '' : (effectiveTag === null ? UNIVERSAL : effectiveTag)}
              onChange={e => changeTag(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">Select service…</option>
              <option value={UNIVERSAL}>Universal</option>
              {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Solution</Label>
          <select
            value={item.type}
            disabled={enableServiceTagPicker && effectiveTag === undefined}
            onChange={e => {
              const product = products.find(p => p.name === e.target.value);
              onChange({
                type: e.target.value,
                price: product ? product.default_price : item.price,
                description: product?.description ? product.description : (item.description || ''),
              });
            }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{enableServiceTagPicker && effectiveTag === undefined ? 'Select a service first…' : 'Select…'}</option>
            {solutionOptions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <CurrencyField label="Price (£)" value={item.price} onChange={v => onChange({ price: v === '' ? 0 : v })} />
        {!hideDiscountPrice && <CurrencyField label="Discounted (£)" value={item.discounted_price ?? ''} onChange={v => onChange({ discounted_price: v === '' ? undefined : v } as any)} />}
        {showDiscountControls && (
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Discount Note</Label>
            <input
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              placeholder="e.g. Early sign-up discount"
              value={item.discount_note || ''}
              onChange={e => onChange({ discount_note: e.target.value || undefined } as any)}
            />
          </div>
        )}
      </Grid>
      {showDiscountControls && item.discounted_price != null && item.discounted_price < item.price && (
        <label className="flex items-center gap-1.5 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={item.show_discount_percent !== false}
            onChange={() => onChange({ show_discount_percent: item.show_discount_percent === false ? true : false } as any)}
            className="w-3.5 h-3.5 accent-green-500"
          />
          <span className="text-xs text-muted-foreground">Show "Save X%" on customer view</span>
        </label>
      )}
      <div>
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Choice Group</Label>
        <input
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          placeholder="e.g. Website option — leave blank for a normal item"
          value={item.choice_group || ''}
          onChange={e => onChange({ choice_group: e.target.value || undefined } as any)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">Items sharing a choice group are shown to the client as "pick one" — they choose one or none.</p>
      </div>
      <div>
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Name</Label>
        <input
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          placeholder="e.g. Onboarding of RMM and AV"
          value={item.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Description</Label>
        <input
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground"
          placeholder="Brief description shown on proposal (auto-filled when solution selected)"
          value={item.description || ''}
          onChange={e => onChange({ description: e.target.value })}
        />
      </div>
      {onSaveToLibrary && !item.type && item.name && !products.find(p => p.name === item.name) && (
        <button
          type="button"
          onClick={() => onSaveToLibrary(item.name, item.price, item.description ?? '')}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline pt-1"
        >
          <BookmarkPlus className="w-3 h-3" />
          Save "{item.name}" to solutions library
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite UpfrontItemsEditor to use the card**

In `src/components/UpfrontItemsEditor.tsx`:
1. Delete the local `Product` interface, `CurrencyField`, and `Grid` (lines 9-55). Replace the `lucide-react` import line with `import { Plus } from "lucide-react";` (Trash2/BookmarkPlus now live in the card).
2. Add `import { UpfrontItemCard, type Product } from "@/components/UpfrontItemCard";`.
3. Replace the entire `{items.map((item, i) => { ... })}` block (lines 128-293) with:

```tsx
        {items.map((item, i) => (
          <UpfrontItemCard
            key={i}
            item={item}
            onChange={patch => updateItem(i, patch)}
            onDelete={() => onChange(items.filter((_, j) => j !== i))}
            products={products}
            currentServiceTypeId={currentServiceTypeId}
            enableServiceTagPicker={enableServiceTagPicker}
            serviceTypes={serviceTypes}
            enableOngoingFlag={enableOngoingFlag}
            showDiscountControls={showDiscountControls}
            hideDiscountPrice={hideDiscountPrice}
            onSaveToLibrary={onSaveToLibrary}
          />
        ))}
```

Keep `updateItem`, the header/Add Item button, the section-title input, the empty-state line, the base-total row, and the notes textarea exactly as they are.

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; no new lint errors.

- [ ] **Step 4: Manual smoke (ad-hoc generator unchanged)**

Run: `npm run dev`, open the ad-hoc generator in AdminDashboard, confirm the Upfront editor renders item cards, Add Item works, service/solution pickers and Ongoing/Optional toggles behave as before.

- [ ] **Step 5: Commit**

```bash
git add src/components/UpfrontItemCard.tsx src/components/UpfrontItemsEditor.tsx
git commit -m "refactor(proposals): extract UpfrontItemCard"
```

---

## Task 5: UpfrontSectionsEditor component

**Files:**
- Create: `src/components/UpfrontSectionsEditor.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/UpfrontSectionsEditor.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { UpfrontItem, UpfrontSection } from "@/types/proposal";
import { computeSectionTotal, computeUpfrontTotal, groupItemsBySection } from "@/types/proposal";
import { UpfrontItemCard, type Product } from "@/components/UpfrontItemCard";
import {
  addSection, updateSection, deleteSection,
  addItem, updateItem, deleteItem,
  type UpfrontModel,
} from "@/lib/upfrontSections";

const money = (n: number) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface UpfrontSectionsEditorProps {
  items: UpfrontItem[];
  sections: UpfrontSection[];
  onChange: (model: UpfrontModel) => void;
  products: Product[];
  currentServiceTypeId: string | null;
  onSaveToLibrary?: (name: string, price: number, description: string) => void;
}

export function UpfrontSectionsEditor({
  items,
  sections,
  onChange,
  products,
  currentServiceTypeId,
  onSaveToLibrary,
}: UpfrontSectionsEditorProps) {
  const model: UpfrontModel = { sections, items };
  const grouped = groupItemsBySection(items, sections);

  return (
    <div className="bg-card border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Upfront Items</h2>
        <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onChange(addSection(model))}>
          <Plus className="w-4 h-4" /> Add Section
        </Button>
      </div>
      <div className="px-6 py-5 space-y-6">
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No sections yet. Add a section to start building the one-time investment breakdown.</p>
        )}
        {sections.map(section => {
          const sectionItems = grouped.get(section.id) || [];
          const subtotal = computeSectionTotal(items, sections, section.id);
          return (
            <div key={section.id} className="border border-border rounded-md">
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-muted/50">
                <Input
                  placeholder="Part 1: One-time project delivery"
                  value={section.title}
                  onChange={e => onChange(updateSection(model, section.id, { title: e.target.value }))}
                  className="text-sm font-semibold"
                />
                <Button variant="ghost" size="sm" className="gap-1 text-primary shrink-0" onClick={() => onChange(addItem(model, section.id))}>
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 shrink-0"
                  onClick={() => onChange(deleteSection(model, section.id))}
                  title="Delete section and its items"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 space-y-3">
                {sectionItems.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No items in this section yet.</p>
                )}
                {sectionItems.map(({ item, i }) => (
                  <UpfrontItemCard
                    key={i}
                    item={item}
                    onChange={patch => onChange(updateItem(model, i, patch))}
                    onDelete={() => onChange(deleteItem(model, i))}
                    products={products}
                    currentServiceTypeId={currentServiceTypeId}
                    onSaveToLibrary={onSaveToLibrary}
                  />
                ))}
                {sectionItems.length > 0 && (
                  <div className="flex justify-between items-center px-1 pt-1 border-t border-border">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Section subtotal {sectionItems.some(({ item }) => item.optional || (item.choice_group && item.choice_group.trim())) && <span className="normal-case font-normal">(always-included only)</span>}
                    </span>
                    <span className="text-sm font-bold text-foreground">£{money(subtotal)}</span>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Section Footnote</label>
                  <textarea
                    className="w-full border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    rows={2}
                    placeholder="e.g. Delivered over 6 weeks. Prices exclude VAT."
                    value={section.notes ?? ''}
                    onChange={e => onChange(updateSection(model, section.id, { notes: e.target.value || undefined }))}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {sections.length > 0 && (
          <div className="flex justify-between items-center px-1 pt-2 border-t-2 border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Base Total {items.some(it => it.optional || (it.choice_group && it.choice_group.trim())) && <span className="normal-case font-normal">(always-included only)</span>}</span>
            <span className="text-sm font-bold text-foreground">£{money(computeUpfrontTotal(items))}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; no new lint errors. (Component not yet mounted; this just typechecks it.)

- [ ] **Step 3: Commit**

```bash
git add src/components/UpfrontSectionsEditor.tsx
git commit -m "feat(proposals): UpfrontSectionsEditor component"
```

---

## Task 6: Wire UpfrontSectionsEditor into ProposalEditor

**Files:**
- Modify: `src/pages/ProposalEditor.tsx` — imports, `FormData` (~89), initial state (~190), load (~282-284), `buildPayload` (~322-333), editor usage (~858-866)

- [ ] **Step 1: Update imports and form type**

1. Replace `import { UpfrontItemsEditor } from "@/components/UpfrontItemsEditor";` (line 20) with:
```tsx
import { UpfrontSectionsEditor } from "@/components/UpfrontSectionsEditor";
import type { UpfrontModel } from "@/lib/upfrontSections";
```
2. Ensure `UpfrontSection` and `resolveUpfrontSections` are imported from `@/types/proposal` (add to the existing `@/types/proposal` import alongside `UpfrontItem`).
3. In the `FormData` interface, after `upfront_section_title: string;` (line 89) add:
```tsx
  upfront_sections: UpfrontSection[];
```

- [ ] **Step 2: Initialize new-proposal state**

In the `useState<FormData>({...})` initializer, next to `upfront_section_title: '',` (line ~192) add:
```tsx
    upfront_sections: [{ id: 'default', title: '' }],
```

- [ ] **Step 3: Synthesize sections on load**

Replace the load lines 282-284:
```tsx
            upfront_items: ((data as any).upfront_items || []) as UpfrontItem[],
            upfront_notes: (data as any).upfront_notes || '',
            upfront_section_title: (data as any).upfront_section_title || '',
```
with:
```tsx
            ...(() => {
              const loadedItems = ((data as any).upfront_items || []) as UpfrontItem[];
              // Reuse the canonical helper so the editor synthesizes sections (and the
              // blank-title default) identically to the customer view / PDF.
              const resolved = resolveUpfrontSections(
                (data as any).upfront_sections,
                (data as any).upfront_section_title,
                (data as any).upfront_notes,
              );
              const firstId = resolved[0].id;
              return {
                upfront_items: loadedItems.map(it => (it.section_id ? it : { ...it, section_id: firstId })),
                upfront_sections: resolved,
                upfront_notes: (data as any).upfront_notes || '',
                upfront_section_title: (data as any).upfront_section_title || '',
              };
            })(),
```

- [ ] **Step 4: Mirror first-section title on save**

In `buildPayload` (line 324-333), change the returned object to also mirror the legacy title so any un-updated reader still shows something:
```tsx
    return {
      ...form,
      // Base total = always-included items only (optional/choice-group items are added
      // when the client selects them in the customer view).
      upfront_total: computeUpfrontTotal(form.upfront_items),
      // Legacy single-title mirror for back-compat (customer-view summary label).
      upfront_section_title: form.upfront_sections[0]?.title ?? form.upfront_section_title,
      contract_file_url: contractFileUrl,
      client_logo_url: clientLogoUrl,
      prepared_by_user_id: form.prepared_by_user_id || null,
      lead_team_member_id: preparedUser?.team_member_id || null,
    } as any;
```
(`upfront_sections` is saved automatically via `...form` into the new jsonb column. Leave `upfront_notes` untouched — it remains the proposal-wide pricing footnote edited near line 1088.)

- [ ] **Step 5: Swap the editor component**

Replace the `<UpfrontItemsEditor ... />` block (lines 858-866) with:
```tsx
        <UpfrontSectionsEditor
          items={form.upfront_items}
          sections={form.upfront_sections}
          onChange={(model: UpfrontModel) => setForm(prev => ({ ...prev, upfront_items: model.items, upfront_sections: model.sections }))}
          products={products}
          currentServiceTypeId={currentServiceTypeId}
          onSaveToLibrary={(name, price, desc) => saveItemToLibrary(name, price, desc, 'upfront')}
        />
```

- [ ] **Step 6: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; no new lint errors.

- [ ] **Step 7: Manual smoke (editor round-trip)**

Run `npm run dev`. Open an existing proposal (created before this change): confirm its items appear under one section titled from the old `upfront_section_title`. Add a second section, give it a title, add items, set a section footnote, save. Reload the page and confirm both sections, their items, subtotals, and footnotes persisted. Delete a section and confirm its items are removed on save.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ProposalEditor.tsx
git commit -m "feat(proposals): edit multiple upfront sections in ProposalEditor"
```

---

## Task 7: Customer view — one table per section

**Files:**
- Modify: `src/pages/ProposalView.tsx` — upfront block (lines 837-993), imports

The current upfront block is: section-title bar (838) → an IIFE that renders the items table + choice-group cards (840-983) → a navy grand-total bar (984-992). Restructure so the title bar + table + a per-section subtotal bar + the section footnote render **once per section**, with the navy grand-total bar moved to **after** the sections loop.

- [ ] **Step 1: Add imports**

Ensure these are imported from `@/types/proposal` in ProposalView: `resolveUpfrontSections`, `groupItemsBySection`, `computeSectionTotal` (alongside existing `computeUpfrontTotal`, `isChoiceGroupItem`, `UpfrontItem`).

- [ ] **Step 2: Extract the table renderer**

Inside the component (near the other `const` render helpers, before the `return`), add a function that renders the items table + choice-group cards for a given list of `{item, i}`. The helper re-declares the locals the existing IIFE computed (`nonGrouped`, `hasOptional`, `groupOrder`, `groups`) from the passed `entries`, so you only move the **returned JSX fragment** (the code currently between `return (` on line 855 and its matching `)` just before `})()}` on line 983 — i.e. lines 856-981, the `<>...</>` fragment). Do NOT move lines 841-853 (the old `allItems`/`nonGrouped`/`groups` setup) — the helper replaces them:

```tsx
  const renderUpfrontTable = (entries: { item: UpfrontItem; i: number }[]) => {
    const nonGrouped = entries.filter(({ item }) => !isChoiceGroupItem(item));
    const hasOptional = nonGrouped.some(({ item }) => (item as any).optional);

    // Ordered choice groups (by first appearance), each with its members.
    const groupOrder: string[] = [];
    const groups: Record<string, { item: UpfrontItem; i: number }[]> = {};
    entries.forEach(({ item, i }) => {
      if (!isChoiceGroupItem(item)) return;
      const g = item.choice_group!.trim();
      if (!groups[g]) { groups[g] = []; groupOrder.push(g); }
      groups[g].push({ item, i });
    });

    return (
      <>
        {/* PASTE the existing fragment from ProposalView lines 856-981 here, unchanged:
            the {hasOptional && ...} note, the {nonGrouped.length > 0 && (...)} table,
            and the {groupOrder.map(g => (...))} choice-group cards. */}
      </>
    );
  };
```

Notes:
- Keep the moved JSX exactly as today — it already uses the global index `i` for `selectedOptionalItems`, which still works because `i` is the global index from `groupItemsBySection`.
- Choice-group "pick one" cards now render within their section. Authoring the same `choice_group` name across two sections is an unsupported edge case (mutual-exclusion only applies within a section's render); the numeric total is unaffected because `computeUpfrontTotal`/`computeSectionTotal` still treat each grouped item via `isChoiceGroupItem`.

- [ ] **Step 3: Replace the single block with a per-section loop**

Replace the whole upfront block (lines 837-993, i.e. from `{(proposal.upfront_items || []).length > 0 && <div>` through its closing `</div>}`) with:

```tsx
              {(proposal.upfront_items || []).length > 0 && (() => {
                const upfrontSections = resolveUpfrontSections(
                  (proposal as any).upfront_sections,
                  (proposal as any).upfront_section_title,
                  (proposal as any).upfront_notes,
                );
                const grouped = groupItemsBySection(proposal.upfront_items, upfrontSections);
                return (
                  <>
                    {upfrontSections.map(section => {
                      const entries = grouped.get(section.id) || [];
                      if (entries.length === 0) return null;
                      const subtotal = computeSectionTotal(proposal.upfront_items, upfrontSections, section.id, selectedOptionalItems);
                      return (
                        <div key={section.id}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#043D5D', letterSpacing: '.04em', textTransform: 'uppercase' as const, paddingBottom: 8, borderBottom: '2px solid #043D5D', marginBottom: 16 }}>{section.title || 'One-time project delivery'}</div>
                          {renderUpfrontTable(entries)}
                          <div style={{ background: '#F0F5F8', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: '#3A6278' }}>Section subtotal</span>
                            <strong style={{ fontSize: 15, fontWeight: 800, color: '#043D5D' }}>£{subtotal.toLocaleString('en-GB')}</strong>
                          </div>
                          {section.notes && (
                            <p style={{ fontSize: 11, color: '#AAAAAA', marginTop: 8, marginBottom: 0 }}>{section.notes}</p>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ background: '#043D5D', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.5)' }}>Total one-time investment</span>
                        {optionalUpfrontAddOn > 0 && (
                          <div style={{ fontSize: 10, color: '#FCD34D', marginTop: 2 }}>Includes £{optionalUpfrontAddOn.toLocaleString('en-GB')} of selected options</div>
                        )}
                      </div>
                      <strong style={{ fontSize: 20, fontWeight: 900, color: '#009FE3', letterSpacing: '-.03em', transition: 'all .3s' }}>£{displayUpfrontTotal.toLocaleString('en-GB')} + VAT @ 20%</strong>
                    </div>
                  </>
                );
              })()}
```

(The outer flex container at line 835-836 and the sibling blocks for core/standard ongoing options below line 994 are unchanged.)

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; no new lint errors.

- [ ] **Step 5: Manual smoke (customer view)**

Run `npm run dev`, open `/p/<slug>` for a multi-section proposal. Confirm: each section renders its own titled table; optional/choice-group selection still updates the per-section subtotal AND the navy grand total; a legacy (pre-sections) proposal renders as a single section under its old title. Confirm section footnotes appear under their tables.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProposalView.tsx
git commit -m "feat(proposals): render upfront sections on customer view"
```

---

## Task 8: PDF — group upfront rows by section

**Files:**
- Modify: `src/components/ProposalPDF.tsx` — upfront block (lines 727-746), imports

- [ ] **Step 1: Add imports**

Ensure `resolveUpfrontSections` and `groupItemsBySection` are imported from `@/types/proposal` (alongside existing `isChoiceGroupItem`, `UpfrontItem`).

- [ ] **Step 2: Replace the flat upfront block**

Replace lines 727-746 (the `{allUpfrontItems.length > 0 ? (...) : null}` block) with:

```tsx
        {allUpfrontItems.length > 0 ? (
          <View>
            {(() => {
              const upfrontSections = resolveUpfrontSections(
                proposal.upfront_sections,
                proposal.upfront_section_title,
              );
              const grouped = groupItemsBySection(allUpfrontItems, upfrontSections);
              return upfrontSections.map(section => {
                const entries = grouped.get(section.id) || [];
                if (entries.length === 0) return null;
                const subtotal = entries.reduce((s, { item }) => s + (item.discounted_price ?? item.price), 0);
                return (
                  <View key={section.id} wrap={false}>
                    <Text style={styles.subHead}>{section.title || 'Upfront investment'}</Text>
                    {entries.map(({ item, i }) => {
                      const price = item.discounted_price ?? item.price;
                      return (
                        <View key={i} style={styles.tableRow}>
                          <Text style={styles.tableDesc}>
                            {item.name}
                            {item.discount_note ? ` (${item.discount_note})` : ''}
                          </Text>
                          <Text style={styles.tableAmt}>{fmt(price)}</Text>
                        </View>
                      );
                    })}
                    <View style={styles.tableRow}>
                      <Text style={styles.tableDescBold}>Section subtotal</Text>
                      <Text style={styles.tableAmtBold}>{fmt(subtotal)}</Text>
                    </View>
                  </View>
                );
              });
            })()}
            <View style={styles.tableRow}>
              <Text style={styles.tableDescBold}>Upfront total</Text>
              <Text style={styles.tableAmtBold}>{fmt(displayUpfrontTotal)}</Text>
            </View>
          </View>
        ) : null}
```

Note: `allUpfrontItems` is `[...baseUpfrontItems, ...selectedOptionalUpfrontItems]` — each item carries its `section_id`, so selected optional items land in their own section. `groupItemsBySection`'s index `i` here is into `allUpfrontItems` and is used only as a React key (unique within the list), which is fine.

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; no new lint errors.

- [ ] **Step 4: Manual smoke (PDF)**

From the customer view of a multi-section proposal, trigger the PDF download. Confirm each section has its own subhead + rows + "Section subtotal", followed by a single "Upfront total" equal to the customer-view grand total. Confirm a legacy proposal renders one section under its title (or the default "Upfront investment").

- [ ] **Step 5: Commit**

```bash
git add src/components/ProposalPDF.tsx
git commit -m "feat(proposals): group upfront PDF rows by section"
```

---

## Task 9: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (including the new `upfront.test.ts` and `upfrontSections.test.ts` cases).

- [ ] **Step 2: Build and lint clean**

Run: `npm run build && npm run lint`
Expected: both succeed with no errors.

- [ ] **Step 3: End-to-end manual check**

With `npm run dev`:
1. Create a NEW proposal → one empty section appears → add two sections with items, subtotals, footnotes → save & generate link.
2. Open the customer link → sections render as stacked tables; select optional/choice items → subtotals + grand total update.
3. Accept the proposal → confirm the acceptance records the right items (accept flow uses flat indices — unaffected).
4. Download the PDF → sections grouped correctly.
5. Open a pre-existing (legacy) proposal → renders as a single section; save it → reopen → still correct.

- [ ] **Step 4: Final commit (if any docs/cleanup remain)**

```bash
git add -A
git commit -m "chore(proposals): finish upfront multiple sections"
```

---

## Notes for the implementer

- **Do not push to `main`.** Frontend auto-deploys on push to `main`. Work on a feature branch; integrate via PR.
- **DB changes go through the Supabase MCP** against project ref `uckvtkxicdbdavbwhqky` (the `config.toml` ref is stale and will deny permission).
- `£0` is a valid price/discount — never coerce `0` to "no price". The reused `UpfrontItemCard` already preserves this.
- The email function (`notify-proposal`) and the accept flow operate on the flat `upfront_items` array and need no changes.
