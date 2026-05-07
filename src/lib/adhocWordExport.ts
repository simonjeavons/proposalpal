import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
} from 'docx';
import type { Phase, UpfrontItem } from '@/types/proposal';

export interface WordOngoingOption {
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

export interface TemplateSection {
  heading: string;
  body: string;
}

export interface AdhocDocxInput {
  clientName: string;
  organisation: string | null;
  programmeTitle: string;
  agreementDate: string; // already formatted display string
  companyRegNumber: string | null;
  registeredOffice: string;
  phases: Phase[];
  upfrontItems: UpfrontItem[];
  ongoingOptions: WordOngoingOption[];
  scopeOfWorkText: string | null;
  additionalTermsText: string | null;
  paymentTerms: string;
  templateSections: TemplateSection[];
  contactName: string;
  contactEmail: string;
}

const NAVY = '043D5D';
const MID = '3A6278';
const LIGHT = 'AAAAAA';
const ROW_BG = 'F4F7FA';

const fmt = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const HAIRLINE = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'DDE8EE' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDE8EE' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const para = (text: string, opts?: { bold?: boolean; size?: number; color?: string; spacingAfter?: number; alignment?: typeof AlignmentType[keyof typeof AlignmentType] }) =>
  new Paragraph({
    alignment: opts?.alignment,
    spacing: { after: opts?.spacingAfter ?? 120 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 22, // 11pt
        color: opts?.color,
      }),
    ],
  });

const heading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) =>
  new Paragraph({
    heading: level,
    spacing: { before: 280, after: 160 },
    children: [
      new TextRun({ text, bold: true, color: NAVY, size: level === HeadingLevel.HEADING_1 ? 36 : 26 }),
    ],
  });

const labelValueRow = (label: string, value: string) =>
  new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        borders: NO_BORDER,
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: label.toUpperCase(), size: 16, color: LIGHT, bold: true, characterSpacing: 24 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        borders: NO_BORDER,
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: value, size: 22, color: NAVY, bold: true })],
          }),
        ],
      }),
    ],
  });

const priceRow = (label: string, value: string, opts?: { bold?: boolean; indent?: number; bg?: boolean }) =>
  new TableRow({
    children: [
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        borders: HAIRLINE,
        shading: opts?.bg ? { type: ShadingType.SOLID, color: ROW_BG, fill: ROW_BG } : undefined,
        children: [
          new Paragraph({
            indent: opts?.indent ? { left: opts.indent } : undefined,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: label, size: 20, color: NAVY, bold: opts?.bold })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        borders: HAIRLINE,
        shading: opts?.bg ? { type: ShadingType.SOLID, color: ROW_BG, fill: ROW_BG } : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: value, size: 20, color: NAVY, bold: opts?.bold })],
          }),
        ],
      }),
    ],
  });

