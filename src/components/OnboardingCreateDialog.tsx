import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OnboardingActionLibraryItem, OnboardingSourceType } from "@/types/onboarding";

interface ContractRow {
  id: string;
  organisation: string;
  client_name: string;
  contact_name: string | null;
  contact_email: string | null;
  prepared_by_user_id: string | null;
  source_type: OnboardingSourceType;
  triggered_at: string;
}

interface ServiceTypeRow {
  id: string;
  name: string;
  sort_order: number;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function OnboardingCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const myUserId = session?.user.id ?? null;

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [sourceFilter, setSourceFilter] = useState<OnboardingSourceType | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSourceFilter("all");
      setSearch("");
      setSelectedContractId(null);
      setSelectedServiceIds(new Set());
      setAssigneeId(myUserId);
      void loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    const [proposalsRes, adhocRes, stRes, profRes] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, organisation, client_name, contact_name, contact_email, prepared_by_user_id, created_at")
        .order("created_at", { ascending: false }).limit(100),
      supabase
        .from("adhoc_contracts")
        .select("id, organisation, client_name, contact_name, contact_email, prepared_by_user_id, created_at")
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("service_types").select("id, name, sort_order").order("sort_order"),
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
    ]);

    const fromProposals: ContractRow[] = (proposalsRes.data ?? []).map(p => ({
      ...(p as any),
      source_type: "proposal" as const,
      triggered_at: (p as any).created_at,
    }));
    const fromAdhoc: ContractRow[] = (adhocRes.data ?? []).map(a => ({
      ...(a as any),
      source_type: "adhoc" as const,
      triggered_at: (a as any).created_at,
    }));
    setContracts([...fromProposals, ...fromAdhoc].sort((a, b) =>
      new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
    ));
    setServiceTypes((stRes.data ?? []) as ServiceTypeRow[]);
    setProfiles((profRes.data ?? []) as ProfileRow[]);
    setLoading(false);
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      if (sourceFilter !== "all" && c.source_type !== sourceFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${c.organisation} ${c.client_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).slice(0, 30);
  }, [contracts, sourceFilter, search]);

  const selectedContract = contracts.find(c => c.id === selectedContractId) ?? null;

  // When a contract is picked, default assignee to its prepared_by_user_id (if not yet set)
  useEffect(() => {
    if (selectedContract && !assigneeId) {
      setAssigneeId(selectedContract.prepared_by_user_id ?? myUserId);
    }
  }, [selectedContractId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const canSubmit = Boolean(selectedContract) && selectedServiceIds.size > 0;

  const handleCreate = async () => {
    if (!selectedContract || selectedServiceIds.size === 0) return;
    setCreating(true);
    try {
      const now = new Date().toISOString();
      const newIds: string[] = [];

      for (const serviceTypeId of selectedServiceIds) {
        const { data: created, error: insErr } = await supabase
          .from("client_onboardings")
          .insert({
            source_type: selectedContract.source_type,
            source_id: selectedContract.id,
            service_type_id: serviceTypeId,
            status: "active",
            current_stage: 1,
            assigned_to_user_id: assigneeId,
            client_name: selectedContract.client_name ?? "",
            organisation: selectedContract.organisation ?? "",
            contact_name: selectedContract.contact_name ?? "",
            contact_email: selectedContract.contact_email ?? "",
            triggered_at: now,
            configured_at: now,
          })
          .select("id").single();
        if (insErr || !created) throw new Error(insErr?.message ?? "Insert failed");
        const id = (created as { id: string }).id;
        newIds.push(id);

        const { data: libItems } = await supabase
          .from("onboarding_action_library")
          .select("id, sort_order")
          .eq("service_type_id", serviceTypeId)
          .eq("is_active", true)
          .order("sort_order");
        const items = (libItems as Pick<OnboardingActionLibraryItem, "id" | "sort_order">[] | null) ?? [];
        if (items.length > 0) {
          const instances = items.map(it => ({
            onboarding_id: id,
            action_library_id: it.id,
            status: "pending" as const,
            notes: "",
            sort_order: it.sort_order,
          }));
          const { error: instErr } = await supabase.from("onboarding_action_instances").insert(instances);
          if (instErr) throw new Error(instErr.message);
        }
      }

      toast.success(`Created ${newIds.length} onboarding${newIds.length === 1 ? "" : "s"}`);
      onOpenChange(false);
      onCreated?.();
      if (newIds.length === 1) {
        navigate(`/onboarding/${newIds[0]}`);
      }
    } catch (err) {
      toast.error("Create failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create onboarding manually</DialogTitle>
          <DialogDescription>
            Use this when the trigger missed a signed contract or you're back-filling.
            Pick a contract, the applicable service types, and the assignee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {/* Step 1: contract */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Step 1 — Source contract
            </Label>
            <RadioGroup
              value={sourceFilter}
              onValueChange={v => setSourceFilter(v as typeof sourceFilter)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <RadioGroupItem value="all" /> All
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <RadioGroupItem value="proposal" /> Proposals
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <RadioGroupItem value="adhoc" /> Ad-hoc
              </label>
            </RadioGroup>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by client or organisation"
                className="pl-8 h-9"
              />
            </div>
            <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
              {loading ? (
                <div className="p-3 text-xs text-muted-foreground">Loading…</div>
              ) : filteredContracts.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">No matching contracts.</div>
              ) : (
                filteredContracts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContractId(c.id)}
                    className={`w-full text-left p-2 text-sm flex items-center justify-between hover:bg-accent transition-colors ${
                      selectedContractId === c.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {c.organisation || c.client_name || "(Unknown)"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {c.source_type === "proposal" ? "Proposal" : "Ad-hoc"} · {new Date(c.triggered_at).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                    {selectedContractId === c.id && (
                      <span className="text-xs text-primary ml-2">Selected</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Step 2: service types */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Step 2 — Service types ({selectedServiceIds.size} selected)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {serviceTypes.map(st => (
                <label key={st.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent cursor-pointer">
                  <Checkbox
                    checked={selectedServiceIds.has(st.id)}
                    onCheckedChange={() => toggleService(st.id)}
                  />
                  <span className="text-sm">{st.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Step 3: assignee */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Step 3 — Assignee
            </Label>
            <Select value={assigneeId ?? ""} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Pick an assignee" /></SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name || p.email}{p.id === myUserId ? " (me)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit || creating}>
            {creating ? "Creating…" : `Create ${selectedServiceIds.size || ""} onboarding${selectedServiceIds.size === 1 ? "" : "s"}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
