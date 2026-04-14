import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SHOOTHILL_LOGO_URI } from './ServiceAgreementPDF';
import { SHOOTHILL_WHITE_LOGO_URI } from './shoothillWhiteLogo';
import { DEFAULT_SAAS_SELLING_POINTS, type Proposal, type RetainerOption, type UpfrontItem } from '@/types/proposal';

const NAVY = '#043D5D';
const BLUE = '#009FE3';
const MID = '#3A6278';
const LIGHT = '#AAAAAA';
const BG = '#F4F7FA';
const BORDER = '#DDE8EE';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#222222',
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    backgroundColor: 'white',
  },
  coverPage: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#222222',
    backgroundColor: NAVY,
    padding: 0,
  },
  coverInner: {
    flex: 1,
    paddingHorizontal: 56,
    paddingTop: 80,
    paddingBottom: 56,
  },
  coverLogo: {
    width: 140,
    marginBottom: 60,
  },
  coverLabel: {
    fontSize: 9,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  coverTitle: {
    fontSize: 30,
    color: 'white',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    lineHeight: 1.15,
  },
  coverSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 48,
    lineHeight: 1.35,
  },
  coverMetaRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  coverMetaLabel: {
    fontSize: 8,
    width: 110,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Helvetica-Bold',
  },
  coverMetaValue: {
    fontSize: 10,
    color: 'white',
    flex: 1,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverFooterText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.55)',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    marginBottom: 18,
  },
  headerLogo: {
    width: 80,
  },
  headerSub: {
    fontSize: 8,
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionLabel: {
    fontSize: 8,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 14,
  },
  sectionBody: {
    fontSize: 10,
    color: '#333333',
    lineHeight: 1.55,
    marginBottom: 14,
  },
  challengeRow: {
    marginBottom: 14,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: BLUE,
  },
  challengeTitle: {
    fontSize: 11,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  challengeNum: {
    fontSize: 8,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  challengeDesc: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.55,
  },
  phaseBlock: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: BLUE,
  },
  phaseLabel: {
    fontSize: 8,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  phaseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  phaseTitle: {
    fontSize: 11,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
  },
  phaseDuration: {
    fontSize: 8,
    color: LIGHT,
  },
  phaseTask: {
    fontSize: 9,
    color: MID,
    paddingLeft: 10,
    marginTop: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableDesc: {
    flex: 1,
    fontSize: 9,
    color: '#222222',
    paddingRight: 12,
  },
  tableAmt: {
    width: 90,
    fontSize: 9,
    color: '#222222',
    textAlign: 'right',
  },
  tableDescBold: {
    flex: 1,
    fontSize: 10,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    paddingRight: 12,
  },
  tableAmtBold: {
    width: 90,
    fontSize: 10,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  subHead: {
    fontSize: 9,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: NAVY,
    padding: 14,
    marginTop: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.65)',
  },
  summaryValue: {
    fontSize: 10,
    color: 'white',
    fontFamily: 'Helvetica-Bold',
  },
  summaryDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    marginVertical: 6,
  },
  summaryTotalLabel: {
    fontSize: 10,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryTotalValue: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'Helvetica-Bold',
  },
  vatNote: {
    fontSize: 7,
    color: LIGHT,
    marginTop: 6,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 56,
    right: 56,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: LIGHT,
  },
  featureItem: {
    fontSize: 8,
    color: MID,
    paddingLeft: 10,
    marginTop: 1,
  },
  retainerBlock: {
    marginTop: 6,
    marginBottom: 8,
    padding: 10,
    backgroundColor: BG,
    borderLeftWidth: 2,
    borderLeftColor: BLUE,
  },
  retainerTitle: {
    fontSize: 10,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  retainerMeta: {
    fontSize: 8,
    color: LIGHT,
    marginBottom: 4,
  },
  optionDivider: {
    marginTop: 18,
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
  },
  optionLabel: {
    fontSize: 8,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  optionHeading: {
    fontSize: 13,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  optionIntro: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.45,
    marginBottom: 8,
  },
  saasTierBlock: {
    marginTop: 6,
    marginBottom: 8,
    padding: 10,
    backgroundColor: BG,
    borderLeftWidth: 2,
    borderLeftColor: BLUE,
  },
  saasTierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  saasTierLabel: {
    fontSize: 10,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
  },
  saasTierPrice: {
    fontSize: 10,
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
  },
  saasTierMeta: {
    fontSize: 8,
    color: LIGHT,
    marginBottom: 4,
  },
  sellingPointsBlock: {
    marginTop: 8,
    padding: 10,
    backgroundColor: BG,
  },
  sellingPointsHead: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sellingPointItem: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.45,
    paddingLeft: 10,
    marginTop: 1,
  },
});

const fmt = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Normalise text for @react-pdf: tab characters render with overlap artefacts
// in the Helvetica PDF font, and common typographic glyphs (curly quotes, en/em
// dashes, etc.) are already safe but leading bullet+tab patterns like "•\t"
// produce visible overlap on the first letter of each line.
const normalise = (s: string | undefined | null): string => {
  if (!s) return '';
  return s
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/ +/g, (m) => (m.length > 3 ? '   ' : m));
};

const fmtDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

export interface ProposalPDFProps {
  proposal: Proposal;
  selectedStandardOption: RetainerOption | null;
  selectedExtras: RetainerOption[];
  coreOptions: RetainerOption[];
  selectedOptionalUpfrontItems: UpfrontItem[];
  displayUpfrontTotal: number;
  annualOngoing: number;
  firstYearTotal: number;
  contractTotal: number;
  yearTotals: Array<{ year: number; total: number }>;
}

const effectivePrice = (r: { price: number; discounted_price?: number }) =>
  r.discounted_price ?? r.price;

const optionTotal = (r: RetainerOption) => (r.quantity ?? 1) * effectivePrice(r);

const optionContractTotal = (r: RetainerOption): number | null => {
  if (r.rolling_monthly || !r.term_months) return null;
  const freq = r.frequency ?? 'monthly';
  const periods = freq === 'annual' ? r.term_months / 12 : freq === 'weekly' ? r.term_months * 4.33 : r.term_months;
  return optionTotal(r) * periods;
};

const termLabel = (r: RetainerOption): string | null => {
  if (r.rolling_monthly) return `Monthly rolling · ${r.notice_days ?? 30} days notice`;
  if (!r.term_months) return null;
  const base = `${r.term_months}-month term`;
  return r.starts_after_months && r.starts_after_months > 0
    ? `${base} · begins after project delivery`
    : base;
};

const FREQ_SUFFIX: Record<string, string> = { weekly: '/week', monthly: '/month', annual: '/year' };

const PageFooter = ({ clientName }: { clientName: string }) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerText}>Shoothill Ltd · Prepared for {clientName}</Text>
    <Text
      style={styles.footerText}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
    />
  </View>
);

const PageHeader = () => (
  <View style={styles.headerBar} fixed>
    <Image src={SHOOTHILL_LOGO_URI} style={styles.headerLogo} />
    <Text style={styles.headerSub}>Programme Proposal</Text>
  </View>
);