const buildPricingChildren = (input: AdhocDocxInput): (Paragraph | Table)[] => {
  const children: (Paragraph | Table)[] = [];
  const { upfrontItems, ongoingOptions, paymentTerms } = input;
  const upfrontTotal = upfrontItems.reduce((s, i) => s + (i.discounted_price ?? i.price), 0);

  const rows: TableRow[] = [];

  // Upfront items
  upfrontItems.forEach(item => {
    const price = item.discounted_price ?? item.price;
    const label = `${item.name || item.type}${item.discount_note ? ` (${item.discount_note})` : ''}`;
    rows.push(priceRow(label, `${fmt(price)} + VAT`));
  });
  if (upfrontItems.length > 0) {
    rows.push(priceRow('One-Time Project Total', `${fmt(upfrontTotal)} + VAT`, { bold: true, bg: true }));
  }

  // Ongoing options
  const fixedOpts = ongoingOptions.filter(o => !o.rolling_monthly);
  const rollingOpts = ongoingOptions.filter(o => o.rolling_monthly);

  const getOptionTotal = (opt: WordOngoingOption) => {
    const numYears = Math.ceil(Math.max(opt.term, 1) / 12);
    const costs = Array.from({ length: numYears }, (_, y) =>
      opt.yearlyCosts[y] ?? (opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0)
    );
    if (opt.frequency === 'annual') return costs.reduce((s, c) => s + c, 0);
    return costs.reduce((s, c, idx) => {
      const months = idx === numYears - 1 ? (opt.term % 12 || 12) : 12;
      const periods = opt.frequency === 'monthly' ? months : Math.round(months * 52 / 12);
      return s + c * periods;
    }, 0);
  };

  let firstYearTotal = upfrontTotal;

  if (fixedOpts.length > 0) {
    rows.push(priceRow('Fixed-Term Commitments', '', { bold: true }));
    fixedOpts.forEach((opt, i) => {
      const numYears = Math.ceil(Math.max(opt.term, 1) / 12);
      const costs = Array.from({ length: numYears }, (_, y) =>
        opt.yearlyCosts[y] ?? (opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0)
      );
      const freqLabel = opt.frequency === 'annual' ? '/yr' : opt.frequency === 'weekly' ? '/wk' : '/mo';
      const startYear = Math.floor((opt.starts_after_months ?? 0) / 12) + 1;
      const baseLabel = opt.name || `Ongoing Option ${i + 1}`;
      const label = opt.discount_note ? `${baseLabel} (${opt.discount_note})` : baseLabel;
      if (numYears > 1) {
        rows.push(priceRow(`${label} (${opt.term} months)`, '', { bold: true, indent: 0 }));
        costs.forEach((cost, y) => {
          rows.push(priceRow(`Year ${startYear + y}`, `${fmt(cost)} + VAT${freqLabel}`, { indent: 360 }));
        });
      } else {
        rows.push(priceRow(`Year ${startYear} — ${label} (${opt.term} months)`, `${fmt(costs[0])} + VAT${freqLabel}`));
      }
      const total = getOptionTotal(opt);
      rows.push(priceRow(`${label} Total`, `${fmt(total)} + VAT`, { bold: true, bg: true, indent: 0 }));
      firstYearTotal += total;
    });
  }

  if (rollingOpts.length > 0) {
    const noticeDays = rollingOpts[0]?.notice_days ?? 30;
    rows.push(priceRow(`Monthly Rolling (${noticeDays} days notice)`, '', { bold: true }));
    rollingOpts.forEach((opt, i) => {
      const freqLabel = opt.frequency === 'annual' ? '/yr' : opt.frequency === 'weekly' ? '/wk' : '/mo';
      const baseLabel = opt.name || `Ongoing Option ${i + 1}`;
      const label = opt.discount_note ? `${baseLabel} (${opt.discount_note})` : baseLabel;
      rows.push(priceRow(label, `${fmt(opt.yearlyCosts[0] ?? 0)} + VAT${freqLabel}`));
    });
  }

  if (firstYearTotal > 0) {
    rows.push(priceRow('Grand Total (Year 1)', `${fmt(firstYearTotal)} + VAT`, { bold: true, bg: true }));
  }

  if (rows.length > 0) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }));
  }

  if (paymentTerms) {
    children.push(new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({ text: 'Payment Terms: ', bold: true, size: 20, color: NAVY }),
        new TextRun({ text: paymentTerms, size: 20, color: '222222' }),
      ],
    }));
  }

  return children;
};

const splitParagraphs = (text: string): Paragraph[] =>
  text
    .split(/\n\n+/)
    .filter(s => s.trim().length > 0)
    .map(s => para(s.trim(), { spacingAfter: 160 }));

