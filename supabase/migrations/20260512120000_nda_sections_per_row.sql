-- Migration: per-NDA editable copy
-- Adds nullable sections JSONB to ndas, re-encodes template seed bodies as HTML,
-- and backfills existing ndas with their template's sections (transformed to HTML).
-- Date: 2026-05-12

-- ─── ndas.sections ──────────────────────────────────────────────────────────
ALTER TABLE public.ndas
  ADD COLUMN IF NOT EXISTS sections JSONB;

-- ─── plain → HTML transform helper ──────────────────────────────────────────
-- Wraps plain text into <p>...</p> blocks split on double newline, with single
-- newlines becoming <br/>. Idempotent for already-HTML bodies (skipped via guard).
CREATE OR REPLACE FUNCTION pg_temp.plain_to_nda_html(input TEXT)
RETURNS TEXT AS $$
DECLARE
  out TEXT;
BEGIN
  IF input IS NULL OR length(input) = 0 THEN
    RETURN '';
  END IF;
  -- Already-HTML check: if the body starts with a block-level tag, leave it alone.
  IF input ~* '^\s*<(p|ul|ol|div|h[1-6])\b' THEN
    RETURN input;
  END IF;
  out := input;
  out := regexp_replace(out, E'\r\n', E'\n', 'g');
  out := regexp_replace(out, E'\n\n', '</p><p>', 'g');
  out := regexp_replace(out, E'\n', '<br/>', 'g');
  RETURN '<p>' || out || '</p>';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── Re-encode template seed bodies in place ────────────────────────────────
UPDATE public.nda_templates
SET sections = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'heading', s->>'heading',
      'body', pg_temp.plain_to_nda_html(s->>'body')
    )
    ORDER BY idx
  )
  FROM jsonb_array_elements(sections) WITH ORDINALITY AS arr(s, idx)
)
WHERE sections IS NOT NULL
  AND jsonb_typeof(sections) = 'array';

-- ─── Backfill ndas.sections from their template ─────────────────────────────
UPDATE public.ndas n
SET sections = t.sections
FROM public.nda_templates t
WHERE n.template_id = t.id
  AND n.sections IS NULL;
