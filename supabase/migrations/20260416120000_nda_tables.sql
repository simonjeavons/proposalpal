-- Migration: NDA tables (nda_templates, ndas, nda_views) + seed Mutual NDA
-- Generated: 2026-04-16

-- ─── nda_templates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nda_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nda_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nda_templates"
  ON public.nda_templates FOR SELECT USING (true);

CREATE POLICY "Admin write nda_templates"
  ON public.nda_templates FOR ALL USING (public.is_admin());

-- ─── ndas ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ndas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  status TEXT NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES public.nda_templates(id),

  -- Shoothill party (pre-signed)
  shoothill_signatory TEXT NOT NULL DEFAULT 'Simon Jeavons',
  shoothill_title TEXT NOT NULL DEFAULT 'Group Managing Director',

  -- Counterparty
  company_name TEXT NOT NULL,
  company_reg_number TEXT,
  registered_address_1 TEXT,
  registered_address_2 TEXT,
  registered_city TEXT,
  registered_county TEXT,
  registered_postcode TEXT,
  contact_name TEXT,
  contact_email TEXT,

  -- NDA-specific
  purpose TEXT NOT NULL DEFAULT 'potential business collaboration opportunities',
  confidentiality_years INTEGER DEFAULT 5,
  agreement_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Signature (populated on signing)
  signer_name TEXT,
  signer_title TEXT,
  signed_at TIMESTAMPTZ,
  signed_nda_url TEXT,

  -- Metadata
  prepared_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_view_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ndas ENABLE ROW LEVEL SECURITY;

-- Authenticated users can CRUD
CREATE POLICY "auth_all_ndas" ON public.ndas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public can read by slug (for signing page)
CREATE POLICY "public_read_ndas_by_slug" ON public.ndas
  FOR SELECT USING (true);

