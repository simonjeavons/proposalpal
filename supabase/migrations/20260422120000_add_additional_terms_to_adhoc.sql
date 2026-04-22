-- Additional free-text terms rendered as Schedule 3 in the ad-hoc service agreement PDF.
ALTER TABLE public.adhoc_contracts
  ADD COLUMN IF NOT EXISTS additional_terms_text TEXT;
