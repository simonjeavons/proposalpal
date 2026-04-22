-- Migration: Client Onboarding Module — core tables, RLS, indexes.
-- Spec: docs/superpowers/specs/2026-04-22-client-onboarding-design.md

-- ─── onboarding_action_library ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_action_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  form_schema JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_action_library_service_type
  ON public.onboarding_action_library (service_type_id, sort_order);

ALTER TABLE public.onboarding_action_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_action_library" ON public.onboarding_action_library
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_action_library" ON public.onboarding_action_library
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_onboarding_action_library_updated_at
  BEFORE UPDATE ON public.onboarding_action_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── onboarding_report_section_templates ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_report_section_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  heading TEXT NOT NULL,
  body_template TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_report_section_templates_service_type
  ON public.onboarding_report_section_templates (service_type_id, sort_order);

ALTER TABLE public.onboarding_report_section_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_section_templates" ON public.onboarding_report_section_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_section_templates" ON public.onboarding_report_section_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_onboarding_report_section_templates_updated_at
  BEFORE UPDATE ON public.onboarding_report_section_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── onboarding_settings (singleton) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_settings (
  id INT PRIMARY KEY CHECK (id = 1),
  reminder_stage1_days INT NOT NULL DEFAULT 5,
  reminder_stage2_days INT NOT NULL DEFAULT 10,
  reminder_stage3_days INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_onboarding_settings" ON public.onboarding_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_update_onboarding_settings" ON public.onboarding_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_onboarding_settings_updated_at
  BEFORE UPDATE ON public.onboarding_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── client_onboardings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('proposal', 'adhoc')),
  source_id UUID NOT NULL,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'complete')),
  current_stage INT NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 3),
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Snapshotted at trigger time
  client_name TEXT NOT NULL DEFAULT '',
  organisation TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',

  -- Stage timestamps
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  configured_at TIMESTAMPTZ,
  kickoff_meeting_at TIMESTAMPTZ,
  kickoff_held BOOLEAN NOT NULL DEFAULT false,
  stage1_completed_at TIMESTAMPTZ,
  stage2_completed_at TIMESTAMPTZ,
  stage3_completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Reminder de-dupe
  last_reminder_at TIMESTAMPTZ,
  last_reminder_stage INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_onboardings_assignee_stage
  ON public.client_onboardings (assigned_to_user_id, current_stage);

CREATE INDEX IF NOT EXISTS idx_client_onboardings_source
  ON public.client_onboardings (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_client_onboardings_status
  ON public.client_onboardings (status);

ALTER TABLE public.client_onboardings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_client_onboardings" ON public.client_onboardings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_client_onboardings_updated_at
  BEFORE UPDATE ON public.client_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── onboarding_action_instances ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_action_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.client_onboardings(id) ON DELETE CASCADE,
  action_library_id UUID REFERENCES public.onboarding_action_library(id) ON DELETE SET NULL,
  name_override TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'na')),
  notes TEXT NOT NULL DEFAULT '',
  form_data JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (action_library_id IS NOT NULL OR name_override IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_action_instances_onboarding_status
  ON public.onboarding_action_instances (onboarding_id, status);

ALTER TABLE public.onboarding_action_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_action_instances" ON public.onboarding_action_instances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_onboarding_action_instances_updated_at
  BEFORE UPDATE ON public.onboarding_action_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── onboarding_reports ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL UNIQUE REFERENCES public.client_onboardings(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  view_token TEXT UNIQUE,
  signoff_token TEXT UNIQUE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  last_view_email_at TIMESTAMPTZ,
  signed_off_at TIMESTAMPTZ,
  signed_off_ip TEXT,
  signed_off_user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_onboarding_reports" ON public.onboarding_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read by token is handled via the edge function (service role),
-- not via direct anon SELECT.

CREATE TRIGGER update_onboarding_reports_updated_at
  BEFORE UPDATE ON public.onboarding_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── onboarding_report_views ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_report_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.onboarding_reports(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_report_views_report_id_viewed_at
  ON public.onboarding_report_views (report_id, viewed_at DESC);

ALTER TABLE public.onboarding_report_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_onboarding_report_views" ON public.onboarding_report_views
  FOR SELECT TO authenticated USING (true);

-- INSERT into onboarding_report_views happens only via the edge function
-- (service role), so no INSERT policy for authenticated/anon.
