-- Migration: Seed onboarding action library, report section templates, and settings.
-- Idempotent — guards against re-running by checking name/heading uniqueness per service type.

-- ─── Settings singleton ─────────────────────────────────────────────────────
INSERT INTO public.onboarding_settings (id, reminder_stage1_days, reminder_stage2_days, reminder_stage3_days)
VALUES (1, 5, 10, 5)
ON CONFLICT (id) DO NOTHING;

-- ─── Action library seed ────────────────────────────────────────────────────
-- Helper CTE pattern: for each (service_type name, action name, sort_order),
-- insert if no row already exists for that pair.

INSERT INTO public.onboarding_action_library (service_type_id, name, description, sort_order)
SELECT st.id, x.name, x.description, x.sort_order
  FROM public.service_types st
  JOIN (VALUES
    -- IT Services
    ('IT Services', 'New server setup',                     'On-prem or cloud server provisioning, hostname/IP/OS captured.', 10),
    ('IT Services', 'Email migration',                      'M365, Google Workspace, or Exchange mailbox migration.', 20),
    ('IT Services', 'Endpoint protection rollout',          'Proofpoint, Defender, or equivalent deployed to all endpoints.', 30),
    ('IT Services', 'Workstation / device migration',       'Client workstation or device migration plan executed.', 40),
    ('IT Services', 'Firewall / VPN configuration',         'Network perimeter and remote access configuration.', 50),
    ('IT Services', 'Backup & DR setup',                    'Backup schedule, retention, and disaster recovery plan in place.', 60),
    ('IT Services', 'Active Directory / Entra ID setup',    'Identity provider configured; user/group structure agreed.', 70),
    ('IT Services', 'Wi-Fi / network rollout',              'Wireless and wired network installed and tested.', 80),
    ('IT Services', 'Patch management onboarding',          'Patch policy and tooling enrolled.', 90),
    ('IT Services', 'Helpdesk onboarding',                  'Ticketing access provisioned, escalation contacts agreed.', 100),

    -- Software Development
    ('Software Development', 'Source control setup',        'GitHub or Azure DevOps repo created, access granted.', 10),
    ('Software Development', 'CI/CD pipeline configuration','Build/deploy pipelines configured and validated.', 20),
    ('Software Development', 'Environment provisioning',    'Dev, staging, and production environments provisioned.', 30),
    ('Software Development', 'Domain & DNS configuration',  'Domain registered/transferred; DNS records configured.', 40),
    ('Software Development', 'SSL / certificate management','TLS certs installed; renewal process documented.', 50),
    ('Software Development', 'Monitoring & error tracking', 'Sentry or equivalent integrated; alert routing agreed.', 60),
    ('Software Development', 'Database provisioning & backups','DB instance(s) provisioned; backup schedule configured.', 70),
    ('Software Development', 'Access management',           'Decision on who gets repo, server, and dashboard access.', 80),
    ('Software Development', 'Sprint cadence agreed',       'Sprint length, ceremonies, and stakeholder cadence agreed.', 90),
    ('Software Development', 'Handover documentation',      'Architecture, runbooks, and credentials documented.', 100),

    -- AI Consultancy
    ('AI Consultancy', 'Use-case discovery workshop',       'Initial workshop to identify and prioritise AI use cases.', 10),
    ('AI Consultancy', 'Data audit & source access',        'Inventory of data sources; access provisioned.', 20),
    ('AI Consultancy', 'Compliance / data residency review','GDPR, residency, and sector-specific compliance review.', 30),
    ('AI Consultancy', 'LLM API access setup',              'Anthropic, OpenAI, or Azure OpenAI access configured.', 40),
    ('AI Consultancy', 'Sandbox environment provisioning',  'Isolated sandbox for prototypes and evaluations.', 50),
    ('AI Consultancy', 'Success metrics & KPIs defined',    'Quantitative measures for pilot success agreed.', 60),
    ('AI Consultancy', 'Pilot scope & timeline agreed',     'Pilot boundary and milestones documented.', 70),
    ('AI Consultancy', 'Data labelling / annotation plan',  'If applicable: labelling approach, tooling, and people.', 80),
    ('AI Consultancy', 'Model evaluation framework',        'Eval harness or process to compare model variants.', 90),
    ('AI Consultancy', 'Stakeholder identification',        'Decision-makers, SMEs, and end-user reps identified.', 100),

    -- Digital Marketing
    ('Digital Marketing', 'GA4 / analytics access',         'Google Analytics 4 access granted to delivery team.', 10),
    ('Digital Marketing', 'Google Ads / Meta Ads access',   'Ad platform admin access provisioned.', 20),
    ('Digital Marketing', 'CRM access',                     'HubSpot or equivalent CRM access provisioned.', 30),
    ('Digital Marketing', 'CMS access',                     'Content management system access provisioned.', 40),
    ('Digital Marketing', 'Brand guidelines & assets',      'Brand book, logos, fonts, and palette collected.', 50),
    ('Digital Marketing', 'Target audience definition',     'Personas and target segments agreed.', 60),
    ('Digital Marketing', 'Conversion goals & KPIs',        'Conversion events and reporting KPIs agreed.', 70),
    ('Digital Marketing', 'UTM / tracking strategy',        'UTM convention and tag plan documented.', 80),
    ('Digital Marketing', 'Reporting cadence agreed',       'Frequency, format, and audience for reports agreed.', 90),
    ('Digital Marketing', 'Channel mix agreed',             'Channels in scope and budget split agreed.', 100),

    -- Website Development
    ('Website Development', 'Hosting & DNS access',         'Hosting and DNS admin access provisioned.', 10),
    ('Website Development', 'Domain registration / transfer','Domain registered or transfer initiated.', 20),
    ('Website Development', 'CMS choice & access',          'CMS selected (e.g. WordPress); admin access provisioned.', 30),
    ('Website Development', 'Brand assets collected',       'Logos, fonts, colour palette, imagery collected.', 40),
    ('Website Development', 'Sitemap & content audit',      'Sitemap drafted; content sources and gaps identified.', 50),
    ('Website Development', 'Wireframes / mockups scope',   'Scope of wireframes and visual designs agreed.', 60),
    ('Website Development', 'SEO baseline captured',        'Existing rankings, traffic, and keywords recorded.', 70),
    ('Website Development', 'GA / Search Console access',   'Analytics and Search Console access provisioned.', 80),
    ('Website Development', 'Stakeholder approval workflow','Sign-off process and approvers documented.', 90),
    ('Website Development', 'Launch checklist agreed',      'Pre-launch QA and go-live checklist signed off.', 100)
  ) AS x(service_type_name, name, description, sort_order)
    ON st.name = x.service_type_name
 WHERE NOT EXISTS (
   SELECT 1 FROM public.onboarding_action_library al
    WHERE al.service_type_id = st.id AND al.name = x.name
 );

-- ─── Report section templates seed ──────────────────────────────────────────
-- Six default sections per service type. body_template uses the
-- {{recommended_actions}} placeholder, substituted at clone time.

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
 WHERE st.name IN ('IT Services', 'Software Development', 'AI Consultancy', 'Digital Marketing', 'Website Development')
   AND NOT EXISTS (
     SELECT 1 FROM public.onboarding_report_section_templates t
      WHERE t.service_type_id = st.id AND t.heading = x.heading
   );
