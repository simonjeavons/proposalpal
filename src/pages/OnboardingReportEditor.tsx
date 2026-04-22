import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowDown, ArrowUp, Eye, Plus, Send, Trash2, RefreshCcw, Copy } from "lucide-react";
import { toast } from "sonner";
import { BlobProvider, pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  cloneSectionsFromTemplates,
  type ActionForReport,
} from "@/lib/onboardingReport";
import { OnboardingReportPDF } from "@/components/OnboardingReportPDF";
import type {
  ClientOnboarding,
  OnboardingReport,
  OnboardingReportSection,
  OnboardingReportSectionTemplate,
} from "@/types/onboarding";

interface ServiceTypeRow {
  id: string;
  name: string;
}
interface AssigneeRow {
  full_name: string;
  email: string;
}

function makeToken(): string {
  // 64-bit random hex; matches the pattern used by the slug defaults in the schema.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function OnboardingReportEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [onboarding, setOnboarding] = useState<ClientOnboarding | null>(null);
  const [report, setReport] = useState<OnboardingReport | null>(null);
  const [sections, setSections] = useState<OnboardingReportSection[]>([]);
  const [serviceType, setServiceType] = useState<ServiceTypeRow | null>(null);
  const [assignee, setAssignee] = useState<AssigneeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      const { data: ob, error: obErr } = await supabase
        .from("client_onboardings").select("*").eq("id", id).single();
      if (obErr || !ob) {
        toast.error("Onboarding not found");
        setLoading(false);
        return;
      }
      if (cancelled) return;
      const onboardingRow = ob as ClientOnboarding;
      setOnboarding(onboardingRow);

      let serviceTypeRow: ServiceTypeRow | null = null;
      if (onboardingRow.service_type_id) {
        const { data: st } = await supabase
          .from("service_types").select("id, name")
          .eq("id", onboardingRow.service_type_id).single();
        if (st) serviceTypeRow = st as ServiceTypeRow;
      }
      if (cancelled) return;
      setServiceType(serviceTypeRow);

      if (onboardingRow.assigned_to_user_id) {
        const { data: prof } = await supabase
          .from("profiles").select("full_name, email")
          .eq("id", onboardingRow.assigned_to_user_id).single();
        if (cancelled) return;
        if (prof) setAssignee(prof as AssigneeRow);
      }

      // Load existing report
      const { data: existingReport } = await supabase
        .from("onboarding_reports").select("*")
        .eq("onboarding_id", onboardingRow.id).maybeSingle();
      if (cancelled) return;

      if (existingReport) {
        const r = existingReport as OnboardingReport;
        setReport(r);
        setSections(r.sections ?? []);
        setLoading(false);
        return;
      }

      // First open — clone sections from templates and create the report row
      if (!serviceTypeRow) {
        // Without a service type we have no template source. Start blank.
        const blank: OnboardingReportSection[] = [];
        const { data: created, error: createErr } = await supabase
          .from("onboarding_reports")
          .insert({ onboarding_id: onboardingRow.id, sections: blank })
          .select("*").single();
        if (cancelled) return;
        if (createErr) toast.error("Failed to create report: " + createErr.message);
        if (created) {
          setReport(created as OnboardingReport);
          setSections(blank);
        }
        setLoading(false);
        return;
      }

      const { data: templates } = await supabase
        .from("onboarding_report_section_templates")
        .select("*")
        .eq("service_type_id", serviceTypeRow.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      // Pull this onboarding's actions for the {{recommended_actions}} substitution
      const { data: actionsData } = await supabase
        .from("onboarding_action_instances")
        .select("status, notes, name_override, library:action_library_id (name)")
        .eq("onboarding_id", onboardingRow.id)
        .order("sort_order", { ascending: true });

      type ActionRow = {
        status: ActionForReport["status"];
        notes: string;
        name_override: string | null;
        library: { name: string } | null;
      };
      const actionsForReport: ActionForReport[] = ((actionsData ?? []) as ActionRow[]).map(a => ({
        status: a.status,
        name: a.library?.name ?? a.name_override ?? "(unnamed)",
        notes: a.notes,
      }));

      const cloned = cloneSectionsFromTemplates(
        (templates as OnboardingReportSectionTemplate[]) ?? [],
        actionsForReport,
      );

      const { data: created, error: createErr } = await supabase
        .from("onboarding_reports")
        .insert({ onboarding_id: onboardingRow.id, sections: cloned })
        .select("*").single();
      if (cancelled) return;
      if (createErr) {
        toast.error("Failed to create report: " + createErr.message);
      } else if (created) {
        setReport(created as OnboardingReport);
        setSections(cloned);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isLocked = Boolean(report?.sent_at);
  const reportDate = useMemo(() => new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  }), []);

  const persistSections = async (next: OnboardingReportSection[]) => {
    if (!report) return;
    setSaving(true);
    const { error } = await supabase
      .from("onboarding_reports")
      .update({ sections: next })
      .eq("id", report.id);
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    setReport(prev => prev ? { ...prev, sections: next } : prev);
  };

  const updateSection = (idx: number, patch: Partial<OnboardingReportSection>) => {
    setSections(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const next = sections.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setSections(next);
    void persistSections(next);
  };

  const removeSection = (idx: number) => {
    const next = sections.filter((_, i) => i !== idx);
    setSections(next);
    void persistSections(next);
  };

  const addSection = () => {
    const next = [...sections, { heading: "New section", body: "" }];
    setSections(next);
    void persistSections(next);
  };

  const handleSectionBlur = async (idx: number) => {
    if (!report) return;
    if (JSON.stringify(sections[idx]) === JSON.stringify(report.sections[idx])) return;
    await persistSections(sections);
  };

  const handleSend = async () => {
    if (!onboarding || !report) return;
    setSending(true);
    try {
      // Persist any in-flight section edits first
      await persistSections(sections);

      const view_token = report.view_token ?? makeToken();
      const signoff_token = report.signoff_token ?? makeToken();
      const now = new Date().toISOString();

      const { error: updErr } = await supabase
        .from("onboarding_reports")
        .update({ view_token, signoff_token, sent_at: now })
        .eq("id", report.id);
      if (updErr) throw new Error(updErr.message);

      const { error: obErr } = await supabase
        .from("client_onboardings")
        .update({ stage2_completed_at: now, current_stage: 3 })
        .eq("id", onboarding.id);
      if (obErr) throw new Error(obErr.message);

      setReport(prev => prev ? { ...prev, view_token, signoff_token, sent_at: now } : prev);
      setOnboarding(prev => prev ? { ...prev, current_stage: 3, stage2_completed_at: now } : prev);
      setConfirmSend(false);
      toast.success("Link generated — copy it below to send to the client");
    } catch (err) {
      toast.error("Send failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSending(false);
    }
  };

  const handleReviseAndResend = async () => {
    if (!report) return;
    const { error } = await supabase
      .from("onboarding_reports")
      .update({ version: (report.version ?? 1) + 1, sent_at: null, viewed_at: null, last_view_email_at: null })
      .eq("id", report.id);
    if (error) {
      toast.error("Revise failed: " + error.message);
      return;
    }
    setReport(prev => prev ? { ...prev, version: (prev.version ?? 1) + 1, sent_at: null, viewed_at: null, last_view_email_at: null } : prev);
    toast.success("Editor unlocked — make your changes and Send again to re-deliver");
  };

  const downloadPdf = async () => {
    if (!onboarding) return;
    const blob = await pdf(
      <OnboardingReportPDF
        organisation={onboarding.organisation || onboarding.client_name || "(Unknown)"}
        serviceTypeName={serviceType?.name ?? ""}
        contactName={onboarding.contact_name}
        preparedBy={assignee?.full_name ?? "Shoothill"}
        reportDate={reportDate}
        sections={sections}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Onboarding-Report-${(onboarding.organisation || "client").replace(/\W+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboarding || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Onboarding or report not found.</div>
      </div>
    );
  }

  const viewUrl = report.view_token
    ? `${window.location.origin}/onboarding/report/${report.view_token}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link to={`/onboarding/${onboarding.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to onboarding
          </Link>
          <div className="flex items-center gap-2">
            {isLocked ? <Badge>Sent</Badge> : <Badge variant="secondary">Draft</Badge>}
            <Badge variant="outline">v{report.version}</Badge>
          </div>
        </div>

        <div className="border rounded-lg p-6 space-y-1">
          <h1 className="text-2xl font-semibold">Onboarding Report</h1>
          <div className="text-sm text-muted-foreground">
            {onboarding.organisation || onboarding.client_name}
            {serviceType && ` · ${serviceType.name}`}
          </div>
        </div>

        {isLocked && viewUrl && (
          <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/30 space-y-3">
            <div>
              <h2 className="font-semibold text-sm">Shareable link ready</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send the link below to the client however you like (email, Teams, etc).
                They'll be able to review the report and click Accept at the bottom — you'll get an
                email when they do.
                {report.sent_at && ` · Generated ${new Date(report.sent_at).toLocaleString("en-GB")}`}
                {report.viewed_at && ` · Viewed ${new Date(report.viewed_at).toLocaleString("en-GB")}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={viewUrl} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard.writeText(viewUrl);
                toast.success("Copied");
              }}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={viewUrl} target="_blank" rel="noreferrer">
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Open
                </a>
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={handleReviseAndResend}>
              <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Revise &amp; regenerate
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {sections.map((section, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Input
                  value={section.heading}
                  onChange={e => updateSection(idx, { heading: e.target.value })}
                  onBlur={() => handleSectionBlur(idx)}
                  disabled={isLocked}
                  className="font-semibold text-base"
                />
                <div className="flex flex-shrink-0 gap-1">
                  <Button size="icon" variant="ghost" disabled={isLocked || idx === 0} onClick={() => moveSection(idx, -1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={isLocked || idx === sections.length - 1} onClick={() => moveSection(idx, 1)}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={isLocked} onClick={() => removeSection(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Body</Label>
                <Textarea
                  value={section.body}
                  onChange={e => updateSection(idx, { body: e.target.value })}
                  onBlur={() => handleSectionBlur(idx)}
                  disabled={isLocked}
                  rows={Math.max(4, section.body.split("\n").length + 1)}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">Supports **bold** and lines starting with "- " for bullets.</p>
              </div>
            </div>
          ))}
        </div>

        {!isLocked && (
          <Button variant="outline" onClick={addSection}>
            <Plus className="w-4 h-4 mr-1.5" /> Add section
          </Button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {saving ? "Saving..." : "Auto-saves on blur"}
          </div>
          <div className="flex flex-wrap gap-2">
            <BlobProvider document={
              <OnboardingReportPDF
                organisation={onboarding.organisation || onboarding.client_name || "(Unknown)"}
                serviceTypeName={serviceType?.name ?? ""}
                contactName={onboarding.contact_name}
                preparedBy={assignee?.full_name ?? "Shoothill"}
                reportDate={reportDate}
                sections={sections}
              />
            }>
              {({ url, loading: pdfLoading }) => (
                <Button variant="outline" disabled={pdfLoading || !url} asChild={!!url}>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      <Eye className="w-4 h-4 mr-1.5" /> Preview PDF
                    </a>
                  ) : (
                    <span><Eye className="w-4 h-4 mr-1.5" /> Preparing PDF…</span>
                  )}
                </Button>
              )}
            </BlobProvider>
            <Button variant="outline" onClick={downloadPdf}>
              Download PDF
            </Button>
            {!isLocked && (
              <Button onClick={() => setConfirmSend(true)} disabled={sections.length === 0}>
                <Send className="w-4 h-4 mr-1.5" /> Generate share link
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate a shareable link?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a tokenised link you can send to the client yourself (no automatic email).
              When they open it and click Accept at the bottom, you'll get an email confirming
              onboarding complete. The editor locks after generating — use "Revise &amp; regenerate"
              if you need to update it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending}>
              {sending ? "Generating..." : "Generate link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
