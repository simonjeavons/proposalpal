CREATE TABLE public.template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  price TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.template_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read template_phases" ON public.template_phases
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage template_phases" ON public.template_phases
  FOR ALL USING (public.is_admin());
