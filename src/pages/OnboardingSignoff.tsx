import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { ClientOnboarding, OnboardingReport } from "@/types/onboarding";

type State =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "needs-confirm"; report: OnboardingReport; onboarding: ClientOnboarding }
  | { kind: "confirmed"; report: OnboardingReport; onboarding: ClientOnboarding };

export default function OnboardingSignoff() {
  const { signoff_token: signoffToken } = useParams<{ signoff_token: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!signoffToken) return;
    let cancelled = false;
    (async () => {
      const { data: report } = await supabase
        .from("onboarding_reports").select("*")
        .eq("signoff_token", signoffToken).maybeSingle();
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
      setState({ kind: r.signed_off_at ? "confirmed" : "needs-confirm", report: r, onboarding });
    })();
    return () => { cancelled = true; };
  }, [signoffToken]);

  const handleConfirm = async () => {
    if (state.kind !== "needs-confirm") return;
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "onboarding-signed-off",
          signoffToken,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      // Re-fetch the report to pick up the signed_off_at
      const { data: refreshed } = await supabase
        .from("onboarding_reports").select("*")
        .eq("id", state.report.id).single();
      const r = refreshed as OnboardingReport;
      setState({ kind: "confirmed", report: r, onboarding: state.onboarding });
      toast.success("Confirmed — thanks!");
    } catch (err) {
      toast.error("Confirm failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

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
            The sign-off link can't be found. It may have expired or already been used.
          </p>
        </div>
      </div>
    );
  }

  const { onboarding } = state;

  if (state.kind === "confirmed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center max-w-md space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <h1 className="text-2xl font-semibold">Onboarding confirmed</h1>
          <p className="text-muted-foreground">
            Thanks {onboarding.contact_name || "—"}, that's us done.
            {state.report.signed_off_at && ` Confirmed on ${new Date(state.report.signed_off_at).toLocaleString("en-GB")}.`}
          </p>
          <p className="text-sm text-muted-foreground">
            Your account moves into ongoing monthly support. We'll be in touch with details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md space-y-6 border rounded-lg p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Confirm onboarding complete</h1>
          <p className="text-sm text-muted-foreground">
            For <strong>{onboarding.organisation || onboarding.client_name}</strong>
          </p>
        </div>

        <p className="text-sm leading-relaxed">
          By clicking below, you confirm that the onboarding has been completed
          to your satisfaction and you're ready to transition to ongoing
          monthly support with Shoothill.
        </p>

        <Button onClick={handleConfirm} disabled={submitting} className="w-full" size="lg">
          {submitting ? "Confirming..." : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Confirm onboarding complete
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
