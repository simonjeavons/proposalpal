import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Challenge, Phase, RetainerOption, UpfrontItem } from "@/types/proposal";
import { DEFAULT_CHALLENGES, DEFAULT_PHASES, DEFAULT_RETAINER_OPTIONS } from "@/types/proposal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Plus, Trash2, Eye, Upload, FileText, X, BookmarkPlus, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  job_title: string;
  phone_number: string;
  office_phone: string;
  team_member_id: string | null;
}

interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
  bio: string;
  photo_url: string;
  linkedin_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface ServiceType {
  id: string;
  name: string;
  sort_order: number;
  is_upfront: boolean;
  is_ongoing: boolean;
  partnership_overview_template: string;
  commercial_opportunity_template: string;
  strategic_focus_template: string;
  whats_needed_template: string;
  working_together_template: string;
}

interface Product {
  id: string;
  name: string;
  default_price: number;
  description: string;
  is_upfront: boolean;
  is_ongoing: boolean;
  service_type_id: string | null;
}

interface AgreementTemplate {
  id: string;
  name: string;
  sort_order: number;
}

interface FormData {
  client_name: string;
  programme_title: string;
  prepared_by: string;
  prepared_by_user_id: string;
  proposal_date: string;
  valid_until: string;
  organisation: string;
  sector: string;
  staff: string;
  tech_stack: string;
  challenge_intro: string;
  challenges: Challenge[];
  phases: Phase[];
  upfront_items: UpfrontItem[];
  upfront_notes: string;
  upfront_section_title: string;
  core_section_title: string;
  ongoing_section_title: string;
  retainer_options: RetainerOption[];
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_mobile: string;
  client_email: string;
  payment_terms: string;
  service_agreement_template_id: string | null;
  partnership_overview: string;
  commercial_opportunity: string;
  strategic_focus: string;
  whats_needed: string;
  working_together: string;
  team_member_ids: string[];
  status: string;
}

const today = () => new Date().toISOString().split('T')[0];
const in30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

function reorderArray<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

function SortableItem({ id, children }: { id: string; children: (props: { dragHandleProps: React.HTMLAttributes<HTMLDivElement>; style: React.CSSProperties }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners }, style })}
    </div>
  );
}

