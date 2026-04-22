import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Settings2, AlertTriangle, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import OnboardingCreateDialog from "@/components/OnboardingCreateDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isOverdueWorkingDays } from "@/lib/workingDays";
import type {
  ClientOnboarding,
  OnboardingActionInstance,
  OnboardingReport,
  OnboardingSettings,
} from "@/types/onboarding";

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

type StageFilter = "all" | "1" | "2" | "3" | "complete";
type AssigneeFilter = "all" | "me" | string;

function StageStepper({ stage, complete }: { stage: 1 | 2 | 3; complete: boolean }) {
  if (complete) {
    return <Badge className="bg-green-600 hover:bg-green-600">Complete</Badge>;
  }
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(n => {
        const isActive = stage === n;
        const isPast = n < stage;
        return (
          <div
            key={n}
            className={[
              "w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center",
              isActive ? "bg-primary text-primary-foreground" : "",
              isPast ? "bg-primary/30 text-primary-foreground" : "",
              !isActive && !isPast ? "bg-muted text-muted-foreground" : "",
            ].join(" ")}
          >
            {n}
          </div>
        );
      })}
    </div>
  );
}

interface RowComputed {
  onboarding: ClientOnboarding;
  serviceTypeName: string;
  assigneeName: string;
  outstandingCount: number;
  overdue: boolean;
  effectiveStageForFilter: "1" | "2" | "3" | "complete";
}

function computeOutstanding(
  ob: ClientOnboarding,
  report: OnboardingReport | undefined,
  actions: OnboardingActionInstance[],
): number {
  if (ob.status === "complete") return 0;
  if (ob.current_stage === 1) {
    const unresolved = actions.filter(a => a.status === "pending" || a.status === "in_progress").length;
    const kickoffPending = ob.kickoff_meeting_at ? 0 : 1;
    const heldPending = ob.kickoff_held ? 0 : 1;
    return unresolved + kickoffPending + heldPending;
  }
  if (ob.current_stage === 2) {
    return report?.sent_at ? 0 : 1;
  }
  if (ob.current_stage === 3) {
    return report?.signed_off_at ? 0 : 1;
  }
  return 0;
}

function computeOverdue(
  ob: ClientOnboarding,
  report: OnboardingReport | undefined,
  settings: OnboardingSettings,
  now: Date,
): boolean {
  if (ob.status !== "active") return false;
  if (ob.current_stage === 1) {
    const startStr = ob.configured_at ?? ob.triggered_at;
    if (ob.stage1_completed_at) return false;
    return isOverdueWorkingDays(new Date(startStr), settings.reminder_stage1_days, now);
  }
  if (ob.current_stage === 2) {
    if (!ob.stage1_completed_at) return false;
    if (report?.sent_at) return false;
    return isOverdueWorkingDays(new Date(ob.stage1_completed_at), settings.reminder_stage2_days, now);
  }
  if (ob.current_stage === 3) {
    if (!report?.sent_at) return false;
    if (report?.signed_off_at) return false;
    return isOverdueWorkingDays(new Date(report.sent_at), settings.reminder_stage3_days, now);
  }
  return false;
}

