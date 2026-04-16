import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SHOOTHILL_LOGO_URI, SIMON_SIGNATURE_URI } from './ServiceAgreementPDF';

export interface NdaPDFProps {
  companyName: string;
  companyRegNumber?: string;
  registeredAddress: string; // pre-formatted comma-separated address
  purpose: string;
  confidentialityYears: number | null; // null = indefinite
  agreementDate: string; // formatted date string like "16 April 2026"
  templateSections: Array<{ heading: string; body: string }>;
  // Signature data (passed at signing time, optional for preview)
  clientSignerName?: string;
  clientSignerTitle?: string;
  clientSignatureUri?: string;
  signingDate?: string;
}

export function formatConfidentialityDuration(years: number | null): string {
  if (years === null) return 'an indefinite period';
  const words: Record<number, string> = { 2: 'two', 3: 'three', 5: 'five' };
  return `${words[years] || String(years)} (${years}) years`;
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
  // Title block
  titleBlock: {
    marginBottom: 16,
  },
  titleText: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 9,
    color: MID,
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
  partiesText: {
    fontSize: 9,
    color: '#222222',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  // Clause heading
  clauseHeading: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    marginBottom: 3,
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
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
    marginVertical: 8,
  },
});

export function NdaPDF({
  companyName,
  companyRegNumber,
  registeredAddress,
  purpose,
  confidentialityYears,
  agreementDate,
  templateSections,
  clientSignerName,
  clientSignerTitle,
  clientSignatureUri,
  signingDate,
}: NdaPDFProps) {
  const durationText = formatConfidentialityDuration(confidentialityYears);

  // Build party 2 description
  const party2Parts: string[] = [`2) ${companyName}`];
  if (companyRegNumber) {
    party2Parts.push(`incorporated and registered in England with company number ${companyRegNumber}`);
  }
  if (registeredAddress) {
    party2Parts.push(`whose registered office is at ${registeredAddress}`);
  }
  const party2Text = party2Parts.join(' ') + '.';

  return (
    <Document title={`Mutual Confidentiality Agreement — ${companyName}`} author="Shoothill Limited">
      <Page size="A4" style={styles.page}>
        {/* Fixed header */}
        <View style={styles.headerBar} fixed>
          <Image src={SHOOTHILL_LOGO_URI} style={styles.headerLogo} />
          <Text style={styles.headerSub}>Mutual Confidentiality Agreement</Text>
        </View>
        <View style={styles.accentStripe} fixed />

        {/* Top spacer to clear fixed header */}
        <View style={{ height: 20 }} />

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>MUTUAL CONFIDENTIALITY AGREEMENT</Text>
          <Text style={styles.dateText}>Dated: {agreementDate}</Text>
        </View>

        <View style={styles.divider} />

        {/* Parties */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Parties</Text>
        </View>
        <Text style={styles.partiesText}>
          1) SHOOTHILL LTD incorporated and registered in England with company number 5885234 whose registered office is at Willow House East, Shrewsbury Business Park, Shrewsbury SY2 6LG.
        </Text>
        <Text style={styles.partiesText}>{party2Text}</Text>

        {/* Background */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Background</Text>
        </View>
        <Text style={styles.sectionBody}>
          Each party wishes to disclose to the other party Confidential Information in relation to {purpose} (the "Purpose"). Each party wishes to ensure that the other party maintains the confidentiality of its Confidential Information. In consideration of the benefits to the parties of the disclosure of the Confidential Information, the parties have agreed to comply with the following terms in connection with the use and disclosure of Confidential Information.
        </Text>

        {/* Agreed Terms */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Agreed terms.</Text>
        </View>

        {templateSections.map((section, i) => (
          <View key={i} wrap={false} style={{ marginTop: 6 }}>
            <Text style={styles.clauseHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>
              {section.body.replace(/\{\{CONFIDENTIALITY_YEARS\}\}/g, durationText)}
            </Text>
          </View>
        ))}

        {/* Signing Block */}
        <View wrap={false} style={{ marginTop: 14 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Execution</Text>
          </View>
          <Text style={{ fontSize: 9, color: '#222222', marginBottom: 10 }}>
            This agreement has been entered on the date stated at the beginning of it.
          </Text>
          <View style={styles.execRow}>
            {/* Shoothill side — always pre-filled */}
            <View style={styles.execCol}>
              <Text style={styles.execLabel}>Signed for and on behalf of: Shoothill Ltd</Text>
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
              <Text style={styles.execLabel}>Signed for and on behalf of: {companyName}</Text>
              {clientSignatureUri ? (
                <>
                  <View style={{ backgroundColor: BG, borderWidth: 0.5, borderColor: '#DDE8EE', height: 52, marginBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
                    <Image src={clientSignatureUri} style={{ height: 44, width: 160 }} />
                  </View>
                  <View style={{ borderTopWidth: 0.5, borderTopColor: '#DDE8EE', paddingTop: 5 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 }}>{clientSignerName}</Text>
                    {clientSignerTitle ? (
                      <Text style={{ fontSize: 8, color: MID, marginBottom: 2 }}>{clientSignerTitle}</Text>
                    ) : null}
                    <Text style={{ fontSize: 7, color: LIGHT }}>{companyName}</Text>
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
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Shoothill Ltd · Mutual Confidentiality Agreement</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
