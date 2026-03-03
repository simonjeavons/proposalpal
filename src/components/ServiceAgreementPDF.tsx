import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Phase, RetainerOption, UpfrontItem } from '@/types/proposal';

interface TemplateSection {
  heading: string;
  body: string;
}

export interface ServiceAgreementPDFProps {
  // Dynamic — from proposal + customer selections
  clientName: string;
  organisation: string;
  programmeTitle: string;
  agreementDate: string;
  phases: Phase[];
  upfrontItems: UpfrontItem[];
  selectedStandard: RetainerOption | null;
  selectedExtras: RetainerOption[];
  upfrontTotal: number;
  monthlyTotal: number;
  firstYearTotal: number;
  paymentTerms: string;
  contactName: string;
  contactEmail: string;
  // Static — from chosen template
  templateSections: TemplateSection[];
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
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 56,
    paddingRight: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
  },
  headerSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
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

const optionTotal = (r: RetainerOption) => (r.quantity ?? 1) * r.price;

export function ServiceAgreementPDF({
  clientName,
  organisation,
  programmeTitle,
  agreementDate,
  phases,
  upfrontItems,
  selectedStandard,
  selectedExtras,
  upfrontTotal,
  monthlyTotal,
  firstYearTotal,
  paymentTerms,
  contactName,
  contactEmail,
  templateSections,
}: ServiceAgreementPDFProps) {
  const entityName = organisation || clientName;

  return (
    <Document title={`Service Agreement — ${entityName}`} author="Shoothill Limited">
      <Page size="A4" style={styles.page}>
        {/* Fixed header */}
        <View style={styles.headerBar} fixed>
          <Text style={styles.headerTitle}>SHOOTHILL LIMITED</Text>
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
          This Agreement is made between: (1) SHOOTHILL LIMITED, a company incorporated in England and Wales with registered number 05885234 whose registered office is at Willow House East, Shrewsbury Business Park, Shrewsbury, England, SY2 6LG (the "Supplier"); and (2) {entityName} (the "Customer"). Together referred to as the "Parties".
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
        ) : (
          <Text style={styles.sectionBody}>{programmeTitle} — services as described in the Supplier's Proposal.</Text>
        )}

        {/* Schedule 2 — Charges */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Schedule 2 — Charges and Payment Terms</Text>
        </View>

        {/* Upfront items */}
        {upfrontItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableDesc}>{item.name || item.type}</Text>
            <Text style={styles.tableAmt}>{fmt(item.price)} + VAT</Text>
          </View>
        ))}
        {upfrontItems.length > 0 && (
          <View style={styles.tableRowBold}>
            <Text style={styles.tableDescBold}>One-Time Project Total</Text>
            <Text style={styles.tableAmtBold}>{fmt(upfrontTotal)} + VAT</Text>
          </View>
        )}

        {/* Monthly — shown if any ongoing items are present */}
        {(selectedStandard || selectedExtras.length > 0) && (
          <>
            <View style={{ height: 6 }} />
            {selectedStandard && (
              <View style={styles.tableRow}>
                <Text style={styles.tableDesc}>{selectedStandard.name || selectedStandard.type} /month</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(selectedStandard))} + VAT/month</Text>
              </View>
            )}
            {selectedExtras.map((extra, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableDesc}>{extra.name || extra.type} /month</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(extra))} + VAT/month</Text>
              </View>
            ))}
            <View style={styles.tableRowBold}>
              <Text style={styles.tableDescBold}>Monthly Support Total</Text>
              <Text style={styles.tableAmtBold}>{fmt(monthlyTotal)} + VAT/month</Text>
            </View>
            <View style={{ height: 4 }} />
            <View style={styles.tableRowBold}>
              <Text style={styles.tableDescBold}>First Year Total</Text>
              <Text style={styles.tableAmtBold}>{fmt(firstYearTotal)} + VAT</Text>
            </View>
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

        {/* Execution block */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Execution</Text>
        </View>
        <Text style={{ fontSize: 9, color: '#222222', marginBottom: 10 }}>
          IN WITNESS WHEREOF the parties have signed this Agreement on {agreementDate}.
        </Text>
        <View style={styles.execRow}>
          <View style={styles.execCol}>
            <Text style={styles.execLabel}>For Shoothill Limited</Text>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Authorised Signatory</Text></View>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Print Name</Text></View>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Date</Text></View>
          </View>
          <View style={styles.execCol}>
            <Text style={styles.execLabel}>For {entityName}</Text>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Authorised Signatory</Text></View>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Print Name</Text></View>
            <View style={styles.execLine}><Text style={styles.execLineLabel}>Date</Text></View>
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
