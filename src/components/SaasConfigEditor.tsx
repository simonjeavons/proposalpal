import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { SaasConfig, SaasTier } from "@/types/proposal";
import { DEFAULT_SAAS_SELLING_POINTS } from "@/types/proposal";

function CurrencyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState((value || 0).toFixed(2));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplay((value || 0).toFixed(2));
  }, [value, focused]);

  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
        <Input
          className="pl-6 text-sm"
          value={display}
          onFocus={() => { setFocused(true); setDisplay(String(value || '')); }}
          onBlur={() => { setFocused(false); const n = parseFloat(display); onChange(isNaN(n) ? 0 : n); }}
          onChange={e => setDisplay(e.target.value)}
        />
      </div>
    </div>
  );
}

const EMPTY_TIER: SaasTier = { label: '', monthly_price: 0, duration_months: 12, features: [] };

interface Props {
  config: SaasConfig;
  onChange: (config: SaasConfig) => void;
}

export default function SaasConfigEditor({ config, onChange }: Props) {
  const tiers = config.tiers || [];
  const sellingPoints = config.selling_points?.length ? config.selling_points : [...DEFAULT_SAAS_SELLING_POINTS];

  const updateTier = (i: number, field: keyof SaasTier, value: any) => {
    const updated = [...tiers];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...config, tiers: updated });
  };

  const addTier = () => {
    const label = tiers.length === 0 ? 'Year 1' : `Year ${tiers.length + 1}+`;
    onChange({ ...config, tiers: [...tiers, { ...EMPTY_TIER, label }] });
  };

  const removeTier = (i: number) => {
    onChange({ ...config, tiers: tiers.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Option B — Shoothill as a Service</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configure the subscription pricing tiers</p>
        </div>
      </div>

      {/* Tiers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing Tiers</Label>
          <Button type="button" variant="outline" size="sm" onClick={addTier} className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" /> Add tier
          </Button>
        </div>

        {tiers.map((tier, i) => (
          <div key={i} className="border border-border rounded-lg p-4 bg-card space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Tier {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeTier(i)} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Label</Label>
                <Input
                  className="text-sm"
                  placeholder="e.g. Year 1"
                  value={tier.label}
                  onChange={e => updateTier(i, 'label', e.target.value)}
                />
              </div>
              <CurrencyField
                label="Monthly price"
                value={tier.monthly_price}
                onChange={v => updateTier(i, 'monthly_price', v)}
              />
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Duration (months)</Label>
                <Input
                  type="number"
                  className="text-sm"
                  min={1}
                  value={tier.duration_months || ''}
                  onChange={e => updateTier(i, 'duration_months', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground">Features (one per line)</Label>
              <Textarea
                className="text-sm min-h-[60px]"
                placeholder="e.g. Development & hosting included&#10;Dedicated account manager&#10;24/7 support"
                value={(tier.features || []).join('\n')}
                onChange={e => updateTier(i, 'features', e.target.value.split('\n').filter(Boolean))}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Total: £{((tier.monthly_price || 0) * (tier.duration_months || 0)).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}

        {tiers.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">No tiers configured. Add a tier to define the SaaS pricing.</p>
          </div>
        )}
      </div>

      {/* Selling points */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selling Points</Label>
        <p className="text-xs text-muted-foreground">Shown to the client when viewing the SaaS option</p>
        {sellingPoints.map((point, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="text-sm flex-1"
              value={point}
              onChange={e => {
                const updated = [...sellingPoints];
                updated[i] = e.target.value;
                onChange({ ...config, selling_points: updated });
              }}
            />
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => onChange({ ...config, selling_points: sellingPoints.filter((_, idx) => idx !== i) })}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => onChange({ ...config, selling_points: [...sellingPoints, ''] })}
          className="h-7 text-xs gap-1"
        >
          <Plus className="w-3 h-3" /> Add point
        </Button>
      </div>

      {/* Custom intro */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Intro Text (optional)</Label>
        <Textarea
          className="text-sm mt-1 min-h-[60px]"
          placeholder="Everything you need, one simple monthly fee"
          value={config.custom_intro || ''}
          onChange={e => onChange({ ...config, custom_intro: e.target.value })}
        />
      </div>

      {/* Summary */}
      {tiers.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <strong>Contract summary:</strong>{' '}
          {tiers.map((t, i) => `${t.label || `Tier ${i+1}`}: £${(t.monthly_price || 0).toLocaleString('en-GB')}/mo × ${t.duration_months || 0} months`).join(' → ')}
          {' '}= £{tiers.reduce((sum, t) => sum + (t.monthly_price || 0) * (t.duration_months || 0), 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })} total
        </div>
      )}
    </div>
  );
}