-- ─── nda_views ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nda_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nda_id UUID NOT NULL REFERENCES public.ndas(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_nda_views_nda_id_viewed_at
  ON public.nda_views (nda_id, viewed_at DESC);

ALTER TABLE public.nda_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_nda_views" ON public.nda_views;
CREATE POLICY "auth_read_nda_views" ON public.nda_views
  FOR SELECT TO authenticated USING (true);

-- ─── Seed: Mutual NDA template ──────────────────────────────────────────────
INSERT INTO public.nda_templates (name, description, sections, sort_order)
VALUES (
  'Mutual NDA',
  'Standard mutual confidentiality agreement. Both parties agree to protect each other''s confidential information disclosed for the purpose of potential business collaboration.',
  '[
    {
      "heading": "1. Definitions and Interpretation",
      "body": "1.1 The following definitions and rules of interpretation apply in this Agreement:\n\nBusiness Day: a day (other than a Saturday, Sunday or public holiday) when banks in London are open for business.\n\nConfidential Information: all confidential information (however recorded, preserved or disclosed) disclosed by a party or its Representatives to the other party and that party''s Representatives including but not limited to:\n\n(a) the fact that discussions and negotiations are taking place concerning the Purpose and the status of those discussions and negotiations;\n\n(b) the terms of this agreement;\n\n(c) any information that would be regarded as confidential by a reasonable business person relating to:\n  (i) the business, affairs, customers, clients, suppliers, plans, intentions, or market opportunities of the Disclosing Party or of the Disclosing Party''s Group; and\n  (ii) the operations, processes, product information, know-how, designs, trade secrets or software of the Disclosing Party or of the Disclosing Party''s Group;\n\n(d) any information or analysis derived from Confidential Information;\n\nbut not including any information that:\n\n(e) is or becomes generally available to the public other than as a result of its disclosure by the Recipient or its Representatives in breach of this agreement or of any other undertaking of confidentiality addressed to the party to whom the information relates (except that any compilation of otherwise public information in a form not publicly known shall nevertheless be treated as Confidential Information); or\n\n(f) was, is or becomes available to the Recipient on a non-confidential basis from a person who, to the Recipient''s knowledge, is not bound by a confidentiality agreement with the Disclosing Party or otherwise prohibited from disclosing the information to the Recipient; or\n\n(g) was lawfully in the possession of the Recipient before the information was disclosed to it by the Disclosing Party; or\n\n(h) the parties agree in writing is not confidential or may be disclosed; or\n\n(i) is developed by or for the Recipient independently of the information disclosed by the Disclosing Party.\n\nDisclosing Party: a party to this agreement which discloses or makes available directly or indirectly Confidential Information.\n\nGroup: in relation to a company, that company, each and any group undertaking, as such term is defined in section 1161 of the Companies Act 2006.\n\nPurpose: as defined in the Background.\n\nRecipient: a party to this agreement which receives or obtains directly or indirectly Confidential Information.\n\nRepresentative: employees, agents, officers, advisers and other representatives of the Disclosing Party or Recipient (as applicable) or their respective Groups.\n\n1.2 Clause, schedule and paragraph headings shall not affect the interpretation of this agreement.\n\n1.3 A person includes a natural person, corporate or unincorporated body (whether or not having separate legal personality).\n\n1.4 The schedules form part of this agreement and shall have effect as if set out in full in the body of this agreement. Any reference to this agreement includes the schedules.\n\n1.5 Unless the context otherwise requires, words in the singular shall include the plural and in the plural include the singular.\n\n1.6 A reference to a statute or statutory provision is a reference to it as it is in force for the time being, taking account of any amendment, extension, or re-enactment, and includes any subordinate legislation for the time being in force made under it.\n\n1.7 Any obligation in this agreement on a person not to do something includes an obligation not to agree or allow that thing to be done.\n\n1.8 References to clauses and schedules are to the clauses and schedules of this agreement; references to paragraphs are to paragraphs of the relevant schedule."
    },
    {
      "heading": "2. Obligations of Confidentiality",
      "body": "2.1 The Recipient shall keep the Disclosing Party''s Confidential Information confidential and, except with the prior written consent of the Disclosing Party, shall:\n\n(a) not use or exploit the Confidential Information in any way except for the Purpose;\n\n(b) not disclose or make available the Confidential Information in whole or in part to any third party, except as expressly permitted by this agreement;\n\n(c) not copy, reduce to writing or otherwise record the Confidential Information except as strictly necessary for the Purpose (and any such copies, reductions to writing and records shall be the property of the Disclosing Party); and\n\n(d) apply the same security measures and degree of care to the Confidential Information as the Recipient applies to its own confidential information, which the Recipient warrants as providing adequate protection from unauthorised disclosure, copying or use.\n\n2.2 The Recipient may disclose the Disclosing Party''s Confidential Information to those of its Representatives who need to know this Confidential Information for the Purpose, provided that:\n\n(a) it informs its Representatives of the confidential nature of the Confidential Information before disclosure; and\n\n(b) it procures that its Representatives shall, in relation to any Confidential Information disclosed to them, comply with this agreement as if they were the Recipient and, if the Disclosing Party so requests, procure that any relevant Representative enters into a confidentiality agreement with the Disclosing Party on terms equivalent to those contained in this agreement,\n\nand it shall at all times be liable for the failure of any Representative to comply with the terms of this agreement.\n\n2.3 A party may disclose Confidential Information to the extent such Confidential Information is required to be disclosed by law, by any governmental or other regulatory authority, or by a court or other authority of competent jurisdiction provided that, to the extent it is legally permitted to do so, it gives the other party as much notice of this disclosure as possible and, where notice of disclosure is not prohibited and is given in accordance with this clause 2.3, it takes into account the reasonable requests of the other party in relation to the content of this disclosure.\n\n2.4 The Recipient shall establish and maintain adequate security measures (including any reasonable security measures proposed by the Disclosing Party from time to time) to safeguard the Confidential Information from unauthorised access or use.\n\n2.5 No party shall make, or permit any person to make, any public announcement concerning this agreement, the Purpose or its prospective interest in the Purpose without the prior written consent of the other party (such consent not to be unreasonably withheld or delayed) except as required by law or any governmental or regulatory authority (including, without limitation, any relevant securities exchange) or by any court or other authority of competent jurisdiction. No party shall make use of the other party''s name or any information acquired through its dealings with the other party for publicity or marketing purposes without the prior written consent of the other party."
    },
    {
      "heading": "3. Return of Information",
      "body": "3.1 At the request of the Disclosing Party, the Recipient shall:\n\n(a) destroy or return to the Disclosing Party all documents and materials (and any copies) containing, reflecting, incorporating, or based on the Disclosing Party''s Confidential Information;\n\n(b) erase all the Disclosing Party''s Confidential Information from its computer systems or which is stored in electronic form (to the extent possible); and\n\n(c) certify in writing to the Disclosing Party that it has complied with the requirements of this clause, provided that a Recipient may retain documents and materials containing, reflecting, incorporating, or based on the Disclosing Party''s Confidential Information to the extent required by law or any applicable governmental or regulatory authority and to the extent reasonable to permit the Recipient to keep evidence that it has performed its obligations under this agreement. The provisions of this agreement shall continue to apply to any documents and materials retained by the Recipient.\n\n3.2 If the Recipient develops or uses a product or a process which, in the reasonable opinion of the Disclosing Party, might have involved the use of any of the Disclosing Party''s Confidential Information, the Recipient shall, at the request of the Disclosing Party, supply to the Disclosing Party information reasonably necessary to establish that the Disclosing Party''s Confidential Information has not been used or disclosed."
    },
    {
      "heading": "4. Reservation of Rights and Acknowledgement",
      "body": "4.1 All Confidential Information shall remain the property of the Disclosing Party. Each party reserves all rights in its Confidential Information. No rights, including, but not limited to, intellectual property rights, in respect of a party''s Confidential Information are granted to the other party and no obligations are imposed on the Disclosing Party other than those expressly stated in this agreement.\n\n4.2 Except as expressly stated in this agreement, no party makes any express or implied warranty or representation concerning its Confidential Information, or the accuracy or completeness of the Confidential Information.\n\n4.3 The disclosure of Confidential Information by the Disclosing Party shall not form any offer by, or representation or warranty on the part of, the Disclosing Party to enter into any further agreement in relation to the Purpose, or the development or supply of any product or service to which the Confidential Information relates.\n\n4.4 The Recipient acknowledges that damages alone would not be an adequate remedy for the breach of any of the provisions of this agreement. Accordingly, without prejudice to any other rights and remedies it may have, the Disclosing Party shall be entitled to the granting of equitable relief (including without limitation injunctive relief) concerning any threatened or actual breach of any of the provisions of this agreement."
    },
    {
      "heading": "5. Warranty and Indemnity",
      "body": "5.1 Each Disclosing Party warrants that it has the right to disclose its Confidential Information to the Recipient and to authorise the Recipient to use such Confidential Information for the Purpose.\n\n5.2 Each Recipient shall indemnify and keep fully indemnified the Disclosing Party and its Group at all times against all liabilities, costs (including legal costs on an indemnity basis), expenses, damages and losses (including any direct, indirect or consequential losses, loss of profit, loss of reputation and all interest, penalties and other reasonable costs and expenses suffered or incurred by the Disclosing Party and/or its Group) arising from any breach of this agreement by the Recipient and from the actions or omissions of any Representative of the Recipient."
    },
    {
      "heading": "6. Term and Termination",
      "body": "6.1 If either party decides not to become or continue to be involved in the Purpose it shall notify the other party in writing immediately. The obligations of each party shall, notwithstanding any earlier termination of negotiations or discussions between the parties in relation to the Purpose, continue for a period of {{CONFIDENTIALITY_YEARS}} from the termination of this agreement.\n\n6.2 Termination of this agreement shall not affect any accrued rights or remedies to which either party is entitled."
    },
    {
      "heading": "7. Entire Agreement and Variation",
      "body": "7.1 This agreement constitutes the entire agreement between the parties and supersedes and extinguishes all previous drafts, agreements, arrangements and understandings between them, whether written or oral, relating to its subject matter.\n\n7.2 Each party agrees that it shall have no remedies in respect of any representation or warranty (whether made innocently or negligently) that is not set out in this agreement. Each party agrees that its only liability in respect of those representations and warranties that are set out in this agreement (whether made innocently or negligently) shall be for breach of contract.\n\n7.3 No variation of this agreement shall be effective unless it is in writing and signed by each of the parties (or their authorised representatives)."
    },
    {
      "heading": "8. No Waiver",
      "body": "8.1 Failure to exercise, or any delay in exercising, any right or remedy provided under this agreement or by law shall not constitute a waiver of that or any other right or remedy, nor shall it preclude or restrict any further exercise of that or any other right or remedy.\n\n8.2 No single or partial exercise of any right or remedy provided under this agreement or by law shall preclude or restrict the further exercise of that or any other right or remedy."
    },
    {
      "heading": "9. Assignment",
      "body": "Except as otherwise provided in this agreement, no party may assign, sub-contract or deal in any way with, any of its rights or obligations under this agreement or any document referred to in it."
    },
    {
      "heading": "10. Notices",
      "body": "10.1 Any notice required to be given under this agreement, shall be in writing and shall be delivered personally, or sent by pre-paid first-class post or recorded delivery or by commercial courier, to each party required to receive the notice at its address as set out below:\n\n(a) Shoothill Ltd:\nFAO: The Group Managing Director\nWillow House East\nShrewsbury Business Park\nShrewsbury\nSY2 6LG\n\n(b) The other party at the address specified in this agreement.\n\n10.2 Or as otherwise specified by the relevant party by notice in writing to each other party.\n\n10.3 Any notice shall be deemed to have been duly received:\n\n(a) if delivered personally, when left at the address and for the contact referred to in this clause; or\n\n(b) if sent by pre-paid first class post or recorded delivery, at 9.00 am on the second Business Day after posting; or\n\n(c) if delivered by commercial courier, on the date and at the time that the courier''s delivery receipt is signed.\n\n10.4 A notice required to be given under this agreement shall not be validly given if sent by e-mail."
    },
    {
      "heading": "11. No Partnership",
      "body": "Nothing in this agreement is intended to, or shall be deemed to, establish any partnership or joint venture between any of the parties, constitute any party the agent of another party, nor authorise any party to make or enter into any commitments for or on behalf of any other party."
    },
    {
      "heading": "12. Third Party Rights",
      "body": "A person who is not a party to this agreement shall not have any rights under or in connection with it."
    },
    {
      "heading": "13. Governing Law and Jurisdiction",
      "body": "13.1 This agreement and any dispute or claim arising out of or in connection with it or its subject matter or formation (including non-contractual disputes or claims) shall be governed by and construed in accordance with English law.\n\n13.2 The parties irrevocably agree that the courts of England and Wales shall have exclusive jurisdiction to settle any dispute or claim that arises out of or in connection with this agreement or its subject matter or formation (including non-contractual disputes or claims)."
    }
  ]'::jsonb,
  1
);
