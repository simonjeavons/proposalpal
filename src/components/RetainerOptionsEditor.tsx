import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, BookmarkPlus, GripVertical, ArrowDownWideNarrow } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RetainerOption } from "@/types/proposal";

interface Product {
  id: string;
  name: string;
  default_price: number;
  description: string;
  is_upfront: boolean;
  is_ongoing: boolean;
  service_type_id: string | null;
}

function reorderArray<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

function SortableItem({ id, children }: { id: string; children: (props: { dragHandleProps: React.HTMLAttributes<HTMLDivElement> }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{label}</Label>
      <Input type="text" value={value} onChange={e => onChange(e.target.value)} className="text-sm" />
    </div>
  );
}

const FREQ_LABEL: Record<string, string> = { weekly: '/week', monthly: '/month', annual: '/year' };

export interface RetainerOptionsEditorProps {
  options: RetainerOption[];
  onChange: (options: RetainerOption[]) => void;
  products: Product[];
  currentServiceTypeId: string | null;
  coreSectionTitle?: string;
  onCoreSectionTitleChange?: (v: string) => void;
  ongoingSectionTitle?: string;
  onOngoingSectionTitleChange?: (v: string) => void;
  showFrequency?: boolean;
  onSaveToLibrary?: (name: string, price: number) => void;
}

export function RetainerOptionsEditor({
  options,
  onChange,
  products,
  currentServiceTypeId,
  coreSectionTitle,
  onCoreSectionTitleChange,
  ongoingSectionTitle,
  onOngoingSectionTitleChange,
  showFrequency = false,
  onSaveToLibrary,
}: RetainerOptionsEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const ids = options.map((_, i) => `retainer-${i}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    onChange(reorderArray(options, from, to));
  };

  const updateOption = (i: number, field: string, value: any) => {
    const updated = [...options];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };

  const newOption = (): RetainerOption => ({
    type: '', name: '', term_months: undefined, quantity: 1, price: 0,
    features: [], option_type: 'standard', recommended: false,
    ...(showFrequency ? { frequency: 'monthly' as const } : {}),
  });

  const freqLabel = (r: RetainerOption) => FREQ_LABEL[r.frequency ?? 'monthly'] ?? '/month';

  return (
    <div className="bg-card border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Ongoing</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs" onClick={() => onChange([...options].sort((a, b) => ((b.quantity ?? 1) * (b.discounted_price ?? b.price)) - ((a.quantity ?? 1) * (a.discounted_price ?? a.price))))}>
            <ArrowDownWideNarrow className="w-3.5 h-3.5" /> Sort by value
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onChange([...options, newOption()])}>
            <Plus className="w-4 h-4" /> Add Option
          </Button>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">
        {(onCoreSectionTitleChange || onOngoingSectionTitleChange) && (
          <div className="grid grid-cols-2 gap-3">
            {onCoreSectionTitleChange && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Core section title</label>
                <Input
                  placeholder="Core — always included"
                  value={coreSectionTitle ?? ''}
                  onChange={e => onCoreSectionTitleChange(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
            {onOngoingSectionTitleChange && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Standard section title</label>
                <Input
                  placeholder="Part 2: Ongoing support / options"
                  value={ongoingSectionTitle ?? ''}
                  onChange={e => onOngoingSectionTitleChange(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {options.map((r, i) => (
              <SortableItem key={ids[i]} id={ids[i]}>
                {({ dragHandleProps }) => (
                  <div className="bg-muted p-4 border border-border space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-foreground truncate">{r.name || r.type || 'Untitled'}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Core / Standard / Optional Extra toggle */}
                        <div className="flex items-center bg-background border border-border rounded overflow-hidden">
                          <button
                            onClick={() => updateOption(i, 'option_type', 'core')}
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 transition-colors ${
                              r.option_type === 'core' ? 'bg-emerald-100 text-emerald-700' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >Core</button>
                          <button
                            onClick={() => updateOption(i, 'option_type', 'standard')}
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 transition-colors ${
                              r.option_type === 'standard' ? 'bg-blue-100 text-blue-700' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >Standard</button>
                          <button
                            onClick={() => updateOption(i, 'option_type', 'optional_extra')}
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 transition-colors ${
                              r.option_type === 'optional_extra' ? 'bg-amber-100 text-amber-700' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >Optional Extra</button>
                        </div>
                        {/* Recommended */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!r.recommended}
                            onChange={() => updateOption(i, 'recommended', !r.recommended)}
                            className="w-3.5 h-3.5 accent-amber-500"
                          />
                          <span className="text-xs text-muted-foreground">★ Recommended</span>
                        </label>
                        <select
                          value={i}
                          onChange={e => onChange(reorderArray(options, i, Number(e.target.value)))}
                          className="h-7 w-12 text-xs text-center border border-border bg-background rounded"
                          title="Reorder"
                        >
                          {options.map((_, j) => <option key={j} value={j}>{j + 1}</option>)}
                        </select>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                          onClick={() => onChange(options.filter((_, j) => j !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Grid>
                      <div>
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Type</Label>
                        <select
                          value={r.type}
                          onChange={e => {
                            const product = products.find(p => p.name === e.target.value);
                            updateOption(i, 'type', e.target.value);
                            if (product) updateOption(i, 'price', product.default_price);
                          }}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          <option value="">Select…</option>
                          {products.filter(p => p.is_ongoing && (!p.service_type_id || p.service_type_id === currentServiceTypeId)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                      <Field label="Name / Tier" value={r.name} onChange={v => updateOption(i, 'name', v)} />
                      <div>
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Term (months)</Label>
                        <input
                          type="number"
                          min={1}
                          placeholder="e.g. 12"
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={r.term_months ?? ''}
                          onChange={e => updateOption(i, 'term_months', e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Quantity</Label>
                        <input
                          type="number"
                          min={1}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={r.quantity ?? 1}
                          onChange={e => updateOption(i, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                        />
                      </div>
                      {showFrequency && (
                        <div>
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Frequency</Label>
                          <select
                            value={r.frequency ?? 'monthly'}
                            onChange={e => updateOption(i, 'frequency', e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                          >
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="annual">Annual</option>
                          </select>
                        </div>
                      )}
                      <CurrencyField label={`Price (£${freqLabel(r)})`} value={r.price} onChange={v => updateOption(i, 'price', v)} />
                      <CurrencyField label={`Discounted (£${freqLabel(r)})`} value={r.discounted_price ?? ''} onChange={v => updateOption(i, 'discounted_price', v === '' || v === 0 ? undefined : Number(v) || 0)} />
                      <div>
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Total (£{freqLabel(r)})</Label>
                        <div className="h-9 flex items-center px-3 bg-muted border border-border text-sm font-semibold text-foreground">
                          £{((r.quantity ?? 1) * (r.discounted_price ?? r.price)).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </Grid>
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Features (one per line)</Label>
                      <Textarea value={r.features.join('\n')} onChange={e => updateOption(i, 'features', e.target.value.split('\n'))} rows={3} className="text-sm" />
                    </div>
                    {onSaveToLibrary && !r.type && r.name && !products.find(p => p.name === r.name) && (
                      <button
                        type="button"
                        onClick={() => onSaveToLibrary(r.name, r.price)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline pt-1"
                      >
                        <BookmarkPlus className="w-3 h-3" />
                        Save "{r.name}" to solutions library
                      </button>
                    )}
                  </div>
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
