import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import OnboardingFormSchemaEditor from "@/components/OnboardingFormSchemaEditor";
import type {
  FormSchema,
  OnboardingActionLibraryItem,
} from "@/types/onboarding";

interface ServiceTypeRow {
  id: string;
  name: string;
  sort_order: number;
}

export default function OnboardingActionLibraryAdmin() {
  const [items, setItems] = useState<OnboardingActionLibraryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaSheet, setSchemaSheet] = useState<{ id: string; schema: FormSchema; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const reload = async () => {
    const [{ data: libData }, { data: stData }] = await Promise.all([
      supabase.from("onboarding_action_library").select("*").order("sort_order"),
      supabase.from("service_types").select("id, name, sort_order").order("sort_order"),
    ]);
    setItems((libData ?? []) as OnboardingActionLibraryItem[]);
    setServiceTypes((stData ?? []) as ServiceTypeRow[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void reload();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, OnboardingActionLibraryItem[]>();
    for (const it of items) {
      const arr = map.get(it.service_type_id) ?? [];
      arr.push(it);
      map.set(it.service_type_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [items]);

  const updateItem = async (id: string, patch: Partial<OnboardingActionLibraryItem>) => {
    const { error } = await supabase.from("onboarding_action_library").update(patch).eq("id", id);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } as OnboardingActionLibraryItem : it)));
  };

  const addItem = async (serviceTypeId: string) => {
    const existing = grouped.get(serviceTypeId) ?? [];
    const maxSort = existing.reduce((m, it) => Math.max(m, it.sort_order), 0);
    const { data, error } = await supabase
      .from("onboarding_action_library")
      .insert({
        service_type_id: serviceTypeId,
        name: "New action",
        description: "",
        sort_order: maxSort + 10,
      })
      .select("*").single();
    if (error || !data) {
      toast.error("Add failed: " + (error?.message ?? "unknown"));
      return;
    }
    setItems(prev => [...prev, data as OnboardingActionLibraryItem]);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("onboarding_action_library").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed: " + error.message);
      return;
    }
    setItems(prev => prev.filter(it => it.id !== id));
    setConfirmDelete(null);
    toast.success("Deleted");
  };

  const openSchemaEditor = (item: OnboardingActionLibraryItem) => {
    setSchemaSheet({
      id: item.id,
      schema: item.form_schema ?? { fields: [] },
      name: item.name,
    });
  };

  const saveSchema = async (schema: FormSchema) => {
    if (!schemaSheet) return;
    const value = schema.fields.length === 0 ? null : schema;
    await updateItem(schemaSheet.id, { form_schema: value });
    toast.success("Form schema saved");
    setSchemaSheet(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-semibold">Action library</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the actions that get pre-populated for new onboardings, grouped by service type.
          Toggle a structured form on for actions where you want to capture specific data.
        </p>
      </div>

      <Accordion type="multiple" defaultValue={serviceTypes.map(s => s.id)} className="space-y-2">
        {serviceTypes.map(st => {
          const stItems = grouped.get(st.id) ?? [];
          return (
            <AccordionItem key={st.id} value={st.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{st.name}</span>
                  <Badge variant="outline" className="text-xs">{stItems.length} action{stItems.length === 1 ? "" : "s"}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-2">
                {stItems.map(item => (
                  <ActionRow
                    key={item.id}
                    item={item}
                    onChange={patch => updateItem(item.id, patch)}
                    onEditSchema={() => openSchemaEditor(item)}
                    onDelete={() => setConfirmDelete({ id: item.id, name: item.name })}
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => addItem(st.id)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add action
                </Button>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Sheet open={schemaSheet !== null} onOpenChange={open => { if (!open) setSchemaSheet(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {schemaSheet && (
            <>
              <SheetHeader>
                <SheetTitle>Form schema — {schemaSheet.name}</SheetTitle>
                <SheetDescription>
                  Define the structured fields captured when the team marks this action.
                  Save with no fields to convert back to a checklist-only action.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <OnboardingFormSchemaEditor
                  schema={schemaSheet.schema}
                  onChange={schema => setSchemaSheet({ ...schemaSheet, schema })}
                />
              </div>
              <SheetFooter className="gap-2">
                <Button variant="outline" onClick={() => setSchemaSheet(null)}>Cancel</Button>
                <Button onClick={() => saveSchema(schemaSheet.schema)}>Save schema</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete !== null} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this action?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be removed from the library. Existing onboardings keep their action instances —
              this only stops new onboardings from including it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && deleteItem(confirmDelete.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionRow({
  item,
  onChange,
  onEditSchema,
  onDelete,
}: {
  item: OnboardingActionLibraryItem;
  onChange: (patch: Partial<OnboardingActionLibraryItem>) => Promise<void>;
  onEditSchema: () => void;
  onDelete: () => void;
}) {
  const fieldCount = item.form_schema?.fields?.length ?? 0;
  return (
    <div className={`border rounded-md p-3 space-y-2 ${item.is_active ? "" : "opacity-60"}`}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_auto] gap-2 items-start">
        <div className="space-y-2">
          <Input
            defaultValue={item.name}
            onBlur={e => { if (e.target.value !== item.name) void onChange({ name: e.target.value }); }}
            placeholder="Action name"
            className="font-medium"
          />
          <Textarea
            defaultValue={item.description}
            onBlur={e => { if (e.target.value !== item.description) void onChange({ description: e.target.value }); }}
            placeholder="Description"
            rows={1}
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sort</Label>
          <Input
            type="number"
            defaultValue={item.sort_order}
            onBlur={e => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n) && n !== item.sort_order) void onChange({ sort_order: n });
            }}
            className="h-9 text-xs"
          />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Switch checked={item.is_active} onCheckedChange={v => void onChange({ is_active: v })} />
            Active
          </label>
          <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {fieldCount > 0 ? (
            <Badge variant="secondary" className="text-[10px]">Form: {fieldCount} field{fieldCount === 1 ? "" : "s"}</Badge>
          ) : (
            <span>Checklist-only</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onEditSchema}>
          <FileEdit className="w-3.5 h-3.5 mr-1" />
          {fieldCount > 0 ? "Edit form" : "Add form"}
        </Button>
      </div>
    </div>
  );
}
