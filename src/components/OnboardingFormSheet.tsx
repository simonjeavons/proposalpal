import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormSchema, FormField } from "@/types/onboarding";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: FormSchema;
  initial: Record<string, unknown> | null;
  actionName: string;
  onSave: (data: Record<string, unknown>) => Promise<void> | void;
}

export default function OnboardingFormSheet({
  open,
  onOpenChange,
  schema,
  initial,
  actionName,
  onSave,
}: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(initial ?? {});
      setErrors({});
    }
  }, [open, initial]);

  const setField = (key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    for (const field of schema.fields) {
      if (!field.required) continue;
      const v = values[field.key];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) next[field.key] = "Required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{actionName}</SheetTitle>
          <SheetDescription>Capture structured data for this action.</SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-4">
          {schema.fields.map(field => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={v => setField(field.key, v)}
              error={errors[field.key]}
            />
          ))}
        </div>
        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const labelEl = (
    <Label className="text-sm">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </Label>
  );

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Textarea
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            rows={4}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
    case "number":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            type="number"
            value={value === undefined || value === null ? "" : String(value)}
            onChange={e => {
              const raw = e.target.value;
              onChange(raw === "" ? null : Number(raw));
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
    case "date":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value || null)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Select
            value={(value as string) ?? ""}
            onValueChange={v => onChange(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
    case "checkbox":
      return (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={checked => onChange(Boolean(checked))}
            />
            <span className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </span>
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
    default:
      return null;
  }
}
