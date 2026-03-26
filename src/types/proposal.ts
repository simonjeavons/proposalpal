export interface UpfrontItem {
  type: string;
  name: string;
  price: number;
  discounted_price?: number;
  discount_note?: string;
  show_discount_percent?: boolean;
  description?: string;
  optional?: boolean;
}

export interface Challenge {
  title: string;
  description: string;
}

export interface Phase {
  label: string;
  title: string;
  duration: string;
  tasks: string[];
  price: string;
  wc_date?: string; // Week commencing date (ISO date string, e.g. "2026-03-16")
}

export interface RetainerOption {
  type: string;
  name: string;
  hours?: string;
  term_months?: number;
  quantity: number;
  price: number;
  discounted_price?: number;
  discount_note?: string;
  show_discount_percent?: boolean;
  features: string[];
  option_type: 'standard' | 'optional_extra' | 'core';
  recommended: boolean;
  frequency?: 'weekly' | 'monthly' | 'annual';
}

export interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
  bio: string;
  photo_url: string;
  linkedin_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Proposal {
  id: string;
  slug: string;
  status: 'draft' | 'sent' | 'accepted';
  client_name: string;
  programme_title: string;
  prepared_by: string;
  prepared_by_user_id?: string;
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
  upfront_total: number;
  retainer_options: RetainerOption[];
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_mobile: string;
  client_email?: string;
  company_reg_number?: string;
  registered_address_1?: string;
  registered_address_2?: string;
  registered_city?: string;
  registered_county?: string;
  registered_postcode?: string;
  payment_terms?: string;
  upfront_notes?: string;
  partnership_overview?: string;
  commercial_opportunity?: string;
  strategic_focus?: string;
  whats_needed?: string;
  working_together?: string;
  team_member_ids?: string[];
  hide_phase_durations?: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CHALLENGES: Challenge[] = [
  { title: "Fragmented client data across three systems", description: "Staff spend 20–40 minutes per query reconciling records that should be instantly accessible." },
  { title: "Shadow AI usage with no governance", description: "60% of fee earners use ChatGPT for drafting. None of this is logged, reviewed or compliant with GDPR obligations." },
  { title: "No AI policy or audit trail", description: "ICAEW guidance requires firms to evidence how AI is used in client deliverables. Currently no mechanism exists to do this." },
  { title: "Manual deadline and workflow tracking", description: "Filing deadlines tracked via spreadsheet — a single point of failure that caused near-misses in the past 12 months." },
  { title: "Partner time absorbed by retrieval tasks", description: "Partners estimate 6–10 hours per week answering internal queries that connected systems would resolve in seconds." },
];

export const DEFAULT_PHASES: Phase[] = [
  { label: "Phase 1", title: "Discovery & AI Audit", duration: "2 wks", tasks: ["On-site process mapping", "Shadow AI usage audit", "Data-flow analysis", "Compliance gap review"], price: "" },
  { label: "Phase 2", title: "Strategy & Architecture", duration: "2 wks", tasks: ["AI policy framework", "Platform selection", "Integration architecture", "Security & GDPR design"], price: "" },
  { label: "Phase 3", title: "Build & Integrate", duration: "4 wks", tasks: ["Central knowledge hub", "AI assistant deployment", "Workflow automation", "Audit trail system"], price: "" },
  { label: "Phase 4", title: "Training & Adoption", duration: "2 wks", tasks: ["Staff training programme", "Champion network setup", "Adoption metrics dashboard", "Change management support"], price: "" },
];

export const DEFAULT_RETAINER_OPTIONS: RetainerOption[] = [];
