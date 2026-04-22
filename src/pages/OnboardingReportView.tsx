import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Download, ExternalLink } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t">
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="w-4 h-4 mr-1.5" /> Download as PDF
          </Button>

          {!signedOff && report.signoff_token && (
            <Button asChild>
              <Link to={`/onboarding/signoff/${report.signoff_token}`}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Confirm onboarding complete
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </Link>
            </Button>
          )}

          {signedOff && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              You confirmed this onboarding on {report.signed_off_at && new Date(report.signed_off_at).toLocaleDateString("en-GB")}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
