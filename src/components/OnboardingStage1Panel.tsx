import { useEffect, useState } from "react";
import { Plus, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import OnboardingActionRow from "@/components/OnboardingActionRow";
import type {
  ClientOnboarding,
  FormSchema,
  OnboardingActionInstance,
} from "@/types/onboarding";

interface ActionWithLibrary extends OnboardingActionInstance {
  library: {
    name: string;
    description: string;
    form_schema: FormSchema | null;
  } | null;
}

interface Props {
  onboarding: ClientOnboarding;
  onOnboardingChange: (next: ClientOnboarding) => void;
}

function toIsoDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export default function OnboardingStage1Panel({ onboarding, onOnboardingChange }: Props) {
  const [actions, setActions] = useState<ActionWithLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [adhocName, setAdhocName] = useState("");
  const [adhocSaving, setAdhocSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [kickoffDraft, setKickoffDraft] = useState(toIsoDateTimeLocal(onboarding.kickoff_meeting_at));
  const [kickoffSaving, setKickoffSaving] = useState(false);

  useEffect(() => {
    setKickoffDraft(toIsoDateTimeLocal(onboarding.kickoff_meeting_at));
  }, [onboarding.kickoff_meeting_at]);

  const loadActions = async () => {
    const { data, error } = await supabase
      .from("onboarding_action_instances")
      .select("*, library:action_library_id (name, description, form_schema)")
      .eq("onboarding_id", onboarding.id)
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error("Failed to load actions: " + error.message);
      setLoading(false);
      return;
    }
    setActions((data ?? []) as ActionWithLibrary[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding.id]);

  const updateAction = async (id: string, patch: Partial<OnboardingActionInstance>) => {
    const { error } = await supabase
      .from("onboarding_action_instances")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    setActions(prev => prev.map(a => (a.id === id ? { ...a, ...patch } as ActionWithLibrary : a)));
  };

  const updateOnboardingField = async (patch: Partial<ClientOnboarding>) => {
    const { error } = await supabase
      .from("client_onboardings")
      .update(patch)
      .eq("id", onboarding.id);
    if (error) {
      toast.error("Save failed: " + error.message);
      return false;
    }
    onOnboardingChange({ ...onboarding, ...patch });
    return true;
  };

  const handleKickoffBlur = async () => {
    const isoOrNull = kickoffDraft ? new Date(kickoffDraft).toISOString() : null;
    if (isoOrNull === onboarding.kickoff_meeting_at) return;
    setKickoffSaving(true);
    await updateOnboardingField({ kickoff_meeting_at: isoOrNull });
    setKickoffSaving(false);
  };

  const handleKickoffHeldChange = async (checked: boolean) => {
    await updateOnboardingField({ kickoff_held: checked });
  };

  const handleAddAdhoc = async () => {
    const trimmed = adhocName.trim();
    if (!trimmed) return;
    setAdhocSaving(true);
    const maxSort = actions.reduce((m, a) => Math.max(m, a.sort_order), 0);
    const { data, error } = await supabase
      .from("onboarding_action_instances")
      .insert({
        onboarding_id: onboarding.id,
        action_library_id: null,
        name_override: trimmed,
        status: "pending",
        notes: "",
        sort_order: maxSort + 10,
      })
      .select("*, library:action_library_id (name, description, form_schema)")
      .single();
    setAdhocSaving(false);
    if (error || !data) {
      toast.error("Add failed: " + (error?.message ?? "unknown"));
      return;
    }
    setActions(prev => [...prev, data as ActionWithLibrary]);
    setAdhocName("");
    setAdhocOpen(false);
  };

  const allResolved = actions.length > 0 && actions.every(a => a.status === "done" || a.status === "na");
  const canComplete = Boolean(onboarding.kickoff_meeting_at) && onboarding.kickoff_held && allResolved;

  const completeStage1 = async () => {
    if (!canComplete) return;
    setCompleting(true);
    const now = new Date().toISOString();
    const ok = await updateOnboardingField({
      stage1_completed_at: now,
      current_stage: 2,
    });
    setCompleting(false);
    if (ok) toast.success("Stage 1 complete — onto report delivery");
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-6 flex justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Stage 1 — Information capture & kick-off</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Run the discovery meeting, work through the action checklist, then mark Stage 1 complete.
        </p>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3 sm:items-end p-4 border rounded-md bg-muted/20">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kick-off meeting</Label>
          <Input
            type="datetime-local"
            value={kickoffDraft}
            onChange={e => setKickoffDraft(e.target.value)}
            onBlur={handleKickoffBlur}
            disabled={kickoffSaving}
            className="max-w-xs"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <Checkbox
            checked={onboarding.kickoff_held}
            onCheckedChange={checked => handleKickoffHeldChange(Boolean(checked))}
            disabled={!onboarding.kickoff_meeting_at}
          />
          <span className="text-sm">Meeting held</span>
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Action checklist ({actions.filter(a => a.status === "done" || a.status === "na").length} / {actions.length})</h3>
          {!adhocOpen && (
            <Button variant="outline" size="sm" onClick={() => setAdhocOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Ad-hoc action
            </Button>
          )}
        </div>

        {adhocOpen && (
          <div className="border rounded-md p-3 mb-3 bg-muted/20 flex gap-2">
            <Input
              value={adhocName}
              onChange={e => setAdhocName(e.target.value)}
              placeholder="Ad-hoc action name"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") handleAddAdhoc();
                if (e.key === "Escape") { setAdhocOpen(false); setAdhocName(""); }
              }}
            />
            <Button onClick={handleAddAdhoc} disabled={adhocSaving || !adhocName.trim()}>
              {adhocSaving ? "Adding..." : "Add"}
            </Button>
            <Button variant="ghost" onClick={() => { setAdhocOpen(false); setAdhocName(""); }}>
              Cancel
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {actions.map(a => (
            <OnboardingActionRow
              key={a.id}
              action={a}
              onChange={patch => updateAction(a.id, patch)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button onClick={completeStage1} disabled={!canComplete || completing}>
          <CheckCheck className="w-4 h-4 mr-1.5" />
          {completing ? "Completing..." : "Complete Stage 1"}
        </Button>
      </div>
      {!canComplete && (
        <p className="text-xs text-muted-foreground text-right -mt-3">
          {!onboarding.kickoff_meeting_at && "Set the kick-off date. "}
          {onboarding.kickoff_meeting_at && !onboarding.kickoff_held && "Mark the meeting as held. "}
          {!allResolved && actions.length > 0 && "Resolve every action (done or n/a). "}
          {actions.length === 0 && "No actions in checklist."}
        </p>
      )}
    </div>
  );
}
