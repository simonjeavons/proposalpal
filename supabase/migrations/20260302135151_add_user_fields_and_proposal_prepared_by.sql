
-- Add job_title and phone_number to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_number TEXT NOT NULL DEFAULT '';

-- Add prepared_by_user_id to proposals (nullable FK to profiles)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS prepared_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
