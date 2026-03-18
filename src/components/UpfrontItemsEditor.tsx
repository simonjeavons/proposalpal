import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, BookmarkPlus } from "lucide-react";
import type { UpfrontItem } from "@/types/proposal";

interface Product {
  id: string;
  name: string;
  default_price: number;
  description: string;
  is_upfront: boolean;
  is_ongoing: boolean;
  service_type_id: string | null;
}

function CurrencyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState((value || 0).toFixed(2));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplay((value || 0).toFixed(2));
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
          const num = parseFloat(display) || 0;
          setDisplay(num.toFixed(2));
          onChange(num);
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
          <div key={i} className="bg-muted p-4 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">{item.name || item.type || 'Untitled'}</span>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Grid>
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Solution</Label>
                <select
                  value={item.type}
                  onChange={e => {
                    const product = products.find(p => p.name === e.target.value);
                    updateItem(i, {
                      type: e.target.value,
                      price: product ? product.default_price : item.price,
                      description: product?.description ? product.description : (item.description || ''),
                    });
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Select…</option>
                  {products.filter(p => p.is_upfront && (!p.service_type_id || p.service_type_id === currentServiceTypeId)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <CurrencyField label="Price (£)" value={item.price} onChange={v => updateItem(i, { price: Number(v) || 0 })} />
              <CurrencyField label="Discounted (£)" value={item.discounted_price ?? ''} onChange={v => updateItem(i, { discounted_price: v === '' || v === 0 ? undefined : Number(v) || 0 } as any)} />
              {showDiscountControls && (
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Discount Note</Label>
                  <input
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    placeholder="e.g. Early sign-up discount"
                    value={item.discount_note || ''}
                    onChange={e => updateItem(i, { discount_note: e.target.value || undefined } as any)}
                  />
                </div>
              )}
            </Grid>
            {showDiscountControls && item.discounted_price != null && item.discounted_price < item.price && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={item.show_discount_percent !== false}
                  onChange={() => updateItem(i, { show_discount_percent: item.show_discount_percent === false ? true : false } as any)}
                  className="w-3.5 h-3.5 accent-green-500"
                />
                <span className="text-xs text-muted-foreground">Show "Save X%" on customer view</span>
              </label>
            )}
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Name</Label>
              <input
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="e.g. Onboarding of RMM and AV"
                value={item.name}
                onChange={e => updateItem(i, { name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Description</Label>
              <input
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground"
                placeholder="Brief description shown on proposal (auto-filled when solution selected)"
                value={item.description || ''}
                onChange={e => updateItem(i, { description: e.target.value })}
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
        ))}
        {items.length > 0 && (
          <div className="flex justify-between items-center px-1 pt-1 border-t border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-sm font-bold text-foreground">£{items.reduce((s, i) => s + (i.discounted_price ?? i.price), 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        {onNotesChange && (
          <div className="pt-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Pricing Footnote (optional)</label>
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
