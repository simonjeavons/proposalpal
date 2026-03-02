
-- Proposals table
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted')),
  
  -- Cover
  client_name TEXT NOT NULL DEFAULT '',
  programme_title TEXT NOT NULL DEFAULT 'AI Transformation Programme',
  prepared_by TEXT NOT NULL DEFAULT 'Josh Welch, Head of Commercial Operations',
  proposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  
  -- Client details
  organisation TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT '',
  staff TEXT NOT NULL DEFAULT '',
  tech_stack TEXT NOT NULL DEFAULT '',
  challenge_intro TEXT NOT NULL DEFAULT '',
  
  -- Challenges (JSONB array of {title, description})
  challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Journey phases (JSONB array of {label, title, duration, tasks[], price})
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Pricing
  upfront_total NUMERIC NOT NULL DEFAULT 0,
  payment_terms TEXT NOT NULL DEFAULT '50% on commencement / 50% on delivery',
  timeline TEXT NOT NULL DEFAULT '10–12 wks',
  
  -- Retainer options (JSONB array of {badge, name, hours, price, features[]})
  retainer_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_retainer_index INTEGER NOT NULL DEFAULT 1,
  
  -- Contact
  contact_name TEXT NOT NULL DEFAULT 'Josh Welch',
  contact_email TEXT NOT NULL DEFAULT 'josh.welch@shoothill.com',
  contact_phone TEXT NOT NULL DEFAULT '01743 636 300',
  contact_mobile TEXT NOT NULL DEFAULT '07904 810 378',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone with the link can view)
CREATE POLICY "Anyone can view proposals" ON public.proposals
  FOR SELECT USING (true);

-- For now, allow all inserts/updates/deletes (no auth yet - admin portal)
CREATE POLICY "Anyone can manage proposals" ON public.proposals
  FOR ALL USING (true) WITH CHECK (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
