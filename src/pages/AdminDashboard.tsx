import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Proposal } from "@/types/proposal";
import { Plus, Eye, Pencil, Copy, Trash2, ExternalLink, Users, FileText, LogOut, Check, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Tab = "proposals" | "users" | "services";

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
  challenges: ServiceTypeChallenge[];
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("proposals");

  // Proposals state
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);

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

  // Services state
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeWithChallenges[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [newServiceName, setNewServiceName] = useState("");

  const fetchServiceTypes = async () => {
    const { data: types } = await supabase.from("service_types" as any).select("id, name, sort_order").order("sort_order");
    if (!types) { setServicesLoading(false); return; }
    const { data: challenges } = await supabase.from("service_type_challenges" as any).select("id, service_type_id, title, description, sort_order").order("sort_order");
    const challengeMap: Record<string, ServiceTypeChallenge[]> = {};
    (challenges || []).forEach((c: any) => {
      if (!challengeMap[c.service_type_id]) challengeMap[c.service_type_id] = [];
      challengeMap[c.service_type_id].push(c);
    });
    setServiceTypes((types as any[]).map(t => ({ ...t, challenges: challengeMap[t.id] || [] })));
    setServicesLoading(false);
  };

  const addServiceType = async () => {
    const name = newServiceName.trim();
    if (!name) return;
    const nextOrder = serviceTypes.length > 0 ? Math.max(...serviceTypes.map(s => s.sort_order)) + 1 : 1;
    const { data, error } = await supabase.from("service_types" as any).insert({ name, sort_order: nextOrder }).select().single();
    if (!error && data) {
      setServiceTypes(prev => [...prev, { ...(data as any), challenges: [] }]);
      setNewServiceName("");
    } else {
      toast.error("Failed to add service type");
    }
  };

  const saveServiceTypeName = async (id: string, name: string) => {
    const { error } = await supabase.from("service_types" as any).update({ name }).eq("id", id);
    if (error) toast.error("Failed to rename");
  };

  const updateServiceTypeName = (id: string, name: string) => {
    setServiceTypes(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const deleteServiceType = async (id: string) => {
    if (!confirm("Delete this service type and all its template challenges?")) return;
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

  const fetchProposals = async () => {
    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProposals(data as unknown as Proposal[]);
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
              activeTab === "proposals"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Proposals
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Users
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "services"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Services
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">Services</h1>
                <p className="text-sm text-muted-foreground">Manage proposal types and their template challenges.</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addServiceType()}
                  placeholder="New service type name…"
                  className="h-8 text-sm w-52"
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
                <p className="text-muted-foreground">No service types yet. Add one above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {serviceTypes.map(st => (
                  <div key={st.id} className="bg-card border border-border">
                    {/* Service type header */}
                    <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                      <Input
                        value={st.name}
                        onChange={e => updateServiceTypeName(st.id, e.target.value)}
                        onBlur={e => saveServiceTypeName(st.id, e.target.value)}
                        className="h-8 text-sm font-bold flex-1 max-w-xs"
                      />
                      <span className="text-xs text-muted-foreground">{st.challenges.length} template challenge{st.challenges.length !== 1 ? 's' : ''}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-primary text-xs h-7"
                          onClick={() => addChallenge(st.id)}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Challenge
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                          onClick={() => deleteServiceType(st.id)}
                          title="Delete service type"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Template challenges */}
                    <div className="px-6 py-4">
                      {st.challenges.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No template challenges yet. Click "Add Challenge" to create one.</p>
                      ) : (
                        <div className="space-y-2">
                          {st.challenges.map((c, idx) => (
                            <div key={idx} className="flex gap-3 items-start bg-muted p-3 border border-border">
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
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
                                onClick={() => deleteChallenge(st.id, idx)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
      </div>
    </div>
  );
}
