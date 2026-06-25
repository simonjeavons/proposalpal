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
                {/* Keyed by the global flat-array index `i` (matches the legacy editor). The
                    cards re-sync their local input state from props on render, so an index
                    shift after a delete corrects itself; revisit with a stable per-item id if
                    cards ever hold state that isn't prop-derived. */}
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
