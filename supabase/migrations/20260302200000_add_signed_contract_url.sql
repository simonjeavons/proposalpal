ALTER TABLE public.proposal_acceptances
  ADD COLUMN IF NOT EXISTS signed_contract_url TEXT;
