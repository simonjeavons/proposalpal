import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ServiceAgreementPDF } from './ServiceAgreementPDF';

// Build an SLA-length body: far taller than one A4 page.
const longSlaBody = Array.from({ length: 90 }, (_, i) =>
  `Clause paragraph ${i}: the Supplier shall use reasonable endeavours to maintain ` +
  `service availability, backups, disaster recovery and security measures as set out herein.`
).join('\n');

const baseProps = {
  clientName: 'Pro-Build 360',
  organisation: 'Pro-Build 360 Ltd',
  programmeTitle: 'ProBuild360',
  agreementDate: '15 July 2026',
  phases: [],
  upfrontItems: [],
  selectedStandard: null,
  selectedExtras: [],
  upfrontTotal: 0,
  monthlyTotal: 0,
  firstYearTotal: 0,
  paymentTerms: '',
  contactName: '',
  contactEmail: '',
  templateSections: [
    { heading: '9. Termination', body: '9.1 A short termination clause.' },
    { heading: 'Schedule 6 - SLA', body: longSlaBody },
  ],
} as const;

describe('ServiceAgreementPDF', () => {
  it('renders a page-spanning schedule (SLA) without the react-pdf oversized-wrap warning', async () => {
    const warnings: string[] = [];
    const spy = vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
      warnings.push(a.join(' '));
    });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await renderToBuffer(React.createElement(ServiceAgreementPDF as any, baseProps));
    } finally {
      spy.mockRestore();
    }
    const cantWrap = warnings.filter(w => /can't wrap between pages/i.test(w));
    expect(cantWrap, `react-pdf warnings:\n${warnings.join('\n')}`).toHaveLength(0);
  }, 30000);
});
