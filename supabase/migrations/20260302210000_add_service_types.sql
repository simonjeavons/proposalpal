CREATE TABLE public.service_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.service_type_challenges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id  UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  title            TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_type_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read service types" ON public.service_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read service type challenges" ON public.service_type_challenges FOR SELECT USING (true);
CREATE POLICY "Admins manage service types" ON public.service_types FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage service type challenges" ON public.service_type_challenges FOR ALL USING (public.is_admin());

INSERT INTO public.service_types (name, sort_order) VALUES
  ('IT Support', 1),
  ('Software Development', 2),
  ('Marketing Services', 3),
  ('Website Development', 4);
