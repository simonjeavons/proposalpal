import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingSettings } from "@/types/onboarding";

export default function OnboardingSettingsAdmin() {
  const [settings, setSettings] = useState<OnboardingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stage1, setStage1] = useState(5);
  const [stage2, setStage2] = useState(10);
  const [stage3, setStage3] = useState(5);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("onboarding_settings").select("*").eq("id", 1).single();
      if (cancelled) return;
      if (error || !data) {
        toast.error("Failed to load settings");
        setLoading(false);
        return;
      }
      const s = data as OnboardingSettings;
      setSettings(s);
      setStage1(s.reminder_stage1_days);
      setStage2(s.reminder_stage2_days);
      setStage3(s.reminder_stage3_days);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("onboarding_settings")
      .update({
        reminder_stage1_days: stage1,
        reminder_stage2_days: stage2,
        reminder_stage3_days: stage3,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    setSettings(prev => prev ? {
      ...prev,
      reminder_stage1_days: stage1,
      reminder_stage2_days: stage2,
      reminder_stage3_days: stage3,
    } : prev);
    toast.success("Settings saved");
  };

  const isDirty = settings && (
    stage1 !== settings.reminder_stage1_days ||
    stage2 !== settings.reminder_stage2_days ||
    stage3 !== settings.reminder_stage3_days
  );

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold">Onboarding settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Working-day thresholds before a chase email goes to the assigned team member.
          Mon–Fri only — UK bank holidays not yet supported.
        </p>
      </div>

      <div className="space-y-4 border rounded-lg p-5">
        <ThresholdField
          label="Stage 1"
          description="Working days from configuration to Stage 1 completion"
          value={stage1}
          onChange={setStage1}
        />
        <ThresholdField
          label="Stage 2"
          description="Working days from Stage 1 completion to report sent"
          value={stage2}
          onChange={setStage2}
        />
        <ThresholdField
          label="Stage 3"
          description="Working days from report sent to client sign-off"
          value={stage3}
          onChange={setStage3}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

function ThresholdField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3 items-start">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={0}
          className="h-9"
        />
        <span className="text-sm text-muted-foreground">days</span>
      </div>
    </div>
  );
}
