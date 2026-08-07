import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { STAROX_LOGO_URL, STAROX_BRAND_COLOR } from "./brand";

// ══════════════════════════════════════════════════════════════════════════════
// Shared PDF renderer for PMX markdown documents (PRDs, artifacts, etc) —
// used by PrdWorkspace.tsx's PDF export and PmxArtifacts.tsx's "Download
// File" for markdown-format artifacts. Call generatePdfBlob(title, markdown)
// to get a Blob.
// ══════════════════════════════════════════════════════════════════════════════

// ── Section splitting ─────────────────────────────────────────────────────────
// Mirrors components/pmx/PrdWorkspace.tsx's splitSections() exactly (same
// regex) so a PRD's PDF always has the same section boundaries as what the
// reader sees on the PRD workspace page. Duplicated rather than imported —
// this lib file shouldn't depend on a page component, and the split is a
// single line of logic to keep in sync.
interface DocSection {
  title: string;
  body: string;
}

function splitIntoSections(markdown: string): DocSection[] {
  if (!markdown) return [];
  const chunks = markdown.split(/\n(?=##\s)/g).map(s => s.trim()).filter(Boolean);
  return chunks.map(raw => {
    const headingMatch = raw.match(/^##\s+(.+)/);
    if (!headingMatch) return { title: "Section", body: raw };
    return {
      title: headingMatch[1].trim(),
      body: raw.slice(headingMatch[0].length).trim(),
    };
  });
}

// ── Body block classification ─────────────────────────────────────────────────
// react-markdown only exposes a React-element tree (via remark→rehype), not
// a react-pdf-usable primitive tree, so there's nothing there to reuse
// directly for this renderer. unified/remark-parse *are* present in
// node_modules (pulled in transitively by react-markdown/remark-gfm), but
// they aren't declared dependencies of this project — importing them
// directly would be relying on an implementation detail that could vanish
// on a future dependency bump. Instead this does a small, self-contained
// line-based classification of paragraph / list / table blocks, which
// covers the AI-generated PRD markdown this renders in practice. Good
// enough for v1; a real remark AST walk can replace this later if needed.
type Block =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] };

const BULLET_LINE = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/;
const TABLE_SEPARATOR_LINE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(cell => stripInlineMarkdown(cell.trim()));
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();
}

function classifyBlock(block: string): Block {
  const lines = block.split("\n").map(l => l.trimEnd()).filter(l => l.trim().length > 0);

  // GFM table: a header row followed by a "---|---" separator row.
  if (lines.length >= 2 && lines[0].includes("|") && TABLE_SEPARATOR_LINE.test(lines[1])) {
    const header = splitCells(lines[0]);
    const rows = lines.slice(2).map(splitCells);
    return { type: "table", header, rows };
  }

  // Bullet/numbered list: every non-empty line matches the bullet pattern.
  if (lines.length > 0 && lines.every(l => BULLET_LINE.test(l))) {
    const items = lines.map(l => stripInlineMarkdown(l.match(BULLET_LINE)![1]));
    return { type: "list", items };
  }

  return { type: "paragraph", text: stripInlineMarkdown(lines.join(" ")) };
}

function blocksForBody(body: string): Block[] {
  if (!body) return [];
  return body
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(classifyBlock);
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
  logo: {
    width: 22,
    height: 22,
    marginRight: 8,
  },
  brandWordmark: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: STAROX_BRAND_COLOR,
    letterSpacing: 1,
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
    color: "#333333",
  },
  list: {
    marginBottom: 6,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  listBullet: {
    width: 12,
    fontSize: 10,
    color: "#333333",
  },
  listItemText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    color: "#333333",
  },
  table: {
    marginBottom: 6,
    border: "1px solid #dddddd",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableRowBorder: {
    borderTop: "1px solid #dddddd",
  },
  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 9,
    color: "#333333",
    borderLeft: "1px solid #dddddd",
  },
  tableCellFirst: {
    borderLeft: "none",
  },
  tableHeaderRow: {
    backgroundColor: "#f0f0f0",
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
});

// ── Block renderers ────────────────────────────────────────────────────────────
function ParagraphBlock({ text }: { text: string }) {
  return <Text style={styles.paragraph}>{text}</Text>;
}

function ListBlock({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={styles.listBullet}>{"•"}</Text>
          <Text style={styles.listItemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function TableBlock({ header, rows }: { header: string[]; rows: string[][] }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeaderRow]}>
        {header.map((cell, i) => (
          <Text
            key={i}
            style={[styles.tableCell, styles.tableHeaderCell, i === 0 ? styles.tableCellFirst : undefined]}
          >
            {cell}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={[styles.tableRow, styles.tableRowBorder]}>
          {row.map((cell, c) => (
            <Text key={c} style={[styles.tableCell, c === 0 ? styles.tableCellFirst : undefined]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function DocumentSection({ section }: { section: DocSection }) {
  const blocks = blocksForBody(section.body);
  return (
    <View style={styles.section} wrap>
      <Text style={styles.heading}>{section.title}</Text>
      {blocks.map((block, i) => {
        if (block.type === "list") return <ListBlock key={i} items={block.items} />;
        if (block.type === "table") return <TableBlock key={i} header={block.header} rows={block.rows} />;
        return <ParagraphBlock key={i} text={block.text} />;
      })}
    </View>
  );
}

// ── Public component ────────────────────────────────────────────────────────────
export interface PmxDocumentPdfProps {
  title: string;
  markdown: string;
}

export function PmxDocumentPdf({ title, markdown }: PmxDocumentPdfProps) {
  const sections = splitIntoSections(markdown);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Image src={STAROX_LOGO_URL} style={styles.logo} />
          <Text style={styles.brandWordmark}>STAROX</Text>
        </View>
        <Text style={styles.docTitle}>{title}</Text>
        {sections.map((section, i) => (
          <DocumentSection key={i} section={section} />
        ))}
      </Page>
    </Document>
  );
}

// ── Blob generator ────────────────────────────────────────────────────────────
export async function generatePdfBlob(title: string, markdown: string): Promise<Blob> {
  return pdf(<PmxDocumentPdf title={title} markdown={markdown} />).toBlob();
}