export async function generateAdhocDocx(input: AdhocDocxInput): Promise<Blob> {
  const entityName = input.organisation || input.clientName;
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: 'SHOOTHILL LIMITED', bold: true, size: 18, color: LIGHT, characterSpacing: 32 })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
    children: [new TextRun({ text: 'Service Agreement', bold: true, size: 44, color: NAVY })],
  }));

  // Meta table
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labelValueRow('Agreement Date', input.agreementDate),
      labelValueRow('Client', entityName),
      labelValueRow('Programme', input.programmeTitle),
    ],
  }));

  children.push(new Paragraph({
    spacing: { before: 160, after: 200 },
    children: [new TextRun({
      text: 'Shoothill Ltd · Willow House East, Shrewsbury Business Park, SY2 6LG · Company No. 05885234',
      size: 16, color: LIGHT, italics: true,
    })],
  }));

  // Parties
  children.push(heading('Parties'));
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: 'This Agreement is made between: ', size: 22, color: '222222' }),
      new TextRun({ text: '(1) SHOOTHILL LIMITED', bold: true, size: 22, color: '222222' }),
      new TextRun({
        text: `, a company incorporated in England and Wales with registered number 05885234 whose registered office is at Willow House East, Shrewsbury Business Park, Shrewsbury, England, SY2 6LG (the "Supplier"); and `,
        size: 22, color: '222222',
      }),
      new TextRun({ text: `(2) ${entityName}`, bold: true, size: 22, color: '222222' }),
      new TextRun({
        text: `${input.companyRegNumber ? `, registered number ${input.companyRegNumber}` : ''}${input.registeredOffice ? `, whose registered office is at ${input.registeredOffice}` : ''} (the "Customer"). Together referred to as the "Parties".`,
        size: 22, color: '222222',
      }),
    ],
  }));

  // Schedule 1 — Scope of Work
  children.push(heading('Schedule 1 — Scope of Work'));
  if (input.phases.length > 0) {
    input.phases.forEach(phase => {
      const head = `${phase.label}${phase.title ? `: ${phase.title}` : ''}${phase.duration ? `  (${phase.duration})` : ''}${phase.price ? `  — ${phase.price.startsWith('£') ? phase.price : `£${phase.price}`}` : ''}`;
      children.push(new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [new TextRun({ text: head, bold: true, size: 22, color: NAVY })],
      }));
      phase.tasks.filter(Boolean).forEach(task => {
        children.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun({ text: task, size: 20, color: MID })],
        }));
      });
    });
  } else if (input.scopeOfWorkText) {
    splitParagraphs(input.scopeOfWorkText).forEach(p => children.push(p));
  } else {
    children.push(para(`${input.programmeTitle} — services as described in the Supplier's Proposal.`));
  }

  // Schedule 2 — Charges
  children.push(heading('Schedule 2 — Charges and Payment Terms'));
  buildPricingChildren(input).forEach(c => children.push(c));

  // Template sections (clauses)
  input.templateSections.forEach(section => {
    children.push(heading(section.heading));
    splitParagraphs(section.body).forEach(p => children.push(p));
  });

  // Additional Terms
  if (input.additionalTermsText) {
    const scheduleNumbers = input.templateSections
      .map(s => s.heading.match(/^Schedule\s+(\d+)/i)?.[1])
      .filter((n): n is string => !!n)
      .map(n => parseInt(n, 10));
    const nextNumber = scheduleNumbers.length > 0 ? Math.max(...scheduleNumbers) + 1 : 3;
    children.push(heading(`Schedule ${nextNumber} — Additional Terms and Conditions`));
    splitParagraphs(input.additionalTermsText).forEach(p => children.push(p));
  }

  // Execution
  children.push(heading('Execution'));
  children.push(para(`IN WITNESS WHEREOF the parties have signed this Agreement on ${input.agreementDate}.`, { spacingAfter: 240 }));

  const sigBlock = (forText: string) => [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: forText, bold: true, size: 20, color: NAVY })] }),
    new Paragraph({ spacing: { after: 360 }, children: [new TextRun({ text: '__________________________________', size: 22, color: LIGHT })] }),
    para('Authorised Signatory'),
    para('Print Name: ___________________________'),
    para('Job Title: _____________________________'),
    para('Date: __________________________________', { spacingAfter: 240 }),
  ];

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDER,
            children: sigBlock('For Shoothill Limited (Simon Jeavons, Group Managing Director)'),
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDER,
            children: sigBlock(`For ${entityName}`),
          }),
        ],
      }),
    ],
  }));

  // Footer note
  children.push(new Paragraph({
    spacing: { before: 280, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: `Shoothill Ltd · ${input.contactName}${input.contactEmail ? ` · ${input.contactEmail}` : ''}`,
      size: 16, color: LIGHT,
    })],
  }));

  const doc = new Document({
    title: `Service Agreement — ${entityName}`,
    creator: 'Shoothill Limited',
    description: `Service Agreement for ${entityName}`,
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
