import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatConfidentialityDuration } from "@/components/NdaPDF";

const formatDate = (s: string) => {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface NdaRecord {
  id: string;
  slug: string;
  status: 'pending' | 'signed';
  company_name: string;
  company_reg_number: string | null;
  registered_address_1: string | null;
  registered_address_2: string | null;
  registered_city: string | null;
  registered_county: string | null;
  registered_postcode: string | null;
  contact_name: string | null;
  contact_email: string | null;
  purpose: string;
  confidentiality_years: number | null;
  agreement_date: string;
  signer_name: string | null;
  signer_title: string | null;
  signed_at: string | null;
  signed_nda_url: string | null;
  template_id: string | null;
  shoothill_signatory: string;
  shoothill_title: string;
}

interface TemplateSection { heading: string; body: string; }

// ─── Signature canvas ─────────────────────────────────────────────────────────
function SignatureCanvas({ onSave }: { onSave: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault(); drawing.current = true;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1A2E3B'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    if (!hasSignature) { setHasSignature(true); onSave(canvas.toDataURL()); }
    else { onSave(canvas.toDataURL()); }
  };

  const stopDraw = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false); onSave(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>Signature *</label>
        {hasSignature && <button onClick={clear} style={{ fontSize: 11, color: '#009FE3', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>}
      </div>
      <canvas ref={canvasRef} width={744} height={160}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{ width: '100%', height: 160, border: '1px solid #DDE8EE', background: '#F4F7FA', cursor: 'crosshair', touchAction: 'none', display: 'block' }}
      />
      <p style={{ fontSize: 11, color: '#AAAAAA', marginTop: 4 }}>Draw your signature in the box above</p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function NdaSign() {
  const { slug } = useParams<{ slug: string }>();
  const [nda, setNda] = useState<NdaRecord | null>(null);
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const viewFired = useRef(false);

  // Mobile detection
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 640;

  // Signing form
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'signing' | 'saving'>('idle');

  // Set browser tab title — keep "Proposal" off this page
  useEffect(() => {
    if (nda) {
      document.title = `Confidentiality Agreement — ${nda.company_name}`;
    } else {
      document.title = 'Mutual Confidentiality Agreement';
    }
  }, [nda]);

  // Load NDA
  useEffect(() => {
    if (!slug) return;
    supabase
      .from('ndas' as any)
      .select('*')
      .eq('slug', slug)
      .single()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        const n = data as unknown as NdaRecord;
        setNda(n);

        // Fire view-tracking event (only once, only for non-signed NDAs)
        if (!viewFired.current && n.status !== 'signed') {
          viewFired.current = true;
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
            },
            body: JSON.stringify({ type: 'nda-viewed', ndaId: n.id, userAgent: navigator.userAgent }),
          }).catch(() => { /* fire-and-forget */ });
        }

        // If already signed, show confirmation immediately
        if (n.status === 'signed') { setSubmitted(true); }

        // Load template sections
        if (n.template_id) {
          const { data: tmpl } = await supabase
            .from('nda_templates' as any)
            .select('sections')
            .eq('id', n.template_id)
            .single();
          if (tmpl && Array.isArray((tmpl as any).sections)) {
            setTemplateSections((tmpl as any).sections as TemplateSection[]);
          }
        }
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async () => {
    if (!nda || !signerName || !signatureData || !agreed) return;
    setSubmitState('signing');

    const signedAt = new Date();
    const signingDateStr = signedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const registeredAddress = [nda.registered_address_1, nda.registered_address_2, nda.registered_city, nda.registered_county, nda.registered_postcode].filter(Boolean).join(', ');

    let signedNdaUrl: string | null = null;

    try {
      const [{ pdf }, { NdaPDF }, { SIMON_SIGNATURE_URI }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/NdaPDF'),
        import('../components/ServiceAgreementPDF'),
      ]);

      const props = {
        companyName: nda.company_name,
        companyRegNumber: nda.company_reg_number || undefined,
        registeredAddress,
        purpose: nda.purpose,
        confidentialityYears: nda.confidentiality_years,
        agreementDate: formatDate(nda.agreement_date) || signingDateStr,
        templateSections,
        clientSignerName: signerName,
        clientSignerTitle: signerTitle,
        clientSignatureUri: signatureData,
        signingDate: signingDateStr,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(React.createElement(NdaPDF as any, props)).toBlob();
      let pdfBytes = new Uint8Array(await blob.arrayBuffer());

      // Append certificate page
      try {
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const certPage = pdfDoc.addPage([595, 842]);
        const { width, height } = certPage.getSize();

        // Header bar
        certPage.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0.016, 0.239, 0.365) });
        certPage.drawText('SIGNATURE CERTIFICATE', { x: 28, y: height - 36, size: 11, font: helveticaBold, color: rgb(1, 1, 1) });
        certPage.drawText('Electronic Signature Verification', { x: 28, y: height - 52, size: 8, font: helvetica, color: rgb(0.6, 0.75, 0.82) });

        const refId = `NDA-${nda.slug.toUpperCase().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
        let y = height - 90;
        const line = (label: string, value: string) => {
          certPage.drawText(label, { x: 28, y, size: 8, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
          certPage.drawText(value, { x: 160, y, size: 8, font: helvetica, color: rgb(0.1, 0.18, 0.23) });
          y -= 18;
        };
        line('Document', 'Mutual Confidentiality Agreement');
        line('Company', nda.company_name);
        line('Reference', refId);
        line('Signed', signedAt.toISOString());

        y -= 10;
        certPage.drawLine({ start: { x: 28, y }, end: { x: width - 28, y }, thickness: 0.5, color: rgb(0.86, 0.91, 0.93) });
        y -= 24;

        certPage.drawText('AUTHORISED SIGNATORY — CLIENT', { x: 28, y, size: 8, font: helveticaBold, color: rgb(0, 0.627, 0.89) });
        y -= 18;
        line('Name', signerName);
        line('Title', signerTitle || '\u2014');

        // Embed client signature image
        try {
          const base64 = signatureData.split(',')[1];
          const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          const sigImg = await pdfDoc.embedPng(imgBytes);
          y -= 8;
          certPage.drawImage(sigImg, { x: 28, y: y - 60, width: 160, height: 60 });
          y -= 72;
        } catch { /* skip image if fails */ }

        if (SIMON_SIGNATURE_URI) {
          y -= 10;
          certPage.drawLine({ start: { x: 28, y }, end: { x: width - 28, y }, thickness: 0.5, color: rgb(0.86, 0.91, 0.93) });
          y -= 24;
          certPage.drawText('AUTHORISED SIGNATORY — SHOOTHILL', { x: 28, y, size: 8, font: helveticaBold, color: rgb(0, 0.627, 0.89) });
          y -= 18;
          line('Name', nda.shoothill_signatory || 'Simon Jeavons');
          line('Title', nda.shoothill_title || 'Group Managing Director');
          try {
            const base64 = (SIMON_SIGNATURE_URI as string).split(',')[1];
            const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            const sigImg = await pdfDoc.embedPng(imgBytes);
            y -= 8;
            certPage.drawImage(sigImg, { x: 28, y: y - 60, width: 160, height: 60 });
          } catch { /* skip */ }
        }

        pdfBytes = await pdfDoc.save();
      } catch (certErr) {
        console.warn('Certificate page failed, using PDF without it:', certErr);
      }

      // Upload to storage
      const signedPath = `nda-${nda.id}-signed-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(signedPath, new Blob([pdfBytes], { type: 'application/pdf' }));
      if (!uploadError) signedNdaUrl = signedPath;
      else console.error('Upload error:', uploadError);

    } catch (err) {
      console.error('PDF signing failed:', err);
    }

    // Update ndas record
    setSubmitState('saving');
    const { error } = await supabase
      .from('ndas' as any)
      .update({
        status: 'signed',
        signer_name: signerName,
        signer_title: signerTitle,
        signed_nda_url: signedNdaUrl,
        signed_at: signedAt.toISOString(),
      })
      .eq('id', nda.id);

    if (!error) {
      // Fire-and-forget email notification
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
        body: JSON.stringify({ type: 'nda-signed', ndaId: nda.id }),
      }).catch(() => { /* fire-and-forget */ });
      setSubmitted(true);
    }
    setSubmitState('idle');
  };

  // ── Loading ──
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F4F7FA' }}>
      <div style={{ width: 32, height: 32, border: '4px solid #009FE3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!nda) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F4F7FA', fontFamily: "'Inter', sans-serif" }}>
      <p style={{ color: '#3A6278', fontSize: 16 }}>NDA not found.</p>
    </div>
  );

  // ── Submitted / already signed ──
  if (submitted) {
    const downloadUrl = nda.signed_nda_url
      ? supabase.storage.from('contracts').getPublicUrl(nda.signed_nda_url).data.publicUrl
      : null;

    return (
      <div style={{ minHeight: '100vh', background: '#F4F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ background: 'white', border: '1px solid #DDE8EE', maxWidth: 560, width: '100%', margin: isMobile ? 12 : 24, textAlign: 'center', padding: isMobile ? '32px 20px' : '56px 40px' }}>
          <div style={{ width: 56, height: 56, background: '#009FE3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', marginBottom: 16 }}>NDA Signed</h1>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#043D5D', marginBottom: 12 }}>Thank you, your signature has been recorded.</p>
          <p style={{ fontSize: 14, color: '#3A6278', lineHeight: 1.8, marginBottom: 8 }}>
            A copy of the signed NDA will be sent to you. {nda.contact_name && `${nda.contact_name} will be in touch shortly.`}
          </p>
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 16, fontSize: 13, color: '#009FE3', fontWeight: 600, textDecoration: 'none' }}>
              Download signed NDA (PDF) ↗
            </a>
          )}
          <p style={{ fontSize: 12, color: '#8FA8B8', marginTop: 24 }}>You can now close this window.</p>
          <div style={{ marginTop: 32 }}>
            <img style={{ height: 20, filter: 'brightness(0) opacity(.25)' }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
          </div>
        </div>
      </div>
    );
  }

  // ── Build on-screen NDA content ──
  const registeredAddress = [nda.registered_address_1, nda.registered_address_2, nda.registered_city, nda.registered_county, nda.registered_postcode].filter(Boolean).join(', ');
  const durationText = formatConfidentialityDuration(nda.confidentiality_years);
  const submitting = submitState !== 'idle';
  const canSubmit = !!signerName.trim() && !!signatureData && agreed && !submitting;

  const buttonLabel = submitState === 'signing'
    ? 'Preparing signed document\u2026'
    : submitState === 'saving'
    ? 'Saving\u2026'
    : 'Sign NDA \u2192';

  // Section counter
  let sectionNum = 0;
  const nextSection = () => { sectionNum += 1; return String(sectionNum).padStart(2, '0'); };

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FA', fontFamily: "'Inter', sans-serif", color: '#1A2E3B', fontSize: 14, lineHeight: 1.7 }}>

      {/* Header */}
      <div style={{ background: '#043D5D', padding: isMobile ? '16px 16px' : '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <img style={{ height: isMobile ? 18 : 24, filter: 'brightness(0) invert(1)', flexShrink: 0 }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
        <span style={{ fontSize: isMobile ? 10 : 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, textAlign: 'right' as const }}>Mutual Confidentiality Agreement</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 24px' }}>

        {/* 01 — Parties */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>{nextSection()}</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Parties</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            <p style={{ fontSize: 12, color: '#AAAAAA', marginBottom: 4 }}>Dated: {formatDate(nda.agreement_date)}</p>

            <div style={{ marginTop: 16, marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#1A2E3B', lineHeight: 1.7, marginBottom: 10 }}>
                <strong style={{ color: '#043D5D' }}>1) SHOOTHILL LTD</strong> incorporated and registered in England with company number 5885234 whose registered office is at Willow House East, Shrewsbury Business Park, Shrewsbury SY2 6LG.
              </p>
              <p style={{ fontSize: 13, color: '#1A2E3B', lineHeight: 1.7 }}>
                <strong style={{ color: '#043D5D' }}>2) {nda.company_name.toUpperCase()}</strong>
                {nda.company_reg_number && ` incorporated and registered in England with company number ${nda.company_reg_number}`}
                {registeredAddress && ` whose registered office is at ${registeredAddress}`}.
              </p>
            </div>
          </div>
        </div>

        {/* 02 — Background */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>{nextSection()}</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Background</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            <p style={{ fontSize: 13, color: '#1A2E3B', lineHeight: 1.7 }}>
              Each party wishes to disclose to the other party Confidential Information in relation to {nda.purpose} (the &ldquo;Purpose&rdquo;). Each party wishes to ensure that the other party maintains the confidentiality of its Confidential Information. In consideration of the benefits to the parties of the disclosure of the Confidential Information, the parties have agreed to comply with the following terms in connection with the use and disclosure of Confidential Information.
            </p>
          </div>
        </div>

        {/* 03 — Agreed Terms */}
        {templateSections.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
            <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>{nextSection()}</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Agreed Terms</h2>
            </div>
            <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
              {templateSections.map((section, i) => (
                <div key={i} style={{ marginBottom: i < templateSections.length - 1 ? 20 : 0 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#043D5D', marginBottom: 6 }}>{section.heading}</h3>
                  <p style={{ fontSize: 13, color: '#1A2E3B', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>
                    {section.body.replace(/\{\{CONFIDENTIALITY_YEARS\}\}/g, durationText)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 04 — Shoothill Signatory (pre-signed) */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>{nextSection()}</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Shoothill Signatory</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 10 }}>Signed for and on behalf of Shoothill Ltd</p>
            <div style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 70 }}>
              <ShootHillSignature />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', display: 'block', marginBottom: 2 }}>Name</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#043D5D' }}>{nda.shoothill_signatory || 'Simon Jeavons'}</span>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', display: 'block', marginBottom: 2 }}>Title</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#043D5D' }}>{nda.shoothill_title || 'Group Managing Director'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 05 — Sign */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>{nextSection()}</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Sign NDA</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Signer details */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', display: 'block', marginBottom: 6 }}>Full Name *</label>
                <input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Your full name"
                  style={{ width: '100%', height: 40, border: '1px solid #DDE8EE', padding: '0 12px', fontSize: 14, color: '#1A2E3B', background: 'white', outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', display: 'block', marginBottom: 6 }}>Job Title</label>
                <input
                  value={signerTitle}
                  onChange={e => setSignerTitle(e.target.value)}
                  placeholder="e.g. Managing Director"
                  style={{ width: '100%', height: 40, border: '1px solid #DDE8EE', padding: '0 12px', fontSize: 14, color: '#1A2E3B', background: 'white', outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>
            </div>

            {/* Signature canvas */}
            <SignatureCanvas onSave={setSignatureData} />

            {/* Agreement checkbox */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 20px', background: '#F4F7FA', border: '1px solid #DDE8EE' }}>
              <input
                type="checkbox"
                id="agree-nda"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#009FE3', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
              />
              <label htmlFor="agree-nda" style={{ fontSize: 13, color: '#3A6278', lineHeight: 1.6, cursor: 'pointer' }}>
                I confirm I have authority to sign on behalf of <strong>{nda.company_name}</strong> and agree to the terms of this mutual confidentiality agreement.
              </label>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%', height: 52, background: canSubmit ? '#009FE3' : '#DDE8EE',
                color: canSubmit ? 'white' : '#AAAAAA', border: 'none',
                fontSize: 14, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const,
                cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'background .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {submitting && <div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
              {buttonLabel}
            </button>

            {/* Validation hint */}
            {(!signerName || !signatureData || !agreed) && (
              <p style={{ fontSize: 12, color: '#AAAAAA', textAlign: 'center' as const }}>
                {!signerName ? 'Enter your full name \u00b7 ' : ''}{!signatureData ? 'Draw your signature \u00b7 ' : ''}{!agreed ? 'Accept the agreement' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' as const, padding: '16px 0 32px' }}>
          <img style={{ height: 16, filter: 'brightness(0) opacity(.2)' }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
          <p style={{ fontSize: 11, color: '#AAAAAA', marginTop: 8 }}>Shoothill Ltd · Company No. 5885234 · Registered in England &amp; Wales</p>
        </div>

      </div>
    </div>
  );
}

// ─── Shoothill signature image (lazy-loaded to avoid top-level import of data URI) ──
function ShootHillSignature() {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    import('../components/ServiceAgreementPDF').then(mod => {
      setUri(mod.SIMON_SIGNATURE_URI || null);
    });
  }, []);
  if (!uri) return <span style={{ fontSize: 12, color: '#CCCCCC' }}>Electronic signature</span>;
  return <img src={uri} alt="Signature" style={{ height: 50, width: 'auto' }} />;
}
