import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import OnboardingStage1Panel from "@/components/OnboardingStage1Panel";
import type { ClientOnboarding, OnboardingActionLibraryItem } from "@/types/onboarding";

interface ServiceType {
  id: string;
  name: string;
  sort_order: number;
}

export default function OnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [onboarding, setOnboarding] = useState<ClientOnboarding | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceTypeName, setServiceTypeName] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: ob, error } = await supabase
        .from("client_onboardings")
        .select("*")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (error || !ob) {
        toast.error("Onboarding not found");
        setLoading(false);
        return;
      }
      setOnboarding(ob as ClientOnboarding);

      const { data: types } = await supabase
        .from("service_types")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      setServiceTypes((types ?? []) as ServiceType[]);

      if ((ob as ClientOnboarding).service_type_id) {
        const match = (types ?? []).find(t => t.id === (ob as ClientOnboarding).service_type_id);
        setServiceTypeName(match?.name ?? "");
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const handleConfigure = async () => {
    if (!onboarding || selectedServiceIds.size === 0) return;
    setConfiguring(true);
    try {
      const now = new Date().toISOString();
      const newOnboardingIds: string[] = [];

      for (const serviceTypeId of selectedServiceIds) {
        const { data: created, error: insErr } = await supabase
          .from("client_onboardings")
          .insert({
            source_type: onboarding.source_type,
            source_id: onboarding.source_id,
            service_type_id: serviceTypeId,
            status: "active",
            current_stage: 1,
            assigned_to_user_id: onboarding.assigned_to_user_id,
            client_name: onboarding.client_name,
            organisation: onboarding.organisation,
            contact_name: onboarding.contact_name,
            contact_email: onboarding.contact_email,
            triggered_at: onboarding.triggered_at,
            configured_at: now,
          })
          .select("id")
          .single();
        if (insErr || !created) throw new Error(insErr?.message ?? "Failed to create onboarding");
        const newId = (created as { id: string }).id;
        newOnboardingIds.push(newId);

        const { data: libItems, error: libErr } = await supabase
          .from("onboarding_action_library")
          .select("id, sort_order")
          .eq("service_type_id", serviceTypeId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (libErr) throw new Error(libErr.message);

        const instances = (libItems as OnboardingActionLibraryItem[] ?? []).map(item => ({
          onboarding_id: newId,
          action_library_id: item.id,
          status: "pending" as const,
          notes: "",
          sort_order: item.sort_order,
        }));
        if (instances.length > 0) {
          const { error: instErr } = await supabase
            .from("onboarding_action_instances")
            .insert(instances);
          if (instErr) throw new Error(instErr.message);
        }
      }

      const { error: delErr } = await supabase
        .from("client_onboardings")
        .delete()
        .eq("id", onboarding.id);
      if (delErr) throw new Error(delErr.message);

      toast.success(`Configured ${newOnboardingIds.length} onboarding${newOnboardingIds.length === 1 ? "" : "s"}`);
      navigate("/admin");
    } catch (err) {
      toast.error("Configure failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConfiguring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Onboarding not found.</div>
      </div>
    );
  }

  const sourceLink = onboarding.source_type === "proposal"
    ? `/admin/proposals/${onboarding.source_id}`
    : `/admin?adhoc=${onboarding.source_id}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </Link>
          <Badge variant={onboarding.status === "complete" ? "default" : "secondary"}>
            {onboarding.status === "draft" ? "Draft — awaiting configuration"
              : onboarding.status === "complete" ? "Complete"
              : `Stage ${onboarding.current_stage} of 3`}
          </Badge>
        </div>

        <div className="border rounded-lg p-6 space-y-3">
          <h1 className="text-2xl font-semibold">
            {onboarding.organisation || onboarding.client_name || "(Unknown client)"}
          </h1>
          <div className="text-sm text-muted-foreground space-y-1">
            {onboarding.client_name && onboarding.organisation && (
              <div>Contact: {onboarding.client_name}</div>
            )}
            {onboarding.contact_email && <div>{onboarding.contact_email}</div>}
            {serviceTypeName && <div>Service type: <span className="font-medium text-foreground">{serviceTypeName}</span></div>}
            <div>
              Source: {onboarding.source_type === "proposal" ? "Proposal" : "Ad-hoc agreement"}{" "}
              <Link to={sourceLink} className="inline-flex items-center text-primary hover:underline">
                view <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <div>Triggered: {new Date(onboarding.triggered_at).toLocaleString("en-GB")}</div>
          </div>
        </div>

        {onboarding.status === "draft" && (
          <div className="border rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Configure onboarding</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pick the service types this contract covers. One onboarding record will be
                created per service type, each with its own action checklist.
              </p>
            </div>
            <div className="space-y-2">
              {serviceTypes.map(st => (
                <label key={st.id} className="flex items-center gap-3 p-3 border rounded-md hover:bg-accent cursor-pointer">
                  <Checkbox
                    checked={selectedServiceIds.has(st.id)}
                    onCheckedChange={() => toggleService(st.id)}
                  />
                  <span className="font-medium">{st.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate("/admin")} disabled={configuring}>
                Cancel
              </Button>
              <Button onClick={handleConfigure} disabled={configuring || selectedServiceIds.size === 0}>
                {configuring ? "Configuring..." : `Create ${selectedServiceIds.size || ""} onboarding${selectedServiceIds.size === 1 ? "" : "s"}`.trim()}
              </Button>
            </div>
          </div>
        )}

        {onboarding.status === "active" && onboarding.current_stage === 1 && (
          <OnboardingStage1Panel
            onboarding={onboarding}
            onOnboardingChange={setOnboarding}
          />
        )}

        {onboarding.status === "active" && onboarding.current_stage === 2 && (
          <div className="border rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Stage 2 — Report delivery</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Build the onboarding report and send it to the client via a tokenised link.
                {onboarding.stage1_completed_at && ` Stage 1 completed ${new Date(onboarding.stage1_completed_at).toLocaleString("en-GB")}.`}
              </p>
            </div>
            <Button onClick={() => navigate(`/onboarding/${onboarding.id}/report`)}>
              Open report editor
            </Button>
          </div>
        )}

        {onboarding.status === "active" && onboarding.current_stage === 3 && (
          <div className="border rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Stage 3 — Awaiting client sign-off</h2>
              <p className="text-sm text-muted-foreground mt-1">
                The report has been sent. The client confirms via the link in their email.
                {onboarding.stage2_completed_at && ` Sent ${new Date(onboarding.stage2_completed_at).toLocaleString("en-GB")}.`}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate(`/onboarding/${onboarding.id}/report`)}>
              View / revise report
            </Button>
          </div>
        )}

        {onboarding.status === "complete" && (
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Onboarding complete</h2>
            <p className="text-sm text-muted-foreground">
              Signed off on {onboarding.stage3_completed_at && new Date(onboarding.stage3_completed_at).toLocaleString("en-GB")}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