export default function ProposalEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const [contractFileUrl, setContractFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showImportPhaseOptions, setShowImportPhaseOptions] = useState(false);
  const [agreementTemplates, setAgreementTemplates] = useState<AgreementTemplate[]>([]);

  const [form, setForm] = useState<FormData>({
    client_name: '',
    programme_title: '',
    prepared_by: '',
    prepared_by_user_id: '',
    proposal_date: today(),
    valid_until: in30Days(),
    organisation: '',
    sector: '',
    staff: '',
    tech_stack: '',
    challenge_intro: '',
    challenges: [],
    phases: [],
    upfront_items: [],
    upfront_notes: '',
    upfront_section_title: '',
    core_section_title: '',
    ongoing_section_title: '',
    retainer_options: [...DEFAULT_RETAINER_OPTIONS],
    contact_name: '',
    contact_email: 'josh.welch@shoothill.com',
    contact_phone: '01743 636 300',
    contact_mobile: '07904 810 378',
    client_email: '',
    payment_terms: '',
    service_agreement_template_id: null,
    partnership_overview: '',
    commercial_opportunity: '',
    strategic_focus: '',
    whats_needed: '',
    working_together: '',
    team_member_ids: [],
    status: 'draft',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const challengeIds = form.challenges.map((_, i) => `challenge-${i}`);
  const retainerIds = form.retainer_options.map((_, i) => `retainer-${i}`);

  const handleChallengeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = challengeIds.indexOf(String(active.id));
    const to = challengeIds.indexOf(String(over.id));
    updateField('challenges', reorderArray(form.challenges, from, to));
  };

  const handleRetainerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = retainerIds.indexOf(String(active.id));
    const to = retainerIds.indexOf(String(over.id));
    updateField('retainer_options', reorderArray(form.retainer_options, from, to));
  };

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, email, job_title, phone_number, office_phone, team_member_id").order("full_name").then(({ data }) => {
      if (data) setUsers(data as UserProfile[]);
    });
    (supabase as any).from("team_members").select("id, full_name, job_title, bio, photo_url, linkedin_url, is_active, sort_order").eq("is_active", true).order("sort_order").then(({ data }: { data: TeamMember[] | null }) => {
      if (data) setTeamMembers(data);
    });
    supabase.from("service_types" as any).select("id, name, sort_order, is_upfront, is_ongoing, partnership_overview_template, commercial_opportunity_template, strategic_focus_template, whats_needed_template, working_together_template").order("sort_order").then(({ data }) => {
      if (data) setServiceTypes(data as ServiceType[]);
    });
    supabase.from("products" as any).select("id, name, default_price, description, is_upfront, is_ongoing, service_type_id").order("sort_order").then(({ data }) => {
      if (data) setProducts(data as Product[]);
    });
    supabase.from("service_agreement_templates" as any)
      .select("id, name, sort_order").order("sort_order")
      .then(({ data }) => { if (data) setAgreementTemplates(data as any[]); });
  }, []);

  useEffect(() => {
    if (!isNew) {
      supabase.from("proposals").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setForm({
            client_name: data.client_name,
            programme_title: data.programme_title,
            prepared_by: data.prepared_by,
            prepared_by_user_id: (data as any).prepared_by_user_id || '',
            proposal_date: data.proposal_date,
            valid_until: data.valid_until,
            organisation: data.organisation,
            sector: data.sector,
            staff: data.staff,
            tech_stack: data.tech_stack,
            challenge_intro: data.challenge_intro,
            challenges: (data.challenges || []) as unknown as Challenge[],
            phases: ((data.phases as any[]) || []).map(p => ({ ...p, price: String(p.price || '').replace(/^£/, '').replace(/,/g, '') })) as Phase[],
            upfront_items: ((data as any).upfront_items || []) as UpfrontItem[],
            upfront_notes: (data as any).upfront_notes || '',
            upfront_section_title: (data as any).upfront_section_title || '',
            core_section_title: (data as any).core_section_title || '',
            ongoing_section_title: (data as any).ongoing_section_title || '',
            retainer_options: (data.retainer_options || []) as unknown as RetainerOption[],
            contact_name: data.contact_name,
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            contact_mobile: data.contact_mobile,
            client_email: (data as any).client_email || '',
            payment_terms: (data as any).payment_terms || '',
            service_agreement_template_id: (data as any).service_agreement_template_id || null,
            partnership_overview: (data as any).partnership_overview || '',
            commercial_opportunity: (data as any).commercial_opportunity || '',
            strategic_focus: (data as any).strategic_focus || '',
            whats_needed: (data as any).whats_needed || '',
            working_together: (data as any).working_together || '',
            team_member_ids: ((data as any).team_member_ids as string[]) || [],
            status: data.status,
          });
          setSlug(data.slug);
          setContractFileUrl((data as any).contract_file_url || null);
          setClientLogoUrl((data as any).client_logo_url || null);
        }
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const save = async () => {
    setSaving(true);
    const preparedUser = users.find(u => u.id === form.prepared_by_user_id);
    const payload = {
      ...form,
      upfront_total: form.upfront_items.reduce((sum, item) => sum + item.price, 0),
      contract_file_url: contractFileUrl,
      client_logo_url: clientLogoUrl,
      prepared_by_user_id: form.prepared_by_user_id || null,
      lead_team_member_id: preparedUser?.team_member_id || null,
    } as any;
    if (isNew) {
      const { data, error } = await supabase.from("proposals").insert(payload).select().single();
      if (error) { toast.error("Failed to save"); setSaving(false); return; }
      toast.success("Proposal created!");
      navigate(`/admin/proposals/${data.id}`);
    } else {
      const { error } = await supabase.from("proposals").update(payload).eq("id", id);
      if (error) { toast.error("Failed to save"); setSaving(false); return; }
      toast.success("Proposal saved!");
    }
    setSaving(false);
  };

  const uploadContract = async (file: File) => {
    setUploading(true);
    const path = `${id || 'new'}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('contracts').upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    setContractFileUrl(path);
    toast.success("Contract uploaded");
    setUploading(false);
  };

  const removeContract = async () => {
    if (contractFileUrl) {
      await supabase.storage.from('contracts').remove([contractFileUrl]);
    }
    setContractFileUrl(null);
  };

  const uploadClientLogo = async (file: File) => {
    setUploadingLogo(true);
    const path = `logos/${id || 'new'}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('proposal-assets').upload(path, file, { upsert: true });
    if (error) { toast.error("Logo upload failed"); setUploadingLogo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('proposal-assets').getPublicUrl(path);
    setClientLogoUrl(publicUrl);
    toast.success("Logo uploaded");
    setUploadingLogo(false);
  };

  const removeClientLogo = async () => {
    if (clientLogoUrl) {
      const path = clientLogoUrl.split('/proposal-assets/')[1];
      if (path) await supabase.storage.from('proposal-assets').remove([path]);
    }
    setClientLogoUrl(null);
  };

  const updateField = (field: keyof FormData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const selectPreparedByUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      setForm(prev => ({ ...prev, prepared_by_user_id: '', prepared_by: '' }));
      return;
    }
    setForm(prev => ({
      ...prev,
      prepared_by_user_id: user.id,
      prepared_by: user.job_title ? `${user.full_name}, ${user.job_title}` : user.full_name,
      contact_email: user.email,
      contact_phone: user.office_phone || user.phone_number,
    }));
  };

  const updateChallenge = (i: number, field: keyof Challenge, value: string) => {
    const updated = [...form.challenges];
    updated[i] = { ...updated[i], [field]: value };
    updateField('challenges', updated);
  };

  const updatePhase = (i: number, field: string, value: any) => {
    const updated = [...form.phases];
    updated[i] = { ...updated[i], [field]: value };
    updateField('phases', updated);
  };

  const updateRetainer = (i: number, field: string, value: any) => {
    const updated = [...form.retainer_options];
    updated[i] = { ...updated[i], [field]: value };
    updateField('retainer_options', updated);
  };

  const currentServiceTypeId = serviceTypes.find(st => st.name === form.sector)?.id ?? null;

  const saveItemToLibrary = async (itemName: string, price: number, description: string, kind: 'upfront' | 'ongoing') => {
    if (!itemName) return;
    const nextOrder = products.length > 0 ? Math.max(...products.map(p => parseInt(String((p as any).sort_order ?? 0)))) + 1 : 1;
    const { data, error } = await supabase.from("products" as any).insert({
      name: itemName,
      default_price: price,
      description: description ?? '',
      is_upfront: kind === 'upfront',
      is_ongoing: kind === 'ongoing',
      sort_order: nextOrder,
      service_type_id: currentServiceTypeId,
    }).select().single();
    if (!error && data) {
      setProducts(prev => [...prev, data as Product]);
      toast.success(`"${itemName}" saved to solutions library`);
    } else {
      toast.error('Failed to save to library');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-secondary text-secondary-foreground sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-secondary-foreground/60 hover:text-secondary-foreground gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <span className="text-sm font-bold">{isNew ? 'New Proposal' : form.client_name || 'Edit Proposal'}</span>
          </div>
          <div className="flex items-center gap-2">
            {slug && (
              <Link to={`/p/${slug}`} target="_blank">
                <Button variant="ghost" size="sm" className="text-secondary-foreground/60 hover:text-secondary-foreground gap-1">
                  <Eye className="w-4 h-4" /> Preview
                </Button>
              </Link>
            )}
            <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground gap-2 text-xs font-bold uppercase tracking-wide">
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Status */}
        <Section title="Status">
          <div className="flex gap-2">
            {['draft', 'sent', 'accepted'].map(s => (
              <button key={s} onClick={() => updateField('status', s)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${form.status === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary'}`}
              >{s}</button>
            ))}
          </div>
        </Section>

        {/* Proposal Details */}
        <Section title="Proposal Details">
          <Grid>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Type</Label>
              <select
                value={form.sector}
                onChange={e => {
                  const newSector = e.target.value;
                  const st = serviceTypes.find(s => s.name === newSector);
                  setForm(prev => {
                    const updates: Partial<typeof prev> = { sector: newSector };
                    if (st) {
                      if (!prev.partnership_overview && st.partnership_overview_template)
                        updates.partnership_overview = st.partnership_overview_template;
                      if (!prev.commercial_opportunity && st.commercial_opportunity_template)
                        updates.commercial_opportunity = st.commercial_opportunity_template;
                      if (!prev.strategic_focus && st.strategic_focus_template)
                        updates.strategic_focus = st.strategic_focus_template;
                      if (!prev.whats_needed && st.whats_needed_template)
                        updates.whats_needed = st.whats_needed_template;
                      if (!prev.working_together && st.working_together_template)
                        updates.working_together = st.working_together_template;
                    }
                    return { ...prev, ...updates };
                  });
                  setShowImportOptions(false);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select a type…</option>
                {serviceTypes.map(st => (
                  <option key={st.id} value={st.name}>{st.name}</option>
                ))}
              </select>
            </div>
            <Field label="Project Title" value={form.programme_title} onChange={v => updateField('programme_title', v)} />
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Prepared By</Label>
              <select
                value={form.prepared_by_user_id}
                onChange={e => selectPreparedByUser(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select a user…</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}{u.job_title ? `, ${u.job_title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Proposal Date" value={form.proposal_date} onChange={v => updateField('proposal_date', v)} type="date" />
            <Field label="Valid Until" value={form.valid_until} onChange={v => updateField('valid_until', v)} type="date" />
          </Grid>
        </Section>

        {/* Client Details */}
        <Section title="Client Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client Name" value={form.client_name} onChange={v => updateField('client_name', v)} />
            <Field label="Client Contact Name" value={form.contact_name} onChange={v => updateField('contact_name', v)} />
            <Field label="Client Email" value={form.client_email} onChange={v => updateField('client_email', v)} type="email" />
            <Field label="Staff" value={form.staff} onChange={v => updateField('staff', v)} />
            <div className="col-span-2">
              <Field label="Current Tech Stack" value={form.tech_stack} onChange={v => updateField('tech_stack', v)} />
            </div>
            {/* Client Logo */}
            <div className="col-span-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Client Logo <span className="font-normal normal-case">(displayed in proposal header)</span></Label>
              {clientLogoUrl ? (
                <div className="flex items-center gap-3 bg-muted p-3 border border-border">
                  <img src={clientLogoUrl} alt="Client logo" className="h-10 object-contain max-w-[160px]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Logo uploaded</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={removeClientLogo} title="Remove logo">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{uploadingLogo ? 'Uploading…' : 'Upload client logo — PNG, JPG or SVG'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadClientLogo(f); e.target.value = ''; }}
                    disabled={uploadingLogo}
                  />
                </label>
              )}
            </div>
          </div>
        </Section>

        {/* Your Business and Our Partnership */}
        <Section title="Your Business and Our Partnership">
          <p className="text-xs text-muted-foreground mb-3">Free-form narrative shown near the top of the proposal, before the Understanding section. Leave blank to omit.</p>
          <Textarea
            value={form.partnership_overview}
            onChange={e => updateField('partnership_overview', e.target.value)}
            rows={6}
            className="text-sm"
            placeholder="e.g. Describe your understanding of the client's business context, the nature of the partnership, strategic goals…"
          />
        </Section>

        {/* Challenges */}
        <Section title="Challenges" action={
          <div className="flex items-center gap-2">
            {form.sector && serviceTypes.some(st => st.name === form.sector) && (
              showImportOptions ? (
                <>
                  <span className="text-xs text-muted-foreground">Import:</span>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={async () => {
                    const st = serviceTypes.find(s => s.name === form.sector);
                    if (!st) return;
                    const { data } = await supabase.from("service_type_challenges" as any).select("title, description").eq("service_type_id", st.id).order("sort_order");
                    if (data) updateField('challenges', data as Challenge[]);
                    setShowImportOptions(false);
                  }}>Replace existing</Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={async () => {
                    const st = serviceTypes.find(s => s.name === form.sector);
                    if (!st) return;
                    const { data } = await supabase.from("service_type_challenges" as any).select("title, description").eq("service_type_id", st.id).order("sort_order");
                    if (data) updateField('challenges', [...form.challenges, ...(data as Challenge[])]);
                    setShowImportOptions(false);
                  }}>Add to existing</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground" onClick={() => setShowImportOptions(false)}>Cancel</Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs" onClick={() => setShowImportOptions(true)}>
                  Import templates
                </Button>
              )
            )}
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => updateField('challenges', [...form.challenges, { title: '', description: '' }])}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        }>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Challenge Introduction</Label>
              <Textarea value={form.challenge_intro} onChange={e => updateField('challenge_intro', e.target.value)} rows={3} className="text-sm" placeholder="Introduce the challenges the client is facing…" />
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChallengeDragEnd}>
              <SortableContext items={challengeIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {form.challenges.map((c, i) => (
                    <SortableItem key={challengeIds[i]} id={challengeIds[i]}>
                      {({ dragHandleProps }) => (
                        <div className="flex gap-3 items-start bg-muted p-4 border border-border">
                          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing pt-2 text-muted-foreground hover:text-foreground">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Input placeholder="Challenge title" value={c.title} onChange={e => updateChallenge(i, 'title', e.target.value)} className="text-sm font-semibold" />
                            <Textarea placeholder="Description" value={c.description} onChange={e => updateChallenge(i, 'description', e.target.value)} rows={2} className="text-sm resize-y min-h-[4rem]" />
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <select
                              value={i}
                              onChange={e => updateField('challenges', reorderArray(form.challenges, i, Number(e.target.value)))}
                              className="h-7 w-12 text-xs text-center border border-border bg-background rounded"
                              title="Reorder"
                            >
                              {form.challenges.map((_, j) => <option key={j} value={j}>{j + 1}</option>)}
                            </select>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => updateField('challenges', form.challenges.filter((_, j) => j !== i))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </Section>

        {/* Marketing Services — additional sections */}
        {form.sector.toLowerCase().includes('marketing') && (
          <Section title="Marketing Details">
            <p className="text-xs text-muted-foreground mb-4">These sections are shown in the proposal beneath the Understanding section when content is entered. Leave any blank to omit it.</p>
            <div className="space-y-5">
              {[
                { field: 'commercial_opportunity' as const, label: 'Commercial Opportunity' },
                { field: 'strategic_focus' as const, label: 'Strategic Focus' },
                { field: 'whats_needed' as const, label: "What's Needed?" },
                { field: 'working_together' as const, label: 'Working Together' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{label}</Label>
                  <Textarea
                    value={form[field]}
                    onChange={e => updateField(field, e.target.value)}
                    rows={4}
                    className="text-sm"
                    placeholder={`Enter content for "${label}"…`}
                  />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Phases */}
        <Section title="Journey Phases" action={
          <div className="flex items-center gap-2">
            {form.sector && serviceTypes.some(st => st.name === form.sector) && (
              showImportPhaseOptions ? (
                <>
                  <span className="text-xs text-muted-foreground">Import:</span>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={async () => {
                    const st = serviceTypes.find(s => s.name === form.sector);
                    if (!st) return;
                    const { data } = await supabase.from("template_phases" as any).select("label, title, duration, tasks, price").eq("service_type_id", st.id).order("sort_order");
                    if (data) updateField('phases', (data as any[]).map(p => ({ ...p, tasks: Array.isArray(p.tasks) ? p.tasks : [] })));
                    setShowImportPhaseOptions(false);
                  }}>Replace existing</Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={async () => {
                    const st = serviceTypes.find(s => s.name === form.sector);
                    if (!st) return;
                    const { data } = await supabase.from("template_phases" as any).select("label, title, duration, tasks, price").eq("service_type_id", st.id).order("sort_order");
                    if (data) updateField('phases', [...form.phases, ...(data as any[]).map(p => ({ ...p, tasks: Array.isArray(p.tasks) ? p.tasks : [] }))]);
                    setShowImportPhaseOptions(false);
                  }}>Add to existing</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground" onClick={() => setShowImportPhaseOptions(false)}>Cancel</Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs" onClick={() => setShowImportPhaseOptions(true)}>
                  Import templates
                </Button>
              )
            )}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!form.hide_phase_durations}
                onChange={e => updateField('hide_phase_durations', !e.target.checked)}
                className="accent-primary"
              />
              Show durations
            </label>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => updateField('phases', [...form.phases, { label: `Phase ${form.phases.length + 1}`, title: '', duration: '', tasks: [], price: '' }])}>
              <Plus className="w-4 h-4" /> Add Phase
            </Button>
          </div>
        }>
          <div className="space-y-4">
            {form.phases.map((p, i) => (
              <div key={i} className="bg-muted p-4 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">{p.label}</span>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => updateField('phases', form.phases.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Grid>
                  <Field label="Label" value={p.label} onChange={v => updatePhase(i, 'label', v)} />
                  <Field label="Title" value={p.title} onChange={v => updatePhase(i, 'title', v)} />
                  <Field label="Duration (e.g. 2 wks)" value={p.duration} onChange={v => updatePhase(i, 'duration', v)} />
                  <Field label="Price (£, optional)" value={p.price} onChange={v => updatePhase(i, 'price', v)} />
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Week Commencing</Label>
                    <Input
                      type="date"
                      value={p.wc_date ?? ''}
                      onChange={e => updatePhase(i, 'wc_date', e.target.value)}
                      className="text-sm h-9"
                    />
                  </div>
                </Grid>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Tasks (one per line)</Label>
                  <Textarea value={p.tasks.join('\n')} onChange={e => updatePhase(i, 'tasks', e.target.value.split('\n'))} rows={3} className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Upfront Items */}
        <Section title="Upfront Items" action={
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => updateField('upfront_items', [...form.upfront_items, { type: '', name: '', price: 0, description: '' }])}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        }>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Section Title</label>
              <Input
                placeholder="Part 1: One-time project delivery"
                value={form.upfront_section_title}
                onChange={e => updateField('upfront_section_title', e.target.value)}
                className="text-sm"
              />
            </div>
            {form.upfront_items.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No upfront items yet. Add items to build the one-time investment breakdown.</p>
            )}
            {form.upfront_items.map((item, i) => (
              <div key={i} className="bg-muted p-4 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{item.name || item.type || 'Untitled'}</span>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                    onClick={() => updateField('upfront_items', form.upfront_items.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Grid>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Solution</Label>
                    <select
                      value={item.type}
                      onChange={e => {
                        const product = products.find(p => p.name === e.target.value);
                        const updated = [...form.upfront_items];
                        updated[i] = {
                          ...updated[i],
                          type: e.target.value,
                          price: product ? product.default_price : updated[i].price,
                          description: product?.description ? product.description : (updated[i].description || ''),
                        };
                        updateField('upfront_items', updated);
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select…</option>
                      {products.filter(p => p.is_upfront && (!p.service_type_id || p.service_type_id === currentServiceTypeId)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <CurrencyField label="Price (£)" value={item.price} onChange={v => {
                    const updated = [...form.upfront_items];
                    updated[i] = { ...updated[i], price: Number(v) || 0 };
                    updateField('upfront_items', updated);
                  }} />
                </Grid>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Name</Label>
                  <input
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    placeholder="e.g. Onboarding of RMM and AV"
                    value={item.name}
                    onChange={e => {
                      const updated = [...form.upfront_items];
                      updated[i] = { ...updated[i], name: e.target.value };
                      updateField('upfront_items', updated);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Description</Label>
                  <input
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground"
                    placeholder="Brief description shown on proposal (auto-filled when solution selected)"
                    value={item.description || ''}
                    onChange={e => {
                      const updated = [...form.upfront_items];
                      updated[i] = { ...updated[i], description: e.target.value };
                      updateField('upfront_items', updated);
                    }}
                  />
                </div>
                {!item.type && item.name && !products.find(p => p.name === item.name) && (
                  <button
                    type="button"
                    onClick={() => saveItemToLibrary(item.name, item.price, item.description ?? '', 'upfront')}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline pt-1"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    Save "{item.name}" to solutions library
                  </button>
                )}
              </div>
            ))}
            {form.upfront_items.length > 0 && (
              <div className="flex justify-between items-center px-1 pt-1 border-t border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
                <span className="text-sm font-bold text-foreground">£{form.upfront_items.reduce((s, i) => s + i.price, 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="pt-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Pricing Footnote (optional)</label>
              <textarea
                className="w-full border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={2}
                placeholder="e.g. All prices exclude VAT. Travel and expenses charged at cost."
                value={form.upfront_notes}
                onChange={e => updateField('upfront_notes', e.target.value)}
              />
            </div>
          </div>
        </Section>

        {/* Ongoing */}
        <Section title="Ongoing" action={
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => updateField('retainer_options', [...form.retainer_options, { type: '', name: '', term_months: undefined, quantity: 1, price: 0, features: [], option_type: 'standard', recommended: false }])}>
            <Plus className="w-4 h-4" /> Add Option
          </Button>
        }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Core section title</label>
                <Input
                  placeholder="Core — always included"
                  value={form.core_section_title}
                  onChange={e => updateField('core_section_title', e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Standard section title</label>
                <Input
                  placeholder="Part 2: Ongoing support / options"
                  value={form.ongoing_section_title}
                  onChange={e => updateField('ongoing_section_title', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRetainerDragEnd}>
              <SortableContext items={retainerIds} strategy={verticalListSortingStrategy}>
            {form.retainer_options.map((r, i) => (
              <SortableItem key={retainerIds[i]} id={retainerIds[i]}>
                {({ dragHandleProps }) => (
              <div className="bg-muted p-4 border border-border space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-foreground truncate">{r.name || r.type || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Core / Standard / Optional Extra toggle */}
                    <div className="flex items-center bg-background border border-border rounded overflow-hidden">
                      <button
                        onClick={() => {
                          const updated = [...form.retainer_options];
                          updated[i] = { ...updated[i], option_type: 'core' };
                          updateField('retainer_options', updated);
                        }}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 transition-colors ${
                          r.option_type === 'core'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Core
                      </button>
                      <button
                        onClick={() => {
                          const updated = [...form.retainer_options];
                          updated[i] = { ...updated[i], option_type: 'standard' };
                          updateField('retainer_options', updated);
                        }}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 transition-colors ${
                          r.option_type === 'standard'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Standard
                      </button>
                      <button
                        onClick={() => {
                          const updated = [...form.retainer_options];
                          updated[i] = { ...updated[i], option_type: 'optional_extra' };
                          updateField('retainer_options', updated);
                        }}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 transition-colors ${
                          r.option_type === 'optional_extra'
                            ? 'bg-amber-100 text-amber-700'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Optional Extra
                      </button>
                    </div>
                    {/* Recommended */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!r.recommended}
                        onChange={() => {
                          const updated = [...form.retainer_options];
                          updated[i] = { ...updated[i], recommended: !updated[i].recommended };
                          updateField('retainer_options', updated);
                        }}
                        className="w-3.5 h-3.5 accent-amber-500"
                      />
                      <span className="text-xs text-muted-foreground">★ Recommended</span>
                    </label>
                    <select
                      value={i}
                      onChange={e => updateField('retainer_options', reorderArray(form.retainer_options, i, Number(e.target.value)))}
                      className="h-7 w-12 text-xs text-center border border-border bg-background rounded"
                      title="Reorder"
                    >
                      {form.retainer_options.map((_, j) => <option key={j} value={j}>{j + 1}</option>)}
                    </select>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                      onClick={() => updateField('retainer_options', form.retainer_options.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Grid>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Type</Label>
                    <select
                      value={r.type}
                      onChange={e => {
                        const product = products.find(p => p.name === e.target.value);
                        const updated = [...form.retainer_options];
                        updated[i] = { ...updated[i], type: e.target.value, price: product ? product.default_price : updated[i].price };
                        updateField('retainer_options', updated);
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select…</option>
                      {products.filter(p => p.is_ongoing && (!p.service_type_id || p.service_type_id === currentServiceTypeId)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <Field label="Name / Tier" value={r.name} onChange={v => updateRetainer(i, 'name', v)} />
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Term (months)</Label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 12"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={r.term_months ?? ''}
                      onChange={e => updateRetainer(i, 'term_months', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Quantity</Label>
                    <input
                      type="number"
                      min={1}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={r.quantity ?? 1}
                      onChange={e => updateRetainer(i, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                  <CurrencyField label="Price (£/month)" value={r.price} onChange={v => updateRetainer(i, 'price', v)} />
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Total (£/month)</Label>
                    <div className="h-9 flex items-center px-3 bg-muted border border-border text-sm font-semibold text-foreground">
                      £{((r.quantity ?? 1) * r.price).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </Grid>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Features (one per line)</Label>
                  <Textarea value={r.features.join('\n')} onChange={e => updateRetainer(i, 'features', e.target.value.split('\n'))} rows={3} className="text-sm" />
                </div>
                {!r.type && r.name && !products.find(p => p.name === r.name) && (
                  <button
                    type="button"
                    onClick={() => saveItemToLibrary(r.name, r.price, '', 'ongoing')}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline pt-1"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    Save "{r.name}" to solutions library
                  </button>
                )}
              </div>
                )}
              </SortableItem>
            ))}
              </SortableContext>
            </DndContext>
          </div>
        </Section>

        {/* Project Team */}
        <Section title="Project Team">
          <p className="text-xs text-muted-foreground mb-4">The left card is always the proposal creator. Select up to three additional team members shown in the proposal.</p>
          <div className="grid grid-cols-4 gap-3">
            {/* Card 0: Lead — always the prepared_by user's team member */}
            {(() => {
              const preparedUser = users.find(u => u.id === form.prepared_by_user_id);
              const leadMember = preparedUser?.team_member_id
                ? teamMembers.find(tm => tm.id === preparedUser.team_member_id) ?? null
                : null;
              return (
                <div className="border border-primary/30 bg-primary/5 overflow-hidden">
                  <div className="w-full aspect-square bg-muted overflow-hidden">
                    {leadMember?.photo_url ? (
                      <img src={leadMember.photo_url} alt={leadMember.full_name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">
                        {form.prepared_by_user_id ? 'No photo linked' : 'Select prepared by →'}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-bold text-foreground truncate">
                      {leadMember?.full_name ?? (form.prepared_by ? form.prepared_by.split(',')[0] : '—')}
                    </div>
                    <div className="text-xs text-primary uppercase tracking-wide truncate mt-0.5">
                      {leadMember?.job_title ?? ''}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground bg-primary/10 px-1.5 py-0.5 inline-block">Lead</div>
                  </div>
                </div>
              );
            })()}

            {/* Cards 1-3: selectable additional team members */}
            {[0, 1, 2].map(slot => {
              const selectedId = form.team_member_ids[slot] ?? '';
              const selectedMember = teamMembers.find(tm => tm.id === selectedId);
              // Already-selected IDs (other slots) to avoid duplicates in dropdown
              const usedIds = new Set(form.team_member_ids.filter((_, i) => i !== slot));
              const preparedUser = users.find(u => u.id === form.prepared_by_user_id);
              if (preparedUser?.team_member_id) usedIds.add(preparedUser.team_member_id);

              return (
                <div key={slot} className="border border-border overflow-hidden">
                  <div className="w-full aspect-square bg-muted overflow-hidden relative">
                    {selectedMember?.photo_url ? (
                      <img src={selectedMember.photo_url} alt={selectedMember.full_name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-3xl font-thin opacity-30">+</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    {selectedMember && (
                      <>
                        <div className="text-xs font-bold text-foreground truncate mb-0.5">{selectedMember.full_name}</div>
                        <div className="text-xs text-primary uppercase tracking-wide truncate mb-1.5">{selectedMember.job_title}</div>
                      </>
                    )}
                    <select
                      value={selectedId}
                      onChange={e => {
                        const updated = [...form.team_member_ids];
                        while (updated.length <= slot) updated.push('');
                        updated[slot] = e.target.value;
                        // trim trailing empties
                        while (updated.length > 0 && !updated[updated.length - 1]) updated.pop();
                        updateField('team_member_ids', updated);
                      }}
                      className="w-full h-7 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="">— select member —</option>
                      {teamMembers.filter(tm => !usedIds.has(tm.id) || tm.id === selectedId).map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.full_name}, {tm.job_title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Contact */}
        <Section title="Shoothill Contact Details">
          <p className="text-xs text-muted-foreground mb-4">Shoothill contact details shown at the bottom of the proposal. Auto-populated from the selected user.</p>
          <Grid>
            <Field label="Email" value={form.contact_email} onChange={v => updateField('contact_email', v)} type="email" />
            <Field label="Office Phone" value={form.contact_phone} onChange={v => updateField('contact_phone', v)} />
            <Field label="Mobile" value={form.contact_mobile} onChange={v => updateField('contact_mobile', v)} />
          </Grid>
        </Section>

        {/* Service Agreement Document */}
        <Section title="Service Agreement Document">
          <div className="mb-4">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Agreement Template</Label>
            <select
              value={form.service_agreement_template_id || ''}
              onChange={e => updateField('service_agreement_template_id', e.target.value || null)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-full"
            >
              <option value="">— Select a template —</option>
              {agreementTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">A PDF will be auto-generated from the selected template at acceptance time. Upload a file below only to override the auto-generated agreement for this specific proposal.</p>
          </div>
          {contractFileUrl ? (
            <div className="flex items-center gap-3 bg-muted p-4 border border-border">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{contractFileUrl.split('/').pop()}</p>
                <a
                  href={`/contracts/${contractFileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View file ↗
                </a>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={removeContract}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{uploading ? 'Uploading…' : 'Override agreement (optional) — leave empty to auto-generate'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) uploadContract(file);
                }}
                disabled={uploading}
              />
            </label>
          )}
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Payment Terms</label>
            <textarea
              className="w-full border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={3}
              placeholder="e.g. 50% on project kick-off, 50% on completion"
              value={form.payment_terms}
              onChange={e => updateField('payment_terms', e.target.value)}
            />
          </div>
        </Section>

        <div className="pb-8">
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground gap-2 font-bold uppercase tracking-wide w-full py-6">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Proposal'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, value, onChange, type = 'text', step }: { label: string; value: string; onChange: (v: string) => void; type?: string; step?: string }) {
  return (
    <div>
      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} className="text-sm" step={step} />
    </div>
  );
}

function CurrencyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState((value || 0).toFixed(2));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplay((value || 0).toFixed(2));
  }, [value, focused]);

  return (
    <div>
      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{label}</Label>
      <Input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={e => setDisplay(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          const num = parseFloat(display) || 0;
          setDisplay(num.toFixed(2));
          onChange(num);
          setFocused(false);
        }}
        className="text-sm"
      />
    </div>
  );
}
