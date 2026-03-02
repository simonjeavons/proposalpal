alter table proposals
  add column if not exists launch_phase jsonb default '{"title":"Launch & Handover","duration":"5 days","description":"Full rollout, partner and compliance sign-off, complete documentation and runbooks delivered."}'::jsonb;
