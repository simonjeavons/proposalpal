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

// DocuSign-style electronic signature certificate page.
// Shows both parties' signatures side-by-side with audit trail and document metadata.
async function appendCertificatePage(
  sourcePdfBytes: Uint8Array,
  clientSignatureDataUrl: string,
  clientSignerName: string,
  clientSignerTitle: string,
  clientEntityName: string,
  shootHillSignatureDataUrl: string | null,
  signedAt: Date,
  documentTitle: string,
  referenceId: string,
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.load(sourcePdfBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed client signature (PNG from canvas)
  const clientSigBase64 = clientSignatureDataUrl.split(',')[1];
  const clientSigBytes = Uint8Array.from(atob(clientSigBase64), c => c.charCodeAt(0));
  const clientSigImage = await pdfDoc.embedPng(clientSigBytes);

  // Embed Simon's signature if provided
  let shootHillSigImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (shootHillSignatureDataUrl) {
    try {
      const shBase64 = shootHillSignatureDataUrl.split(',')[1];
      const shBytes = Uint8Array.from(atob(shBase64), c => c.charCodeAt(0));
      shootHillSigImage = await pdfDoc.embedPng(shBytes);
    } catch { /* ignore embed errors */ }
  }

  // A4 page
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // Colours
  const navy  = rgb(4/255,   61/255,  93/255);   // #043D5D
  const blue  = rgb(0/255,  159/255, 227/255);   // #009FE3
  const mid   = rgb(58/255,  98/255, 120/255);   // #3A6278
  const light = rgb(170/255,170/255, 170/255);   // #AAAAAA
  const bg    = rgb(244/255,247/255, 250/255);   // #F4F7FA
  const lbg   = rgb(235/255,245/255, 251/255);   // light blue tint
  const white = rgb(1, 1, 1);
  const green = rgb(0/255, 155/255,  85/255);

  // ── LOGO (fetch + rasterise SVG → PNG for header) ──────────────────────────
  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  try {
    const svgRes = await fetch('https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg');
    if (svgRes.ok) {
      const svgText = await svgRes.text();
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 80;
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.filter = 'brightness(0) invert(1)'; // render as white
          ctx.drawImage(img, 0, 0, 300, 80);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = blobUrl;
      });
      URL.revokeObjectURL(blobUrl);
      const pngDataUrl = canvas.toDataURL('image/png');
      const pngBase64 = pngDataUrl.split(',')[1];
      const pngBytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
      logoImage = await pdfDoc.embedPng(pngBytes);
    }
  } catch { /* fall back to text */ }

  // ── HEADER ─────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: navy });
  page.drawText('Electronic Signature Certificate', {
    x: 36, y: height - 40, size: 16, font: helveticaBold, color: white,
  });
  page.drawText('Shoothill Proposal Manager', {
    x: 36, y: height - 58, size: 9, font: helvetica, color: rgb(0.6, 0.7, 0.75),
  });
  // Shoothill logo on right side of header
  if (logoImage) {
    const d = logoImage.scaleToFit(120, 26);
    page.drawImage(logoImage, {
      x: width - 36 - d.width,
      y: height - 35 - d.height / 2,
      width: d.width,
      height: d.height,
    });
  } else {
    page.drawText('SHOOTHILL', {
      x: width - 36 - 62,
      y: height - 44,
      size: 12, font: helveticaBold, color: white,
    });
  }
  // Blue accent stripe
  page.drawRectangle({ x: 0, y: height - 73, width, height: 3, color: blue });

  const dateStr = signedAt.toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  // ── DOCUMENT DETAILS BOX ───────────────────────────────────────────────────
  let y = height - 97;
  const detailsH = 108;
  const boxX = 36;
  const boxW = width - 72;

  page.drawRectangle({ x: boxX, y: y - detailsH, width: boxW, height: detailsH, color: lbg });
  page.drawRectangle({ x: boxX, y: y - detailsH, width: boxW, height: detailsH, borderColor: rgb(0.87, 0.91, 0.93), borderWidth: 0.5 });

  const c1 = boxX + 12;
  const c2 = boxX + boxW / 2 + 6;

  y -= 16;
  page.drawText('DOCUMENT', { x: c1, y, size: 7, font: helveticaBold, color: light });
  page.drawText('REFERENCE', { x: c2, y, size: 7, font: helveticaBold, color: light });
  y -= 14;
  const titleTrunc = documentTitle.length > 44 ? documentTitle.slice(0, 44) + '…' : documentTitle;
  page.drawText(titleTrunc, { x: c1, y, size: 9, font: helveticaBold, color: navy });
  page.drawText(referenceId, { x: c2, y, size: 9, font: helveticaBold, color: navy });

  y -= 20;
  page.drawText('PARTIES', { x: c1, y, size: 7, font: helveticaBold, color: light });
  page.drawText('DATE & TIME SIGNED', { x: c2, y, size: 7, font: helveticaBold, color: light });
  y -= 14;
  const partiesText = `Shoothill Limited  ·  ${clientEntityName}`;
  page.drawText(partiesText.length > 50 ? partiesText.slice(0, 50) + '…' : partiesText, { x: c1, y, size: 9, font: helvetica, color: navy });
  page.drawText(dateStr, { x: c2, y, size: 9, font: helvetica, color: navy });

  y -= 20;
  // "Completed" status badge
  page.drawRectangle({ x: c1, y: y - 3, width: 76, height: 15, color: rgb(0.88, 0.98, 0.92) });
  page.drawText('COMPLETED', { x: c1 + 5, y: y + 1, size: 7.5, font: helveticaBold, color: green });

  // ── SIGNATURES HEADING ─────────────────────────────────────────────────────
  y = height - 97 - detailsH - 24;
  page.drawText('SIGNATURES', { x: 36, y, size: 8, font: helveticaBold, color: navy });
  page.drawLine({ start: { x: 36, y: y - 5 }, end: { x: width - 36, y: y - 5 }, thickness: 0.5, color: rgb(0.87, 0.91, 0.93) });
  y -= 18;

  // ── TWO SIGNATURE BOXES ────────────────────────────────────────────────────
  const colW = (boxW - 12) / 2;
  const sigBoxH = 175;
  const lColX = 36;
  const rColX = 36 + colW + 12;
  const sigAreaH = 72;
  const sigAreaW = colW - 24;
  const boxBottomY = y - sigBoxH;

  // Box backgrounds + borders
  for (const bx of [lColX, rColX]) {
    page.drawRectangle({ x: bx, y: boxBottomY, width: colW, height: sigBoxH, color: bg });
    page.drawRectangle({ x: bx, y: boxBottomY, width: colW, height: sigBoxH, borderColor: rgb(0.87, 0.91, 0.93), borderWidth: 0.5 });
  }

  // ── LEFT BOX: Shoothill ────────────────────────────────────────────────────
  const li = lColX + 12;
  let ly = y - 14;
  page.drawText('FOR SHOOTHILL LIMITED', { x: li, y: ly, size: 7, font: helveticaBold, color: light });
  // Blue accent top border
  page.drawLine({ start: { x: lColX, y: y }, end: { x: lColX + colW, y: y }, thickness: 2.5, color: blue });

  ly -= 14;
  // Signature area
  page.drawRectangle({ x: li, y: ly - sigAreaH, width: sigAreaW, height: sigAreaH, color: white });
  page.drawRectangle({ x: li, y: ly - sigAreaH, width: sigAreaW, height: sigAreaH, borderColor: rgb(0.87, 0.91, 0.93), borderWidth: 0.5 });
  if (shootHillSigImage) {
    const d = shootHillSigImage.scaleToFit(sigAreaW - 8, sigAreaH - 8);
    page.drawImage(shootHillSigImage, {
      x: li + (sigAreaW - d.width) / 2,
      y: ly - sigAreaH + (sigAreaH - d.height) / 2,
      width: d.width, height: d.height,
    });
  } else {
    page.drawText('Signed electronically', {
      x: li + 6, y: ly - sigAreaH / 2 - 3,
      size: 7.5, font: helvetica, color: rgb(0.75, 0.75, 0.75),
    });
  }

  ly -= sigAreaH + 10;
  page.drawLine({ start: { x: li, y: ly }, end: { x: li + sigAreaW, y: ly }, thickness: 0.5, color: rgb(0.87, 0.91, 0.93) });
  ly -= 12;
  page.drawText('Simon Jeavons', { x: li, y: ly, size: 10, font: helveticaBold, color: navy });
  ly -= 14;
  page.drawText('Group Managing Director', { x: li, y: ly, size: 8, font: helvetica, color: mid });
  ly -= 12;
  page.drawText('Shoothill Limited', { x: li, y: ly, size: 8, font: helvetica, color: light });
  ly -= 11;
  page.drawText(dateStr, { x: li, y: ly, size: 7, font: helvetica, color: light });

  // ── RIGHT BOX: Client ──────────────────────────────────────────────────────
  const ri = rColX + 12;
  const clientLabel = `FOR ${clientEntityName.toUpperCase()}`;
  const clientLabelTrunc = clientLabel.length > 34 ? clientLabel.slice(0, 34) + '…' : clientLabel;
  let ry = y - 14;
  page.drawText(clientLabelTrunc, { x: ri, y: ry, size: 7, font: helveticaBold, color: light });
  page.drawLine({ start: { x: rColX, y: y }, end: { x: rColX + colW, y: y }, thickness: 2.5, color: blue });

  ry -= 14;
  // Client signature image
  page.drawRectangle({ x: ri, y: ry - sigAreaH, width: sigAreaW, height: sigAreaH, color: white });
  page.drawRectangle({ x: ri, y: ry - sigAreaH, width: sigAreaW, height: sigAreaH, borderColor: rgb(0.87, 0.91, 0.93), borderWidth: 0.5 });
  const cd = clientSigImage.scaleToFit(sigAreaW - 8, sigAreaH - 8);
  page.drawImage(clientSigImage, {
    x: ri + (sigAreaW - cd.width) / 2,
    y: ry - sigAreaH + (sigAreaH - cd.height) / 2,
    width: cd.width, height: cd.height,
  });

  ry -= sigAreaH + 10;
  page.drawLine({ start: { x: ri, y: ry }, end: { x: ri + sigAreaW, y: ry }, thickness: 0.5, color: rgb(0.87, 0.91, 0.93) });
  ry -= 12;
  page.drawText(clientSignerName, { x: ri, y: ry, size: 10, font: helveticaBold, color: navy });
  ry -= 14;
  if (clientSignerTitle) {
    page.drawText(clientSignerTitle, { x: ri, y: ry, size: 8, font: helvetica, color: mid });
    ry -= 12;
  }
  const entityTrunc = clientEntityName.length > 38 ? clientEntityName.slice(0, 38) + '…' : clientEntityName;
  page.drawText(entityTrunc, { x: ri, y: ry, size: 8, font: helvetica, color: light });
  ry -= 11;
  page.drawText(dateStr, { x: ri, y: ry, size: 7, font: helvetica, color: light });

  // ── AUDIT TRAIL ────────────────────────────────────────────────────────────
  y = boxBottomY - 22;
  page.drawText('AUDIT TRAIL', { x: 36, y, size: 8, font: helveticaBold, color: navy });
  page.drawLine({ start: { x: 36, y: y - 5 }, end: { x: width - 36, y: y - 5 }, thickness: 0.5, color: rgb(0.87, 0.91, 0.93) });
  y -= 18;

  // Two-column audit trail: action (left) | date/time (right)
  // Items 1-3 have no specific timestamp (lifecycle events); 4-5 have the signing timestamp.
  const auditItemsData: { action: string; ts: string | null }[] = [
    { action: `Proposal prepared by Shoothill Limited for ${clientEntityName}`, ts: null },
    { action: `Proposal sent to ${clientEntityName}`, ts: null },
    { action: `Service agreement viewed by ${clientEntityName}`, ts: null },
    { action: `Agreement signed by ${clientSignerName}${clientSignerTitle ? `, ${clientSignerTitle}` : ''}`, ts: dateStr },
    { action: `Signature certificate generated — Reference: ${referenceId}`, ts: dateStr },
  ];

  const auditTsX = 420; // x position for timestamp column
  // Column headers
  page.drawText('ACTION', { x: 50, y, size: 7, font: helveticaBold, color: light });
  page.drawText('DATE / TIME', { x: auditTsX, y, size: 7, font: helveticaBold, color: light });
  y -= 13;

  for (const item of auditItemsData) {
    page.drawRectangle({ x: 36, y: y - 2, width: 8, height: 8, color: green });
    const actionTrunc = item.action.length > 58 ? item.action.slice(0, 58) + '…' : item.action;
    page.drawText(actionTrunc, { x: 50, y, size: 8, font: helvetica, color: mid });
    page.drawText(item.ts ?? '—', { x: auditTsX, y, size: 8, font: helvetica, color: item.ts ? mid : light });
    y -= 14;
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 36, y: 58 }, end: { x: width - 36, y: 58 }, thickness: 0.5, color: rgb(0.87, 0.91, 0.93) });
  page.drawText(
    'This certificate confirms that the above-named parties have electronically executed the Service Agreement via Shoothill Proposal Manager.',
    { x: 36, y: 46, size: 7, font: helvetica, color: light },
  );
  page.drawText(
    'Shoothill Limited · Company No. 05885234 · Willow House East, Shrewsbury Business Park, Shrewsbury, England, SY2 6LG',
    { x: 36, y: 35, size: 7, font: helvetica, color: light },
  );
  page.drawText(referenceId, { x: width - 36 - 90, y: 40, size: 7, font: helveticaBold, color: light });

  return pdfDoc.save();
}