export default function OnboardingActiveDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const myUserId = session?.user.id ?? null;

  const [rows, setRows] = useState<ClientOnboarding[]>([]);
  const [reports, setReports] = useState<OnboardingReport[]>([]);
  const [actions, setActions] = useState<OnboardingActionInstance[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [assignees, setAssignees] = useState<ProfileRow[]>([]);
  const [settings, setSettings] = useState<OnboardingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [obRes, stRes, sRes] = await Promise.all([
        supabase
          .from("client_onboardings")
          .select("*")
          .is("archived_at", null)
          .order("triggered_at", { ascending: false }),
        supabase.from("service_types").select("id, name, sort_order").order("sort_order"),
        supabase.from("onboarding_settings").select("*").eq("id", 1).single(),
      ]);
      if (cancelled) return;

      const obRows = (obRes.data ?? []) as ClientOnboarding[];
      const obIds = obRows.map(o => o.id);

      const [reportsRes, actionsRes, profileIdsToFetch] = await Promise.all([
        obIds.length > 0
          ? supabase.from("onboarding_reports").select("*").in("onboarding_id", obIds)
          : Promise.resolve({ data: [] as OnboardingReport[] }),
        obIds.length > 0
          ? supabase.from("onboarding_action_instances").select("*").in("onboarding_id", obIds)
          : Promise.resolve({ data: [] as OnboardingActionInstance[] }),
        Promise.resolve(Array.from(new Set(obRows.map(o => o.assigned_to_user_id).filter(Boolean) as string[]))),
      ]);

      const profilesRes = profileIdsToFetch.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIdsToFetch)
        : { data: [] as ProfileRow[] };

      if (cancelled) return;
      setRows(obRows);
      setReports((reportsRes.data ?? []) as OnboardingReport[]);
      setActions((actionsRes.data ?? []) as OnboardingActionInstance[]);
      setServiceTypes((stRes.data ?? []) as ServiceTypeRow[]);
      setAssignees((profilesRes.data ?? []) as ProfileRow[]);
      setSettings(sRes.data as OnboardingSettings | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const computed: RowComputed[] = useMemo(() => {
    if (!settings) return [];
    const now = new Date();
    const reportByObId = new Map(reports.map(r => [r.onboarding_id, r]));
    const actionsByObId = new Map<string, OnboardingActionInstance[]>();
    for (const a of actions) {
      const arr = actionsByObId.get(a.onboarding_id) ?? [];
      arr.push(a);
      actionsByObId.set(a.onboarding_id, arr);
    }
    const stByName: Record<string, string> = {};
    for (const t of serviceTypes) stByName[t.id] = t.name;
    const profById: Record<string, ProfileRow> = {};
    for (const p of assignees) profById[p.id] = p;

    return rows
      .filter(o => o.status !== "draft") // drafts are in their own callout
      .map(o => {
        const report = reportByObId.get(o.id);
        const obActions = actionsByObId.get(o.id) ?? [];
        const outstandingCount = computeOutstanding(o, report, obActions);
        const overdue = computeOverdue(o, report, settings, now);
        const stageKey: "1" | "2" | "3" | "complete" =
          o.status === "complete" ? "complete" : (String(o.current_stage) as "1" | "2" | "3");
        return {
          onboarding: o,
          serviceTypeName: o.service_type_id ? stByName[o.service_type_id] ?? "" : "",
          assigneeName: o.assigned_to_user_id ? (profById[o.assigned_to_user_id]?.full_name ?? profById[o.assigned_to_user_id]?.email ?? "—") : "—",
          outstandingCount,
          overdue,
          effectiveStageForFilter: stageKey,
        };
      });
  }, [rows, reports, actions, settings, serviceTypes, assignees]);

  const drafts = rows.filter(r => r.status === "draft");

  const filtered = useMemo(() => {
    return computed
      .filter(r => {
        if (!showCompleted && r.onboarding.status === "complete") return false;
        if (stageFilter !== "all" && r.effectiveStageForFilter !== stageFilter) return false;
        if (assigneeFilter === "me" && r.onboarding.assigned_to_user_id !== myUserId) return false;
        if (assigneeFilter !== "all" && assigneeFilter !== "me" && r.onboarding.assigned_to_user_id !== assigneeFilter) return false;
        if (serviceTypeFilter !== "all" && r.onboarding.service_type_id !== serviceTypeFilter) return false;
        if (overdueOnly && !r.overdue) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const haystack = `${r.onboarding.organisation} ${r.onboarding.client_name} ${r.serviceTypeName} ${r.assigneeName}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        return new Date(b.onboarding.triggered_at).getTime() - new Date(a.onboarding.triggered_at).getTime();
      });
  }, [computed, showCompleted, stageFilter, assigneeFilter, serviceTypeFilter, search, overdueOnly, myUserId]);

  const summary = useMemo(() => {
    const active = computed.filter(r => r.onboarding.status === "active");
    const overdueCount = active.filter(r => r.overdue).length;
    const byStage = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
    for (const r of active) {
      const s = r.onboarding.current_stage;
      if (s === 1 || s === 2 || s === 3) byStage[s] += 1;
    }
    return { active: active.length, overdue: overdueCount, byStage };
  }, [computed]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track new clients through Information capture, Report delivery, and Sign-off.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Create onboarding
        </Button>
      </div>

      <OnboardingCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setReloadKey(k => k + 1)}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Active" value={summary.active} />
        <SummaryCard label="Overdue" value={summary.overdue} alert={summary.overdue > 0} />
        <SummaryCard label="Stage 1" value={summary.byStage[1]} />
        <SummaryCard label="Stage 2" value={summary.byStage[2]} />
        <SummaryCard label="Stage 3" value={summary.byStage[3]} />
      </div>

      {drafts.length > 0 && (
        <div className="border rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <h2 className="font-semibold text-sm">
              {drafts.length} onboarding{drafts.length === 1 ? "" : "s"} awaiting configuration
            </h2>
          </div>
          <div className="space-y-2">
            {drafts.map(d => (
              <button
                key={d.id}
                onClick={() => navigate(`/onboarding/${d.id}`)}
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-background rounded-md border text-left hover:border-primary transition-colors"
              >
                <div>
                  <div className="font-medium text-sm">
                    {d.organisation || d.client_name || "(Unknown)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.source_type === "proposal" ? "Proposal" : "Ad-hoc"} signed {new Date(d.triggered_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Configure <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Client, organisation, assignee…"
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stage</Label>
          <Select value={stageFilter} onValueChange={v => setStageFilter(v as StageFilter)}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">Stage 1</SelectItem>
              <SelectItem value="2">Stage 2</SelectItem>
              <SelectItem value="3">Stage 3</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Assignee</Label>
          <Select value={assigneeFilter} onValueChange={v => setAssigneeFilter(v)}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="me">Me</SelectItem>
              {assignees.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Service</Label>
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {serviceTypes.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
          <span className="text-xs">Show completed</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <Switch checked={overdueOnly} onCheckedChange={setOverdueOnly} />
          <span className="text-xs">Overdue only</span>
        </label>
      </div>

      <section>
        {filtered.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
            {rows.filter(r => r.status !== "draft").length === 0
              ? "No active onboardings yet. New ones appear here automatically when a contract is signed."
              : "No onboardings match the current filters."}
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {filtered.map(r => (
              <button
                key={r.onboarding.id}
                onClick={() => navigate(`/onboarding/${r.onboarding.id}`)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {r.overdue && (
                      <span title="Overdue" className="flex items-center text-destructive">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <div className="font-medium truncate">
                      {r.onboarding.organisation || r.onboarding.client_name || "(Unknown)"}
                    </div>
                    {r.serviceTypeName && (
                      <Badge variant="outline" className="text-[10px]">{r.serviceTypeName}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Triggered {new Date(r.onboarding.triggered_at).toLocaleDateString("en-GB")}</span>
                    <span>{r.assigneeName}</span>
                    {r.outstandingCount > 0 && (
                      <span>{r.outstandingCount} outstanding</span>
                    )}
                  </div>
                </div>
                <StageStepper
                  stage={r.onboarding.current_stage}
                  complete={r.onboarding.status === "complete"}
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`border rounded-lg p-4 ${alert ? "border-destructive bg-destructive/5" : ""}`}>
      <div className={`text-2xl font-semibold ${alert ? "text-destructive" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
