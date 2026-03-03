import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Proposal, Challenge, Phase, RetainerOption } from "@/types/proposal";
import { Checkbox } from "@/components/ui/checkbox";

const formatCurrency = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    drawing.current = true;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1A2E3B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (!hasSignature) {
      setHasSignature(true);
      onSave(canvas.toDataURL());
    } else {
      onSave(canvas.toDataURL());
    }
  };

  const stopDraw = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSave(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA' }}>Signature *</label>
        {hasSignature && (
          <button onClick={clear} style={{ fontSize: 11, color: '#009FE3', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={744}
        height={160}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        style={{
          width: '100%',
          height: 160,
          border: '1px solid #DDE8EE',
          background: '#F4F7FA',
          cursor: 'crosshair',
          touchAction: 'none',
          display: 'block',
        }}
      />
      <p style={{ fontSize: 11, color: '#AAAAAA', marginTop: 4 }}>Draw your signature in the box above</p>
    </div>
  );
}

// Accepts Uint8Array bytes directly instead of fetching from a URL.
async function appendSignaturePage(
  sourcePdfBytes: Uint8Array,
  signatureDataUrl: string,
  signerName: string,
  signerTitle: string,
  clientName: string,
  signedAt: Date,
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.load(sourcePdfBytes);

  // Embed signature image
  const sigBase64 = signatureDataUrl.split(',')[1];
  const sigBytes = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0));
  const sigImage = await pdfDoc.embedPng(sigBytes);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 page
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const navy = rgb(4 / 255, 61 / 255, 93 / 255);    // #043D5D
  const blue = rgb(0 / 255, 159 / 255, 227 / 255);  // #009FE3
  const mid = rgb(58 / 255, 98 / 255, 120 / 255);   // #3A6278
  const light = rgb(170 / 255, 170 / 255, 170 / 255); // #AAAAAA
  const bg = rgb(244 / 255, 247 / 255, 250 / 255);  // #F4F7FA

  // Header bar
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: navy });
  page.drawText('Accepted & Signed', {
    x: 36, y: height - 42,
    size: 18, font: helveticaBold, color: rgb(1, 1, 1),
  });
  page.drawText('Shoothill Proposal Manager', {
    x: 36, y: height - 60,
    size: 9, font: helvetica, color: rgb(0.6, 0.7, 0.75),
  });

  // Blue accent line
  page.drawRectangle({ x: 0, y: height - 73, width, height: 3, color: blue });

  let y = height - 110;

  // "Signed for" label
  page.drawText('SIGNED FOR', { x: 36, y, size: 8, font: helveticaBold, color: light });
  y -= 18;
  page.drawText(clientName, { x: 36, y, size: 14, font: helveticaBold, color: navy });
  y -= 14;

  // Date/time
  const dateStr = signedAt.toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  page.drawText(dateStr, { x: 36, y, size: 10, font: helvetica, color: mid });
  y -= 36;

  // Divider
  page.drawLine({ start: { x: 36, y }, end: { x: width - 36, y }, thickness: 0.5, color: rgb(0.87, 0.91, 0.93) });
  y -= 36;

  // Signature box background
  const sigBoxHeight = 140;
  const sigBoxWidth = width - 72;
  page.drawRectangle({ x: 36, y: y - sigBoxHeight, width: sigBoxWidth, height: sigBoxHeight, color: bg });
  page.drawRectangle({ x: 36, y: y - sigBoxHeight, width: sigBoxWidth, height: sigBoxHeight, borderColor: rgb(0.87, 0.91, 0.93), borderWidth: 1 });

  // Fit signature image inside the box with padding
  const pad = 12;
  const maxSigW = sigBoxWidth - pad * 2;
  const maxSigH = sigBoxHeight - pad * 2;
  const sigDims = sigImage.scaleToFit(maxSigW, maxSigH);
  page.drawImage(sigImage, {
    x: 36 + pad,
    y: y - sigBoxHeight + (sigBoxHeight - sigDims.height) / 2,
    width: sigDims.width,
    height: sigDims.height,
  });

  y -= sigBoxHeight + 20;

  // Name and title
  page.drawText(signerName, { x: 36, y, size: 14, font: helveticaBold, color: navy });
  y -= 18;
  if (signerTitle) {
    page.drawText(signerTitle, { x: 36, y, size: 10, font: helvetica, color: mid });
    y -= 14;
  }

  // Footer
  page.drawLine({ start: { x: 36, y: 56 }, end: { x: width - 36, y: 56 }, thickness: 0.5, color: rgb(0.87, 0.91, 0.93) });
  page.drawText('This document was accepted electronically via Shoothill Proposal Manager.', {
    x: 36, y: 40, size: 8, font: helvetica, color: light,
  });

  return pdfDoc.save();
}

