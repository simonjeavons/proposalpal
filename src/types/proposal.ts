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
}

export interface RetainerOption {
  badge: string;
  name: string;
  hours: string;
  price: number;
  features: string[];
}

export interface LaunchPhase {
  title: string;
  duration: string;
  description: string;
}

export const DEFAULT_LAUNCH_PHASE: LaunchPhase = {
  title: "Launch & Handover",
  duration: "5 days",
  description: "Full rollout, partner and compliance sign-off, complete documentation and runbooks delivered.",
};

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
  upfront_total: number;
  payment_terms: string;
  timeline: string;
  retainer_options: RetainerOption[];
  default_retainer_index: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_mobile: string;
  launch_phase: LaunchPhase;
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
  { label: "Phase 1", title: "Discovery & AI Audit", duration: "2 wks", tasks: ["On-site process mapping", "Shadow AI usage audit", "Data-flow analysis", "Compliance gap review"], price: "4500" },
  { label: "Phase 2", title: "Strategy & Architecture", duration: "2 wks", tasks: ["AI policy framework", "Platform selection", "Integration architecture", "Security & GDPR design"], price: "5000" },
  { label: "Phase 3", title: "Build & Integrate", duration: "4 wks", tasks: ["Central knowledge hub", "AI assistant deployment", "Workflow automation", "Audit trail system"], price: "11000" },
  { label: "Phase 4", title: "Training & Adoption", duration: "2 wks", tasks: ["Staff training programme", "Champion network setup", "Adoption metrics dashboard", "Change management support"], price: "4000" },
];

export const DEFAULT_RETAINER_OPTIONS: RetainerOption[] = [
  { badge: "No retainer", name: "Self-managed", hours: "0 hrs / month", price: 0, features: ["Full handover documentation", "Access to support portal", "Ad-hoc work available on request"] },
  { badge: "Most popular", name: "Standard", hours: "~5 hrs / month", price: 1200, features: ["Dedicated account contact", "Platform monitoring & updates", "Monthly check-in call", "Priority bug resolution", "Minor configuration changes"] },
  { badge: "Full service", name: "Growth", hours: "~10 hrs / month", price: 2200, features: ["Everything in Standard", "Proactive AI usage analysis", "Quarterly strategic review", "Workflow expansion work", "Staff training refreshers", "New AI feature roll-outs"] },
];
