import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Challenge, Phase, RetainerOption, LaunchPhase, UpfrontItem } from "@/types/proposal";
import { DEFAULT_CHALLENGES, DEFAULT_PHASES, DEFAULT_RETAINER_OPTIONS, DEFAULT_LAUNCH_PHASE } from "@/types/proposal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Plus, Trash2, Eye, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  job_title: string;
  phone_number: string;
}

interface ServiceType {
  id: string;
  name: string;
  sort_order: number;
  is_upfront: boolean;
  is_ongoing: boolean;
}

interface Product {
  id: string;
  name: string;
  default_price: number;
  description: string;
  is_upfront: boolean;
  is_ongoing: boolean;
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
  retainer_options: RetainerOption[];
  launch_phase: LaunchPhase;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_mobile: string;
  payment_terms: string;
  status: string;
}

const today = () => new Date().toISOString().split('T')[0];
const in30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

export default function ProposalEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const [contractFileUrl, setContractFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showImportPhaseOptions, setShowImportPhaseOptions] = useState(false);

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
    retainer_options: [...DEFAULT_RETAINER_OPTIONS],
    launch_phase: { ...DEFAULT_LAUNCH_PHASE },
    contact_name: 'Josh Welch',
    contact_email: 'josh.welch@shoothill.com',
    contact_phone: '01743 636 300',
    contact_mobile: '07904 810 378',
    payment_terms: '',
    status: 'draft',
  });

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, email, job_title, phone_number").order("full_name").then(({ data }) => {
      if (data) setUsers(data as UserProfile[]);
    });
    supabase.from("service_types" as any).select("id, name, sort_order, is_upfront, is_ongoing").order("sort_order").then(({ data }) => {
      if (data) setServiceTypes(data as ServiceType[]);
    });
    supabase.from("products" as any).select("id, name, default_price, description, is_upfront, is_ongoing").order("sort_order").then(({ data }) => {
      if (data) setProducts(data as Product[]);
    });
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
            retainer_options: (data.retainer_options || []) as unknown as RetainerOption[],
            launch_phase: ((data as any).launch_phase || { ...DEFAULT_LAUNCH_PHASE }) as LaunchPhase,
            contact_name: data.contact_name,
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            contact_mobile: data.contact_mobile,
            payment_terms: (data as any).payment_terms || '',
            status: data.status,
          });
          setSlug(data.slug);
          setContractFileUrl((data as any).contract_file_url || null);
        }
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      upfront_total: form.upfront_items.reduce((sum, item) => sum + item.price, 0),
      contract_file_url: contractFileUrl,
      prepared_by_user_id: form.prepared_by_user_id || null,
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
      contact_name: user.full_name,
      contact_email: user.email,
      contact_phone: user.phone_number,
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

        {/* Cover */}
        <Section title="Cover Details">
          <Grid>
            <Field label="Client Name" value={form.client_name} onChange={v => updateField('client_name', v)} />
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
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Type</Label>
              <select
                value={form.sector}
                onChange={e => { updateField('sector', e.target.value); setShowImportOptions(false); }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select a type…</option>
                {serviceTypes.map(st => (
                  <option key={st.id} value={st.name}>{st.name}</option>
                ))}
              </select>
            </div>
          </Grid>
        </Section>

        {/* Client Details */}
        <Section title="Client Details">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Organisation" value={form.organisation} onChange={v => updateField('organisation', v)} />
            <Field label="Staff" value={form.staff} onChange={v => updateField('staff', v)} />
            <Field label="Tech Stack" value={form.tech_stack} onChange={v => updateField('tech_stack', v)} />
          </div>
          <div className="mt-4">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Challenge Introduction</Label>
            <Textarea value={form.challenge_intro} onChange={e => updateField('challenge_intro', e.target.value)} rows={3} className="text-sm" />
          </div>
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
          <div className="space-y-3">
            {form.challenges.map((c, i) => (
              <div key={i} className="flex gap-3 items-start bg-muted p-4 border border-border">
                <div className="flex-1 space-y-2">
                  <Input placeholder="Challenge title" value={c.title} onChange={e => updateChallenge(i, 'title', e.target.value)} className="text-sm font-semibold" />
                  <Input placeholder="Description" value={c.description} onChange={e => updateChallenge(i, 'description', e.target.value)} className="text-sm" />
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => updateField('challenges', form.challenges.filter((_, j) => j !== i))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Section>

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
                  <Field label="Duration" value={p.duration} onChange={v => updatePhase(i, 'duration', v)} />
                  <Field label="Price (£, optional)" value={p.price} onChange={v => updatePhase(i, 'price', v)} />
                </Grid>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Tasks (one per line)</Label>
                  <Textarea value={p.tasks.join('\n')} onChange={e => updatePhase(i, 'tasks', e.target.value.split('\n'))} rows={3} className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Launch Phase */}
        <Section title="Launch & Handover Phase">
          <p className="text-xs text-muted-foreground mb-4">This always appears as the final "Included" card in the pricing section.</p>
          <Grid>
            <Field label="Title" value={form.launch_phase.title} onChange={v => updateField('launch_phase', { ...form.launch_phase, title: v })} />
            <Field label="Duration" value={form.launch_phase.duration} onChange={v => updateField('launch_phase', { ...form.launch_phase, duration: v })} />
          </Grid>
          <div className="mt-4">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Description</Label>
            <Textarea value={form.launch_phase.description} onChange={e => updateField('launch_phase', { ...form.launch_phase, description: e.target.value })} rows={3} className="text-sm" />
          </div>
        </Section>

        {/* Upfront Items */}
        <Section title="Upfront Items" action={
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => updateField('upfront_items', [...form.upfront_items, { type: '', name: '', price: 0 }])}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        }>
          <div className="space-y-3">
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
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Type</Label>
                    <select
                      value={item.type}
                      onChange={e => {
                        const product = products.find(p => p.name === e.target.value);
                        const updated = [...form.upfront_items];
                        updated[i] = {
                          ...updated[i],
                          type: e.target.value,
                          name: product?.description ? updated[i].name || product.description : updated[i].name,
                          price: product ? product.default_price : updated[i].price,
                        };
                        updateField('upfront_items', updated);
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select…</option>
                      {products.filter(p => p.is_upfront).length > 0 && (
                        <optgroup label="Products">
                          {products.filter(p => p.is_upfront).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </optgroup>
                      )}
                      {serviceTypes.filter(s => s.is_upfront).length > 0 && (
                        <optgroup label="Services">
                          {serviceTypes.filter(s => s.is_upfront).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <CurrencyField label="Price (£)" value={item.price} onChange={v => {
                    const updated = [...form.upfront_items];
                    updated[i] = { ...updated[i], price: Number(v) || 0 };
                    updateField('upfront_items', updated);
                  }} />
                </Grid>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Description</Label>
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
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => updateField('retainer_options', [...form.retainer_options, { type: '', name: '', hours: '', quantity: 1, price: 0, features: [], option_type: 'standard', recommended: false }])}>
            <Plus className="w-4 h-4" /> Add Option
          </Button>
        }>
          <div className="space-y-4">
            {form.retainer_options.map((r, i) => (
              <div key={i} className="bg-muted p-4 border border-border space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-foreground truncate">{r.name || r.type || 'Untitled'}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Standard / Optional Extra toggle */}
                    <div className="flex items-center bg-background border border-border rounded overflow-hidden">
                      <button
                        onClick={() => {
                          const updated = [...form.retainer_options];
                          updated[i] = { ...updated[i], option_type: 'standard' };
                          updateField('retainer_options', updated);
                        }}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 transition-colors ${
                          r.option_type !== 'optional_extra'
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
                      {products.filter(p => p.is_ongoing).length > 0 && (
                        <optgroup label="Products">
                          {products.filter(p => p.is_ongoing).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </optgroup>
                      )}
                      {serviceTypes.filter(s => s.is_ongoing).length > 0 && (
                        <optgroup label="Services">
                          {serviceTypes.filter(s => s.is_ongoing).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <Field label="Name / Tier" value={r.name} onChange={v => updateRetainer(i, 'name', v)} />
                  <Field label="Hours" value={r.hours} onChange={v => updateRetainer(i, 'hours', v)} />
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
              </div>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact Details">
          <p className="text-xs text-muted-foreground mb-4">Auto-populated from the selected user. You can override these values.</p>
          <Grid>
            <Field label="Contact Name" value={form.contact_name} onChange={v => updateField('contact_name', v)} />
            <Field label="Email" value={form.contact_email} onChange={v => updateField('contact_email', v)} />
            <Field label="Phone" value={form.contact_phone} onChange={v => updateField('contact_phone', v)} />
          </Grid>
        </Section>

        {/* Service Agreement Document */}
        <Section title="Service Agreement Document">
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
              <span className="text-sm text-muted-foreground">{uploading ? 'Uploading…' : 'Click to upload service agreement PDF'}</span>
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