export default function ProposalAccept() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const standardIndex = Number(searchParams.get('standard') ?? 0);
  const extrasParam = searchParams.get('extras');
  // extrasParam === null means the user navigated directly (no URL param set yet).
  // In that case we'll fall back to recommended extras once the proposal loads.
  const checkedExtrasIndices: number[] = extrasParam !== null
    ? (extrasParam ? extrasParam.split(',').map(Number).filter(n => !isNaN(n)) : [])
    : [];

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState<'idle' | 'signing' | 'saving'>('idle');
  const [submitted, setSubmitted] = useState(false);

  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Template sections and PDF generation state
  const [templateSections, setTemplateSections] = useState<{ heading: string; body: string }[]>([]);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const generatedPdfBytesRef = useRef<Uint8Array | null>(null);

  const notifyEdgeFunction = (type: 'viewed' | 'signed', proposalId: string) => {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '' },
      body: JSON.stringify({ type, proposalId }),
    }).catch(() => {/* fire-and-forget */});
  };

  // Load proposal and template sections
  useEffect(() => {
    supabase.from("proposals").select("*").eq("slug", slug).single().then(async ({ data }) => {
      if (data) {
        setProposal({
          ...data,
          challenges: (data.challenges || []) as unknown as Challenge[],
          phases: (data.phases || []) as unknown as Phase[],
          retainer_options: (data.retainer_options || []) as unknown as RetainerOption[],
        } as Proposal);
        notifyEdgeFunction('viewed', data.id);

        // Fetch template sections if a template is selected
        const templateId = (data as any).service_agreement_template_id;
        if (templateId) {
          const { data: tmpl } = await supabase
            .from("service_agreement_templates" as any)
            .select("sections")
            .eq("id", templateId)
            .single();
          if (tmpl) setTemplateSections((tmpl as any).sections || []);
        }
      }
      setLoading(false);
    });
  }, [slug]);

  // Auto-generate PDF preview when proposal loads (skipped if a manual override PDF exists)
  useEffect(() => {
    if (!proposal) return;
    const fileUrl = (proposal as any).contract_file_url as string | null;
    if (fileUrl) return; // manual override present — use it as-is

    let cancelled = false;
    setPdfGenerating(true);

    (async () => {
      try {
        const stdOpts = proposal.retainer_options.filter(r => r.option_type === 'standard');
        const optExtras = proposal.retainer_options.filter(r => r.option_type === 'optional_extra');
        const selStandard = stdOpts[standardIndex] || null;
        // If no extras param was present in the URL, default to recommended extras
        const selExtras = extrasParam !== null
          ? checkedExtrasIndices.map(i => optExtras[i]).filter(Boolean)
          : optExtras.filter(r => r.recommended);
        const upfrontAmt = Number(proposal.upfront_total);
        const stdPrice = selStandard ? (selStandard.quantity ?? 1) * selStandard.price : 0;
        const extrasPrice = selExtras.reduce((sum, r) => sum + (r.quantity ?? 1) * r.price, 0);
        const monthlyAmt = stdPrice + extrasPrice;
        const firstYrTotal = upfrontAmt + monthlyAmt * 12;

        const [{ pdf }, { ServiceAgreementPDF }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('../components/ServiceAgreementPDF'),
        ]);

        const props = {
          clientName: proposal.client_name,
          organisation: proposal.organisation || '',
          programmeTitle: proposal.programme_title,
          agreementDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          phases: proposal.phases || [],
          upfrontItems: (proposal as any).upfront_items || [],
          selectedStandard: selStandard,
          selectedExtras: selExtras,
          upfrontTotal: upfrontAmt,
          monthlyTotal: monthlyAmt,
          firstYearTotal: firstYrTotal,
          paymentTerms: (proposal as any).payment_terms || '',
          contactName: proposal.contact_name || '',
          contactEmail: proposal.contact_email || '',
          templateSections,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = await pdf(React.createElement(ServiceAgreementPDF as any, props)).toBlob();
        if (cancelled) return;

        const bytes = new Uint8Array(await blob.arrayBuffer());
        generatedPdfBytesRef.current = bytes;
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        setGeneratedPdfUrl(url);
      } catch (err) {
        console.error('PDF generation failed:', err);
      } finally {
        if (!cancelled) setPdfGenerating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [proposal, templateSections]);

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

  const standardOptions = proposal.retainer_options.filter(r => r.option_type === 'standard');
  const optionalExtras = proposal.retainer_options.filter(r => r.option_type === 'optional_extra');
  const selectedStandard = standardOptions[standardIndex] || null;
  const selectedExtras = checkedExtrasIndices.map(i => optionalExtras[i]).filter(Boolean);
  const upfront = Number(proposal.upfront_total);
  const optionTotal = (r: { price: number; quantity?: number }) => (r.quantity ?? 1) * r.price;
  const standardPrice = selectedStandard ? optionTotal(selectedStandard) : 0;
  const extrasPrice = selectedExtras.reduce((sum, r) => sum + optionTotal(r), 0);
  const monthlyTotal = standardPrice + extrasPrice;
  const monthlyAnnual = monthlyTotal * 12;
  const firstYearTotal = upfront + monthlyAnnual;

  const contractFileUrl = (proposal as any).contract_file_url as string | null;

  const submitting = submitState !== 'idle';
  const canSubmit = signerName && agreed && !!signatureData && !submitting && !pdfGenerating;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    let signedContractUrl: string | null = null;

    setSubmitState('signing');
    try {
      let pdfBytes: Uint8Array | null = null;

      if (contractFileUrl) {
        // Manual override PDF: fetch from storage proxy
        const response = await fetch(`/contracts/${contractFileUrl}`);
        pdfBytes = new Uint8Array(await response.arrayBuffer());
      } else if (generatedPdfBytesRef.current) {
        // Auto-generated PDF already in memory
        pdfBytes = generatedPdfBytesRef.current;
      }

      if (pdfBytes) {
        const signedBytes = await appendSignaturePage(
          pdfBytes,
          signatureData!,
          signerName,
          signerTitle,
          proposal.organisation || proposal.client_name,
          new Date(),
        );
        const baseName = contractFileUrl
          ? contractFileUrl.replace(/\.[^.]+$/, '')
          : `${proposal.slug}-agreement`;
        const signedPath = `${baseName}-signed-${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(signedPath, new Blob([signedBytes], { type: 'application/pdf' }));
        if (!uploadError) signedContractUrl = signedPath;
      }
    } catch (err) {
      console.error('PDF signing failed:', err);
      // Continue without signed PDF rather than blocking acceptance
    }

    // Save acceptance record
    setSubmitState('saving');
    const { error } = await supabase.from("proposal_acceptances" as any).insert({
      proposal_id: proposal.id,
      signer_name: signerName,
      signer_title: signerTitle,
      selected_retainer_index: standardIndex,
      selected_extras: checkedExtrasIndices,
      upfront_total: upfront,
      retainer_price: monthlyTotal,
      first_year_total: firstYearTotal,
      signature_data: signatureData,
      signed_contract_url: signedContractUrl,
    });

    if (!error) {
      await supabase.from("proposals").update({ status: 'accepted' } as any).eq("id", proposal.id);
      notifyEdgeFunction('signed', proposal.id);
      setSubmitted(true);
    }
    setSubmitState('idle');
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

  const buttonLabel = submitState === 'signing'
    ? 'Preparing signed document…'
    : submitState === 'saving'
    ? 'Saving…'
    : 'Sign & Accept Proposal →';

  // Determine PDF URL to display (manual override takes precedence over generated)
  const displayPdfUrl = contractFileUrl
    ? `/contracts/${contractFileUrl}#toolbar=1&navpanes=0`
    : generatedPdfUrl
    ? `${generatedPdfUrl}#toolbar=1&navpanes=0`
    : null;

  const downloadPdfUrl = contractFileUrl
    ? `/contracts/${contractFileUrl}`
    : generatedPdfUrl ?? null;

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FA', fontFamily: "'Inter', sans-serif", color: '#1A2E3B', fontSize: 14, lineHeight: 1.7 }}>
      {/* Header */}
      <div style={{ background: '#043D5D', padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img style={{ height: 24, filter: 'brightness(0) invert(1)' }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>Contract Acceptance — {proposal.client_name}</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* 01 — Pricing Summary */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>01</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Pricing Summary</h2>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: monthlyTotal > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: '18px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>One-Time Project</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', letterSpacing: '-.02em' }}>{formatCurrency(upfront)}<span style={{ fontSize: 12, fontWeight: 500, color: '#AAAAAA' }}> + VAT</span></div>
              </div>
              {monthlyTotal > 0 && (
                <div style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>
                    Monthly Ongoing{selectedStandard ? ` — ${selectedStandard.name || selectedStandard.type}` : ''}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', letterSpacing: '-.02em' }}>{formatCurrency(monthlyTotal)}<span style={{ fontSize: 12, fontWeight: 500, color: '#AAAAAA' }}> + VAT / mo</span></div>
                  {selectedExtras.length > 0 && (
                    <div style={{ fontSize: 12, color: '#3A6278', marginTop: 4 }}>
                      Includes: {selectedExtras.map(r => r?.name || r?.type).filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#AAAAAA', marginTop: 2 }}>Annual: {formatCurrency(monthlyAnnual)}</div>
                </div>
              )}
            </div>
            <div style={{ background: '#043D5D', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>First Year Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#009FE3', letterSpacing: '-.02em' }}>{formatCurrency(firstYearTotal)}<span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}> + VAT</span></span>
            </div>
          </div>
        </div>

        {/* 02 — Service Agreement (always shown) */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>02</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Service Agreement</h2>
          </div>
          <div style={{ padding: '24px 28px' }}>
            {pdfGenerating ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 0', color: '#3A6278' }}>
                <div style={{ width: 24, height: 24, border: '3px solid #009FE3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 14 }}>Generating your service agreement…</span>
              </div>
            ) : displayPdfUrl ? (
              <>
                <iframe src={displayPdfUrl} title="Service Agreement" width="100%" style={{ height: 600, border: '1px solid #DDE8EE' }} />
                {downloadPdfUrl && (
                  <a href={downloadPdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: '#009FE3', fontWeight: 600 }}>
                    Open in new tab ↗
                  </a>
                )}
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#AAAAAA', padding: '16px 0' }}>
                No service agreement template selected. You can still accept the proposal.
              </p>
            )}
          </div>
        </div>

        {/* 03 — Sign & Accept */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 40 }}>
          <div style={{ padding: '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>03</div>
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
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>Date</label>
              <input
                value={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                readOnly
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #DDE8EE', fontSize: 14, color: '#AAAAAA', outline: 'none', background: '#F4F7FA', boxSizing: 'border-box', maxWidth: 300 }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <SignatureCanvas onSave={setSignatureData} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
                style={{ borderColor: '#DDE8EE' }}
              />
              <label style={{ fontSize: 13, color: '#3A6278', lineHeight: 1.6, cursor: 'pointer' }} onClick={() => setAgreed(!agreed)}>
                I have read and agree to the terms outlined in this proposal and the service agreement. I confirm I am authorised to accept on behalf of <strong style={{ color: '#043D5D' }}>{proposal.organisation || proposal.client_name}</strong>.
              </label>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%',
                padding: '16px',
                background: !canSubmit ? '#DDE8EE' : '#009FE3',
                color: !canSubmit ? '#AAAAAA' : 'white',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: !canSubmit ? 'not-allowed' : 'pointer',
                transition: 'background .2s',
              }}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
