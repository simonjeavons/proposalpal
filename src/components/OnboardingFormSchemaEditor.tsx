import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormField, FormFieldType, FormSchema } from "@/types/onboarding";

const TYPE_OPTIONS: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
];

interface Props {
  schema: FormSchema;
  onChange: (next: FormSchema) => void;
}

export default function OnboardingFormSchemaEditor({ schema, onChange }: Props) {
  const updateField = (idx: number, patch: Partial<FormField>) => {
    onChange({
      fields: schema.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    });
  };

  const removeField = (idx: number) => {
    onChange({ fields: schema.fields.filter((_, i) => i !== idx) });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= schema.fields.length) return;
    const next = schema.fields.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ fields: next });
  };

  const addField = () => {
    onChange({
      fields: [
        ...schema.fields,
        { key: `field_${schema.fields.length + 1}`, label: "New field", type: "text" },
      ],
    });
  };

  return (
    <div className="space-y-3">
      {schema.fields.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No fields yet. Add one to start collecting structured data for this action.
        </p>
      )}
      {schema.fields.map((field, idx) => (
        <div key={idx} className="border rounded-md p-3 space-y-3 bg-muted/20">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-mono text-muted-foreground">#{idx + 1}</div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0} onClick={() => moveField(idx, -1)}>
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === schema.fields.length - 1} onClick={() => moveField(idx, 1)}>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeField(idx)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Key</Label>
              <Input
                value={field.key}
                onChange={e => updateField(idx, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={field.label}
                onChange={e => updateField(idx, { label: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={field.type} onValueChange={v => updateField(idx, { type: v as FormFieldType })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer self-end pb-1.5">
              <Checkbox
                checked={Boolean(field.required)}
                onCheckedChange={checked => updateField(idx, { required: Boolean(checked) })}
              />
              <span className="text-xs">Required</span>
            </label>
          </div>
          {field.type === "select" && (
            <div className="space-y-1">
              <Label className="text-xs">Options (one per line)</Label>
              <textarea
                value={(field.options ?? []).join("\n")}
                onChange={e => updateField(idx, {
                  options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean),
                })}
                rows={3}
                className="w-full text-xs font-mono p-2 border rounded-md bg-background"
              />
            </div>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addField}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add field
      </Button>
    </div>
  );
}