export function ProposalPDF({
  proposal,
  selectedStandardOption,
  selectedExtras,
  coreOptions,
  selectedOptionalUpfrontItems,
  displayUpfrontTotal,
  annualOngoing,
  firstYearTotal,
  contractTotal,
  yearTotals,
}: ProposalPDFProps) {
  const allOngoing: RetainerOption[] = [
    ...coreOptions,
    ...(selectedStandardOption ? [selectedStandardOption] : []),
    ...selectedExtras,
  ];

  const baseUpfrontItems = (proposal.upfront_items || []).filter((it) => !(it as UpfrontItem).optional);
  const allUpfrontItems: UpfrontItem[] = [...baseUpfrontItems, ...selectedOptionalUpfrontItems];

  const isDual = proposal.pricing_model === 'dual' && !!proposal.saas_config && (proposal.saas_config.tiers?.length ?? 0) > 0;
  const saasTiers = proposal.saas_config?.tiers ?? [];
  const saasSellingPoints = (proposal.saas_config?.selling_points && proposal.saas_config.selling_points.length > 0)
    ? proposal.saas_config.selling_points
    : DEFAULT_SAAS_SELLING_POINTS;
  const saasIntro = proposal.saas_config?.custom_intro;

  // SaaS year-by-year breakdown: tiers run sequentially. Year 1 can be
  // partial if the first tier's duration is less than 12 months; years 2+
  // are always billed as full 12-month years whenever the subscription is
  // still active (matching the Option A rule).
  const saasTotalMonths = saasTiers.reduce((sum, t) => sum + (t.duration_months || 0), 0);
  const saasTotalYears = Math.min(Math.max(1, Math.ceil(saasTotalMonths / 12)), 5);
  const priceAtMonth = (m: number): number => {
    let acc = 0;
    for (const t of saasTiers) {
      const dur = t.duration_months || 0;
      if (m < acc + dur) return t.monthly_price || 0;
      acc += dur;
    }
    return 0;
  };
  const saasYearTotals = Array.from({ length: saasTotalYears }, (_, y) => {
    const yearStart = y * 12;
    const yearEnd = (y + 1) * 12;
    let total = 0;
    let anyActive = false;
    for (let m = yearStart; m < yearEnd; m += 1) {
      if (m < saasTotalMonths) {
        total += priceAtMonth(m);
        anyActive = true;
      } else if (y > 0 && anyActive) {
        // Round year 2+ up to a full 12 months at the last active price
        total += priceAtMonth(Math.max(0, saasTotalMonths - 1));
      }
    }
    return { year: y + 1, total };
  });
  const saasDisplayedContractTotal = saasYearTotals.reduce((s, y) => s + y.total, 0);

  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverInner}>
          <Image src={SHOOTHILL_WHITE_LOGO_URI} style={styles.coverLogo} />
          <Text style={styles.coverLabel}>Programme Proposal</Text>
          <Text style={styles.coverTitle}>{proposal.programme_title || 'Programme Proposal'}</Text>
          <Text style={styles.coverSubtitle}>Prepared for {proposal.client_name}</Text>

          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Organisation</Text>
            <Text style={styles.coverMetaValue}>{proposal.organisation || '—'}</Text>
          </View>
          {proposal.sector ? (
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Sector</Text>
              <Text style={styles.coverMetaValue}>{proposal.sector}</Text>
            </View>
          ) : null}
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Prepared by</Text>
            <Text style={styles.coverMetaValue}>{proposal.prepared_by || '—'}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Proposal date</Text>
            <Text style={styles.coverMetaValue}>{fmtDate(proposal.proposal_date)}</Text>
          </View>
          {proposal.valid_until ? (
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Valid until</Text>
              <Text style={styles.coverMetaValue}>{fmtDate(proposal.valid_until)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>Shoothill Ltd</Text>
          <Text style={styles.coverFooterText}>shoothill.com</Text>
        </View>
      </Page>

      {/* Content page */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        {proposal.partnership_overview ? (
          <View>
            <Text style={styles.sectionLabel}>Overview</Text>
            <Text style={styles.sectionTitle}>Partnership overview</Text>
            <Text style={styles.sectionBody}>{normalise(proposal.partnership_overview)}</Text>
          </View>
        ) : null}

        {proposal.challenge_intro ? (
          <Text style={styles.sectionBody}>{normalise(proposal.challenge_intro)}</Text>
        ) : null}

        {(() => {
          const meaningfulChallenges = (proposal.challenges || []).filter(
            (c) => (c?.title || '').trim() || (c?.description || '').trim()
          );
          if (meaningfulChallenges.length === 0) return null;
          return (
            <View>
              <Text style={styles.sectionLabel}>Current state</Text>
              <Text style={styles.sectionTitle}>Challenges we'll address</Text>
              {meaningfulChallenges.map((c, i) => (
                <View key={i} style={styles.challengeRow}>
                  <Text style={styles.challengeNum}>Challenge {String(i + 1).padStart(2, '0')}</Text>
                  {c.title ? <Text style={styles.challengeTitle}>{normalise(c.title)}</Text> : null}
                  {c.description ? <Text style={styles.challengeDesc}>{normalise(c.description)}</Text> : null}
                </View>
              ))}
            </View>
          );
        })()}

        <PageFooter clientName={proposal.client_name} />
      </Page>

      {/* Phases page */}
      {proposal.phases && proposal.phases.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <PageHeader />
          <Text style={styles.sectionLabel}>Delivery</Text>
          <Text style={styles.sectionTitle}>Programme phases</Text>
          {proposal.phases.map((p, i) => {
            const tasks = (p.tasks || []).map((t) => normalise(t)).filter((t) => t.trim());
            return (
              <View key={i} style={styles.phaseBlock} break={i > 0 && tasks.length > 8}>
                <View wrap={false}>
                  {p.label ? <Text style={styles.phaseLabel}>{normalise(p.label)}</Text> : null}
                  <View style={styles.phaseTitleRow}>
                    <Text style={styles.phaseTitle}>{normalise(p.title)}</Text>
                    {!proposal.hide_phase_durations && p.duration ? (
                      <Text style={styles.phaseDuration}>{normalise(p.duration)}</Text>
                    ) : null}
                  </View>
                </View>
                {tasks.map((t, j) => (
                  <Text key={j} style={styles.phaseTask}>• {t.replace(/^[•·]\s*/, '')}</Text>
                ))}
              </View>
            );
          })}
          <PageFooter clientName={proposal.client_name} />
        </Page>
      ) : null}

      {/* Pricing page */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.sectionLabel}>Commercials</Text>
        <Text style={styles.sectionTitle}>Investment</Text>

        {isDual ? (
          <View>
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.optionLabel}>Option A</Text>
              <Text style={styles.optionHeading}>Managed SaaS subscription</Text>
              {saasIntro ? (
                <Text style={styles.optionIntro}>{normalise(saasIntro)}</Text>
              ) : (
                <Text style={styles.optionIntro}>
                  Development, hosting and ongoing support bundled into a single monthly subscription — no upfront build cost.
                </Text>
              )}
            </View>

            {saasTiers.map((tier, i) => {
              const tierTotal = (tier.monthly_price || 0) * (tier.duration_months || 0);
              return (
                <View key={i} style={styles.saasTierBlock} wrap={false}>
                  <View style={styles.saasTierHeaderRow}>
                    <Text style={styles.saasTierLabel}>{normalise(tier.label) || `Tier ${i + 1}`}</Text>
                    <Text style={styles.saasTierPrice}>{fmt(tier.monthly_price || 0)}/month</Text>
                  </View>
                  <Text style={styles.saasTierMeta}>
                    {tier.duration_months} month{tier.duration_months === 1 ? '' : 's'}
                    {tierTotal > 0 ? ` · ${fmt(tierTotal)} total` : ''}
                  </Text>
                  {tier.features && tier.features.length > 0 ? (
                    <View style={{ marginTop: 4 }}>
                      {tier.features.map((f, j) => (
                        <Text key={j} style={styles.featureItem}>• {normalise(f)}</Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={styles.summaryCard} wrap={false}>
              <Text style={[styles.summaryTotalLabel, { marginBottom: 8 }]}>Investment summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Upfront</Text>
                <Text style={styles.summaryValue}>£0.00</Text>
              </View>
              <View style={styles.summaryDivider} />
              {saasYearTotals.map((y) => (
                <View key={y.year} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Year {y.year}</Text>
                  <Text style={styles.summaryValue}>{fmt(y.total)}</Text>
                </View>
              ))}
              {saasYearTotals.length > 1 ? (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotalLabel}>Contract total</Text>
                    <Text style={styles.summaryTotalValue}>{fmt(saasDisplayedContractTotal)}</Text>
                  </View>
                </>
              ) : null}
              <Text style={styles.vatNote}>All figures exclude VAT. VAT will be added at the prevailing rate (currently 20%).</Text>
            </View>

            {saasSellingPoints.length > 0 ? (
              <View style={styles.sellingPointsBlock} wrap={false}>
                <Text style={styles.sellingPointsHead}>Why choose the SaaS option</Text>
                {saasSellingPoints.map((p, i) => (
                  <Text key={i} style={styles.sellingPointItem}>• {normalise(p)}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {isDual ? (
          <View style={{ marginBottom: 6 }} break>
            <Text style={styles.optionLabel}>Option B</Text>
            <Text style={styles.optionHeading}>Traditional build + hosting, support and maintenance</Text>
            <Text style={styles.optionIntro}>
              Upfront investment in the build, followed by ongoing hosting, support and maintenance.
            </Text>
          </View>
        ) : null}

        {allUpfrontItems.length > 0 ? (
          <View>
            <Text style={styles.subHead}>Upfront investment</Text>
            {allUpfrontItems.map((item, i) => {
              const price = item.discounted_price ?? item.price;
              return (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableDesc}>
                    {item.name}
                    {item.discount_note ? ` (${item.discount_note})` : ''}
                  </Text>
                  <Text style={styles.tableAmt}>{fmt(price)}</Text>
                </View>
              );
            })}
            <View style={styles.tableRow}>
              <Text style={styles.tableDescBold}>Upfront total</Text>
              <Text style={styles.tableAmtBold}>{fmt(displayUpfrontTotal)}</Text>
            </View>
          </View>
        ) : null}

        {allOngoing.length > 0 ? (
          <View>
            <Text style={styles.subHead}>Ongoing support</Text>
            {allOngoing.map((r, i) => {
              const ct = optionContractTotal(r);
              const tl = termLabel(r);
              const suffix = FREQ_SUFFIX[r.frequency ?? 'monthly'] ?? '/month';
              return (
                <View key={i} style={styles.retainerBlock} wrap={false}>
                  <Text style={styles.retainerTitle}>{r.name || r.type || 'Ongoing support'}</Text>
                  {tl ? <Text style={styles.retainerMeta}>{tl}{ct != null ? ` · ${fmt(ct)} total` : ''}</Text> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                    <Text style={{ fontSize: 9, color: MID }}>
                      {fmt(effectivePrice(r))}{suffix}
                      {r.quantity && r.quantity > 1 ? ` × ${r.quantity}` : ''}
                    </Text>
                    <Text style={{ fontSize: 9, color: NAVY, fontFamily: 'Helvetica-Bold' }}>
                      {fmt(optionTotal(r))}{suffix}
                    </Text>
                  </View>
                  {r.features && r.features.length > 0 ? (
                    <View style={{ marginTop: 4 }}>
                      {r.features.slice(0, 6).map((f, j) => (
                        <Text key={j} style={styles.featureItem}>• {f}</Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.summaryCard} wrap={false}>
          <Text style={[styles.summaryTotalLabel, { marginBottom: 8 }]}>Investment summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Upfront</Text>
            <Text style={styles.summaryValue}>{fmt(displayUpfrontTotal)}</Text>
          </View>
          {allOngoing.length > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Year 1 ongoing</Text>
              <Text style={styles.summaryValue}>{fmt(annualOngoing)}</Text>
            </View>
          ) : null}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Year 1 total</Text>
            <Text style={styles.summaryValue}>{fmt(firstYearTotal)}</Text>
          </View>
          {yearTotals.slice(1).map((y) => (
            <View key={y.year} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Year {y.year}</Text>
              <Text style={styles.summaryValue}>{fmt(y.total)}</Text>
            </View>
          ))}
          {yearTotals.length > 1 ? (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Contract total</Text>
                <Text style={styles.summaryTotalValue}>{fmt(contractTotal)}</Text>
              </View>
            </>
          ) : null}
          <Text style={styles.vatNote}>All figures exclude VAT. VAT will be added at the prevailing rate (currently 20%).</Text>
        </View>

        {proposal.payment_terms ? (
          <View style={{ marginTop: 14, padding: 10, backgroundColor: BG }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
              Payment terms
            </Text>
            <Text style={{ fontSize: 9, color: '#222222', lineHeight: 1.5 }}>{proposal.payment_terms}</Text>
          </View>
        ) : null}

        <PageFooter clientName={proposal.client_name} />
      </Page>
    </Document>
  );
}
