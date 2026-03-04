import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Proposal } from "@/types/proposal";
import { Plus, Eye, Pencil, Copy, Trash2, ExternalLink, Users, FileText, LogOut, Check, X, Target, Download, GitBranch, ShoppingBag, Scale, UserCircle2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
  phone_number: string;
  role: "admin" | "user";
  created_at: string;
}

type Tab = "proposals" | "users" | "team" | "solutions" | "services" | "agreements";

interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
  bio: string;
  photo_url: string;
  linkedin_url: string;
  sort_order: number;
  is_active: boolean;
}

interface ServiceTypeChallenge {
  id: string | null;
  service_type_id: string;
  title: string;
  description: string;
  sort_order: number;
}

interface ServiceTypeWithChallenges {
  id: string;
  name: string;
  sort_order: number;
  is_upfront: boolean;
  is_ongoing: boolean;
  challenges: ServiceTypeChallenge[];
  partnership_overview_template: string;
  commercial_opportunity_template: string;
  strategic_focus_template: string;
  whats_needed_template: string;
  working_together_template: string;
}

interface Product {
  id: string | null;
  name: string;
  default_price: number;
  description: string;
  is_upfront: boolean;
  is_ongoing: boolean;
  sort_order: number;
  service_type_id: string | null;
}

interface TemplatePhase {
  id: string | null;
  service_type_id: string;
  label: string;
  title: string;
  duration: string;
  tasks: string[];
  price: string;
  sort_order: number;
}

interface AgreementSection {
  heading: string;
  body: string;
}

interface AgreementTemplate {
  id: string;
  name: string;
  description: string;
  sections: AgreementSection[];
  sort_order: number;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("proposals");

  // Proposals state
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [signedContracts, setSignedContracts] = useState<Record<string, string>>({}); // proposal_id -> signed_contract_url