export default function ProposalAccept() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const standardIndex = Number(searchParams.get('standard') ?? 0);
  const extrasParam = searchParams.get('extras');
  // Initialise from URL param immediately; when extrasParam is null (direct nav)
  // we'll default to recommended extras once the proposal loads.
  const [selectedExtrasIndices, setSelectedExtrasIndices] = useState<number[]>(() =>
    extrasParam !== null
      ? (extrasParam ? extrasParam.split(',').map(Number).filter(n => !isNaN(n)) : [])
      : []
  );
  const toggleExtra = (i: number) =>
    setSelectedExtrasIndices(prev =>
      prev.includes(i) ? prev.filter(j => j !== i) : [...prev, i]
    );

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState<'idle' | 'signing' | 'saving'>('idle');
  const [submitted, setSubmitted] = useState(false);

  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Mobile detection
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = windowWidth < 640;

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
        // If no extras param in URL, default to recommended extras
        if (extrasParam === null) {
          const optExtras = ((data.retainer_options || []) as unknown as RetainerOption[])
            .filter(r => r.option_type === 'optional_extra');
          setSelectedExtrasIndices(optExtras.reduce<number[]>((acc, r, i) => r.recommended ? [...acc, i] : acc, []));
        }

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
        const selExtras = selectedExtrasIndices.map(i => optExtras[i]).filter(Boolean);
        const upfrontAmt = Number(proposal.upfront_total);
        const stdPrice = selStandard ? (selStandard.quantity ?? 1) * (selStandard.discounted_price ?? selStandard.price) : 0;
        const extrasPrice = selExtras.reduce((sum, r) => sum + (r.quantity ?? 1) * (r.discounted_price ?? r.price), 0);
        const allOpts: RetainerOption[] = [...coreOpts, ...(selStandard ? [selStandard] : []), ...selExtras];
        const annualAmt = allOpts.reduce((sum, r) => sum + (r.quantity ?? 1) * (r.discounted_price ?? r.price) * (r.frequency === 'weekly' ? 52 : r.frequency === 'annual' ? 1 : 12), 0);
        const ongoingAmt = stdPrice + extrasPrice;
        const firstYrTotal = upfrontAmt + annualAmt;

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
          monthlyTotal: ongoingAmt,
          firstYearTotal: firstYrTotal,
          paymentTerms: (proposal as any).payment_terms || '',
          contactName: proposal.contact_name || '',
          contactEmail: proposal.contact_email || '',
          companyRegNumber: (proposal as any).company_reg_number || '',
          registeredOffice: [(proposal as any).registered_address_1, (proposal as any).registered_address_2, (proposal as any).registered_city, (proposal as any).registered_county, (proposal as any).registered_postcode].filter(Boolean).join(', '),
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
  }, [proposal, templateSections, selectedExtrasIndices]);

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

  const coreOptions = proposal.retainer_options.filter(r => r.option_type === 'core');
  const standardOptions = proposal.retainer_options.filter(r => r.option_type === 'standard');
  const optionalExtras = proposal.retainer_options.filter(r => r.option_type === 'optional_extra');
  const selectedStandard = standardOptions[standardIndex] || null;
  const selectedExtras = selectedExtrasIndices.map(i => optionalExtras[i]).filter(Boolean);
  const upfront = Number(proposal.upfront_total);
  const optionTotal = (r: { price: number; discounted_price?: number; quantity?: number }) => (r.quantity ?? 1) * (r.discounted_price ?? r.price);
  const corePrice = coreOptions.reduce((sum, r) => sum + optionTotal(r), 0);
  const standardPrice = selectedStandard ? optionTotal(selectedStandard) : 0;
  const extrasPrice = selectedExtras.reduce((sum, r) => sum + optionTotal(r), 0);
  const ongoingTotal = corePrice + standardPrice + extrasPrice;

  // Frequency-aware annual calculation
  const annualMultiplier = (r: RetainerOption) => {
    if (r.frequency === 'weekly') return 52;
    if (r.frequency === 'annual') return 1;
    return 12;
  };
  const allSelectedOptions: RetainerOption[] = [
    ...coreOptions,
    ...(selectedStandard ? [selectedStandard] : []),
    ...selectedExtras,
  ];
  const annualOngoing = allSelectedOptions.reduce((sum, r) => sum + optionTotal(r) * annualMultiplier(r), 0);
  const frequencies = allSelectedOptions.map(r => r.frequency ?? 'monthly');
  const dominantFreq = frequencies.length > 0 && frequencies.every(f => f === frequencies[0]) ? frequencies[0] : 'mixed';
  const FREQ_LABEL: Record<string, string> = { weekly: '/wk', monthly: '/mo', annual: '/yr' };
  const freqSuffix = dominantFreq !== 'mixed' ? (FREQ_LABEL[dominantFreq] ?? '/mo') : '/yr';
  const ongoingLabel = dominantFreq === 'annual' ? 'Annual Ongoing' : dominantFreq === 'weekly' ? 'Weekly Ongoing' : 'Monthly Ongoing';

  // Max term for multi-year breakdown
  const maxTermMonths = Math.max(...allSelectedOptions.map(r => r.term_months ?? 12), 12);
  const totalYears = Math.min(Math.ceil(maxTermMonths / 12), 5);
  const firstYearTotal = upfront + annualOngoing;
  const contractTotal = upfront + annualOngoing * totalYears;

  const contractFileUrl = (proposal as any).contract_file_url as string | null;

  const submitting = submitState !== 'idle';
  const canSubmit = signerName && agreed && !!signatureData && !submitting && !pdfGenerating;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    let signedContractUrl: string | null = null;
    let signingError: string | null = null;
    const signedAt = new Date();
    const signingDateStr = signedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const referenceId = `SH-${proposal.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    setSubmitState('signing');
    try {
      // Always import these — dynamic imports are module-cached so no wasted cost
      const [{ pdf }, { ServiceAgreementPDF, SIMON_SIGNATURE_URI }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/ServiceAgreementPDF'),
      ]);

      let pdfBytes: Uint8Array | null = null;

      if (contractFileUrl) {
        // Manual override PDF: fetch from storage proxy, then append certificate
        const response = await fetch(`/contracts/${contractFileUrl}`);
        pdfBytes = new Uint8Array(await response.arrayBuffer());
      } else {
        // Regenerate the PDF with both signatures embedded in the execution block
        const coreOpts = proposal.retainer_options.filter(r => r.option_type === 'core');
        const stdOpts = proposal.retainer_options.filter(r => r.option_type === 'standard');
        const optExtras = proposal.retainer_options.filter(r => r.option_type === 'optional_extra');
        const selStandard = stdOpts[standardIndex] || null;
        const selExtras = selectedExtrasIndices.map(i => optExtras[i]).filter(Boolean);
        const upfrontAmt = Number(proposal.upfront_total);
        const coreAmt = coreOpts.reduce((sum, r) => sum + (r.quantity ?? 1) * (r.discounted_price ?? r.price), 0);
        const stdPrice = selStandard ? (selStandard.quantity ?? 1) * (selStandard.discounted_price ?? selStandard.price) : 0;
        const extrasPrice = selExtras.reduce((sum, r) => sum + (r.quantity ?? 1) * (r.discounted_price ?? r.price), 0);
        const allOpts2: RetainerOption[] = [...coreOpts, ...(selStandard ? [selStandard] : []), ...selExtras];
        const annualAmt2 = allOpts2.reduce((sum, r) => sum + (r.quantity ?? 1) * (r.discounted_price ?? r.price) * (r.frequency === 'weekly' ? 52 : r.frequency === 'annual' ? 1 : 12), 0);
        const ongoingAmt2 = coreAmt + stdPrice + extrasPrice;
        const firstYrTotal = upfrontAmt + annualAmt2;

        const signedProps = {
          clientName: proposal.client_name,
          organisation: proposal.organisation || '',
          programmeTitle: proposal.programme_title,
          agreementDate: signingDateStr,
          phases: proposal.phases || [],
          upfrontItems: (proposal as any).upfront_items || [],
          selectedStandard: selStandard,
          selectedExtras: selExtras,
          upfrontTotal: upfrontAmt,
          monthlyTotal: ongoingAmt2,
          firstYearTotal: firstYrTotal,
          paymentTerms: (proposal as any).payment_terms || '',
          contactName: proposal.contact_name || '',
          contactEmail: proposal.contact_email || '',
          companyRegNumber: (proposal as any).company_reg_number || '',
          registeredOffice: [(proposal as any).registered_address_1, (proposal as any).registered_address_2, (proposal as any).registered_city, (proposal as any).registered_county, (proposal as any).registered_postcode].filter(Boolean).join(', '),
          templateSections,
          // Embed signatures directly into the execution block of the PDF
          clientSignerName: signerName,
          clientSignerTitle: signerTitle,
          clientSignatureUri: signatureData!,
          signingDate: signingDateStr,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = await pdf(React.createElement(ServiceAgreementPDF as any, signedProps)).toBlob();
        pdfBytes = new Uint8Array(await blob.arrayBuffer());
        generatedPdfBytesRef.current = pdfBytes;
      }

      if (pdfBytes) {
        const finalBytes = await appendCertificatePage(
          pdfBytes,
          signatureData!,
          signerName,
          signerTitle,
          proposal.organisation || proposal.client_name,
          SIMON_SIGNATURE_URI || null,
          signedAt,
          proposal.programme_title,
          referenceId,
        );
        const baseName = contractFileUrl
          ? contractFileUrl.replace(/\.[^.]+$/, '')
          : `${proposal.slug}-agreement`;
        const signedPath = `${baseName}-signed-${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(signedPath, new Blob([finalBytes], { type: 'application/pdf' }));
        if (!uploadError) signedContractUrl = signedPath;
        else { console.error('PDF upload error:', uploadError); signingError = `Upload error: ${uploadError.message}`; }
      }
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error('PDF signing failed:', err);
      signingError = msg;
      // Continue without signed PDF rather than blocking acceptance
    }

    // Save acceptance record
    setSubmitState('saving');
    const { error } = await supabase.from("proposal_acceptances" as any).insert({
      proposal_id: proposal.id,
      signer_name: signerName,
      signer_title: signerTitle,
      selected_retainer_index: standardIndex,
      selected_extras: selectedExtrasIndices,
      upfront_total: upfront,
      retainer_price: ongoingTotal,
      first_year_total: contractTotal,
      signature_data: signatureData,
      signed_contract_url: signedContractUrl,
      signing_error: signingError || null,
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
      <div style={{ background: 'white', border: '1px solid #DDE8EE', maxWidth: 560, width: '100%', margin: isMobile ? 12 : 24, textAlign: 'center', padding: isMobile ? '32px 20px' : '56px 40px' }}>
        <div style={{ width: 56, height: 56, background: '#009FE3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', marginBottom: 16 }}>Let's Get Started</h1>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#043D5D', marginBottom: 12 }}>Your approval is confirmed.</p>
        <p style={{ fontSize: 14, color: '#3A6278', lineHeight: 1.8, marginBottom: 8 }}>
          Your project is now in motion. Our team is preparing your delivery plan, and {proposal.prepared_by ? proposal.prepared_by.split(',')[0].trim() : 'your Shoothill contact'} will be in touch shortly to schedule your kickoff meeting.
        </p>
        <p style={{ fontSize: 14, color: '#3A6278', lineHeight: 1.8, marginBottom: 32 }}>
          We're excited to be part of your next chapter. Welcome aboard.
        </p>
        <p style={{ fontSize: 12, color: '#8FA8B8' }}>You can now close this window.</p>
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
      <div style={{ background: '#043D5D', padding: isMobile ? '16px 16px' : '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <img style={{ height: isMobile ? 18 : 24, filter: 'brightness(0) invert(1)', flexShrink: 0 }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
        <span style={{ fontSize: isMobile ? 10 : 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, textAlign: 'right' as const }}>Contract Acceptance — {proposal.client_name}</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 24px' }}>
        {/* 01 — Pricing Summary */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>01</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Pricing Summary</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: ongoingTotal > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
              {upfront > 0 && (
                <div style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>One-Time Project</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', letterSpacing: '-.02em' }}>{formatCurrency(upfront)}<span style={{ fontSize: 12, fontWeight: 500, color: '#AAAAAA' }}> + VAT</span></div>
                </div>
              )}
              {ongoingTotal > 0 && (
                <div style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 6 }}>
                    {ongoingLabel}{selectedStandard ? ` — ${selectedStandard.name || selectedStandard.type}` : ''}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#043D5D', letterSpacing: '-.02em' }}>{formatCurrency(ongoingTotal)}<span style={{ fontSize: 12, fontWeight: 500, color: '#AAAAAA' }}> + VAT {freqSuffix}</span></div>
                  {selectedExtras.length > 0 && (
                    <div style={{ fontSize: 12, color: '#3A6278', marginTop: 4 }}>
                      Includes: {selectedExtras.map(r => r?.name || r?.type).filter(Boolean).join(', ')}
                    </div>
                  )}
                  {dominantFreq !== 'annual' && <div style={{ fontSize: 12, color: '#AAAAAA', marginTop: 2 }}>Annual: {formatCurrency(annualOngoing)}</div>}
                </div>
              )}
            </div>
            {/* Optional extras toggle */}
            {optionalExtras.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#AAAAAA', marginBottom: 8 }}>Optional Add-ons</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {optionalExtras.map((extra, i) => {
                    const checked = selectedExtrasIndices.includes(i);
                    return (
                      <div
                        key={i}
                        onClick={() => toggleExtra(i)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px',
                          background: checked ? '#F0FAFF' : '#F9FAFB',
                          border: `1.5px solid ${checked ? '#009FE3' : '#DDE8EE'}`,
                          cursor: 'pointer',
                          transition: 'all .2s',
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                          background: checked ? '#009FE3' : 'transparent',
                          border: checked ? 'none' : '1.5px solid #AAAAAA',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .2s',
                        }}>
                          {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><polyline points="1,4 4,7 9,1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, color: '#1A2E3B', fontWeight: 600 }}>
                          {extra.name || extra.type}
                          {extra.recommended && (
                            <span style={{ marginLeft: 8, fontSize: 9, background: '#FDE68A', color: '#92400E', padding: '1px 5px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Recommended</span>
                          )}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#043D5D', flexShrink: 0 }}>
                          +{formatCurrency((extra.quantity ?? 1) * (extra.discounted_price ?? extra.price))}{FREQ_LABEL[extra.frequency ?? 'monthly'] ?? '/mo'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ background: '#043D5D', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Total Contract Value{totalYears > 1 ? ` (${totalYears} years)` : ''}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#009FE3', letterSpacing: '-.02em' }}>{formatCurrency(contractTotal)}<span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}> + VAT</span></span>
            </div>
          </div>
        </div>

        {/* 02 — Service Agreement (always shown) */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', marginBottom: 24 }}>
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>02</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Service Agreement</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
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
          <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: isMobile ? 10 : 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', textTransform: 'uppercase' }}>03</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Sign & Accept</h2>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
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
