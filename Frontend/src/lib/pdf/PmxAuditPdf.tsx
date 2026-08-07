import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { STAROX_LOGO_URL, STAROX_BRAND_COLOR } from "./brand";

// ══════════════════════════════════════════════════════════════════════════════
// PDF renderer for UI Audit reports (pages/pmx/PmxAnalysis.tsx's "Download
// Report" button). A separate renderer from PmxDocumentPdf.tsx rather than
// reusing it — audit data is structured (score, severity counts, per-
// screenshot groups with embedded images), not a markdown document, so the
// markdown-section splitter/classifier there doesn't apply here. Shares the
// same brand.ts header (logo + accent color) so every generated PDF still
// looks like it came from one product.
//
// This file deliberately does NOT import PmxAnalysis.tsx's own UIIssue/
// IssueGroup types (a lib shouldn't depend on a page component) — the props
// below are a structurally-compatible shape, and the caller passes its
// already-computed issueGroups/previewImages straight through, so the PDF's
// grouping is always identical to what's on screen rather than recomputed
// separately here.
// ══════════════════════════════════════════════════════════════════════════════

export type AuditSeverity = "critical" | "high" | "medium" | "low";

export interface AuditPdfIssue {
  id: string;
  title: string;
  severity: AuditSeverity;
  screen: string;
  category: string;
  problem: string;
  change: string;
  improvement: string;
}

export interface AuditPdfGroup {
  key: string;
  screenshotIndex: number | null;
  issues: AuditPdfIssue[];
}

export interface AuditPdfScreenshot {
  dataUrl: string;
  label: string;
}

const SEVERITY_LABEL: Record<AuditSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_COLOR: Record<AuditSeverity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#38bdf8",
};

// Same thresholds as PmxAnalysis.tsx's scoreLabel/scoreColor, kept in sync
// by hand (a lib file importing from a page component would be backwards).
function scoreLabel(s: number): string {
  return s >= 80 ? "Good" : s >= 60 ? "Needs Work" : s >= 40 ? "Poor" : "Critical Issues";
}
function scoreColor(s: number): string {
  return s >= 75 ? "#16a34a" : s >= 50 ? "#ca8a04" : "#dc2626";
}

function severityCounts(issues: AuditPdfIssue[]): Record<AuditSeverity, number> {
  return {
    critical: issues.filter(i => i.severity === "critical").length,
    high: issues.filter(i => i.severity === "high").length,
    medium: issues.filter(i => i.severity === "medium").length,
    low: issues.filter(i => i.severity === "low").length,
  };
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: `2px solid ${STAROX_BRAND_COLOR}`,
  },
  logo: { width: 22, height: 22, marginRight: 8 },
  brandWordmark: { fontSize: 11, fontFamily: "Helvetica-Bold", color: STAROX_BRAND_COLOR, letterSpacing: 1 },

  reportHeader: { marginBottom: 20 },
  docTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  summary: { fontSize: 10, color: "#555555", lineHeight: 1.5, marginBottom: 10 },
  scoreRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  scoreBox: { fontSize: 22, fontFamily: "Helvetica-Bold", marginRight: 10 },
  scoreOutOf: { fontSize: 10, color: "#888888" },
  statusBadge: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  severityRow: { flexDirection: "row", flexWrap: "wrap" },
  severityPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    border: "1px solid #dddddd",
    marginRight: 6,
  },
  severityDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  severityText: { fontSize: 8, fontFamily: "Helvetica-Bold" },

  group: { marginBottom: 18 },
  groupHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  groupThumb: { width: 70, height: 50, objectFit: "cover", borderRadius: 4, border: "1px solid #dddddd", marginRight: 10 },
  groupThumbPlaceholder: { width: 70, height: 50, borderRadius: 4, backgroundColor: "#f0f0f0", marginRight: 10 },
  groupTitle: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  groupMeta: { fontSize: 8, color: "#888888", marginTop: 2 },

  issue: { marginBottom: 10, paddingLeft: 8, borderLeft: "2px solid #eeeeee" },
  issueTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  issueTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", flex: 1 },
  issueMeta: { fontSize: 8, color: "#888888", marginBottom: 4 },
  issueLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#888888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  issueText: { fontSize: 9.5, lineHeight: 1.4, color: "#333333", marginBottom: 4 },
});

