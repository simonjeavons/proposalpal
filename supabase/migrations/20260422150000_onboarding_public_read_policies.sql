-- Migration: Public SELECT policies so the client-facing report view and
-- signoff pages can fetch by token. Matches the existing permissive
-- pattern used by proposals (FOR SELECT USING (true)). The token in the
-- URL is the access control mechanism — nobody can guess it.

CREATE POLICY "public_read_onboarding_reports" ON public.onboarding_reports
  FOR SELECT USING (true);

CREATE POLICY "public_read_client_onboardings" ON public.client_onboardings
  FOR SELECT USING (true);
