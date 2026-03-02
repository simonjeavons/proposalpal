import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Proposal, Challenge, Phase, RetainerOption } from "@/types/proposal";
import { Checkbox } from "@/components/ui/checkbox";

const formatCurrency = (n: number) => `£${n.toLocaleString('en-GB')}`;

export default function ProposalAccept() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const retainerIndex = Number(searchParams.get('retainer') ?? 1);

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    supabase.from("proposals").select("*").eq("slug", slug).single().then(({ data }) => {
      if (data) {
        setProposal({
          ...data,
          challenges: (data.challenges || []) as unknown as Challenge[],
          phases: (data.phases || []) as unknown as Phase[],
          retainer_options: (data.retainer_options || []) as unknown as RetainerOption[],
        } as Proposal);
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F4F7FA' }}>
      <div style={{ width: 32, height: 32, border: '4px solid #009FE3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!proposal) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F4F7FA' }}>
      <p style={{ color: '#3A6278', fontSize: 16 }}>Proposal not found.</p>
    </div>
  );

  const retainer = proposal.retainer_options[retainerIndex] || proposal.retainer_options[0];
  const upfront = Number(proposal.upfront_total);
  const retainerPrice = retainer?.price || 0;
  const retainerAnnual = retainerPrice * 12;
  const firstYearTotal = upfront + retainerAnnual;

  const contractUrl = (proposal as any).contract_file_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/contracts/${(proposal as any).contract_file_url}`
    : null;

  const handleSubmit = async () => {
    if (!signerName || !agreed) return;
    setSubmitting(true);

    const { error } = await supabase.from("proposal_acceptances" as any).insert({
      proposal_id: proposal.id,
      signer_name: signerName,
      signer_title: signerTitle,
      selected_retainer_index: retainerIndex,
      upfront_total: upfront,
      retainer_price: retainerPrice,
      first_year_total: firstYearTotal,
    });

    if (!error) {
      await supabase.from("proposals").update({ status: 'accepted' } as any).eq("id", proposal.id);
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: '#F4F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: 'white', border: '1px solid #DDE8EE', maxWidth: 560, width: '100%', margin: 24, textAlign: 'center', padding: '56px 40px' }}>
        <div style={{ width: 56, height: 56, background: '#009FE3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#043D5D', marginBottom: 8 }}>Proposal Accepted</h1>
        <p style={{ fontSize: 14, color: '#3A6278', lineHeight: 1.7, marginBottom: 24 }}>
          Thank you, {signerName}. Your acceptance has been recorded.<br />
          {proposal.contact_name} will be in touch within one working day to prepare your Statement of Work.
        </p>
        <div style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: '16px 20px', fontSize: 13, color: '#3A6278' }}>
          First Year Total: <strong style={{ color: '#043D5D' }}>{formatCurrency(firstYearTotal)} + VAT</strong>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FA', fontFamily: "'Inter', sans-serif", color: '#1A2E3B', fontSize: 14, lineHeight: 1.7 }}>
      {/* Header */}
      <div style={{ background: '#043D5D', padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img style={{ height: 24, filter: 'brightness(0) invert(1)' }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>Contract Acceptance — {proposal.client_name}</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Pricing Summary */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>01</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Pricing Summary</h2>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: '18px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>One-Time Project</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', letterSpacing: '-.02em' }}>{formatCurrency(upfront)}<span style={{ fontSize: 12, fontWeight: 500, color: '#AAAAAA' }}> + VAT</span></div>
                <div style={{ fontSize: 12, color: '#3A6278', marginTop: 4 }}>{proposal.payment_terms}</div>
              </div>
              <div style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: '18px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>Monthly Retainer — {retainer?.name || 'Selected'}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', letterSpacing: '-.02em' }}>{formatCurrency(retainerPrice)}<span style={{ fontSize: 12, fontWeight: 500, color: '#AAAAAA' }}> + VAT / mo</span></div>
                <div style={{ fontSize: 12, color: '#3A6278', marginTop: 4 }}>{retainer?.hours || ''} · 12-month retainer: {formatCurrency(retainerAnnual)}</div>
              </div>
            </div>
            <div style={{ background: '#043D5D', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>First Year Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#009FE3', letterSpacing: '-.02em' }}>{formatCurrency(firstYearTotal)}<span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}> + VAT</span></span>
            </div>
          </div>
        </div>

        {/* Contract Document */}
        {contractUrl && (
          <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
            <div style={{ padding: '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>02</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Contract Document</h2>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <iframe src={contractUrl + '#toolbar=1&navpanes=0'} title="Contract Document" width="100%" style={{ height: 600, border: '1px solid #DDE8EE' }} />
              <a href={contractUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: '#009FE3', fontWeight: 600 }}>
                Open in new tab ↗
              </a>
            </div>
          </div>
        )}

        {/* Acceptance Form */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 40 }}>
          <div style={{ padding: '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>{contractUrl ? '03' : '02'}</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Sign & Accept</h2>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>Full Name *</label>
                <input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Your full name"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #DDE8EE', fontSize: 14, color: '#1A2E3B', outline: 'none', background: '#F4F7FA', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>Job Title</label>
                <input
                  value={signerTitle}
                  onChange={e => setSignerTitle(e.target.value)}
                  placeholder="e.g. Managing Director"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #DDE8EE', fontSize: 14, color: '#1A2E3B', outline: 'none', background: '#F4F7FA', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>Date</label>
              <input
                value={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                readOnly
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #DDE8EE', fontSize: 14, color: '#AAAAAA', outline: 'none', background: '#F4F7FA', boxSizing: 'border-box', maxWidth: 300 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 24, marginBottom: 24 }}>
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
                style={{ borderColor: '#DDE8EE' }}
              />
              <label style={{ fontSize: 13, color: '#3A6278', lineHeight: 1.6, cursor: 'pointer' }} onClick={() => setAgreed(!agreed)}>
                I have read and agree to the terms outlined in this proposal{contractUrl ? ' and the attached contract document' : ''}. I confirm I am authorised to accept on behalf of <strong style={{ color: '#043D5D' }}>{proposal.organisation || proposal.client_name}</strong>.
              </label>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!signerName || !agreed || submitting}
              style={{
                width: '100%',
                padding: '16px',
                background: (!signerName || !agreed) ? '#DDE8EE' : '#009FE3',
                color: (!signerName || !agreed) ? '#AAAAAA' : 'white',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: (!signerName || !agreed) ? 'not-allowed' : 'pointer',
                transition: 'background .2s',
              }}
            >
              {submitting ? 'Submitting…' : 'Sign & Accept Proposal →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
