import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Proposal, Phase, UpfrontItem } from "@/types/proposal";
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
  office_phone: string;
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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  // Users state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [invitePhoneNumber, setInvitePhoneNumber] = useState("");
  const [inviteOfficePhone, setInviteOfficePhone] = useState("01743 636300");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", job_title: "", phone_number: "", office_phone: "" });

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

  // Ad-hoc contract generator state
  const [adhocView, setAdhocView] = useState<'templates' | 'adhoc' | 'all'>('templates');
  const [savingAdhoc, setSavingAdhoc] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [adhocLink, setAdhocLink] = useState<string | null>(null);
  const [allAgreements, setAllAgreements] = useState<any[]>([]);
  const [allAgreementsLoading, setAllAgreementsLoading] = useState(false);
  const [adhocForm, setAdhocForm] = useState({
    clientName: '',
    organisation: '',
    programmeTitle: '',
    agreementDate: new Date().toISOString().split('T')[0],
    contactName: '',
    contactEmail: '',
    paymentTerms: '50% on commencement / 50% on delivery',
    templateId: '',
    phases: [] as Phase[],
    upfrontItems: [] as UpfrontItem[],
    ongoingOptions: [] as Array<{ name: string; yearlyCosts: number[]; term: number; frequency: 'weekly' | 'monthly' | 'annual' }>,
  });

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

  const fetchAllAgreements = async () => {
    setAllAgreementsLoading(true);
    // 1. All ad-hoc contracts (all statuses)
    const { data: adhocData } = await supabase
      .from('adhoc_contracts' as any)
      .select('id, slug, status, client_name, organisation, programme_title, contact_name, signer_name, signer_title, signed_at, signed_contract_url, created_at')
      .order('created_at', { ascending: false });

    // 2. Proposal acceptances
    const { data: acceptances } = await supabase
      .from('proposal_acceptances' as any)
      .select('id, proposal_id, signer_name, signer_title, signed_contract_url, created_at')
      .order('created_at', { ascending: false });

    // 3. Fetch proposal metadata for those acceptances
    let proposalMap: Record<string, any> = {};
    const acceptanceList = (acceptances as any[] || []);
    if (acceptanceList.length > 0) {
      const ids = [...new Set(acceptanceList.map((a: any) => a.proposal_id))];
      const { data: proposalData } = await supabase
        .from('proposals' as any)
        .select('id, client_name, organisation, programme_title, contact_name, prepared_by')
        .in('id', ids);
      (proposalData as any[] || []).forEach((p: any) => { proposalMap[p.id] = p; });
    }

    // 4. Normalise into one list
    const adhocRows = (adhocData as any[] || []).map((c: any) => ({
      _key: `adhoc-${c.id}`,
      source: 'adhoc',
      status: c.status,
      slug: c.slug,
      client_name: c.client_name,
      organisation: c.organisation,
      programme_title: c.programme_title,
      contact_name: c.contact_name,
      signer_name: c.signer_name,
      signer_title: c.signer_title,
      date: c.signed_at || c.created_at,
      signed_contract_url: c.signed_contract_url,
    }));

    const proposalRows = acceptanceList.map((a: any) => {
      const p = proposalMap[a.proposal_id] || {};
      return {
        _key: `proposal-${a.id}`,
        source: 'proposal',
        status: 'signed',
        slug: null,
        client_name: p.client_name || '—',
        organisation: p.organisation || '',
        programme_title: p.programme_title || '',
        contact_name: p.prepared_by ? p.prepared_by.split(',')[0].trim() : (p.contact_name || ''),
        signer_name: a.signer_name,
        signer_title: a.signer_title,
        date: a.created_at,
        signed_contract_url: a.signed_contract_url,
      };
    });

    const merged = [...adhocRows, ...proposalRows].sort((a, b) =>
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
    setAllAgreements(merged);
    setAllAgreementsLoading(false);
  };

  const saveDraftAdhocContract = async () => {
    if (!adhocForm.clientName.trim()) { toast.error('Enter a client name first'); return; }
    setSavingDraft(true);
    const { error } = await supabase
      .from('adhoc_contracts' as any)
      .insert({
        status: 'draft',
        client_name: adhocForm.clientName,
        organisation: adhocForm.organisation,
        programme_title: adhocForm.programmeTitle,
        agreement_date: adhocForm.agreementDate,
        contact_name: adhocForm.contactName,
        contact_email: adhocForm.contactEmail,
        payment_terms: adhocForm.paymentTerms,
        template_id: adhocForm.templateId || null,
        phases: adhocForm.phases,
        upfront_items: adhocForm.upfrontItems,
        ongoing_options: adhocForm.ongoingOptions,
      });
    setSavingDraft(false);
    if (error) { toast.error('Failed to save draft'); return; }
    toast.success('Draft saved — find it in All Agreements');
  };

  // Term is always in months. yearlyCosts[i] = cost for year i.
  const getAdhocOptionTotal = (opt: { yearlyCosts: number[]; term: number; frequency: 'weekly' | 'monthly' | 'annual' }) => {
    const numYears = Math.ceil(Math.max(opt.term, 1) / 12);
    const costs: number[] = Array.from({ length: numYears }, (_, y) =>
      opt.yearlyCosts[y] ?? (opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0)
    );
    if (opt.frequency === 'annual') return costs.reduce((s, c) => s + c, 0);
    return costs.reduce((s, c, idx) => {
      const months = idx === numYears - 1 ? (opt.term % 12 || 12) : 12;
      const periods = opt.frequency === 'monthly' ? months : Math.round(months * 52 / 12);
      return s + c * periods;
    }, 0);
  };

  const saveAdhocContract = async () => {
    if (!adhocForm.clientName.trim()) { toast.error('Enter a client name first'); return; }
    setSavingAdhoc(true);
    const { data, error } = await supabase
      .from('adhoc_contracts' as any)
      .insert({
        status: 'pending',
        client_name: adhocForm.clientName,
        organisation: adhocForm.organisation,
        programme_title: adhocForm.programmeTitle,
        agreement_date: adhocForm.agreementDate,
        contact_name: adhocForm.contactName,
        contact_email: adhocForm.contactEmail,
        payment_terms: adhocForm.paymentTerms,
        template_id: adhocForm.templateId || null,
        phases: adhocForm.phases,
        upfront_items: adhocForm.upfrontItems,
        ongoing_options: adhocForm.ongoingOptions,
      })
      .select('slug')
      .single();
    setSavingAdhoc(false);
    if (error) { toast.error('Failed to create contract'); return; }
    setAdhocLink(`${window.location.origin}/ac/${(data as any).slug}/sign`);
    toast.success('Contract created — share the signing link below');
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
      body: { email: inviteEmail, password: invitePassword, full_name: inviteFullName, job_title: inviteJobTitle, phone_number: invitePhoneNumber, office_phone: inviteOfficePhone, role: inviteRole },
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
    setInviteOfficePhone("01743 636300");
    setInvitePassword("");
    setInviteRole("user");
    setInviting(false);
    fetchProfiles();
  };

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditForm({ full_name: profile.full_name || "", job_title: profile.job_title || "", phone_number: profile.phone_number || "", office_phone: profile.office_phone || "" });
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
        {activeTab === "proposals" && (() => {
          const fmtGbp = (n: number) => n === 0 ? '—' : `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
          const monthlyTotal = (p: Proposal) => ((p.retainer_options || []) as any[]).reduce((s: number, r: any) => s + (r.price ?? 0) * (r.quantity ?? 1), 0);
          const uniqueSectors = [...new Set(proposals.map(p => p.sector).filter(Boolean))] as string[];
          const uniqueUsers = [...new Set(proposals.map(p => p.prepared_by).filter(Boolean))] as string[];
          const filtered = proposals.filter(p => {
            if (filterStatus !== 'all' && p.status !== filterStatus) return false;
            if (filterSector !== 'all' && p.sector !== filterSector) return false;
            if (filterUser !== 'all' && p.prepared_by !== filterUser) return false;
            return true;
          });
          const grandUpfront = filtered.reduce((s, p) => s + (p.upfront_total || 0), 0);
          const grandMonthly = filtered.reduce((s, p) => s + monthlyTotal(p), 0);
          const selectCls = "h-8 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground";

          return (
            <>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Proposals</h1>
              <p className="text-sm text-muted-foreground mb-5">Create, manage and share client proposals.</p>

              {/* Filter bar */}
              {!proposalsLoading && proposals.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <select className={selectCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                  </select>
                  {uniqueSectors.length > 0 && (
                    <select className={selectCls} value={filterSector} onChange={e => setFilterSector(e.target.value)}>
                      <option value="all">All services</option>
                      {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {uniqueUsers.length > 1 && (
                    <select className={selectCls} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                      <option value="all">All team members</option>
                      {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  )}
                  {(filterStatus !== 'all' || filterSector !== 'all' || filterUser !== 'all') && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                      onClick={() => { setFilterStatus('all'); setFilterSector('all'); setFilterUser('all'); }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

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
              ) : filtered.length === 0 ? (
                <div className="bg-card border border-border p-12 text-center">
                  <p className="text-muted-foreground">No proposals match the current filters.</p>
                </div>
              ) : (
                <>
                  <div className="bg-card border border-border divide-y divide-border">
                    {filtered.map(p => {
                      const mo = monthlyTotal(p);
                      return (
                        <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-sm font-bold text-foreground truncate">{p.client_name || 'Untitled'}</h3>
                              <Badge className={`${getStatusColor(p.status)} text-[10px] font-bold uppercase tracking-wider`}>{p.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{p.programme_title || 'Untitled project'} · {new Date(p.created_at).toLocaleDateString('en-GB')}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {p.sector && <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{p.sector}</span>}
                              {p.prepared_by && <span className="text-[11px] text-muted-foreground">{p.prepared_by}</span>}
                            </div>
                          </div>
                          {/* Financials */}
                          <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 min-w-[120px] text-right">
                            <div className="text-sm font-bold text-foreground">{fmtGbp(p.upfront_total || 0)} <span className="text-[10px] font-normal text-muted-foreground">upfront</span></div>
                            {mo > 0 && <div className="text-xs text-muted-foreground">{fmtGbp(mo)}<span className="text-[10px]">/mo</span></div>}
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
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
                              <a href={`/contracts/${signedContracts[p.id]}`} target="_blank" rel="noopener noreferrer" title="Download signed contract">
                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grand totals */}
                  <div className="bg-muted/60 border border-border border-t-0 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-xs text-muted-foreground">{filtered.length} proposal{filtered.length !== 1 ? 's' : ''}</span>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total upfront</div>
                        <div className="text-sm font-bold text-foreground">{fmtGbp(grandUpfront)}</div>
                      </div>
                      {grandMonthly > 0 && (
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total monthly</div>
                          <div className="text-sm font-bold text-foreground">{fmtGbp(grandMonthly)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          );
        })()}

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
            {/* Header + view toggle */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Agreements</h1>
                <p className="text-sm text-muted-foreground">Manage service agreement templates or generate a standalone ad-hoc contract.</p>
              </div>
              <div className="flex gap-1 border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setAdhocView('templates')}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${adhocView === 'templates' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >Templates</button>
                <button
                  onClick={() => setAdhocView('adhoc')}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${adhocView === 'adhoc' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >Ad-Hoc Generator</button>
                <button
                  onClick={() => { setAdhocView('all'); fetchAllAgreements(); }}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${adhocView === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >All Agreements</button>
              </div>
            </div>

            {/* ── TEMPLATES VIEW ── */}
            {adhocView === 'templates' && (<>
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
            </>)}

            {/* ── AD-HOC GENERATOR VIEW ── */}
            {adhocView === 'adhoc' && (
              <div className="space-y-6 max-w-3xl">

                {/* Client Details */}
                <div className="bg-card border border-border p-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Client Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client Name <span className="text-destructive">*</span></Label>
                      <Input value={adhocForm.clientName} onChange={e => setAdhocForm(f => ({ ...f, clientName: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Acme Corp" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Organisation</Label>
                      <Input value={adhocForm.organisation} onChange={e => setAdhocForm(f => ({ ...f, organisation: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Acme Corporation Ltd" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Programme Title</Label>
                      <Input value={adhocForm.programmeTitle} onChange={e => setAdhocForm(f => ({ ...f, programmeTitle: e.target.value }))} className="h-8 text-sm" placeholder="e.g. IT Support Agreement" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agreement Date</Label>
                      <Input type="date" value={adhocForm.agreementDate} onChange={e => setAdhocForm(f => ({ ...f, agreementDate: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shoothill Contact</Label>
                      <select
                        value={adhocForm.contactName}
                        onChange={e => {
                          const profile = profiles.find(p => p.full_name === e.target.value);
                          setAdhocForm(f => ({
                            ...f,
                            contactName: profile?.full_name ?? e.target.value,
                            contactEmail: profile?.email ?? f.contactEmail,
                          }));
                        }}
                        className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm w-full"
                      >
                        <option value="">— Select a contact —</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.full_name}>{p.full_name}{p.job_title ? ` — ${p.job_title}` : ''}</option>
                        ))}
                      </select>
                      {adhocForm.contactEmail && (
                        <p className="text-xs text-muted-foreground mt-1">{adhocForm.contactEmail}</p>
                      )}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Terms</Label>
                      <Input value={adhocForm.paymentTerms} onChange={e => setAdhocForm(f => ({ ...f, paymentTerms: e.target.value }))} className="h-8 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Agreement Template */}
                <div className="bg-card border border-border p-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">Agreement Template</h2>
                  <select
                    value={adhocForm.templateId}
                    onChange={e => setAdhocForm(f => ({ ...f, templateId: e.target.value }))}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-full"
                  >
                    <option value="">— Select a template (optional) —</option>
                    {agreementTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">The template's clauses will be included in the contract. Leave blank for clauses-only.</p>
                </div>

                {/* Phases of Work */}
                <div className="bg-card border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Phases of Work</h2>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs h-7"
                      onClick={() => setAdhocForm(f => ({ ...f, phases: [...f.phases, { label: `Phase ${f.phases.length + 1}`, title: '', duration: '', tasks: [], price: '' }] }))}>
                      <Plus className="w-3.5 h-3.5" /> Add Phase
                    </Button>
                  </div>
                  {adhocForm.phases.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No phases added yet.</p>
                  )}
                  <div className="space-y-3">
                    {adhocForm.phases.map((p, i) => (
                      <div key={i} className="bg-muted border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">{p.label || `Phase ${i + 1}`}</span>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                            onClick={() => setAdhocForm(f => ({ ...f, phases: f.phases.filter((_, j) => j !== i) }))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Label</Label>
                            <Input value={p.label} onChange={e => { const ps = [...adhocForm.phases]; ps[i] = { ...ps[i], label: e.target.value }; setAdhocForm(f => ({ ...f, phases: ps })); }} className="h-7 text-xs" placeholder="Phase 1" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Title</Label>
                            <Input value={p.title} onChange={e => { const ps = [...adhocForm.phases]; ps[i] = { ...ps[i], title: e.target.value }; setAdhocForm(f => ({ ...f, phases: ps })); }} className="h-7 text-xs" placeholder="Discovery & Planning" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Duration</Label>
                            <Input value={p.duration} onChange={e => { const ps = [...adhocForm.phases]; ps[i] = { ...ps[i], duration: e.target.value }; setAdhocForm(f => ({ ...f, phases: ps })); }} className="h-7 text-xs" placeholder="2 wks" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Price (£, optional)</Label>
                            <Input value={p.price} onChange={e => { const ps = [...adhocForm.phases]; ps[i] = { ...ps[i], price: e.target.value }; setAdhocForm(f => ({ ...f, phases: ps })); }} className="h-7 text-xs" placeholder="£5,000" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upfront Pricing */}
                <div className="bg-card border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Upfront Pricing</h2>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs h-7"
                      onClick={() => setAdhocForm(f => ({ ...f, upfrontItems: [...f.upfrontItems, { type: '', name: '', price: 0 }] }))}>
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </Button>
                  </div>
                  {adhocForm.upfrontItems.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No items added yet.</p>
                  )}
                  <div className="space-y-3">
                    {adhocForm.upfrontItems.map((item, i) => (
                      <div key={i} className="bg-muted border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground">{item.name || 'Untitled item'}</span>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                            onClick={() => setAdhocForm(f => ({ ...f, upfrontItems: f.upfrontItems.filter((_, j) => j !== i) }))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Input value={item.name} onChange={e => { const items = [...adhocForm.upfrontItems]; items[i] = { ...items[i], name: e.target.value }; setAdhocForm(f => ({ ...f, upfrontItems: items })); }} className="h-7 text-xs" placeholder="e.g. Initial setup fee" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Price (£)</Label>
                            <Input type="number" min="0" value={item.price || ''} onChange={e => { const items = [...adhocForm.upfrontItems]; items[i] = { ...items[i], price: Number(e.target.value) || 0 }; setAdhocForm(f => ({ ...f, upfrontItems: items })); }} className="h-7 text-xs" placeholder="0" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {adhocForm.upfrontItems.length > 0 && (
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Upfront Total</span>
                      <span className="text-sm font-bold text-foreground">£{adhocForm.upfrontItems.reduce((s, i) => s + i.price, 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                {/* Ongoing Options */}
                <div className="bg-card border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Ongoing Options <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional)</span></h2>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => setAdhocForm(f => ({ ...f, ongoingOptions: [...f.ongoingOptions, { name: '', yearlyCosts: [0], term: 12, frequency: 'monthly' as const }] }))}>
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </Button>
                  </div>
                  {adhocForm.ongoingOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No ongoing options added yet.</p>
                  )}
                  <div className="space-y-3">
                    {adhocForm.ongoingOptions.map((opt, i) => {
                      const numYears = Math.ceil(Math.max(opt.term, 1) / 12);
                      const displayCosts: number[] = Array.from({ length: numYears }, (_, y) =>
                        opt.yearlyCosts[y] ?? (opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0)
                      );
                      const optTotal = getAdhocOptionTotal(opt);
                      return (
                        <div key={i} className="bg-muted border border-border p-3 space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Option {i + 1}</span>
                            <button
                              onClick={() => setAdhocForm(f => ({ ...f, ongoingOptions: f.ongoingOptions.filter((_, j) => j !== i) }))}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            ><X className="w-3.5 h-3.5" /></button>
                          </div>

                          {/* Description */}
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Input
                              value={opt.name}
                              onChange={e => { const opts = [...adhocForm.ongoingOptions]; opts[i] = { ...opts[i], name: e.target.value }; setAdhocForm(f => ({ ...f, ongoingOptions: opts })); }}
                              className="h-7 text-xs" placeholder="e.g. Monthly Support Retainer"
                            />
                          </div>

                          {/* Frequency + Term */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Frequency</Label>
                              <select
                                value={opt.frequency}
                                onChange={e => { const opts = [...adhocForm.ongoingOptions]; opts[i] = { ...opts[i], frequency: e.target.value as 'weekly' | 'monthly' | 'annual' }; setAdhocForm(f => ({ ...f, ongoingOptions: opts })); }}
                                className="h-7 rounded-md border border-input bg-background px-2 text-xs w-full"
                              >
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="annual">Annual</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Term (months)</Label>
                              <Input
                                type="number" min="1"
                                value={opt.term || ''}
                                onChange={e => {
                                  const opts = [...adhocForm.ongoingOptions];
                                  const newTerm = Number(e.target.value) || 1;
                                  const newNumYears = Math.ceil(newTerm / 12);
                                  const current = [...opts[i].yearlyCosts];
                                  while (current.length < newNumYears) current.push(current[current.length - 1] ?? 0);
                                  opts[i] = { ...opts[i], term: newTerm, yearlyCosts: current.slice(0, newNumYears) };
                                  setAdhocForm(f => ({ ...f, ongoingOptions: opts }));
                                }}
                                className="h-7 text-xs" placeholder="12"
                              />
                            </div>
                          </div>

                          {/* Per-year costs */}
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              Cost per year (£) — {opt.frequency === 'annual' ? 'paid annually' : opt.frequency === 'weekly' ? 'cost per week for that year' : 'cost per month for that year'}
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                              {displayCosts.map((c, y) => (
                                <div key={y} className="space-y-0.5">
                                  <span className="text-[9px] text-muted-foreground font-medium">Year {y + 1}</span>
                                  <Input
                                    type="number" min="0"
                                    value={c || ''}
                                    onChange={e => {
                                      const opts = [...adhocForm.ongoingOptions];
                                      const newCosts = [...displayCosts];
                                      newCosts[y] = Number(e.target.value) || 0;
                                      opts[i] = { ...opts[i], yearlyCosts: newCosts };
                                      setAdhocForm(f => ({ ...f, ongoingOptions: opts }));
                                    }}
                                    className="h-7 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Total */}
                          <div className="flex justify-between items-center pt-2 border-t border-border">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total Cost</span>
                            <span className="text-sm font-bold text-foreground">£{optTotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Save buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-10 text-sm font-bold uppercase tracking-wide"
                    onClick={saveDraftAdhocContract}
                    disabled={savingDraft || savingAdhoc}
                  >
                    {savingDraft ? (
                      <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Saving…</>
                    ) : 'Save as Draft'}
                  </Button>
                  <Button
                    className="h-10 text-sm font-bold uppercase tracking-wide"
                    onClick={saveAdhocContract}
                    disabled={savingAdhoc || savingDraft}
                  >
                    {savingAdhoc ? (
                      <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Saving…</>
                    ) : 'Save & Generate Signing Link'}
                  </Button>
                </div>

                {/* Generated link */}
                {adhocLink && (
                  <div className="bg-card border border-primary p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Signing Link Ready</p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={adhocLink} className="flex-1 h-8 border border-border bg-muted px-3 text-xs font-mono rounded-md" />
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 flex-shrink-0"
                        onClick={() => { navigator.clipboard.writeText(adhocLink); toast.success('Copied!'); }}>
                        <LinkIcon className="w-3.5 h-3.5" /> Copy
                      </Button>
                      <a href={adhocLink} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" /> Open
                        </Button>
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">Share this link with your client for signing. Generate a new contract if you need to make changes.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── ALL AGREEMENTS VIEW ── */}
            {adhocView === 'all' && (
              <div>
                {allAgreementsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : allAgreements.length === 0 ? (
                  <div className="bg-card border border-border p-12 text-center">
                    <p className="text-muted-foreground">No agreements yet.</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Programme</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signed By</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                          <th className="px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAgreements.map((c: any, i: number) => {
                          const statusBadge = c.status === 'draft'
                            ? <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-muted text-muted-foreground">Draft</span>
                            : c.status === 'pending'
                            ? <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Sent</span>
                            : <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Signed</span>;
                          const sourceBadge = c.source === 'proposal'
                            ? <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Proposal</span>
                            : <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">Ad-Hoc</span>;
                          const dateStr = c.date ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                          const signingLink = c.slug ? `${window.location.origin}/ac/${c.slug}/sign` : null;
                          return (
                            <tr key={c._key} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                              <td className="px-4 py-3">{statusBadge}</td>
                              <td className="px-4 py-3">{sourceBadge}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-foreground">{c.client_name}</div>
                                {c.organisation && <div className="text-xs text-muted-foreground">{c.organisation}</div>}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{c.programme_title || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{c.signer_name || '—'}</div>
                                {c.signer_title && <div className="text-xs text-muted-foreground">{c.signer_title}</div>}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{c.contact_name || '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{dateStr}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  {c.status === 'signed' && c.signed_contract_url && (
                                    <a
                                      href={supabase.storage.from('contracts').getPublicUrl(c.signed_contract_url).data.publicUrl}
                                      target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Download
                                    </a>
                                  )}
                                  {c.status === 'pending' && signingLink && (
                                    <button
                                      onClick={() => { navigator.clipboard.writeText(signingLink); toast.success('Signing link copied!'); }}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5" /> Copy Link
                                    </button>
                                  )}
                                  {c.status === 'draft' && <span className="text-xs text-muted-foreground">Draft</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile / Direct</Label>
                  <Input
                    type="tel"
                    value={invitePhoneNumber}
                    onChange={(e) => setInvitePhoneNumber(e.target.value)}
                    placeholder="07700 900000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Office Phone</Label>
                  <Input
                    type="tel"
                    value={inviteOfficePhone}
                    onChange={(e) => setInviteOfficePhone(e.target.value)}
                    placeholder="01743 636300"
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
                          placeholder="Mobile / direct"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground truncate">{profile.phone_number || <span className="opacity-40">—</span>}</span>
                      )}
                      {isEditing ? (
                        <Input
                          value={editForm.office_phone}
                          onChange={(e) => setEditForm(f => ({ ...f, office_phone: e.target.value }))}
                          className="h-7 text-xs py-0"
                          placeholder="Office phone"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground truncate">{profile.office_phone || <span className="opacity-40">—</span>}</span>
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
