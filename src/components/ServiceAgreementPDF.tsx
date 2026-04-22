import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export const SHOOTHILL_LOGO_URI = 'data:image/png;base64,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';
import type { Phase, RetainerOption, UpfrontItem } from '@/types/proposal';

interface TemplateSection {
  heading: string;
  body: string;
}

export const SIMON_SIGNATURE_URI = 'data:image/png;base64,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';

export interface ServiceAgreementPDFProps {
  // Dynamic — from proposal + customer selections
  clientName: string;
  organisation: string;
  programmeTitle: string;
  agreementDate: string;
  phases: Phase[];
  upfrontItems: UpfrontItem[];
  coreOptions?: RetainerOption[];
  selectedStandard: RetainerOption | null;
  selectedExtras: RetainerOption[];
  upfrontTotal: number;
  monthlyTotal: number;
  firstYearTotal: number;
  paymentTerms: string;
  contactName: string;
  contactEmail: string;
  companyRegNumber?: string;
  registeredOffice?: string; // pre-formatted address string
  scopeOfWorkText?: string;
  additionalTermsText?: string;
  // Static — from chosen template
  templateSections: TemplateSection[];
  // Signature data — passed at signing time to embed into execution block
  clientSignerName?: string;
  clientSignerTitle?: string;
  clientSignatureUri?: string;
  signingDate?: string;
  // Ad-hoc ongoing options — when provided, replaces selectedStandard/selectedExtras with per-year breakdown
  ongoingOptions?: Array<{
    name: string;
    yearlyCosts: number[];
    term: number;
    frequency: 'weekly' | 'monthly' | 'annual';
    rolling_monthly?: boolean;
    notice_days?: number;
    starts_after_months?: number;
    discount_note?: string;
  }>;
  // Fixed-term billings per contract year (honouring starts_after_months) — drives multi-year subtotal rows.
  contractYearSubtotals?: number[];
  // SaaS pricing — when pricingOption is 'saas', show SaaS tiers instead of traditional pricing
  pricingOption?: 'traditional' | 'saas';
  saasConfig?: { tiers: Array<{ label: string; monthly_price: number; duration_months: number; features: string[] }>; selling_points?: string[]; custom_intro?: string };
}

const NAVY = '#043D5D';
const BLUE = '#009FE3';
const MID = '#3A6278';
const LIGHT = '#AAAAAA';
const BG = '#F4F7FA';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
    paddingTop: 48,
    paddingBottom: 56,
    paddingLeft: 56,
    paddingRight: 56,
  },
  // Header
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 56,
    paddingRight: 56,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
  },
  headerLogo: {
    height: 28,
    width: 105,
  },
  headerSub: {
    fontSize: 10,
    color: MID,
  },
  accentStripe: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: BLUE,
  },
  // Sections
  sectionHeader: {
    backgroundColor: '#E8F4FB',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 6,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  sectionBody: {
    fontSize: 9,
    color: '#222222',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  // Meta table
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    width: 120,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 9,
    color: '#111111',
    flex: 1,
  },
  // Charges table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
    paddingVertical: 4,
  },
  tableRowBold: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: NAVY,
    paddingVertical: 4,
    marginTop: 2,
  },
  // Intermediate bold row: same typography as tableRowBold but no navy divider —
  // used when multiple bold rows stack (per-option and per-year subtotals) so the
  // page doesn't end up with a run of heavy blue lines.
  tableRowBoldQuiet: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  tableDesc: {
    flex: 1,
    fontSize: 9,
    color: '#222222',
  },
  tableDescBold: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  tableAmt: {
    fontSize: 9,
    color: '#222222',
    textAlign: 'right',
    width: 100,
  },
  tableAmtBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'right',
    width: 100,
  },
  // Execution
  execRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
  },
  execCol: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#DDE8EE',
    paddingTop: 8,
  },
  execLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  execLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
    marginBottom: 10,
    paddingBottom: 16,
  },
  execLineLabel: {
    fontSize: 7,
    color: LIGHT,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: '#DDE8EE',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: LIGHT,
  },
  spacer: { height: 8 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#DDE8EE', marginVertical: 8 },
  partiesText: { fontSize: 9, color: '#222222', lineHeight: 1.5, marginBottom: 6 },
});

const fmt = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const optionTotal = (r: RetainerOption) => (r.quantity ?? 1) * (r.discounted_price ?? r.price);