// ── Block renderers ────────────────────────────────────────────────────────────
function SeverityPill({ severity, count }: { severity: AuditSeverity; count: number }) {
  if (!count) return null;
  return (
    <View style={styles.severityPill}>
      <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[severity] }]} />
      <Text style={styles.severityText}>{count} {SEVERITY_LABEL[severity]}</Text>
    </View>
  );
}

function IssueBlock({ issue, index }: { issue: AuditPdfIssue; index: number }) {
  return (
    <View style={styles.issue} wrap={false}>
      <View style={styles.issueTitleRow}>
        <Text style={styles.issueTitle}>{index + 1}. {issue.title}</Text>
        <View style={[styles.severityPill, { marginRight: 0, marginLeft: 6 }]}>
          <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[issue.severity] }]} />
          <Text style={styles.severityText}>{SEVERITY_LABEL[issue.severity]}</Text>
        </View>
      </View>
      <Text style={styles.issueMeta}>{issue.screen} · {issue.category}</Text>
      <Text style={styles.issueLabel}>Problem</Text>
      <Text style={styles.issueText}>{issue.problem}</Text>
      <Text style={styles.issueLabel}>What to change</Text>
      <Text style={styles.issueText}>{issue.change}</Text>
      <Text style={styles.issueLabel}>Expected improvement</Text>
      <Text style={styles.issueText}>{issue.improvement}</Text>
    </View>
  );
}

function GroupSection({ group, thumbnail }: { group: AuditPdfGroup; thumbnail?: AuditPdfScreenshot }) {
  const isGeneral = group.screenshotIndex === null;
  const heading = isGeneral
    ? "General / Cross-screen"
    : thumbnail?.label || group.issues[0]?.screen || `Screenshot ${group.screenshotIndex! + 1}`;

  return (
    <View style={styles.group} wrap>
      <View style={styles.groupHeaderRow}>
        {thumbnail
          ? <Image src={thumbnail.dataUrl} style={styles.groupThumb} />
          : <View style={styles.groupThumbPlaceholder} />}
        <View>
          <Text style={styles.groupTitle}>{heading}</Text>
          <Text style={styles.groupMeta}>{group.issues.length} issue{group.issues.length !== 1 ? "s" : ""}</Text>
        </View>
      </View>
      {group.issues.map((issue, i) => <IssueBlock key={issue.id} issue={issue} index={i} />)}
    </View>
  );
}

// ── Public component ────────────────────────────────────────────────────────────
export interface PmxAuditPdfProps {
  title: string;
  summary: string;
  overallScore: number;
  groups: AuditPdfGroup[];
  screenshots: AuditPdfScreenshot[]; // indexed by group.screenshotIndex
}

export function PmxAuditPdf({ title, summary, overallScore, groups, screenshots }: PmxAuditPdfProps) {
  const counts = severityCounts(groups.flatMap(g => g.issues));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Image src={STAROX_LOGO_URL} style={styles.logo} />
          <Text style={styles.brandWordmark}>STAROX</Text>
        </View>

        <View style={styles.reportHeader}>
          <Text style={styles.docTitle}>{title}</Text>
          {summary ? <Text style={styles.summary}>{summary}</Text> : null}
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreBox, { color: scoreColor(overallScore) }]}>
              {overallScore}<Text style={styles.scoreOutOf}> /100</Text>
            </Text>
            <Text style={[styles.statusBadge, { color: scoreColor(overallScore) }]}>{scoreLabel(overallScore)}</Text>
          </View>
          <View style={styles.severityRow}>
            <SeverityPill severity="critical" count={counts.critical} />
            <SeverityPill severity="high" count={counts.high} />
            <SeverityPill severity="medium" count={counts.medium} />
            <SeverityPill severity="low" count={counts.low} />
          </View>
        </View>

        {groups.map(group => (
          <GroupSection
            key={group.key}
            group={group}
            thumbnail={group.screenshotIndex !== null ? screenshots[group.screenshotIndex] : undefined}
          />
        ))}
      </Page>
    </Document>
  );
}

// ── Blob generator ────────────────────────────────────────────────────────────
export async function generateAuditPdfBlob(
  title: string,
  summary: string,
  overallScore: number,
  groups: AuditPdfGroup[],
  screenshots: AuditPdfScreenshot[]
): Promise<Blob> {
  return pdf(<PmxAuditPdf title={title} summary={summary} overallScore={overallScore} groups={groups} screenshots={screenshots} />).toBlob();
}
