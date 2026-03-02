
-- Add contract_file_url to proposals
ALTER TABLE public.proposals ADD COLUMN contract_file_url text;

-- Create proposal_acceptances table
CREATE TABLE public.proposal_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_title text NOT NULL DEFAULT '',
  signed_at timestamptz NOT NULL DEFAULT now(),
  selected_retainer_index integer NOT NULL DEFAULT 0,
  upfront_total numeric NOT NULL DEFAULT 0,
  retainer_price numeric NOT NULL DEFAULT 0,
  first_year_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view acceptances" ON public.proposal_acceptances FOR SELECT USING (true);
CREATE POLICY "Anyone can insert acceptances" ON public.proposal_acceptances FOR INSERT WITH CHECK (true);

-- Create contracts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', true);

-- Storage policies for contracts bucket
CREATE POLICY "Anyone can read contracts" ON storage.objects FOR SELECT USING (bucket_id = 'contracts');
CREATE POLICY "Anyone can upload contracts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contracts');
CREATE POLICY "Anyone can update contracts" ON storage.objects FOR UPDATE USING (bucket_id = 'contracts');
CREATE POLICY "Anyone can delete contracts" ON storage.objects FOR DELETE USING (bucket_id = 'contracts');
