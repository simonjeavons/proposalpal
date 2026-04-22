import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OnboardingReportPDF } from "@/components/OnboardingReportPDF";
import type {
  ClientOnboarding,
  OnboardingReport,
  OnboardingReportSection,
} from "@/types/onboarding";

type State =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "ready"; report: OnboardingReport; onboarding: ClientOnboarding; serviceTypeName: string };

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
}

function SectionBody({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      elements.push(
        <ul key={`b-${elements.length}`} className="list-disc pl-5 space-y-1 my-2">
          {items.map((it, idx) => <li key={idx}>{renderInline(it)}</li>)}
        </ul>
      );
      continue;
    }
    if (line.trim() === "") {
      elements.push(<div key={`s-${elements.length}`} className="h-2" />);
      i += 1;
      continue;
    }
    elements.push(
      <p key={`p-${elements.length}`} className="leading-relaxed my-2">
        {renderInline(line)}
      </p>
    );
    i += 1;
  }
  return <>{elements}</>;
}

export default function OnboardingReportView() {
  const { view_token: viewToken } = useParams<{ view_token: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [accepting, setAccepting] = useState(false);
  const reportDate = useMemo(() => new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  }), []);

  useEffect(() => {
    if (!viewToken) return;
    let cancelled = false;
    (async () => {
      const { data: report } = await supabase
        .from("onboarding_reports").select("*")
        .eq("view_token", viewToken).maybeSingle();
      if (cancelled) return;
      if (!report) {
        setState({ kind: "not-found" });
        return;
      }
      const r = report as OnboardingReport;
      const { data: ob } = await supabase
        .from("client_onboardings").select("*")
        .eq("id", r.onboarding_id).maybeSingle();
      if (cancelled) return;
      if (!ob) {
        setState({ kind: "not-found" });
        return;
      }
      const onboarding = ob as ClientOnboarding;
      let serviceTypeName = "";
      if (onboarding.service_type_id) {
        const { data: st } = await supabase
          .from("service_types").select("name")
          .eq("id", onboarding.service_type_id).maybeSingle();
        if (cancelled) return;
        serviceTypeName = (st as { name: string } | null)?.name ?? "";
      }
      setState({ kind: "ready", report: r, onboarding, serviceTypeName });

      // Fire-and-forget view tracking
      void fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "onboarding-report-viewed",
          reportId: r.id,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => { /* swallow */ });
    })();
    return () => { cancelled = true; };
  }, [viewToken]);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (state.kind === "not-found") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">This link is no longer valid</h1>
          <p className="text-muted-foreground text-sm">
            The report you're trying to view can't be found. The link may have expired or been revised.
          </p>
        </div>
      </div>
    );
  }

  const { report, onboarding, serviceTypeName } = state;
  const signedOff = Boolean(report.signed_off_at);

  const handleAccept = async () => {
    if (state.kind !== "ready" || !state.report.signoff_token) return;
    setAccepting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "onboarding-signed-off",
          signoffToken: state.report.signoff_token,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const { data: refreshed } = await supabase
        .from("onboarding_reports").select("*")
        .eq("id", state.report.id).single();
      const r = refreshed as OnboardingReport;
      setState({ ...state, report: r });
      toast.success("Thanks — onboarding confirmed");
    } catch (err) {
      toast.error("Accept failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAccepting(false);
    }
  };

  const downloadPdf = async () => {
    const blob = await pdf(
      <OnboardingReportPDF
        organisation={onboarding.organisation || onboarding.client_name || "(Unknown)"}
        serviceTypeName={serviceTypeName}
        contactName={onboarding.contact_name}
        preparedBy="Shoothill"
        reportDate={reportDate}
        sections={(report.sections ?? []) as OnboardingReportSection[]}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Onboarding-Report-${(onboarding.organisation || "client").replace(/\W+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Onboarding report from <strong>Shoothill</strong>
          </div>
          {signedOff && <Badge>Confirmed</Badge>}
        </div>

        <div className="border rounded-lg p-6 space-y-1">
          <h1 className="text-2xl font-semibold">Onboarding Report</h1>
          <div className="text-sm text-muted-foreground">
            For <strong>{onboarding.organisation || onboarding.client_name}</strong>
            {serviceTypeName && ` · ${serviceTypeName}`}
          </div>
        </div>

        <div className="space-y-6">
          {((report.sections ?? []) as OnboardingReportSection[]).map((s, i) => (
            <section key={i} className="space-y-1">
              <h2 className="text-lg font-semibold border-b pb-1.5">{s.heading}</h2>
              <div className="text-sm">
                <SectionBody body={s.body} />
              </div>
            </section>
          ))}
        </div>

        <div className="pt-6 border-t space-y-6">
          {!signedOff && report.signoff_token && (
            <div className="border rounded-lg p-5 bg-muted/20 space-y-3 text-center">
              <p className="text-sm">
                Happy with the onboarding? Click below to confirm — we'll be notified immediately
                and your account moves into ongoing monthly support.
              </p>
              <Button onClick={handleAccept} disabled={accepting} size="lg" className="w-full sm:w-auto">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {accepting ? "Confirming..." : "Accept — onboarding complete"}
              </Button>
            </div>
          )}

          {signedOff && (
            <div className="border rounded-lg p-5 bg-green-50 dark:bg-green-950/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold">Thanks — onboarding confirmed.</div>
                <div className="text-muted-foreground mt-0.5">
                  Accepted on {report.signed_off_at && new Date(report.signed_off_at).toLocaleString("en-GB")}.
                  You've moved into ongoing monthly support.
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button variant="outline" onClick={downloadPdf}>
              <Download className="w-4 h-4 mr-1.5" /> Download as PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
