-- Allow anonymous signers to mark a pending NDA as signed.
-- Without this, the UPDATE in src/pages/NdaSign.tsx is silently filtered to
-- 0 rows by RLS (no error returned), so the signing page shows success
-- but the row stays at status='pending'.

DROP POLICY IF EXISTS "public_sign_pending_nda" ON public.ndas;
CREATE POLICY "public_sign_pending_nda" ON public.ndas
  FOR UPDATE
  USING (status = 'pending')
  WITH CHECK (status = 'signed');