  // Users state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [invitePhoneNumber, setInvitePhoneNumber] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", job_title: "", phone_number: "" });

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamEditForm, setTeamEditForm] = useState<Omit<TeamMember, 'id' | 'sort_order'>>({
    full_name: "", job_title: "", bio: "", photo_url: "", linkedin_url: "", is_active: true,
  });
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState<Omit<TeamMember, 'id' | 'sort_order'>>({
    full_name: "", job_title: "", bio: "", photo_url: "", linkedin_url: "", is_active: true,
  });

  // Services state
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeWithChallenges[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [solutionsServiceTabId, setSolutionsServiceTabId] = useState<string | null>(null); // null = Universal tab

  // Services tab state - two-level navigation
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newSolutionName, setNewSolutionName] = useState("");
  const [templatePhases, setTemplatePhases] = useState<TemplatePhase[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(false);

  // Agreements tab state
  const [agreementTemplates, setAgreementTemplates] = useState<AgreementTemplate[]>([]);
  const [agreementsLoading, setAgreementsLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const fetchServiceTypes = async () => {
    const { data: types } = await supabase.from("service_types" as any).select("id, name, sort_order, is_upfront, is_ongoing, partnership_overview_template, commercial_opportunity_template, strategic_focus_template, whats_needed_template, working_together_template").order("sort_order");
    if (!types) { setServicesLoading(false); return; }
    const { data: challenges } = await supabase.from("service_type_challenges" as any).select("id, service_type_id, title, description, sort_order").order("sort_order");
    const challengeMap: Record<string, ServiceTypeChallenge[]> = {};
    (challenges || []).forEach((c: any) => {
      if (!challengeMap[c.service_type_id]) challengeMap[c.service_type_id] = [];
      challengeMap[c.service_type_id].push(c);
    });
    setServiceTypes((types as any[]).map(t => ({
      ...t,
      challenges: challengeMap[t.id] || [],
      partnership_overview_template: t.partnership_overview_template || '',
      commercial_opportunity_template: t.commercial_opportunity_template || '',
      strategic_focus_template: t.strategic_focus_template || '',
      whats_needed_template: t.whats_needed_template || '',
      working_together_template: t.working_together_template || '',
    })));
    setServicesLoading(false);
  };

  const saveServiceTypeName = async (id: string, name: string) => {
    const { error } = await supabase.from("service_types" as any).update({ name }).eq("id", id);
    if (error) toast.error("Failed to rename");
  };

  const updateServiceTypeName = (id: string, name: string) => {
    setServiceTypes(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const saveServiceTemplate = async (id: string, field: string, value: string) => {
    const { error } = await supabase.from("service_types" as any).update({ [field]: value }).eq("id", id);
    if (error) toast.error("Failed to save");
  };

  const saveMarketingTemplates = async (id: string) => {
    const st = serviceTypes.find(s => s.id === id);
    if (!st) return;
    const { error } = await supabase.from("service_types" as any).update({
      commercial_opportunity_template: st.commercial_opportunity_template,
      strategic_focus_template: st.strategic_focus_template,
      whats_needed_template: st.whats_needed_template,
      working_together_template: st.working_together_template,
    }).eq("id", id);
    if (error) toast.error("Failed to save");
  };

  const updateServiceTemplate = (id: string, field: string, value: string) => {
    setServiceTypes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteServiceType = async (id: string) => {
    if (!confirm("Delete this service and all its phases and challenges?")) return;
    const { error } = await supabase.from("service_types" as any).delete().eq("id", id);
    if (!error) {
      setServiceTypes(prev => prev.filter(s => s.id !== id));
    } else {
      toast.error("Failed to delete");
    }
  };

  const addChallenge = (serviceTypeId: string) => {
    const nextOrder = serviceTypes.find(s => s.id === serviceTypeId)?.challenges.length || 0;
    setServiceTypes(prev => prev.map(s => s.id === serviceTypeId
      ? { ...s, challenges: [...s.challenges, { id: null, service_type_id: serviceTypeId, title: '', description: '', sort_order: nextOrder }] }
      : s));
  };

  const updateChallengeField = (serviceTypeId: string, idx: number, field: 'title' | 'description', value: string) => {
    setServiceTypes(prev => prev.map(s => {
      if (s.id !== serviceTypeId) return s;
      const updated = [...s.challenges];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...s, challenges: updated };
    }));
  };

  const saveChallenge = async (serviceTypeId: string, idx: number) => {
    const st = serviceTypes.find(s => s.id === serviceTypeId);
    if (!st) return;
    const c = st.challenges[idx];
    if (c.id === null) {
      const { data, error } = await supabase.from("service_type_challenges" as any)
        .insert({ service_type_id: c.service_type_id, title: c.title, description: c.description, sort_order: c.sort_order })
        .select().single();
      if (!error && data) {
        setServiceTypes(prev => prev.map(s => {
          if (s.id !== serviceTypeId) return s;
          const updated = [...s.challenges];
          updated[idx] = { ...updated[idx], id: (data as any).id };
          return { ...s, challenges: updated };
        }));
      }
    } else {
      await supabase.from("service_type_challenges" as any).update({ title: c.title, description: c.description }).eq("id", c.id);
    }
  };

  const deleteChallenge = async (serviceTypeId: string, idx: number) => {
    const st = serviceTypes.find(s => s.id === serviceTypeId);
    if (!st) return;
    const c = st.challenges[idx];
    if (c.id) {
      await supabase.from("service_type_challenges" as any).delete().eq("id", c.id);
    }
    setServiceTypes(prev => prev.map(s => s.id === serviceTypeId
      ? { ...s, challenges: s.challenges.filter((_, i) => i !== idx) }
      : s));
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    const { data } = await supabase.from("products" as any).select("id, name, default_price, description, is_upfront, is_ongoing, sort_order, service_type_id").order("sort_order");
    setProducts((data as any[] || []) as Product[]);
    setProductsLoading(false);
  };

  const updateProductField = (idx: number, field: keyof Product, value: string | number) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const saveProduct = async (idx: number) => {
    const p = products[idx];
    if (!p?.id) return;
    const { error } = await supabase.from("products" as any).update({
      name: p.name, default_price: p.default_price, description: p.description,
      is_upfront: p.is_upfront, is_ongoing: p.is_ongoing, service_type_id: p.service_type_id,
    }).eq("id", p.id);
    if (error) toast.error("Failed to save product");
  };

  const saveServiceTypeFlags = async (id: string, is_upfront: boolean, is_ongoing: boolean) => {
    const { error } = await supabase.from("service_types" as any).update({ is_upfront, is_ongoing }).eq("id", id);
    if (error) toast.error("Failed to save service flags");
  };

  const deleteProduct = async (idx: number) => {
    const p = products[idx];
    if (!p) return;
    if (p.id) await supabase.from("products" as any).delete().eq("id", p.id);
    setProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const fetchAgreementTemplates = async () => {
    setAgreementsLoading(true);
    const { data } = await supabase.from("service_agreement_templates" as any)
      .select("id, name, description, sections, sort_order")
      .order("sort_order");
    setAgreementTemplates((data as any[] || []) as AgreementTemplate[]);
    setAgreementsLoading(false);
  };

  const updateAgreementSections = async (id: string, sections: AgreementSection[]) => {
    const { error } = await supabase.from("service_agreement_templates" as any)
      .update({ sections, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Failed to save sections");
  };

  const updateAgreementMeta = async (id: string, name: string, description: string) => {
    const { error } = await supabase.from("service_agreement_templates" as any)
      .update({ name, description, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Failed to save template");
  };

  const addSection = (templateId: string) => {
    setAgreementTemplates(prev => prev.map(t =>
      t.id === templateId
        ? { ...t, sections: [...t.sections, { heading: '', body: '' }] }
        : t
    ));
  };

  const deleteSection = async (templateId: string, idx: number) => {
    const tmpl = agreementTemplates.find(t => t.id === templateId);
    if (!tmpl) return;
    const updated = tmpl.sections.filter((_, i) => i !== idx);
    setAgreementTemplates(prev => prev.map(t => t.id === templateId ? { ...t, sections: updated } : t));
    await updateAgreementSections(templateId, updated);
  };

  const updateSectionField = (templateId: string, idx: number, field: keyof AgreementSection, value: string) => {
    setAgreementTemplates(prev => prev.map(t => {
      if (t.id !== templateId) return t;
      const sections = [...t.sections];
      sections[idx] = { ...sections[idx], [field]: value };
      return { ...t, sections };
    }));
  };

  const addServiceType = async () => {
    const name = newServiceName.trim();
    if (!name) return;
    const nextOrder = serviceTypes.length > 0 ? Math.max(...serviceTypes.map(s => s.sort_order)) + 1 : 1;
    const { data, error } = await supabase.from("service_types" as any).insert({ name, sort_order: nextOrder }).select().single();
    if (!error && data) {
      setServiceTypes(prev => [...prev, { ...(data as any), challenges: [], partnership_overview_template: '', commercial_opportunity_template: '', strategic_focus_template: '', whats_needed_template: '', working_together_template: '' }]);
      setNewServiceName("");
    } else {
      toast.error("Failed to add service");
    }
  };

  const addSolution = async () => {
    const name = newSolutionName.trim();
    if (!name) return;
    const nextOrder = products.length > 0 ? Math.max(...products.map(p => p.sort_order)) + 1 : 1;
    const { data, error } = await supabase.from("products" as any).insert({ name, default_price: 0, sort_order: nextOrder, service_type_id: solutionsServiceTabId }).select().single();
    if (!error && data) {
      setProducts(prev => [...prev, data as Product]);
      setNewSolutionName("");
    } else {
      toast.error("Failed to add solution");
    }
  };

  const fetchTemplatePhases = async (serviceTypeId: string) => {
    setPhasesLoading(true);
    const { data } = await supabase.from("template_phases" as any)
      .select("id, service_type_id, label, title, duration, tasks, price, sort_order")
      .eq("service_type_id", serviceTypeId)
      .order("sort_order");
    setTemplatePhases((data as any[] || []).map((p: any) => ({
      ...p,
      tasks: Array.isArray(p.tasks) ? p.tasks : [],
    })));
    setPhasesLoading(false);
  };

  const addTemplatePhase = async () => {
    if (!selectedServiceId) return;
    const nextOrder = templatePhases.length;
    const nextLabel = `Phase ${templatePhases.length + 1}`;
    const { data, error } = await supabase.from("template_phases" as any)
      .insert({ service_type_id: selectedServiceId, label: nextLabel, title: '', duration: '', tasks: [], price: '', sort_order: nextOrder })
      .select().single();
    if (!error && data) {
      setTemplatePhases(prev => [...prev, { ...(data as any), tasks: [] }]);
    } else {
      toast.error("Failed to add phase");
    }
  };

  const updateTemplatePhaseField = (idx: number, field: keyof TemplatePhase, value: string | string[]) => {
    setTemplatePhases(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const saveTemplatePhase = async (idx: number) => {
    const p = templatePhases[idx];
    if (!p) return;
    const payload = { label: p.label, title: p.title, duration: p.duration, tasks: p.tasks, price: p.price };
    if (p.id === null) {
      const { data, error } = await supabase.from("template_phases" as any)
        .insert({ ...payload, service_type_id: p.service_type_id, sort_order: p.sort_order })
        .select().single();
      if (!error && data) {
        setTemplatePhases(prev => prev.map((ph, i) => i === idx ? { ...ph, id: (data as any).id } : ph));
      }
    } else {
      await supabase.from("template_phases" as any).update(payload).eq("id", p.id);
    }
  };

  const deleteTemplatePhase = async (idx: number) => {
    const p = templatePhases[idx];
    if (!p) return;
    if (p.id) {
      await supabase.from("template_phases" as any).delete().eq("id", p.id);
    }
    setTemplatePhases(prev => prev.filter((_, i) => i !== idx));
  };

  const fetchProposals = async () => {
    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProposals(data as unknown as Proposal[]);
    }

    // Load signed contract URLs from acceptances
    const { data: acceptances } = await supabase
      .from("proposal_acceptances" as any)
      .select("proposal_id, signed_contract_url")
      .not("signed_contract_url", "is", null);

    if (acceptances) {
      const map: Record<string, string> = {};
      (acceptances as any[]).forEach(a => { map[a.proposal_id] = a.signed_contract_url; });
      setSignedContracts(map);
    }

    setProposalsLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProfiles(data as Profile[]);
    }
    setUsersLoading(false);
  };

  useEffect(() => {
    fetchProposals();
    fetchProfiles();
    fetchServiceTypes();
    fetchProducts();
    fetchAgreementTemplates();
    fetchTeamMembers();
  }, []);

  const duplicateProposal = async (p: Proposal) => {
    const { id: _id, slug: _slug, created_at: _ca, updated_at: _ua, ...rest } = p;
    const { error } = await supabase
      .from("proposals")
      .insert({ ...rest, client_name: `${p.client_name} (Copy)`, status: "draft" } as any);
    if (!error) {
      toast.success("Proposal duplicated");
      fetchProposals();
    }
  };

  const deleteProposal = async (id: string) => {
    if (!confirm("Delete this proposal?")) return;
    const { error } = await supabase.from("proposals").delete().eq("id", id);
    if (!error) {
      toast.success("Proposal deleted");
      fetchProposals();
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("create-user", {
      body: { email: inviteEmail, password: invitePassword, full_name: inviteFullName, job_title: inviteJobTitle, phone_number: invitePhoneNumber, role: inviteRole },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (res.error || res.data?.error) {
      // Extract the actual error body from the edge function response
      let errorMsg = res.data?.error ?? res.error?.message ?? "Failed to create user";
      try {
        const body = await (res.error as any)?.context?.json?.();
        if (body?.error) errorMsg = body.error;
      } catch { /* ignore */ }
      toast.error(errorMsg);
      setInviting(false);
      return;
    }

    toast.success(`User ${inviteEmail} created`);
    setInviteEmail("");
    setInviteFullName("");
    setInviteJobTitle("");
    setInvitePhoneNumber("");
    setInvitePassword("");
    setInviteRole("user");
    setInviting(false);
    fetchProfiles();
  };

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditForm({ full_name: profile.full_name || "", job_title: profile.job_title || "", phone_number: profile.phone_number || "" });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("profiles").update(editForm).eq("id", id);
    if (!error) {
      toast.success("User updated");
      setEditingId(null);
      fetchProfiles();
    } else {
      toast.error("Failed to update user");
    }
  };

  const updateRole = async (id: string, role: "admin" | "user") => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (!error) {
      toast.success("Role updated");
      fetchProfiles();
    }
  };

  const fetchTeamMembers = async () => {
    setTeamLoading(true);
    const { data } = await (supabase as any).from("team_members").select("*").order("sort_order");
    setTeamMembers((data as TeamMember[]) || []);
    setTeamLoading(false);
  };

  const startEditTeam = (member: TeamMember) => {
    setEditingTeamId(member.id);
    setTeamEditForm({
      full_name: member.full_name,
      job_title: member.job_title || "",
      bio: member.bio || "",
      photo_url: member.photo_url || "",
      linkedin_url: member.linkedin_url || "",
      is_active: member.is_active,
    });
  };

  const saveTeamMember = async (id: string) => {
    const { error } = await (supabase as any).from("team_members").update({
      ...teamEditForm,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (!error) {
      toast.success("Team member updated");
      setEditingTeamId(null);
      fetchTeamMembers();
    } else {
      toast.error("Failed to update team member");
    }
  };

  const deleteTeamMember = async (id: string) => {
    if (!confirm("Delete this team member?")) return;
    const { error } = await (supabase as any).from("team_members").delete().eq("id", id);
    if (!error) {
      setTeamMembers(prev => prev.filter(m => m.id !== id));
      toast.success("Team member deleted");
    } else {
      toast.error("Failed to delete");
    }
  };

  const addTeamMember = async () => {
    if (!newTeamForm.full_name.trim()) return;
    const nextOrder = teamMembers.length > 0 ? Math.max(...teamMembers.map(m => m.sort_order)) + 1 : 1;
    const { data, error } = await (supabase as any).from("team_members").insert({
      ...newTeamForm,
      sort_order: nextOrder,
    }).select().single();
    if (!error && data) {
      setTeamMembers(prev => [...prev, data as TeamMember]);
      setNewTeamForm({ full_name: "", job_title: "", bio: "", photo_url: "", linkedin_url: "", is_active: true });
      setAddingTeam(false);
      toast.success("Team member added");
    } else {
      toast.error("Failed to add team member");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'sent': return 'bg-primary/10 text-primary';
      case 'accepted': return 'bg-green-100 text-green-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-secondary text-secondary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" className="h-6 brightness-0 invert" />
            <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Proposal Manager</span>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "proposals" && (
              <Link to="/admin/proposals/new">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-xs font-bold tracking-wide uppercase">
                  <Plus className="w-4 h-4" /> New Proposal
                </Button>
              </Link>
            )}
            <span className="text-xs opacity-60 hidden sm:block">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-secondary-foreground/60 hover:text-secondary-foreground gap-1.5 text-xs"
              onClick={signOut}
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 flex gap-0">
          <button
            onClick={() => setActiveTab("proposals")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "proposals" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Proposals
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Users
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "team" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCircle2 className="w-3.5 h-3.5" /> Team
          </button>
          <button
            onClick={() => { setActiveTab("services"); setSelectedServiceId(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "services" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="w-3.5 h-3.5" /> Services
          </button>
          <button
            onClick={() => setActiveTab("solutions")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "solutions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Solutions
          </button>
          <button
            onClick={() => setActiveTab("agreements")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "agreements" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Scale className="w-3.5 h-3.5" /> Agreements
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Proposals Tab */}
        {activeTab === "proposals" && (
          <>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Proposals</h1>
            <p className="text-sm text-muted-foreground mb-6">Create, manage and share client proposals.</p>

            {proposalsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : proposals.length === 0 ? (
              <div className="bg-card border border-border p-12 text-center">
                <p className="text-muted-foreground mb-4">No proposals yet. Create your first one.</p>
                <Link to="/admin/proposals/new">
                  <Button className="bg-primary text-primary-foreground gap-2">
                    <Plus className="w-4 h-4" /> Create Proposal
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="bg-card border border-border divide-y divide-border">
                {proposals.map(p => (
                  <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-bold text-foreground truncate">{p.client_name || 'Untitled'}</h3>
                        <Badge className={`${getStatusColor(p.status)} text-[10px] font-bold uppercase tracking-wider`}>{p.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.programme_title || 'Untitled project'} · {new Date(p.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link to={`/p/${p.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" title="Preview">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost" size="sm"
                        className="text-muted-foreground hover:text-primary"
                        title="Copy link"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/p/${p.slug}`);
                          toast.success("Link copied!");
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Link to={`/admin/proposals/${p.id}`}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" title="Duplicate" onClick={() => duplicateProposal(p)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" title="Delete" onClick={() => deleteProposal(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {signedContracts[p.id] && (
                        <a
                          href={`/contracts/${signedContracts[p.id]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download signed contract"
                        >
                          <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* SOLUTIONS TAB */}
        {activeTab === "solutions" && (() => {
          const tabProducts = products.filter(p =>
            solutionsServiceTabId === null
              ? p.service_type_id === null
              : p.service_type_id === solutionsServiceTabId
          );
          return (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Solutions</h1>
                  <p className="text-sm text-muted-foreground">Products and services you sell, organised by service type.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newSolutionName}
                    onChange={e => setNewSolutionName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addSolution(); }}
                    placeholder="New solution…"
                    className="h-8 text-sm w-48"
                  />
                  <Button
                    onClick={addSolution}
                    disabled={!newSolutionName.trim()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-xs font-bold uppercase tracking-wide h-8"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </div>

              {/* Service type tab bar */}
              <div className="flex items-end gap-0 border-b border-border mb-4 overflow-x-auto">
                {[{ id: null, name: 'Universal' }, ...serviceTypes.map(st => ({ id: st.id, name: st.name }))].map(tab => (
                  <button
                    key={tab.id ?? 'universal'}
                    onClick={() => setSolutionsServiceTabId(tab.id)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 -mb-px ${
                      solutionsServiceTabId === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.name}
                    {tab.id !== null && (
                      <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">
                        ({products.filter(p => p.service_type_id === tab.id).length})
                      </span>
                    )}
                    {tab.id === null && (
                      <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">
                        ({products.filter(p => p.service_type_id === null).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {productsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tabProducts.length === 0 ? (
                <div className="bg-card border border-border p-12 text-center">
                  <p className="text-muted-foreground">No solutions for this service yet. Add one above.</p>
                </div>
              ) : (
                <div className="bg-card border border-border divide-y divide-border">
                  {tabProducts.map((p) => {
                    const idx = products.indexOf(p);
                    return (
                      <div key={`product-${p.id ?? idx}`} className="px-6 py-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <Input
                            value={p.name}
                            onChange={e => updateProductField(idx, 'name', e.target.value)}
                            onBlur={() => saveProduct(idx)}
                            className="h-8 text-sm font-semibold flex-1"
                            placeholder="Solution name"
                          />
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-sm text-muted-foreground">£</span>
                            <Input
                              type="number"
                              value={p.default_price}
                              onChange={e => updateProductField(idx, 'default_price', Number(e.target.value) || 0)}
                              onBlur={() => saveProduct(idx)}
                              className="h-8 text-sm w-28"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input type="checkbox" checked={!!p.is_upfront} className="w-3.5 h-3.5"
                                onChange={e => updateProductField(idx, 'is_upfront', e.target.checked)} />
                              <span className="text-xs text-muted-foreground">Upfront</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input type="checkbox" checked={!!p.is_ongoing} className="w-3.5 h-3.5"
                                onChange={e => updateProductField(idx, 'is_ongoing', e.target.checked)} />
                              <span className="text-xs text-muted-foreground">Ongoing</span>
                            </label>
                          </div>
                          <Button
                            variant="ghost" size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => saveProduct(idx)}
                            title="Save changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => deleteProduct(idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <Input
                          value={p.description || ''}
                          onChange={e => updateProductField(idx, 'description', e.target.value)}
                          onBlur={() => saveProduct(idx)}
                          className="h-7 text-xs text-muted-foreground"
                          placeholder="Description — auto-fills in proposal when this solution is selected"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

        {/* SERVICES TAB */}
        {activeTab === "services" && (
          <>
            {!selectedServiceId ? (
              /* SERVICE LIST VIEW */
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Services</h1>
                    <p className="text-sm text-muted-foreground">Click a service to configure its challenges, journey phases, and boilerplate content.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newServiceName}
                      onChange={e => setNewServiceName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addServiceType(); }}
                      placeholder="New service…"
                      className="h-8 text-sm w-48"
                    />
                    <Button
                      onClick={addServiceType}
                      disabled={!newServiceName.trim()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-xs font-bold uppercase tracking-wide h-8"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : serviceTypes.length === 0 ? (
                  <div className="bg-card border border-border p-12 text-center">
                    <p className="text-muted-foreground">No services yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border divide-y divide-border">
                    {serviceTypes.map(st => (
                      <div key={st.id} className="px-6 py-3 flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedServiceId(st.id);
                            fetchTemplatePhases(st.id);
                          }}
                          className="flex-1 text-left text-sm font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {st.name}
                          {st.name.toLowerCase().includes('marketing') && (
                            <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">+ Extra fields</span>
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground">{st.challenges.length} challenge{st.challenges.length !== 1 ? 's' : ''}</span>
                        <Button
                          variant="ghost" size="sm"
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => deleteServiceType(st.id)}
                          title="Delete service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (() => {
              /* SERVICE DETAIL VIEW */
              const st = serviceTypes.find(s => s.id === selectedServiceId);
              if (!st) return null;
              const isMarketing = st.name.toLowerCase().includes('marketing');
              return (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setSelectedServiceId(null)}
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                    >
                      ← Services
                    </button>
                    <span className="text-muted-foreground/40">/</span>
                    <Input
                      value={st.name}
                      onChange={e => updateServiceTypeName(st.id, e.target.value)}
                      onBlur={e => saveServiceTypeName(st.id, e.target.value)}
                      className="h-8 text-sm font-extrabold flex-1 max-w-sm"
                    />
                  </div>

                  {/* Your Business & Our Partnership boilerplate */}
                  <div className="bg-card border border-border p-5 mb-4 space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Business &amp; Our Partnership — Default Boilerplate</Label>
                    <p className="text-xs text-muted-foreground">This text auto-fills the "Your Business &amp; Our Partnership" field when this service is selected in a new proposal.</p>
                    <Textarea
                      value={st.partnership_overview_template}
                      onChange={e => updateServiceTemplate(st.id, 'partnership_overview_template', e.target.value)}
                      onBlur={e => saveServiceTemplate(st.id, 'partnership_overview_template', e.target.value)}
                      rows={4}
                      placeholder="Enter boilerplate text for this service's business &amp; partnership overview…"
                      className="text-sm"
                    />
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-xs font-bold uppercase tracking-wide h-8"
                        onClick={() => saveServiceTemplate(st.id, 'partnership_overview_template', st.partnership_overview_template)}
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </Button>
                    </div>
                  </div>

                  {/* Marketing-specific template fields */}
                  {isMarketing && (
                    <div className="bg-card border border-border p-5 mb-4 space-y-4">
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Commercial Opportunity — Default Boilerplate</Label>
                        <Textarea
                          value={st.commercial_opportunity_template}
                          onChange={e => updateServiceTemplate(st.id, 'commercial_opportunity_template', e.target.value)}
                          onBlur={e => saveServiceTemplate(st.id, 'commercial_opportunity_template', e.target.value)}
                          rows={3}
                          placeholder="Default commercial opportunity text…"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Strategic Focus — Default Boilerplate</Label>
                        <Textarea
                          value={st.strategic_focus_template}
                          onChange={e => updateServiceTemplate(st.id, 'strategic_focus_template', e.target.value)}
                          onBlur={e => saveServiceTemplate(st.id, 'strategic_focus_template', e.target.value)}
                          rows={3}
                          placeholder="Default strategic focus text…"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">What's Needed — Default Boilerplate</Label>
                        <Textarea
                          value={st.whats_needed_template}
                          onChange={e => updateServiceTemplate(st.id, 'whats_needed_template', e.target.value)}
                          onBlur={e => saveServiceTemplate(st.id, 'whats_needed_template', e.target.value)}
                          rows={3}
                          placeholder="Default what's needed text…"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Working Together — Default Boilerplate</Label>
                        <Textarea
                          value={st.working_together_template}
                          onChange={e => updateServiceTemplate(st.id, 'working_together_template', e.target.value)}
                          onBlur={e => saveServiceTemplate(st.id, 'working_together_template', e.target.value)}
                          rows={3}
                          placeholder="Default working together text…"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-xs font-bold uppercase tracking-wide h-8"
                          onClick={() => saveMarketingTemplates(st.id)}
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Challenges section */}
                  <div className="mb-6">
                    <h2 className="text-base font-extrabold text-foreground mb-3">Challenges</h2>
                    <div className="space-y-2">
                      {st.challenges.length === 0 && (
                        <div className="bg-card border border-border p-6 text-center">
                          <p className="text-muted-foreground text-sm">No challenges yet. Add one below.</p>
                        </div>
                      )}
                      {st.challenges.map((c, idx) => (
                        <div key={idx} className="flex gap-3 items-start bg-card border border-border p-4">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Challenge title"
                              value={c.title}
                              onChange={e => updateChallengeField(st.id, idx, 'title', e.target.value)}
                              onBlur={() => saveChallenge(st.id, idx)}
                              className="text-sm font-semibold h-8"
                            />
                            <Input
                              placeholder="Description"
                              value={c.description}
                              onChange={e => updateChallengeField(st.id, idx, 'description', e.target.value)}
                              onBlur={() => saveChallenge(st.id, idx)}
                              className="text-sm h-8"
                            />
                          </div>
                          <Button
                            variant="ghost" size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => saveChallenge(st.id, idx)}
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => deleteChallenge(st.id, idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-xs font-bold uppercase tracking-wide"
                        onClick={() => addChallenge(st.id)}
                      >
                        <Plus className="w-4 h-4" /> Add Challenge
                      </Button>
                    </div>
                  </div>

                  {/* Journey Phases section */}
                  <div>
                    <h2 className="text-base font-extrabold text-foreground mb-3">Journey Phases</h2>
                    {phasesLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {templatePhases.length === 0 && (
                          <div className="bg-card border border-border p-8 text-center">
                            <p className="text-muted-foreground text-sm">No journey phases yet. Add one below.</p>
                          </div>
                        )}
                        {templatePhases.map((p, idx) => (
                          <div key={idx} className="bg-card border border-border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider">{p.label || `Phase ${idx + 1}`}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost" size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 w-7 p-0"
                                  onClick={() => saveTemplatePhase(idx)}
                                  title="Save"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                                  onClick={() => deleteTemplatePhase(idx)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Label</Label>
                                <Input placeholder="Phase 1" value={p.label}
                                  onChange={e => updateTemplatePhaseField(idx, 'label', e.target.value)}
                                  onBlur={() => saveTemplatePhase(idx)} className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</Label>
                                <Input placeholder="Discovery & Audit" value={p.title}
                                  onChange={e => updateTemplatePhaseField(idx, 'title', e.target.value)}
                                  onBlur={() => saveTemplatePhase(idx)} className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</Label>
                                <Input placeholder="2 wks" value={p.duration}
                                  onChange={e => updateTemplatePhaseField(idx, 'duration', e.target.value)}
                                  onBlur={() => saveTemplatePhase(idx)} className="h-8 text-sm" />
                              </div>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tasks (one per line)</Label>
                                <Textarea
                                  placeholder={"Task one\nTask two\nTask three"}
                                  value={p.tasks.join('\n')}
                                  onChange={e => updateTemplatePhaseField(idx, 'tasks', e.target.value.split('\n'))}
                                  onBlur={() => saveTemplatePhase(idx)}
                                  rows={3} className="text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price (£)</Label>
                                <Input placeholder="4500" value={p.price}
                                  onChange={e => updateTemplatePhaseField(idx, 'price', e.target.value)}
                                  onBlur={() => saveTemplatePhase(idx)} className="h-8 text-sm w-28" />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          className="w-full gap-2 text-xs font-bold uppercase tracking-wide"
                          onClick={addTemplatePhase}
                        >
                          <Plus className="w-4 h-4" /> Add Phase
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* Agreements Tab */}
        {activeTab === "agreements" && (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Agreements</h1>
                <p className="text-sm text-muted-foreground">Manage service agreement templates. Select a template to edit its clauses and schedules.</p>
              </div>
            </div>

            <div className="mb-6">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Template</Label>
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-96"
              >
                <option value="">Select a template to edit…</option>
                {agreementTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {agreementsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !selectedTemplateId ? (
              <div className="bg-card border border-border p-12 text-center">
                <p className="text-muted-foreground">Select a template above to edit its clauses and schedules.</p>
              </div>
            ) : (() => {
              const tmpl = agreementTemplates.find(t => t.id === selectedTemplateId);
              if (!tmpl) return null;
              return (
                <div className="space-y-4">
                  <div className="bg-card border border-border p-4 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Template Name</Label>
                      <Input
                        value={tmpl.name}
                        onChange={e => setAgreementTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, name: e.target.value } : t))}
                        onBlur={e => updateAgreementMeta(selectedTemplateId, e.target.value, tmpl.description)}
                        className="h-8 text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                      <Input
                        value={tmpl.description || ''}
                        onChange={e => setAgreementTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, description: e.target.value } : t))}
                        onBlur={e => updateAgreementMeta(selectedTemplateId, tmpl.name, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {tmpl.sections.map((section, idx) => (
                    <div key={idx} className="bg-card border border-border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={section.heading}
                          onChange={e => updateSectionField(selectedTemplateId, idx, 'heading', e.target.value)}
                          onBlur={() => updateAgreementSections(selectedTemplateId, tmpl.sections)}
                          className="h-8 text-sm font-semibold flex-1"
                          placeholder="Section heading"
                        />
                        <Button
                          variant="ghost" size="sm"
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => deleteSection(selectedTemplateId, idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <Textarea
                        value={section.body}
                        onChange={e => updateSectionField(selectedTemplateId, idx, 'body', e.target.value)}
                        onBlur={() => updateAgreementSections(selectedTemplateId, tmpl.sections)}
                        rows={8}
                        className="text-sm font-mono text-xs"
                        placeholder="Section body text"
                      />
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full gap-2 text-xs font-bold uppercase tracking-wide"
                    onClick={() => addSection(selectedTemplateId)}
                  >
                    <Plus className="w-4 h-4" /> Add Section
                  </Button>
                </div>
              );
            })()}
          </>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Users</h1>
            <p className="text-sm text-muted-foreground mb-6">Manage who can access the Proposal Manager.</p>

            {/* Create User Form */}
            <div className="bg-card border border-border p-6 mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Add User</h2>
              <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Title</Label>
                  <Input
                    value={inviteJobTitle}
                    onChange={(e) => setInviteJobTitle(e.target.value)}
                    placeholder="Head of Sales"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                  <Input
                    type="tel"
                    value={invitePhoneNumber}
                    onChange={(e) => setInvitePhoneNumber(e.target.value)}
                    placeholder="01743 636 300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="jane@shoothill.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                  <Input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</Label>
                  <div className="flex gap-2 items-end">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "admin" | "user")}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button
                      type="submit"
                      disabled={inviting}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                    >
                      {inviting ? "Adding…" : "Add User"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : profiles.length === 0 ? (
              <div className="bg-card border border-border p-12 text-center">
                <p className="text-muted-foreground">No users yet.</p>
              </div>
            ) : (
              <div className="bg-card border border-border">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto] px-6 py-2 border-b border-border bg-muted/50 gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Job Title</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Joined</span>
                  <span />
                </div>
                {profiles.map((profile) => {
                  const isEditing = editingId === profile.id;
                  return (
                    <div key={profile.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto] px-6 py-3 items-center border-b border-border last:border-0 hover:bg-muted/50 transition-colors gap-4">
                      {isEditing ? (
                        <Input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                          className="h-7 text-sm py-0"
                          placeholder="Full name"
                        />
                      ) : (
                        <span className="text-sm font-medium text-foreground truncate">
                          {profile.full_name || <span className="text-muted-foreground/50">—</span>}
                          {profile.id === user?.id && (
                            <span className="ml-2 text-[10px] text-muted-foreground">(you)</span>
                          )}
                        </span>
                      )}
                      {isEditing ? (
                        <Input
                          value={editForm.job_title}
                          onChange={(e) => setEditForm(f => ({ ...f, job_title: e.target.value }))}
                          className="h-7 text-xs py-0"
                          placeholder="Job title"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground truncate">{profile.job_title || <span className="opacity-40">—</span>}</span>
                      )}
                      {isEditing ? (
                        <Input
                          value={editForm.phone_number}
                          onChange={(e) => setEditForm(f => ({ ...f, phone_number: e.target.value }))}
                          className="h-7 text-xs py-0"
                          placeholder="Phone number"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground truncate">{profile.phone_number || <span className="opacity-40">—</span>}</span>
                      )}
                      <span className="text-sm text-muted-foreground truncate">{profile.email}</span>
                      <div>
                        <select
                          value={profile.role}
                          onChange={(e) => updateRole(profile.id, e.target.value as "admin" | "user")}
                          className="h-7 rounded border border-input bg-background px-2 py-0 text-xs"
                          disabled={profile.id === user?.id}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(profile.created_at).toLocaleDateString("en-GB")}
                      </span>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700" onClick={() => saveEdit(profile.id)} title="Save">
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => setEditingId(null)} title="Cancel">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => startEdit(profile)} title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Team Members</h1>
                <p className="text-sm text-muted-foreground">Manage the team members shown in proposals. Photos and bios are sourced from Shoothill.com.</p>
              </div>
              <Button
                className="bg-primary text-primary-foreground gap-2 text-xs font-bold uppercase tracking-wide"
                onClick={() => { setAddingTeam(true); setNewTeamForm({ full_name: "", job_title: "", bio: "", photo_url: "", linkedin_url: "", is_active: true }); }}
              >
                <Plus className="w-4 h-4" /> Add Member
              </Button>
            </div>

            {/* Add new team member form */}
            {addingTeam && (
              <div className="bg-card border border-primary/30 rounded p-6 mb-6 space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">New Team Member</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Full Name *</Label>
                    <Input value={newTeamForm.full_name} onChange={e => setNewTeamForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Jane Smith" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Job Title</Label>
                    <Input value={newTeamForm.job_title} onChange={e => setNewTeamForm(f => ({ ...f, job_title: e.target.value }))} placeholder="e.g. Head of Development" className="h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Photo URL</Label>
                  <Input value={newTeamForm.photo_url} onChange={e => setNewTeamForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://shoothill.com/wp-content/uploads/..." className="h-8 text-sm font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">LinkedIn URL</Label>
                  <Input value={newTeamForm.linkedin_url} onChange={e => setNewTeamForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://www.linkedin.com/in/..." className="h-8 text-sm font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Bio</Label>
                  <Textarea value={newTeamForm.bio} onChange={e => setNewTeamForm(f => ({ ...f, bio: e.target.value }))} rows={4} className="text-sm" placeholder="Client-facing bio for proposal display…" />
                </div>
                <div className="flex items-center gap-3">
                  <Button className="bg-primary text-primary-foreground text-xs h-8" onClick={addTeamMember}>Add Member</Button>
                  <Button variant="ghost" className="text-xs h-8" onClick={() => setAddingTeam(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {teamLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {teamMembers.map(member => {
                  const isEditing = editingTeamId === member.id;
                  return (
                    <div key={member.id} className={`bg-card border rounded p-0 overflow-hidden ${!member.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-start gap-0">
                        {/* Photo column */}
                        <div className="w-24 h-24 flex-shrink-0 bg-muted overflow-hidden">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover object-top" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <UserCircle2 className="w-10 h-10" />
                            </div>
                          )}
                        </div>

                        {/* Content column */}
                        <div className="flex-1 p-4 min-w-0">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Full Name</Label>
                                  <Input value={teamEditForm.full_name} onChange={e => setTeamEditForm(f => ({ ...f, full_name: e.target.value }))} className="h-7 text-xs" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Job Title</Label>
                                  <Input value={teamEditForm.job_title} onChange={e => setTeamEditForm(f => ({ ...f, job_title: e.target.value }))} className="h-7 text-xs" />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Photo URL</Label>
                                <Input value={teamEditForm.photo_url} onChange={e => setTeamEditForm(f => ({ ...f, photo_url: e.target.value }))} className="h-7 text-xs font-mono" placeholder="https://shoothill.com/…" />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">LinkedIn URL</Label>
                                <Input value={teamEditForm.linkedin_url} onChange={e => setTeamEditForm(f => ({ ...f, linkedin_url: e.target.value }))} className="h-7 text-xs font-mono" placeholder="https://linkedin.com/in/…" />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Bio</Label>
                                <Textarea value={teamEditForm.bio} onChange={e => setTeamEditForm(f => ({ ...f, bio: e.target.value }))} rows={4} className="text-xs" />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                  <input type="checkbox" checked={teamEditForm.is_active} onChange={e => setTeamEditForm(f => ({ ...f, is_active: e.target.checked }))} className="w-3 h-3" />
                                  Active (shown in proposal picker)
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground" onClick={() => saveTeamMember(member.id)}>
                                  <Check className="w-3 h-3 mr-1" /> Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingTeamId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <span className="font-bold text-sm text-foreground">{member.full_name}</span>
                                  {!member.is_active && <span className="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inactive</span>}
                                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mt-0.5">{member.job_title}</div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {member.linkedin_url && (
                                    <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="LinkedIn">
                                      <LinkIcon className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => startEditTeam(member)} title="Edit">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteTeamMember(member.id)} title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{member.bio || <span className="italic opacity-50">No bio yet</span>}</p>
                              {member.photo_url && (
                                <div className="mt-2">
                                  <span className="text-xs font-mono text-muted-foreground/60 truncate block">{member.photo_url}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
