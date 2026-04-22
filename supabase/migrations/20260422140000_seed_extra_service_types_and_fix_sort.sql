-- Migration: Seed Graphic Design + Consultancy onboarding library/templates,
-- and fix the sort_order collision (AI Consultancy and Graphic Design were
-- both at 5). Re-grouping puts tech together, then creative, then generic.
-- Idempotent: safe to re-run.

-- ─── Sort order: tech first, then creative, then generic ───────────────────
UPDATE public.service_types SET sort_order = 1 WHERE name = 'IT Services';
UPDATE public.service_types SET sort_order = 2 WHERE name = 'Software Development';
UPDATE public.service_types SET sort_order = 3 WHERE name = 'AI Consultancy';
UPDATE public.service_types SET sort_order = 4 WHERE name = 'Website Development';
UPDATE public.service_types SET sort_order = 5 WHERE name = 'Digital Marketing';
UPDATE public.service_types SET sort_order = 6 WHERE name = 'Graphic Design';
UPDATE public.service_types SET sort_order = 7 WHERE name = 'Consultancy';

-- ─── Action library seed for Graphic Design + Consultancy ───────────────────
INSERT INTO public.onboarding_action_library (service_type_id, name, description, sort_order)
SELECT st.id, x.name, x.description, x.sort_order
  FROM public.service_types st
  JOIN (VALUES
    -- Graphic Design
    ('Graphic Design', 'Brand brief & moodboard captured',     'Creative direction, references, and tone agreed.', 10),
    ('Graphic Design', 'Brand guidelines collected',           'Existing style guide, brand book, or rationale gathered.', 20),
    ('Graphic Design', 'Logo files received (vector + raster)','SVG/AI/EPS source files plus raster exports collected.', 30),
    ('Graphic Design', 'Typography & colour palette agreed',   'Typeface licences, weights, and colour tokens locked in.', 40),
    ('Graphic Design', 'Asset library access',                 'Adobe Creative Cloud, Figma, or shared drive access set up.', 50),
    ('Graphic Design', 'Print specifications captured',        'Print sizes, bleed, finishes, and stock requirements.', 60),
    ('Graphic Design', 'Stock & font licensing review',        'Confirm rights to use stock imagery and fonts in deliverables.', 70),
    ('Graphic Design', 'File delivery format & DPI agreed',    'Final delivery format, DPI, and file naming convention.', 80),
    ('Graphic Design', 'Stakeholder approval workflow',        'Sign-off path and approver list documented.', 90),
    ('Graphic Design', 'Project timeline & milestones agreed', 'Key dates and review points scheduled.', 100),

    -- Consultancy (generic — works for any advisory engagement)
    ('Consultancy', 'Discovery workshop',                  'Initial workshop to understand context and goals.', 10),
    ('Consultancy', 'Stakeholder mapping',                 'Decision-makers, influencers, and end users identified.', 20),
    ('Consultancy', 'Current-state assessment',            'Baseline of existing processes, systems, or capabilities.', 30),
    ('Consultancy', 'Engagement scope & boundaries',       'What is in and out of scope clearly documented.', 40),
    ('Consultancy', 'Success criteria & KPIs',             'Measurable outcomes for the engagement agreed.', 50),
    ('Consultancy', 'Decision-making framework',           'How decisions are escalated and approved.', 60),
    ('Consultancy', 'Workshop schedule planned',           'Cadence and format of working sessions agreed.', 70),
    ('Consultancy', 'Reporting cadence & format',          'Frequency, audience, and structure of progress reports.', 80),
    ('Consultancy', 'Documentation handover plan',         'What artefacts will be delivered and where they live.', 90),
    ('Consultancy', 'Sign-off process agreed',             'How phases and final deliverables get signed off.', 100)
  ) AS x(service_type_name, name, description, sort_order)
    ON st.name = x.service_type_name
 WHERE NOT EXISTS (
   SELECT 1 FROM public.onboarding_action_library al
    WHERE al.service_type_id = st.id AND al.name = x.name
 );

-- ─── Report section templates for Graphic Design + Consultancy ─────────────
-- Same six default sections as the other service types.
INSERT INTO public.onboarding_report_section_templates (service_type_id, heading, body_template, sort_order)
SELECT st.id, x.heading, x.body_template, x.sort_order
  FROM public.service_types st
  CROSS JOIN (VALUES
    ('Discovery Summary',
     'Summary of the discovery meeting and key context gathered from the client.',
     10),
    ('Recommended Actions',
     '{{recommended_actions}}',
     20),
    ('Scope Agreed',
     'The scope of work agreed during onboarding.',
     30),
    ('Timeline',
     'Key milestones and target dates for delivery.',
     40),
    ('Team & Contacts',
     'Delivery team, primary contacts, and escalation paths.',
     50),
    ('Next Steps',
     'Immediate next steps and any actions required from the client.',
     60)
  ) AS x(heading, body_template, sort_order)
 WHERE st.name IN ('Graphic Design', 'Consultancy')
   AND NOT EXISTS (
     SELECT 1 FROM public.onboarding_report_section_templates t
      WHERE t.service_type_id = st.id AND t.heading = x.heading
   );
