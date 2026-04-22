import { useState } from "react";
import { CheckCircle2, FilePlus, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OnboardingFormSheet from "@/components/OnboardingFormSheet";
import type {
  FormSchema,
  OnboardingActionInstance,
  OnboardingActionStatus,
} from "@/types/onboarding";

interface ActionWithLibrary extends OnboardingActionInstance {
  library: {
    name: string;
    description: string;
    form_schema: FormSchema | null;
  } | null;
}

interface Props {
  action: ActionWithLibrary;
  onChange: (patch: Partial<OnboardingActionInstance>) => Promise<void>;
}

const STATUS_OPTIONS: { value: OnboardingActionStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "na", label: "N/A" },
];

const STATUS_BADGE_VARIANT: Record<OnboardingActionStatus, "default" | "secondary" | "outline"> = {
  pending: "outline",
  in_progress: "secondary",
  done: "default",
  na: "outline",
};

export default function OnboardingActionRow({ action, onChange }: Props) {
  const [notesDraft, setNotesDraft] = useState(action.notes ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);

  const displayName = action.library?.name ?? action.name_override ?? "(unnamed)";
  const description = action.library?.description ?? "";
  const schema = action.library?.form_schema ?? null;
  const hasFormData = action.form_data !== null && action.form_data !== undefined && Object.keys(action.form_data).length > 0;

  const handleStatusChange = async (next: OnboardingActionStatus) => {
    const completionPatch =
      next === "done" || next === "na"
        ? { completed_at: new Date().toISOString() }
        : { completed_at: null };
    await onChange({ status: next, ...completionPatch });
  };

  const handleNotesBlur = async () => {
    if (notesDraft === (action.notes ?? "")) return;
    await onChange({ notes: notesDraft });
  };

  const isResolved = action.status === "done" || action.status === "na";

  return (
    <div className={`border rounded-md p-4 space-y-3 ${isResolved ? "bg-muted/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isResolved && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
            <div className="font-medium text-sm">{displayName}</div>
            {action.action_library_id === null && (
              <Badge variant="outline" className="text-[10px]">ad-hoc</Badge>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <Select value={action.status} onValueChange={v => handleStatusChange(v as OnboardingActionStatus)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <Badge variant={STATUS_BADGE_VARIANT[opt.value]} className="text-[10px]">{opt.label}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Textarea
        value={notesDraft}
        onChange={e => setNotesDraft(e.target.value)}
        onBlur={handleNotesBlur}
        placeholder="Notes (saved when you click away)"
        rows={2}
        className="text-sm"
      />

      {schema && schema.fields.length > 0 && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
            {hasFormData ? <FileCheck2 className="w-3.5 h-3.5 mr-1.5" /> : <FilePlus className="w-3.5 h-3.5 mr-1.5" />}
            {hasFormData ? "Edit captured data" : "Capture data"}
          </Button>
          {hasFormData && <span className="text-xs text-muted-foreground">{Object.keys(action.form_data ?? {}).length} field{Object.keys(action.form_data ?? {}).length === 1 ? "" : "s"} captured</span>}
        </div>
      )}

      {schema && schema.fields.length > 0 && (
        <OnboardingFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          schema={schema}
          initial={action.form_data}
          actionName={displayName}
          onSave={async data => {
            await onChange({ form_data: data });
          }}
        />
      )}
    </div>
  );
}
