-- Migration: Reconcile service_types names with onboarding spec.
-- Renames IT Support → IT Services and Marketing Services → Digital Marketing.
-- Adds AI Consultancy. Idempotent; safe to re-run.

UPDATE public.service_types
   SET name = 'IT Services'
 WHERE name = 'IT Support';

UPDATE public.service_types
   SET name = 'Digital Marketing'
 WHERE name = 'Marketing Services';

INSERT INTO public.service_types (name, sort_order)
SELECT 'AI Consultancy', 5
 WHERE NOT EXISTS (
   SELECT 1 FROM public.service_types WHERE name = 'AI Consultancy'
 );
