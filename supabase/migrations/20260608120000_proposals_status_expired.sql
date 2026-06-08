-- Allow proposals to be marked as 'expired'.
-- Drop whatever CHECK constraint currently governs proposals.status, then
-- re-add it including 'expired'. Done dynamically so it works regardless of
-- the existing constraint's auto-generated name.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.proposals'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.proposals DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'expired'));
