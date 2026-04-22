import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { OnboardingReportSectionTemplate } from "@/types/onboarding";

interface ServiceTypeRow {
  id: string;
  name: string;
  sort_order: number;
}

export default function OnboardingSectionTemplatesAdmin() {
  const [items, setItems] = useState<OnboardingReportSectionTemplate[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; heading: string } | null>(null);

  const reload = async () => {
    const [{ data: tplData }, { data: stData }] = await Promise.all([
      supabase.from("onboarding_report_section_templates").select("*").order("sort_order"),
      supabase.from("service_types").select("id, name, sort_order").order("sort_order"),
    ]);
    setItems((tplData ?? []) as OnboardingReportSectionTemplate[]);
    setServiceTypes((stData ?? []) as ServiceTypeRow[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void reload();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, OnboardingReportSectionTemplate[]>();
    for (const it of items) {
      const arr = map.get(it.service_type_id) ?? [];
      arr.push(it);
      map.set(it.service_type_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [items]);

  const updateItem = async (id: string, patch: Partial<OnboardingReportSectionTemplate>) => {
    const { error } = await supabase.from("onboarding_report_section_templates").update(patch).eq("id", id);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } as OnboardingReportSectionTemplate : it)));
  };

  const addItem = async (serviceTypeId: string) => {
    const existing = grouped.get(serviceTypeId) ?? [];
    const maxSort = existing.reduce((m, it) => Math.max(m, it.sort_order), 0);
    const { data, error } = await supabase
      .from("onboarding_report_section_templates")
      .insert({
        service_type_id: serviceTypeId,
        heading: "New section",
        body_template: "",
        sort_order: maxSort + 10,
      })
      .select("*").single();
    if (error || !data) {
      toast.error("Add failed: " + (error?.message ?? "unknown"));
      return;
    }
    setItems(prev => [...prev, data as OnboardingReportSectionTemplate]);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("onboarding_report_section_templates").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed: " + error.message);
      return;
    }
    setItems(prev => prev.filter(it => it.id !== id));
    setConfirmDelete(null);
    toast.success("Deleted");
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
        <h2 className="text-xl font-semibold">Report section templates</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Default sections cloned into new onboarding reports. Use{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{recommended_actions}}"}</code>{" "}
          in the body to substitute the formatted action checklist at clone time.
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
                  <Badge variant="outline" className="text-xs">{stItems.length} section{stItems.length === 1 ? "" : "s"}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-2">
                {stItems.map(item => (
                  <SectionRow
                    key={item.id}
                    item={item}
                    onChange={patch => updateItem(item.id, patch)}
                    onDelete={() => setConfirmDelete({ id: item.id, heading: item.heading })}
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => addItem(st.id)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add section
                </Button>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <AlertDialog open={confirmDelete !== null} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this section template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.heading}" will be removed. Existing reports keep their sections —
              this only stops new reports from including it.
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

function SectionRow({
  item,
  onChange,
  onDelete,
}: {
  item: OnboardingReportSectionTemplate;
  onChange: (patch: Partial<OnboardingReportSectionTemplate>) => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <div className={`border rounded-md p-3 space-y-2 ${item.is_active ? "" : "opacity-60"}`}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_auto] gap-2 items-start">
        <Input
          defaultValue={item.heading}
          onBlur={e => { if (e.target.value !== item.heading) void onChange({ heading: e.target.value }); }}
          placeholder="Section heading"
          className="font-medium"
        />
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
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Body template</Label>
        <Textarea
          defaultValue={item.body_template}
          onBlur={e => { if (e.target.value !== item.body_template) void onChange({ body_template: e.target.value }); }}
          rows={3}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}
