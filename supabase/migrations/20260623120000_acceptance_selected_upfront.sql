-- Record which upfront items the client selected when accepting a proposal.
-- selected_upfront_items: indices into proposals.upfront_items the client chose
--   (optional add-ons + one choice per "choose one" group).
-- selected_upfront_snapshot: [{name, price}] of the chosen + always-included items,
--   so the acceptance record stays meaningful even if the proposal later changes.
ALTER TABLE public.proposal_acceptances
  ADD COLUMN IF NOT EXISTS selected_upfront_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_upfront_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;
