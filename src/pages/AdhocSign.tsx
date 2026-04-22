import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Phase, UpfrontItem, RetainerOption } from "@/types/proposal";

const formatCurrency = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (s: string) => {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface OngoingOption {
  name: string;
  yearlyCosts: number[];
  originalYearlyCosts?: number[];
  term: number;
  frequency: 'weekly' | 'monthly' | 'annual';
  rolling_monthly?: boolean;
  notice_days?: number;
  starts_after_months?: number;
  discount_note?: string;
}

interface AdhocContract {
  id: string;
  slug: string;
  status: 'pending' | 'signed';
  client_name: string;
  organisation: string;
  company_reg_number: string | null;
  registered_address_1: string | null;
  registered_address_2: string | null;
  registered_city: string | null;
  registered_county: string | null;
  registered_postcode: string | null;
  scope_of_work_text: string | null;
  additional_terms_text: string | null;
  programme_title: string;
  agreement_date: string;
  contact_name: string;
  contact_email: string;
  payment_terms: string;
  phases: Phase[];
  upfront_items: UpfrontItem[];
  ongoing_options: OngoingOption[];
  retainer_options?: RetainerOption[];
  template_id: string | null;
  signed_contract_url: string | null;
  signer_name: string | null;
  signer_title: string | null;
  signed_at: string | null;
}

const FREQ_LABEL: Record<string, string> = { weekly: '/wk', monthly: '/mo', annual: '/yr' };

// Legacy ongoing option total (year-by-year)
const getOptionTotal = (opt: OngoingOption) => {
  const numYears = Math.ceil(Math.max(opt.term, 1) / 12);
  const costs: number[] = Array.from({ length: numYears }, (_, y) =>
    opt.yearlyCosts[y] ?? (opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0)
  );
  if (opt.frequency === 'annual') return costs.reduce((s, c) => s + c, 0);
  return costs.reduce((s, c, idx) => {
    const months = idx === numYears - 1 ? (opt.term % 12 || 12) : 12;
    const periods = opt.frequency === 'monthly' ? months : Math.round(months * 52 / 12);
    return s + c * periods;
  }, 0);
};

// Per-contract-year billings for a non-rolling option, respecting starts_after_months.
// Month-by-month walk: bills each active month at the rate for that option-year and
// bucketed into the contract year it falls in. Returns [] for rolling options (open-ended).
const getFixedOptionContractYearCosts = (opt: OngoingOption): number[] => {
  if (opt.rolling_monthly) return [];
  const startMonth = opt.starts_after_months ?? 0;
  const termMonths = Math.max(opt.term, 1);
  const endMonth = startMonth + termMonths;
  const numContractYears = Math.ceil(endMonth / 12);
  const costs = new Array(numContractYears).fill(0);
  const fallbackRate = opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0;
  for (let m = startMonth; m < endMonth; m++) {
    const optionMonth = m - startMonth;
    const optionYear = Math.floor(optionMonth / 12);
    const contractYear = Math.floor(m / 12);
    const yearRate = opt.yearlyCosts[optionYear] ?? fallbackRate;
    if (opt.frequency === 'monthly') {
      costs[contractYear] += yearRate;
    } else if (opt.frequency === 'weekly') {
      costs[contractYear] += yearRate * 52 / 12;
    } else if (opt.frequency === 'annual') {
      if (optionMonth % 12 === 0) costs[contractYear] += yearRate;
    }
  }
  return costs;
};

// Sum per-option year costs into a single contract-year subtotal array.
const computeContractYearSubtotals = (options: OngoingOption[]): number[] => {
  const perOption = options.filter(o => !o.rolling_monthly).map(getFixedOptionContractYearCosts);
  const numYears = perOption.reduce((n, arr) => Math.max(n, arr.length), 0);
  return Array.from({ length: numYears }, (_, y) =>
    perOption.reduce((s, arr) => s + (arr[y] ?? 0), 0)
  );
};

// New retainer option total (price × quantity, annualised based on frequency)
const getRetainerAnnualTotal = (r: RetainerOption) => {
  const unitPrice = r.discounted_price ?? r.price;
  const qty = r.quantity ?? 1;
  const freq = r.frequency ?? 'monthly';
  if (freq === 'annual') return unitPrice * qty;
  if (freq === 'weekly') return unitPrice * qty * 52;
  return unitPrice * qty * 12; // monthly
};

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
export default function AdhocSign() {
  const { slug } = useParams<{ slug: string }>();
  const [contract, setContract] = useState<AdhocContract | null>(null);
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Mobile detection
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 640;

  // PDF preview
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  // Signing form
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'signing' | 'saving'>('idle');

  // Load contract
  useEffect(() => {
    if (!slug) return;
    supabase
      .from('adhoc_contracts' as any)
      .select('*')
      .eq('slug', slug)
      .single()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        const c = {
          ...data,
          phases: Array.isArray((data as any).phases) ? (data as any).phases : [],
          upfront_items: Array.isArray((data as any).upfront_items) ? (data as any).upfront_items : [],
          ongoing_options: Array.isArray((data as any).ongoing_options)
            ? (data as any).ongoing_options.map((o: any) => ({
                ...o,
                yearlyCosts: o.yearlyCosts ?? (o.cost != null ? [o.cost] : [0]),
              }))
            : [],
          retainer_options: Array.isArray((data as any).retainer_options) ? (data as any).retainer_options : undefined,
        } as AdhocContract;
        // If new-format retainer_options exist, convert them to ongoing_options for display
        if (c.retainer_options && c.retainer_options.length > 0) {
          c.ongoing_options = c.retainer_options.map((r: RetainerOption) => {
            const freq = r.frequency ?? 'monthly';
            const qty = r.quantity ?? 1;
            const hasDiscount = r.discounted_price != null && r.discounted_price < r.price;
            const discountedUnit = r.discounted_price ?? r.price;
            return {
              name: r.name || r.type || 'Ongoing Option',
              yearlyCosts: [qty * discountedUnit],
              originalYearlyCosts: hasDiscount ? [qty * r.price] : undefined,
              term: r.rolling_monthly ? 12 : (r.term_months ?? 12),
              frequency: freq,
              rolling_monthly: r.rolling_monthly,
              notice_days: r.notice_days,
              starts_after_months: r.starts_after_months,
              discount_note: r.discount_note,
            };
          });
        }
        setContract(c);

        // Fire view-tracking event (skip for logged-in internal users)
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) return;
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
            },
            body: JSON.stringify({ type: 'adhoc-viewed', contractId: (c as any).id, userAgent: navigator.userAgent }),
          }).catch(() => { /* fire-and-forget */ });
        })();

        // If already signed, show confirmation immediately
        if (c.status === 'signed') { setSubmitted(true); }

        // Load template sections
        if (c.template_id) {
          const { data: tmpl } = await supabase
            .from('service_agreement_templates' as any)
            .select('sections')
            .eq('id', c.template_id)
            .single();
          if (tmpl && Array.isArray((tmpl as any).sections)) {
            setTemplateSections((tmpl as any).sections as TemplateSection[]);
          }
        }
        setLoading(false);
      });
  }, [slug]);

  // Generate PDF preview once contract + sections are loaded
  useEffect(() => {
    if (!contract) return;
    let cancelled = false;
    setPdfGenerating(true);

    (async () => {
      try {
        const upfrontTotal = contract.upfront_items.reduce((s, i) => s + (i.discounted_price ?? i.price), 0);
        const allAnnualTotals = contract.ongoing_options.map(getOptionTotal);
        const totalAnnualOngoing = allAnnualTotals.reduce((s, t) => s + t, 0);
        const monthlyTotal = totalAnnualOngoing / 12;
        const firstYearTotal = upfrontTotal + totalAnnualOngoing;
        const contractYearSubtotals = computeContractYearSubtotals(contract.ongoing_options);
        const [firstOpt, ...extraOpts] = contract.ongoing_options;
        const selectedStandard = firstOpt ? {
          type: 'Retainer',
          name: firstOpt.name || 'Ongoing Option',
          price: firstOpt.yearlyCosts[0] ?? 0,
          quantity: firstOpt.term,
          hours: firstOpt.frequency,
          features: [],
          option_type: 'standard' as const,
          recommended: false,
          rolling_monthly: firstOpt.rolling_monthly,
          notice_days: firstOpt.notice_days,
        } : null;
        const selectedExtras = extraOpts.map(opt => ({
          type: 'Retainer',
          name: opt.name || 'Ongoing Option',
          price: opt.yearlyCosts[0] ?? 0,
          quantity: opt.term,
          hours: opt.frequency,
          features: [],
          option_type: 'standard' as const,
          recommended: false,
          rolling_monthly: opt.rolling_monthly,
          notice_days: opt.notice_days,
        }));

        const [{ pdf }, { ServiceAgreementPDF }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('../components/ServiceAgreementPDF'),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = await pdf(React.createElement(ServiceAgreementPDF as any, {
          clientName: contract.client_name,
          organisation: contract.organisation,
          programmeTitle: contract.programme_title,
          agreementDate: formatDate(contract.agreement_date) || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          phases: contract.phases,
          upfrontItems: contract.upfront_items,
          selectedStandard,
          selectedExtras,
          upfrontTotal,
          monthlyTotal,
          firstYearTotal,
          paymentTerms: contract.payment_terms,
          contactName: contract.contact_name,
          contactEmail: contract.contact_email,
          companyRegNumber: contract.company_reg_number || '',
          registeredOffice: [contract.registered_address_1, contract.registered_address_2, contract.registered_city, contract.registered_county, contract.registered_postcode].filter(Boolean).join(', '),
          templateSections,
          scopeOfWorkText: contract.scope_of_work_text || '',
          additionalTermsText: contract.additional_terms_text || '',
          ongoingOptions: contract.ongoing_options,
          contractYearSubtotals,
        })).toBlob();

        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setGeneratedPdfUrl(url);
      } catch (err) {
        console.error('PDF preview generation failed:', err);
      } finally {
        if (!cancelled) setPdfGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
      setGeneratedPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [contract, templateSections]);

  const handleSubmit = async () => {
    if (!contract || !signerName || !signatureData || !agreed) return;
    setSubmitState('signing');

    const signedAt = new Date();
    const signingDateStr = signedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const upfrontTotal = contract.upfront_items.reduce((s, i) => s + (i.discounted_price ?? i.price), 0);
    const allAnnualTotals = contract.ongoing_options.map(getOptionTotal);
    const totalAnnualOngoing = allAnnualTotals.reduce((s, t) => s + t, 0);
    const monthlyTotal = totalAnnualOngoing / 12;
    const firstYearTotal = upfrontTotal + totalAnnualOngoing;
    const contractYearSubtotals = computeContractYearSubtotals(contract.ongoing_options);
    const [firstOpt, ...extraOpts] = contract.ongoing_options;
    const selectedStandard = firstOpt ? {
      type: 'Retainer',
      name: firstOpt.name || 'Ongoing Option',
      price: firstOpt.yearlyCosts[0] ?? 0,
      quantity: firstOpt.term,
      hours: firstOpt.frequency,
      features: [],
      option_type: 'standard' as const,
      recommended: false,
      rolling_monthly: (firstOpt as any).rolling_monthly,
      notice_days: (firstOpt as any).notice_days,
    } : null;
    const selectedExtras = extraOpts.map(opt => ({
      type: 'Retainer',
      name: opt.name || 'Ongoing Option',
      price: opt.yearlyCosts[0] ?? 0,
      quantity: opt.term,
      hours: opt.frequency,
      features: [],
      option_type: 'standard' as const,
      recommended: false,
      rolling_monthly: (opt as any).rolling_monthly,
      notice_days: (opt as any).notice_days,
    }));

    let signedContractUrl: string | null = null;

    try {
      const [{ pdf }, { ServiceAgreementPDF, SIMON_SIGNATURE_URI }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/ServiceAgreementPDF'),
      ]);

      const props = {
        clientName: contract.client_name,
        organisation: contract.organisation,
        programmeTitle: contract.programme_title,
        agreementDate: formatDate(contract.agreement_date) || signingDateStr,
        phases: contract.phases,
        upfrontItems: contract.upfront_items,
        selectedStandard,
        selectedExtras,
        upfrontTotal,
        monthlyTotal,
        firstYearTotal,
        paymentTerms: contract.payment_terms,
        contactName: contract.contact_name,
        contactEmail: contract.contact_email,
        companyRegNumber: contract.company_reg_number || '',
        registeredOffice: [contract.registered_address_1, contract.registered_address_2, contract.registered_city, contract.registered_county, contract.registered_postcode].filter(Boolean).join(', '),
        templateSections,
        scopeOfWorkText: contract.scope_of_work_text || '',
        additionalTermsText: contract.additional_terms_text || '',
        ongoingOptions: contract.ongoing_options,
        contractYearSubtotals,
        clientSignerName: signerName,
        clientSignerTitle: signerTitle,
        clientSignatureUri: signatureData,
        signingDate: signingDateStr,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(React.createElement(ServiceAgreementPDF as any, props)).toBlob();
      let pdfBytes = new Uint8Array(await blob.arrayBuffer());

      // Append certificate page (same as ProposalAccept)
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

        const refId = `SH-${contract.slug.toUpperCase().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
        let y = height - 90;
        const line = (label: string, value: string) => {
          certPage.drawText(label, { x: 28, y, size: 8, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
          certPage.drawText(value, { x: 160, y, size: 8, font: helvetica, color: rgb(0.1, 0.18, 0.23) });
          y -= 18;
        };
        line('Document', contract.programme_title || 'Service Agreement');
        line('Client', contract.organisation || contract.client_name);
        line('Reference', refId);
        line('Signed', signedAt.toISOString());

        y -= 10;
        certPage.drawLine({ start: { x: 28, y }, end: { x: width - 28, y }, thickness: 0.5, color: rgb(0.86, 0.91, 0.93) });
        y -= 24;

        certPage.drawText('AUTHORISED SIGNATORY — CLIENT', { x: 28, y, size: 8, font: helveticaBold, color: rgb(0, 0.627, 0.89) });
        y -= 18;
        line('Name', signerName);
        line('Title', signerTitle || '—');

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
          line('Name', 'Simon Jeavons');
          line('Title', 'Group Managing Director');
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
      const signedPath = `adhoc-${contract.id}-signed-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(signedPath, new Blob([pdfBytes], { type: 'application/pdf' }));
      if (!uploadError) signedContractUrl = signedPath;
      else console.error('Upload error:', uploadError);

    } catch (err) {
      console.error('PDF signing failed:', err);
    }

    // Update adhoc_contracts record
    setSubmitState('saving');
    const { error } = await supabase
      .from('adhoc_contracts' as any)
      .update({
        status: 'signed',
        signer_name: signerName,
        signer_title: signerTitle,
        signed_contract_url: signedContractUrl,
        signed_at: signedAt.toISOString(),
      })
      .eq('id', contract.id);

    if (!error) {
      // Fire-and-forget email notification
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
        body: JSON.stringify({ type: 'adhoc-signed', contractId: contract.id }),
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

  if (!contract) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F4F7FA', fontFamily: "'Inter', sans-serif" }}>
      <p style={{ color: '#3A6278', fontSize: 16 }}>Contract not found.</p>
    </div>
  );

  // ── Submitted / already signed ──
  if (submitted) return (
    <div style={{ minHeight: '100vh', background: '#F4F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: 'white', border: '1px solid #DDE8EE', maxWidth: 560, width: '100%', margin: isMobile ? 12 : 24, textAlign: 'center', padding: isMobile ? '32px 20px' : '56px 40px' }}>
        <div style={{ width: 56, height: 56, background: '#009FE3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', marginBottom: 16 }}>Agreement Signed</h1>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#043D5D', marginBottom: 12 }}>Thank you, your signature has been recorded.</p>
        <p style={{ fontSize: 14, color: '#3A6278', lineHeight: 1.8, marginBottom: 8 }}>
          A copy of the signed agreement will be sent to you. {contract.contact_name && `${contract.contact_name} will be in touch shortly.`}
        </p>
        <p style={{ fontSize: 12, color: '#8FA8B8', marginTop: 24 }}>You can now close this window.</p>
        <div style={{ marginTop: 32 }}>
          <img style={{ height: 20, filter: 'brightness(0) opacity(.25)' }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
        </div>
      </div>
    </div>
  );

  // ── Pricing calculations ──
  const upfrontTotal = contract.upfront_items.reduce((s, i) => s + (i.discounted_price ?? i.price), 0);
  const allAnnualTotals = contract.ongoing_options.map(getOptionTotal);
  const totalAnnualOngoing = allAnnualTotals.reduce((s, t) => s + t, 0);
  const firstYearTotal = upfrontTotal + totalAnnualOngoing;

  const submitting = submitState !== 'idle';
  const canSubmit = !!signerName.trim() && !!signatureData && agreed && !submitting;

  const buttonLabel = submitState === 'signing'
    ? 'Preparing signed document…'
    : submitState === 'saving'
    ? 'Saving…'
    : 'Sign Agreement →';

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FA', fontFamily: "'Inter', sans-serif", color: '#1A2E3B', fontSize: 14, lineHeight: 1.7 }}>

      {/* Header */}
      <div style={{ background: '#043D5D', padding: isMobile ? '16px 16px' : '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <img style={{ height: isMobile ? 18 : 24, filter: 'brightness(0) invert(1)', flexShrink: 0 }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
        <span style={{ fontSize: isMobile ? 10 : 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, textAlign: 'right' as const }}>Service Agreement — {contract.organisation || contract.client_name}</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 24px' }}>

        {/* 01 — Summary */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>01</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Agreement Summary</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', display: 'block', marginBottom: 2 }}>Client</span><span style={{ fontSize: 14, fontWeight: 700, color: '#043D5D' }}>{contract.client_name}</span></div>
              {contract.organisation && <div><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', display: 'block', marginBottom: 2 }}>Organisation</span><span style={{ fontSize: 14, fontWeight: 700, color: '#043D5D' }}>{contract.organisation}</span></div>}
              {contract.programme_title && <div><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', display: 'block', marginBottom: 2 }}>Programme</span><span style={{ fontSize: 14, fontWeight: 700, color: '#043D5D' }}>{contract.programme_title}</span></div>}
              <div><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA', display: 'block', marginBottom: 2 }}>Agreement Date</span><span style={{ fontSize: 14, fontWeight: 700, color: '#043D5D' }}>{formatDate(contract.agreement_date)}</span></div>
            </div>
          </div>
        </div>

        {/* 02 — Phases */}
        {contract.phases.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
            <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>02</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Phases of Work</h2>
            </div>
            <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {contract.phases.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '60px 1fr' : '80px 1fr auto', gap: isMobile ? 8 : 16, alignItems: 'center', padding: '12px 0', borderBottom: i < contract.phases.length - 1 ? '1px solid #F4F7FA' : 'none' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#009FE3' }}>{p.label}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#043D5D' }}>{p.title}</div>
                      {p.duration && <div style={{ fontSize: 11, color: '#AAAAAA' }}>{p.duration}</div>}
                    </div>
                    {p.price && <div style={{ fontSize: 13, fontWeight: 700, color: '#043D5D', whiteSpace: 'nowrap' as const }}>{p.price}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 03 — Pricing */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>03</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Investment</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            {/* Investment table: one-time + each ongoing option (row per year) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #DDE8EE' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>Item</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>Rate</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#AAAAAA' }}>Annual Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F4F7FA' }}>
                  <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#043D5D' }}>One-Time</td>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '12px 0', fontSize: 15, fontWeight: 800, color: '#043D5D' }}>
                    {formatCurrency(upfrontTotal)}<span style={{ fontSize: 11, fontWeight: 500, color: '#AAAAAA' }}> + VAT</span>
                  </td>
                </tr>
                {contract.ongoing_options.flatMap((opt, i) => {
                  const isRolling = opt.rolling_monthly;
                  const noticeDays = opt.notice_days ?? 30;
                  const numYears = isRolling ? 1 : Math.ceil(Math.max(opt.term, 1) / 12);
                  const costs: number[] = Array.from({ length: numYears }, (_, y) =>
                    opt.yearlyCosts[y] ?? (opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0)
                  );
                  const originalCosts: number[] | null = opt.originalYearlyCosts ? Array.from({ length: numYears }, (_, y) =>
                    opt.originalYearlyCosts![y] ?? (opt.originalYearlyCosts![opt.originalYearlyCosts!.length - 1] ?? 0)
                  ) : null;
                  const freqLabel = opt.frequency === 'annual' ? '/yr' : opt.frequency === 'weekly' ? '/wk' : '/mo';
                  const startYear = Math.floor((opt.starts_after_months ?? 0) / 12) + 1;
                  const name = opt.name || `Ongoing Option ${i + 1}`;
                  const yearAnnualTotal = (rate: number, yearIdx: number): number | null => {
                    if (isRolling) return null;
                    const months = yearIdx === numYears - 1 ? (opt.term % 12 || 12) : 12;
                    if (opt.frequency === 'annual') return rate;
                    if (opt.frequency === 'weekly') return rate * Math.round(months * 52 / 12);
                    return rate * months;
                  };
                  return costs.map((c, y) => {
                    const origC = originalCosts?.[y];
                    const hasDiscount = origC != null && origC > c;
                    const origAnnual = hasDiscount ? yearAnnualTotal(origC!, y) : null;
                    const discAnnual = yearAnnualTotal(c, y);
                    return (
                      <tr key={`${i}-${y}`} style={{ borderBottom: '1px solid #F4F7FA' }}>
                        <td style={{ padding: '12px 0', fontSize: 13, color: '#043D5D' }}>
                          <div>
                            <span style={{ fontWeight: 700 }}>{name}</span>
                            {numYears > 1 && <span style={{ color: '#AAAAAA', fontWeight: 500 }}> — Year {startYear + y}</span>}
                            {isRolling && <span style={{ color: '#AAAAAA', fontWeight: 500 }}> — monthly rolling · {noticeDays} days notice</span>}
                          </div>
                          {hasDiscount && opt.discount_note && (
                            <div style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic' as const, marginTop: 2 }}>{opt.discount_note}</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#043D5D', whiteSpace: 'nowrap' as const }}>
                          {hasDiscount ? (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#AAAAAA', textDecoration: 'line-through' }}>{formatCurrency(origC!)}<span style={{ fontWeight: 500 }}>{freqLabel}</span></div>
                              <div>{formatCurrency(c)}<span style={{ fontSize: 11, fontWeight: 500, color: '#AAAAAA' }}>{freqLabel}</span></div>
                            </>
                          ) : (
                            <>{formatCurrency(c)}<span style={{ fontSize: 11, fontWeight: 500, color: '#AAAAAA' }}>{freqLabel}</span></>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 0', fontSize: 15, fontWeight: 800, color: '#009FE3', whiteSpace: 'nowrap' as const }}>
                          {isRolling ? '—' : hasDiscount && origAnnual != null ? (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#AAAAAA', textDecoration: 'line-through' }}>{formatCurrency(origAnnual)}</div>
                              <div>{formatCurrency(discAnnual ?? 0)}</div>
                            </>
                          ) : (
                            formatCurrency(discAnnual ?? 0)
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>

            {/* Upfront line items */}
            {contract.upfront_items.length > 0 && (
              <div style={{ marginBottom: 0 }}>
                {contract.upfront_items.map((item, i) => {
                  const hasDiscount = item.discounted_price != null && item.discounted_price < item.price;
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start', gap: 16, padding: '10px 0', borderBottom: '1px solid #F4F7FA', fontSize: 13 }}>
                      <div style={{ color: '#3A6278' }}>
                        <div>{item.name || item.type}</div>
                        {hasDiscount && item.discount_note && (
                          <div style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic' as const, marginTop: 2 }}>{item.discount_note}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>
                        {hasDiscount ? (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#AAAAAA', textDecoration: 'line-through' }}>{formatCurrency(item.price)}</div>
                            <div style={{ fontWeight: 700, color: '#043D5D' }}>{formatCurrency(item.discounted_price!)}</div>
                          </>
                        ) : (
                          <span style={{ fontWeight: 700, color: '#043D5D' }}>{formatCurrency(item.price)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Upfront subtotal — matches PDF "One-Time Project Total" row */}
                <div style={{ borderTop: '1px solid #DDE8EE', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#043D5D' }}>One-Time Project Total</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#043D5D' }}>{formatCurrency(upfrontTotal)} + VAT</span>
                </div>
              </div>
            )}

            {/* Total: upfront + all ongoing annual totals */}
            {(upfrontTotal > 0 || totalAnnualOngoing > 0) && (
              <div style={{ borderTop: '2px solid #043D5D', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#043D5D' }}>Grand Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#009FE3' }}>{formatCurrency(firstYearTotal)}</span>
              </div>
            )}

            {contract.payment_terms && (
              <p style={{ fontSize: 12, color: '#AAAAAA', marginTop: 12 }}>Payment terms: {contract.payment_terms}</p>
            )}
          </div>
        </div>

        {/* 04 — Service Agreement PDF */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>04</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Service Agreement</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            {pdfGenerating ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 0', color: '#3A6278' }}>
                <div style={{ width: 24, height: 24, border: '3px solid #009FE3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 14 }}>Generating your service agreement…</span>
              </div>
            ) : generatedPdfUrl ? (
              <>
                <iframe src={`${generatedPdfUrl}#toolbar=1&navpanes=0`} title="Service Agreement" width="100%" style={{ height: 600, border: '1px solid #DDE8EE', display: 'block' }} />
                <a href={generatedPdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: '#009FE3', fontWeight: 600 }}>
                  Open in new tab ↗
                </a>
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#AAAAAA', padding: '16px 0' }}>No template selected — agreement clauses will be minimal.</p>
            )}
          </div>
        </div>

        {/* 05 — Sign */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' as const }}>05</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Sign Agreement</h2>
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
                id="agree-adhoc"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#009FE3', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
              />
              <label htmlFor="agree-adhoc" style={{ fontSize: 13, color: '#3A6278', lineHeight: 1.6, cursor: 'pointer' }}>
                I confirm I am authorised to sign on behalf of <strong>{contract.organisation || contract.client_name}</strong> and agree to the terms of this service agreement.
                {templateSections.length > 0 && ' The full agreement including all schedules and terms forms part of this acceptance.'}
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
                {!signerName ? 'Enter your full name · ' : ''}{!signatureData ? 'Draw your signature · ' : ''}{!agreed ? 'Accept the agreement' : ''}
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
