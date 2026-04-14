-- View tracking for proposals and ad-hoc contracts
-- Every customer view is recorded in *_views tables.
-- Emails to proposal/contract owners are throttled in the edge function using
-- last_view_email_at on the parent row.

-- ─── adhoc_contracts: add owner FK ───────────────────────────────────────────
ALTER TABLE public.adhoc_contracts
  ADD COLUMN IF NOT EXISTS prepared_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── Throttle timestamps on parent rows ──────────────────────────────────────
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS last_view_email_at TIMESTAMPTZ;

ALTER TABLE public.adhoc_contracts
  ADD COLUMN IF NOT EXISTS last_view_email_at TIMESTAMPTZ;

-- ─── proposal_views ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_proposal_views_proposal_id_viewed_at
  ON public.proposal_views (proposal_id, viewed_at DESC);

ALTER TABLE public.proposal_views ENABLE ROW LEVEL SECURITY;

-- Authenticated team can read all view records
DROP POLICY IF EXISTS "auth_read_proposal_views" ON public.proposal_views;
CREATE POLICY "auth_read_proposal_views" ON public.proposal_views
  FOR SELECT TO authenticated USING (true);

-- Service role handles inserts via edge function; no public policies needed.

-- ─── contract_views ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contract_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.adhoc_contracts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_contract_views_contract_id_viewed_at
  ON public.contract_views (contract_id, viewed_at DESC);

ALTER TABLE public.contract_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_contract_views" ON public.contract_views;
CREATE POLICY "auth_read_contract_views" ON public.contract_views
  FOR SELECT TO authenticated USING (true);