export function ServiceAgreementPDF({
  clientName,
  organisation,
  programmeTitle,
  agreementDate,
  phases,
  upfrontItems,
  coreOptions = [],
  selectedStandard,
  selectedExtras,
  upfrontTotal,
  monthlyTotal,
  firstYearTotal,
  paymentTerms,
  contactName,
  contactEmail,
  companyRegNumber,
  registeredOffice,
  scopeOfWorkText,
  additionalTermsText,
  templateSections,
  clientSignerName,
  clientSignerTitle,
  clientSignatureUri,
  signingDate,
  ongoingOptions,
  contractYearSubtotals,
  pricingOption,
  saasConfig,
}: ServiceAgreementPDFProps) {
  const entityName = organisation || clientName;

  return (
    <Document title={`Service Agreement — ${entityName}`} author="Shoothill Limited">
      <Page size="A4" style={styles.page}>
        {/* Fixed header */}
        <View style={styles.headerBar} fixed>
          <Image src={SHOOTHILL_LOGO_URI} style={styles.headerLogo} />
          <Text style={styles.headerSub}>Service Agreement</Text>
        </View>
        <View style={styles.accentStripe} fixed />

        {/* Top spacer to clear fixed header */}
        <View style={{ height: 20 }} />

        {/* Agreement meta */}
        <View style={{ marginBottom: 12 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Agreement Date</Text>
            <Text style={styles.metaValue}>{agreementDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Client</Text>
            <Text style={styles.metaValue}>{entityName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Programme</Text>
            <Text style={styles.metaValue}>{programmeTitle}</Text>
          </View>
          {(selectedStandard?.rolling_monthly || selectedStandard?.term_months) && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Initial Term</Text>
              <Text style={styles.metaValue}>{selectedStandard.rolling_monthly ? `Monthly rolling, ${selectedStandard.notice_days ?? 30} days notice` : `${selectedStandard.term_months} months${selectedStandard.starts_after_months ? ' (begins after project delivery)' : ''}`}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 7, color: LIGHT, marginBottom: 10 }}>
          Shoothill Ltd · Willow House East, Shrewsbury Business Park, SY2 6LG · Company No. 05885234
        </Text>
        <View style={styles.divider} />

        {/* Parties */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Parties</Text>
        </View>
        <Text style={styles.partiesText}>
          This Agreement is made between: (1) SHOOTHILL LIMITED, a company incorporated in England and Wales with registered number 05885234 whose registered office is at Willow House East, Shrewsbury Business Park, Shrewsbury, England, SY2 6LG (the "Supplier"); and (2) {entityName}{companyRegNumber ? `, registered number ${companyRegNumber}` : ''}{registeredOffice ? `, whose registered office is at ${registeredOffice}` : ''} (the "Customer"). Together referred to as the "Parties".
        </Text>

        {/* Schedule 1 — Scope */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Schedule 1 — Scope of Work</Text>
        </View>
        {phases.length > 0 ? (
          phases.map((phase, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY }}>
                {phase.label}{phase.title ? `: ${phase.title}` : ''}{phase.duration ? `  (${phase.duration})` : ''}{phase.price ? `  — ${phase.price.startsWith('£') ? phase.price : `£${phase.price}`}` : ''}
              </Text>
              {phase.tasks.filter(Boolean).map((task, j) => (
                <Text key={j} style={{ fontSize: 8, color: MID, paddingLeft: 12 }}>• {task}</Text>
              ))}
            </View>
          ))
        ) : scopeOfWorkText ? (
          scopeOfWorkText.split(/\n\n+/).map((para, i) => (
            <Text key={i} style={[styles.sectionBody, { marginBottom: 6 }]}>{para}</Text>
          ))
        ) : (
          <Text style={styles.sectionBody}>{programmeTitle} — services as described in the Supplier's Proposal.</Text>
        )}

        {/* Schedule 2 — Charges */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Schedule 2 — Charges and Payment Terms</Text>
        </View>

        {/* SaaS pricing — replaces traditional pricing when SaaS option selected */}
        {pricingOption === 'saas' && saasConfig && saasConfig.tiers.length > 0 ? (() => {
          const tiers = saasConfig.tiers;
          const totalContract = tiers.reduce((s, t) => s + t.monthly_price * t.duration_months, 0);
          return (
            <>
              <View style={styles.tableRow}>
                <Text style={[styles.tableDesc, { fontFamily: 'Helvetica-Bold' }]}>Shoothill as a Service — Subscription Pricing</Text>
                <Text style={styles.tableAmt} />
              </View>
              {tiers.map((tier, i) => (
                <View key={i}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableDesc, { paddingLeft: 14 }]}>{tier.label} ({tier.duration_months} months @ {fmt(tier.monthly_price)}/mo)</Text>
                    <Text style={styles.tableAmt}>{fmt(tier.monthly_price * tier.duration_months)} + VAT</Text>
                  </View>
                </View>
              ))}
              <View style={styles.tableRowBold}>
                <Text style={styles.tableDescBold}>Total Contract Value</Text>
                <Text style={styles.tableAmtBold}>{fmt(totalContract)} + VAT</Text>
              </View>
            </>
          );
        })() : (
          <>
        {/* Upfront items */}
        {upfrontItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableDesc}>{item.name || item.type}{item.discount_note ? ` (${item.discount_note})` : ''}</Text>
            <Text style={styles.tableAmt}>{fmt(item.discounted_price ?? item.price)} + VAT</Text>
          </View>
        ))}
        {upfrontItems.length > 0 && (
          <View style={styles.tableRowBold}>
            <Text style={styles.tableDescBold}>One-Time Project Total</Text>
            <Text style={styles.tableAmtBold}>{fmt(upfrontTotal)} + VAT</Text>
          </View>
        )}

        {/* Ad-hoc ongoing options — per-year cost breakdown */}
        {ongoingOptions && ongoingOptions.length > 0 && (() => {
          const getTotal = (opt: { yearlyCosts: number[]; term: number; frequency: string }) => {
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
          const fixedOpts = ongoingOptions.filter(o => !o.rolling_monthly);
          const rollingOpts = ongoingOptions.filter(o => o.rolling_monthly);
          const fixedTotal = fixedOpts.reduce((s, o) => s + getTotal(o), 0);
          const rollingMonthlyTotal = rollingOpts.reduce((s, o) => s + (o.yearlyCosts[0] ?? 0), 0);
          return (
            <>
              {/* Fixed-term items */}
              {fixedOpts.length > 0 && (() => {
                const yearSubtotals = contractYearSubtotals ?? [];
                const isMultiYear = yearSubtotals.length > 1;
                return (
                <>
                  <View style={{ height: 6 }} />
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableDesc, { fontFamily: 'Helvetica-Bold', fontSize: 9 }]}>{isMultiYear ? 'Fixed-Term Commitments' : 'Annual Commitments'}</Text>
                    <Text style={styles.tableAmt} />
                  </View>
                  {fixedOpts.map((opt, i) => {
                    const numYears = Math.ceil(Math.max(opt.term, 1) / 12);
                    const costs = Array.from({ length: numYears }, (_, y) =>
                      opt.yearlyCosts[y] ?? (opt.yearlyCosts[opt.yearlyCosts.length - 1] ?? 0)
                    );
                    const freqLabel = opt.frequency === 'annual' ? '/yr' : opt.frequency === 'weekly' ? '/wk' : '/mo';
                    const startYear = Math.floor((opt.starts_after_months ?? 0) / 12) + 1;
                    const baseLabel = opt.name || `Ongoing Option ${i + 1}`;
                    const label = opt.discount_note ? `${baseLabel} (${opt.discount_note})` : baseLabel;
                    return (
                      <View key={`fixed-${i}`}>
                        {numYears > 1 ? (
                          <>
                            <View style={styles.tableRow}>
                              <Text style={[styles.tableDesc, { fontFamily: 'Helvetica-Bold' }]}>{label} ({opt.term} months)</Text>
                              <Text style={styles.tableAmt} />
                            </View>
                            {costs.map((cost, y) => (
                              <View key={y} style={styles.tableRow}>
                                <Text style={[styles.tableDesc, { paddingLeft: 14 }]}>Year {startYear + y}</Text>
                                <Text style={styles.tableAmt}>{fmt(cost)} + VAT{freqLabel}</Text>
                              </View>
                            ))}
                          </>
                        ) : (
                          <View style={styles.tableRow}>
                            <Text style={styles.tableDesc}>Year {startYear} — {label} ({opt.term} months)</Text>
                            <Text style={styles.tableAmt}>{fmt(costs[0])} + VAT{freqLabel}</Text>
                          </View>
                        )}
                        <View style={styles.tableRowBoldQuiet}>
                          <Text style={styles.tableDescBold}>{label} Total</Text>
                          <Text style={styles.tableAmtBold}>{fmt(getTotal(opt))} + VAT</Text>
                        </View>
                      </View>
                    );
                  })}
                  {isMultiYear && (
                    <>
                      <View style={{ height: 4 }} />
                      {yearSubtotals.map((subtotal, y) => (
                        <View key={`year-sub-${y}`} style={styles.tableRowBoldQuiet}>
                          <Text style={styles.tableDescBold}>Year {y + 1} Subtotal</Text>
                          <Text style={styles.tableAmtBold}>{fmt(subtotal)} + VAT</Text>
                        </View>
                      ))}
                    </>
                  )}
                  <View style={styles.tableRowBold}>
                    <Text style={styles.tableDescBold}>{isMultiYear ? 'Total Fixed-Term Commitment' : 'Annual Commitments Total'}</Text>
                    <Text style={styles.tableAmtBold}>{fmt(fixedTotal)} + VAT</Text>
                  </View>
                </>
                );
              })()}

              {/* Monthly rolling items */}
              {rollingOpts.length > 0 && (
                <>
                  <View style={{ height: 10 }} />
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableDesc, { fontFamily: 'Helvetica-Bold', fontSize: 9 }]}>Monthly Rolling ({rollingOpts[0]?.notice_days ?? 30} days notice)</Text>
                    <Text style={styles.tableAmt} />
                  </View>
                  {rollingOpts.map((opt, i) => {
                    const freqLabel = opt.frequency === 'annual' ? '/yr' : opt.frequency === 'weekly' ? '/wk' : '/mo';
                    const baseLabel = opt.name || `Ongoing Option ${i + 1}`;
                    const label = opt.discount_note ? `${baseLabel} (${opt.discount_note})` : baseLabel;
                    return (
                      <View key={`rolling-${i}`} style={styles.tableRow}>
                        <Text style={styles.tableDesc}>{label}</Text>
                        <Text style={styles.tableAmt}>{fmt(opt.yearlyCosts[0] ?? 0)} + VAT{freqLabel}</Text>
                      </View>
                    );
                  })}
                  <View style={{ height: 2 }} />
                  <View style={styles.tableRowBold}>
                    <Text style={styles.tableDescBold}>Monthly Rolling Total</Text>
                    <Text style={styles.tableAmtBold}>{fmt(rollingMonthlyTotal)} + VAT/mo</Text>
                  </View>
                </>
              )}

              <View style={{ height: 6 }} />
              <View style={styles.tableRowBold}>
                <Text style={styles.tableDescBold}>Grand Total</Text>
                <Text style={styles.tableAmtBold}>{fmt(firstYearTotal)} + VAT</Text>
              </View>
            </>
          );
        })()}

        {/* Proposal ongoing options (retainer) — shown when no ongoingOptions prop */}
        {(!ongoingOptions || ongoingOptions.length === 0) && (coreOptions.length > 0 || selectedStandard || selectedExtras.length > 0) && (
          <>
            <View style={{ height: 6 }} />
            {coreOptions.map((core, i) => (
              <View key={`core-${i}`} style={styles.tableRow}>
                <Text style={styles.tableDesc}>{core.name || core.type} /month{core.rolling_monthly ? ' (Monthly rolling)' : core.term_months ? ` (${core.term_months} months${core.starts_after_months ? ', begins after project delivery' : ''})` : ''}</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(core))} + VAT/month</Text>
              </View>
            ))}
            {selectedStandard && (
              <View style={styles.tableRow}>
                <Text style={styles.tableDesc}>{selectedStandard.name || selectedStandard.type} /month{selectedStandard.rolling_monthly ? ' (Monthly rolling)' : selectedStandard.term_months ? ` (${selectedStandard.term_months} months${selectedStandard.starts_after_months ? ', begins after project delivery' : ''})` : ''}</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(selectedStandard))} + VAT/month</Text>
              </View>
            )}
            {selectedExtras.map((extra, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableDesc}>{extra.name || extra.type} /month{extra.rolling_monthly ? ' (Monthly rolling)' : extra.term_months ? ` (${extra.term_months} months${extra.starts_after_months ? ', begins after project delivery' : ''})` : ''}</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(extra))} + VAT/month</Text>
              </View>
            ))}
            <View style={styles.tableRowBold}>
              <Text style={styles.tableDescBold}>Monthly Support Total</Text>
              <Text style={styles.tableAmtBold}>{fmt(monthlyTotal)} + VAT/month</Text>
            </View>
            <View style={{ height: 4 }} />
            <View style={styles.tableRowBold}>
              <Text style={styles.tableDescBold}>Grand Total</Text>
              <Text style={styles.tableAmtBold}>{fmt(firstYearTotal)} + VAT</Text>
            </View>
          </>
        )}
          </>
        )}

        {paymentTerms ? (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: BG }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Payment Terms</Text>
            <Text style={{ fontSize: 9, color: '#222222' }}>{paymentTerms}</Text>
          </View>
        ) : null}

        {/* Template sections (legal clauses) */}
        {templateSections.map((section, i) => (
          <View key={i} wrap={false} style={{ marginTop: 2 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Additional Terms and Conditions — numbered as next schedule after template-supplied schedules */}
        {additionalTermsText ? (() => {
          const scheduleNumbers = templateSections
            .map(s => s.heading.match(/^Schedule\s+(\d+)/i)?.[1])
            .filter((n): n is string => !!n)
            .map(n => parseInt(n, 10));
          const nextNumber = scheduleNumbers.length > 0 ? Math.max(...scheduleNumbers) + 1 : 3;
          return (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeading}>Schedule {nextNumber} — Additional Terms and Conditions</Text>
              </View>
              {additionalTermsText.split(/\n\n+/).map((para, i) => (
                <Text key={i} style={[styles.sectionBody, { marginBottom: 6 }]}>{para}</Text>
              ))}
            </>
          );
        })() : null}

        {/* Execution block */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Execution</Text>
        </View>
        <Text style={{ fontSize: 9, color: '#222222', marginBottom: 10 }}>
          IN WITNESS WHEREOF the parties have signed this Agreement on {signingDate || agreementDate}.
        </Text>
        <View style={styles.execRow}>
          {/* Shoothill side — always pre-filled */}
          <View style={styles.execCol}>
            <Text style={styles.execLabel}>For Shoothill Limited</Text>
            {/* Signature image or electronic placeholder */}
            <View style={{ backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#DDE8EE', height: 52, marginBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
              {SIMON_SIGNATURE_URI ? (
                <Image src={SIMON_SIGNATURE_URI} style={{ height: 44, width: 160 }} />
              ) : (
                <Text style={{ fontSize: 7, color: '#CCCCCC' }}>Electronic signature</Text>
              )}
            </View>
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#DDE8EE', paddingTop: 5 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 }}>Simon Jeavons</Text>
              <Text style={{ fontSize: 8, color: MID, marginBottom: 2 }}>Group Managing Director</Text>
              <Text style={{ fontSize: 7, color: LIGHT }}>Shoothill Limited</Text>
              {signingDate ? (
                <Text style={{ fontSize: 7, color: LIGHT, marginTop: 2 }}>{signingDate}</Text>
              ) : null}
            </View>
          </View>
          {/* Client side — filled at signing time */}
          <View style={styles.execCol}>
            <Text style={styles.execLabel}>For {entityName}</Text>
            {clientSignatureUri ? (
              <>
                <View style={{ backgroundColor: '#F4F7FA', borderWidth: 0.5, borderColor: '#DDE8EE', height: 52, marginBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
                  <Image src={clientSignatureUri} style={{ height: 44, width: 160 }} />
                </View>
                <View style={{ borderTopWidth: 0.5, borderTopColor: '#DDE8EE', paddingTop: 5 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 }}>{clientSignerName}</Text>
                  {clientSignerTitle ? (
                    <Text style={{ fontSize: 8, color: MID, marginBottom: 2 }}>{clientSignerTitle}</Text>
                  ) : null}
                  <Text style={{ fontSize: 7, color: LIGHT }}>{entityName}</Text>
                  {signingDate ? (
                    <Text style={{ fontSize: 7, color: LIGHT, marginTop: 2 }}>{signingDate}</Text>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <View style={styles.execLine}><Text style={styles.execLineLabel}>Authorised Signatory</Text></View>
                <View style={styles.execLine}><Text style={styles.execLineLabel}>Print Name</Text></View>
                <View style={styles.execLine}><Text style={styles.execLineLabel}>Job Title</Text></View>
                <View style={styles.execLine}><Text style={styles.execLineLabel}>Date</Text></View>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Shoothill Ltd · {contactName} · {contactEmail}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
