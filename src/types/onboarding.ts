export type OnboardingSourceType = "proposal" | "adhoc";
export type OnboardingStatus = "draft" | "active" | "complete";
export type OnboardingActionStatus = "pending" | "in_progress" | "done" | "na";

export type FormFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
}

export interface FormSchema {
  fields: FormField[];
}

export interface OnboardingActionLibraryItem {
  id: string;
  service_type_id: string;
  name: string;
  description: string;
  form_schema: FormSchema | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingReportSectionTemplate {
  id: string;
  service_type_id: string;
  heading: string;
  body_template: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingSettings {
  id: 1;
  reminder_stage1_days: number;
  reminder_stage2_days: number;
  reminder_stage3_days: number;
  updated_at: string;
}

export interface ClientOnboarding {
  id: string;
  source_type: OnboardingSourceType;
  source_id: string;
  service_type_id: string | null;
  status: OnboardingStatus;
  current_stage: 1 | 2 | 3;
  assigned_to_user_id: string | null;
  client_name: string;
  organisation: string;
  contact_name: string;
  contact_email: string;
  triggered_at: string;
  configured_at: string | null;
  kickoff_meeting_at: string | null;
  kickoff_held: boolean;
  stage1_completed_at: string | null;
  stage2_completed_at: string | null;
  stage3_completed_at: string | null;
  archived_at: string | null;
  last_reminder_at: string | null;
  last_reminder_stage: number | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingActionInstance {
  id: string;
  onboarding_id: string;
  action_library_id: string | null;
  name_override: string | null;
  status: OnboardingActionStatus;
  notes: string;
  form_data: Record<string, unknown> | null;
  sort_order: number;
  completed_at: string | null;
  completed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingReportSection {
  heading: string;
  body: string;
}

export interface OnboardingReport {
  id: string;
  onboarding_id: string;
  version: number;
  sections: OnboardingReportSection[];
  view_token: string | null;
  signoff_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  last_view_email_at: string | null;
  signed_off_at: string | null;
  signed_off_ip: string | null;
  signed_off_user_agent: string | null;
  created_at: string;
  updated_at: string;
}
