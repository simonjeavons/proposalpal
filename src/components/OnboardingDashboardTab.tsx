import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClientOnboarding } from "@/types/onboarding";

interface ServiceTypeMap {
  [id: string]: string;
}

export default function OnboardingDashboardTab() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClientOnboarding[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: onboardings }, { data: types }] = await Promise.all([
        supabase
          .from("client_onboardings")
          .select("*")
          .is("archived_at", null)
          .order("triggered_at", { ascending: false }),
        supabase.from("service_types").select("id, name"),
      ]);
      if (cancelled) return;
      setRows((onboardings ?? []) as ClientOnboarding[]);
      const map: ServiceTypeMap = {};
      for (const t of (types ?? []) as { id: string; name: string }[]) {
        map[t.id] = t.name;
      }
      setServiceTypes(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const drafts = rows.filter(r => r.status === "draft");
  const active = rows.filter(r => r.status === "active");
  const complete = rows.filter(r => r.status === "complete");

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track new clients through Information capture, Report delivery, and Sign-off.
          </p>
        </div>
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

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
            No active onboardings yet. New ones appear here automatically when a contract is signed.
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {active.map(o => (
              <button
                key={o.id}
                onClick={() => navigate(`/onboarding/${o.id}`)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-accent transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {o.organisation || o.client_name || "(Unknown)"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {o.service_type_id ? serviceTypes[o.service_type_id] ?? "(unknown service)" : ""}
                    {" · "}
                    Triggered {new Date(o.triggered_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <Badge variant="secondary">Stage {o.current_stage} of 3</Badge>
              </button>
            ))}
          </div>
        )}
      </section>

      {complete.length > 0 && (
        <section>
          <details>
            <summary className="text-sm font-semibold text-muted-foreground mb-3 cursor-pointer hover:text-foreground">
              Complete ({complete.length})
            </summary>
            <div className="border rounded-lg divide-y mt-3">
              {complete.map(o => (
                <button
                  key={o.id}
                  onClick={() => navigate(`/onboarding/${o.id}`)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {o.organisation || o.client_name || "(Unknown)"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {o.service_type_id ? serviceTypes[o.service_type_id] ?? "(unknown service)" : ""}
                      {o.stage3_completed_at && ` · Signed off ${new Date(o.stage3_completed_at).toLocaleDateString("en-GB")}`}
                    </div>
                  </div>
                  <Badge>Complete</Badge>
                </button>
              ))}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
