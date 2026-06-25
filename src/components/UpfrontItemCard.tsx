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
