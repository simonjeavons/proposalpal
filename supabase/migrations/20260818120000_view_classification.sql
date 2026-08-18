-- Classify recorded views as human / bot / internal.
--
-- Why: view tracking fires from client-side JS on the public pages. Email
-- security sandboxes (notably Microsoft Defender for Office 365 Safe Links)
-- open those links in a headless browser to check for malware, execute the
-- JS, and were therefore recorded as genuine customer views. Analysis of the
-- first 567 rows found 44% of views carried fabricated user-agent strings,
-- and 12 of 35 proposals had their *first* view -- the one that sets
-- viewed_at and triggers the "customer opened your proposal" email -- come
-- from a scanner rather than a client.
--
-- Rows are classified, never discarded, so the heuristic can be re-tuned
-- against real data later.

-- ─── Internal egress ranges ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.internal_ip_ranges (
  cidr  CIDR PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_ip_ranges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_internal_ip_ranges" ON public.internal_ip_ranges;
CREATE POLICY "auth_read_internal_ip_ranges" ON public.internal_ip_ranges
  FOR SELECT TO authenticated USING (true);

-- Identified from the view log: 26 views spanning 13 different client
-- companies, all UK office hours, Chrome auto-incrementing 147->151 across
-- three months alongside iPhone and Android devices. That profile is staff,
-- not a client. Remove this row if that attribution is wrong.
INSERT INTO public.internal_ip_ranges (cidr, label)
VALUES ('62.232.125.102/32', 'Shoothill office egress (inferred - verify)')
ON CONFLICT (cidr) DO NOTHING;

-- ─── Classifier ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.classify_view(
  p_user_agent   TEXT,
  p_ip           TEXT,
  p_is_webdriver BOOLEAN DEFAULT FALSE
) RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $fn$
DECLARE
  ua           TEXT := coalesce(p_user_agent, '');
  chrome_major INT;
BEGIN
  -- Client self-reported an automation harness (navigator.webdriver).
  IF coalesce(p_is_webdriver, FALSE) THEN RETURN 'bot'; END IF;

  -- A JS-driven tracker cannot fire without a browser, so an absent UA is
  -- something forging the request.
  IF length(btrim(ua)) = 0 THEN RETURN 'bot'; END IF;

  -- Self-identifying non-browser agents. Bots are named explicitly rather
  -- than matching a bare "bot" substring, which would catch real devices
  -- such as the CUBOT range of Android handsets.
  IF ua ~* '(googlebot|bingbot|yandex(bot)?|duckduckbot|baiduspider|slurp|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|applebot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|bingpreview|crawler|crawl|spider|headless|phantomjs|puppeteer|playwright|selenium|webdriver|curl/|wget/|python-requests|go-http-client|okhttp|apache-httpclient|libwww|httrack|scrapy)'
  THEN RETURN 'bot'; END IF;

  chrome_major := nullif((regexp_match(ua, 'Chrome/([0-9]+)'))[1], '')::INT;

  -- Chrome dropped Windows 7 / 8 / 8.1 after v109, so "Windows NT 6.1" plus
  -- a modern Chrome is a combination that cannot exist on a real machine.
  IF chrome_major IS NOT NULL
     AND chrome_major >= 110
     AND ua ~ 'Windows NT 6\.[123]'
  THEN RETURN 'bot'; END IF;

  -- Chrome's UA reduction (v113+) freezes the minor version to "0.0.0" on
  -- desktop, so a full build number there is fabricated. Deliberately scoped
  -- to desktop: Android WebView (in-app browsers such as Gmail or LinkedIn)
  -- legitimately still sends full build numbers.
  IF ua ~ '(Windows NT|Macintosh)'
     AND ua ~ 'Chrome/[0-9]+\.0\.[0-9]{3,4}\.[0-9]+'
  THEN RETURN 'bot'; END IF;

  -- Known internal egress.
  IF p_ip ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'
     AND EXISTS (
       SELECT 1 FROM public.internal_ip_ranges r WHERE p_ip::INET <<= r.cidr
     )
  THEN RETURN 'internal'; END IF;

  RETURN 'human';
END;
$fn$;

-- ─── Trigger ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_view_classification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.classification IS NULL THEN
    NEW.classification := public.classify_view(
      NEW.user_agent, NEW.ip, NEW.is_webdriver
    );
  END IF;
  RETURN NEW;
END;
$fn$;

-- ─── Apply to every view table ───────────────────────────────────────────────
DO $do$
DECLARE
  t   TEXT;
  fk  TEXT;
  tbl TEXT[][] := ARRAY[
    ['proposal_views',          'proposal_id'],
    ['contract_views',          'contract_id'],
    ['nda_views',               'nda_id'],
    ['onboarding_report_views', 'report_id']
  ];
  i INT;
BEGIN
  FOR i IN 1 .. array_length(tbl, 1) LOOP
    t  := tbl[i][1];
    fk := tbl[i][2];

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE NOTICE 'skipping %, table not present', t;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I
         ADD COLUMN IF NOT EXISTS classification TEXT,
         ADD COLUMN IF NOT EXISTS is_webdriver   BOOLEAN,
         ADD COLUMN IF NOT EXISTS visit_id       TEXT', t);

    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_classification_chk');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I
         CHECK (classification IN (''human'', ''bot'', ''internal''))
         NOT VALID', t, t || '_classification_chk');

    -- Backfill history with the same function used for new rows.
    EXECUTE format(
      'UPDATE public.%I
          SET classification = public.classify_view(user_agent, ip, is_webdriver)
        WHERE classification IS NULL', t);

    EXECUTE format(
      'ALTER TABLE public.%I VALIDATE CONSTRAINT %I', t, t || '_classification_chk');

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (classification)',
      'idx_' || t || '_classification', t);

    -- One row per (document, browser visit): collapses the double-fire from
    -- the view page and the accept page, plus in-tab refreshes.
    --
    -- Deliberately NOT a partial index. Postgres cannot infer a partial
    -- unique index for ON CONFLICT unless the statement repeats the
    -- predicate, which the Supabase client cannot express. A plain unique
    -- index behaves identically here because NULLs are distinct by default,
    -- so older clients that send no visit_id remain unconstrained.
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (%I, visit_id)',
      'uq_' || t || '_visit', t, fk);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_classify_view ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_classify_view BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_view_classification()', t);
  END LOOP;
END
$do$;
