-- Multiple titled upfront sections. Each section: { id, title, notes? }.
-- Items remain in the flat proposals.upfront_items array, tagged with section_id.
-- Legacy upfront_section_title / upfront_notes are retained; a single section is
-- synthesized from them at read time when upfront_sections is empty.
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS upfront_sections JSONB NOT NULL DEFAULT '[]'::jsonb;
