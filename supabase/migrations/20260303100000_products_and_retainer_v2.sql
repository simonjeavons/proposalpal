-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.is_admin());

-- Remove deprecated proposal columns
ALTER TABLE public.proposals DROP COLUMN IF EXISTS payment_terms;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS timeline;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS default_retainer_index;

-- Migrate retainer_options: swap badge->type, add option_type + default_selected
UPDATE public.proposals
SET retainer_options = (
  SELECT jsonb_agg(
    (r - 'badge') || jsonb_build_object(
      'type', COALESCE(r->>'badge', ''),
      'option_type', 'standard',
      'default_selected', false
    )
  )
  FROM jsonb_array_elements(retainer_options) AS r
)
WHERE retainer_options IS NOT NULL AND retainer_options != '[]'::jsonb;

-- Track selected optional extras on acceptance
ALTER TABLE public.proposal_acceptances
  ADD COLUMN IF NOT EXISTS selected_extras JSONB NOT NULL DEFAULT '[]'::jsonb;
