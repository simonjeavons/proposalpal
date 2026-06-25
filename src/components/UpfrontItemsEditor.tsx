import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UpfrontItem } from "@/types/proposal";
import { computeUpfrontTotal, isChoiceGroupItem } from "@/types/proposal";
import { UpfrontItemCard, type Product } from "@/components/UpfrontItemCard";

export interface UpfrontItemsEditorProps {
  items: UpfrontItem[];
  onChange: (items: UpfrontItem[]) => void;
  products: Product[];
  currentServiceTypeId: string | null;
  sectionTitle?: string;
  onSectionTitleChange?: (v: string) => void;
  notes?: string;
  onNotesChange?: (v: string) => void;
  paymentTerms?: string;
  onPaymentTermsChange?: (v: string) => void;
  onSaveToLibrary?: (name: string, price: number, description: string) => void;
  showDiscountControls?: boolean;
  hideDiscountPrice?: boolean;
  // When true, each item first picks a service tag, then the Solution list filters
  // to that tag + universal items. Requires `serviceTypes`. Used by the ad-hoc generator.
  enableServiceTagPicker?: boolean;
  serviceTypes?: { id: string; name: string }[];
  // When true, each item gets an "Ongoing" toggle; if all items are ongoing the
  // charges total is labelled "Ongoing Monthly Total". Used by the ad-hoc generator.
  enableOngoingFlag?: boolean;
}

export function UpfrontItemsEditor({
  items,
  onChange,
  products,
  currentServiceTypeId,
  sectionTitle,
  onSectionTitleChange,
  notes,
  onNotesChange,
  onSaveToLibrary,
  showDiscountControls = true,
  hideDiscountPrice = false,
  enableServiceTagPicker = false,
  serviceTypes = [],
  enableOngoingFlag = false,
}: UpfrontItemsEditorProps) {
  const updateItem = (i: number, patch: Partial<UpfrontItem>) => {
    const updated = [...items];
    updated[i] = { ...updated[i], ...patch };
    onChange(updated);
  };

  return (
    <div className="bg-card border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Upfront Items</h2>
        <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onChange([...items, { type: '', name: '', price: 0, description: '' }])}>
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>
      <div className="px-6 py-5 space-y-3">
        {onSectionTitleChange && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Section Title</label>
            <Input
              placeholder="Part 1: One-time project delivery"
              value={sectionTitle ?? ''}
              onChange={e => onSectionTitleChange(e.target.value)}
              className="text-sm"
            />
          </div>
        )}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No upfront items yet. Add items to build the one-time investment breakdown.</p>
        )}
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
        {items.length > 0 && (
          <div className="flex justify-between items-center px-1 pt-1 border-t border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Base Total {items.some(it => it.optional || isChoiceGroupItem(it)) && <span className="normal-case font-normal">(always-included only)</span>}</span>
            <span className="text-sm font-bold text-foreground">£{computeUpfrontTotal(items).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        {onNotesChange && (
          <div className="pt-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Pricing Footnote</label>
            <textarea
              className="w-full border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              placeholder="e.g. All prices exclude VAT. Travel and expenses charged at cost."
              value={notes ?? ''}
              onChange={e => onNotesChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
