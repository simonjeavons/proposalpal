-- Add an optional contract start (commencement) date to proposals.
-- Defaults to the proposal date in the UI; nullable so existing rows fall back to proposal_date.
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS contract_start_date DATE;
