import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { SHOOTHILL_LOGO_URI } from "./ServiceAgreementPDF";
import type { OnboardingReportSection } from "@/types/onboarding";

export interface OnboardingReportPDFProps {
  organisation: string;
  serviceTypeName: string;
  contactName: string;
  preparedBy: string;
  reportDate: string;
  sections: OnboardingReportSection[];
}

const NAVY = "#043D5D";
const BLUE = "#009FE3";
const MID = "#3A6278";
const LIGHT = "#AAAAAA";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111111",
    paddingTop: 80,
    paddingBottom: 56,
    paddingLeft: 56,
    paddingRight: 56,
  },
  headerBar: {
    position: "absolute",
    top: 0, left: 0, right: 0, height: 60,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 56, paddingRight: 56,
    borderBottomWidth: 0.5, borderBottomColor: "#DDE8EE",
  },
  headerLogo: { height: 28, width: 105 },
  headerSub: { fontSize: 10, color: MID },
  accentStripe: {
    position: "absolute",
    top: 60, left: 0, right: 0, height: 3,
    backgroundColor: BLUE,
  },
  titleBlock: { marginBottom: 18 },
  titleText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 6,
  },
  meta: {
    fontSize: 9,
    color: MID,
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDE8EE",
    marginVertical: 14,
  },
  sectionHeader: {
    backgroundColor: "#E8F4FB",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  sectionBody: {
    fontSize: 10,
    color: "#222222",
    lineHeight: 1.5,
    marginBottom: 4,
  },
  sectionBodyBold: {
    fontFamily: "Helvetica-Bold",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
    color: MID,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: "#222222",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 56, right: 56,
    borderTopWidth: 0.5,
    borderTopColor: "#DDE8EE",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: LIGHT },
});

// Renders a body string, supporting **bold** segments and lines starting
// with `- ` as bullets. Keeps things simple — no full markdown engine.
function renderBody(body: string) {
  const lines = body.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      for (const item of items) {
        elements.push(
          <View key={`b-${elements.length}`} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{renderInline(item)}</Text>
          </View>
        );
      }
      continue;
    }
    if (line.trim() === "") {
      elements.push(<View key={`s-${elements.length}`} style={{ height: 4 }} />);
      i += 1;
      continue;
    }
    elements.push(
      <Text key={`p-${elements.length}`} style={styles.sectionBody}>
        {renderInline(line)}
      </Text>
    );
    i += 1;
  }
  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={idx} style={styles.sectionBodyBold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={idx}>{part}</Text>;
  });
}

export function OnboardingReportPDF({
  organisation,
  serviceTypeName,
  contactName,
  preparedBy,
  reportDate,
  sections,
}: OnboardingReportPDFProps) {
  return (
    <Document title={`Onboarding Report — ${organisation}`} author="Shoothill Limited">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} fixed>
          <Image src={SHOOTHILL_LOGO_URI} style={styles.headerLogo} />
          <Text style={styles.headerSub}>Onboarding Report</Text>
        </View>
        <View style={styles.accentStripe} fixed />

        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>Onboarding Report</Text>
          <Text style={styles.meta}>Prepared for: {organisation}</Text>
          <Text style={styles.meta}>Service: {serviceTypeName}</Text>
          {contactName && <Text style={styles.meta}>Contact: {contactName}</Text>}
          <Text style={styles.meta}>Prepared by: {preparedBy}</Text>
          <Text style={styles.meta}>Dated: {reportDate}</Text>
        </View>

        <View style={styles.divider} />

        {sections.map((section, idx) => (
          <View key={idx} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            </View>
            {renderBody(section.body)}
          </View>
        ))}

        <View
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => (
            <>
              <Text style={styles.footerText}>{organisation} — Onboarding Report</Text>
              <Text style={styles.footerText}>Page {pageNumber} of {totalPages}</Text>
            </>
          )}
        />
      </Page>
    </Document>
  );
}
