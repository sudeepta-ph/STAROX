import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type { PmxExecutionTask } from "../pmxStore";
import { loadStaroxLogoDataUri, STAROX_BRAND_COLOR_RGB } from "./brand";

// ══════════════════════════════════════════════════════════════════════════════
// Execution task list → PDF. Used by PmxExecution.tsx's "Export PDF" button.
// Call generateTasksPdfBlob(title, tasks) directly to get a Blob.
// ══════════════════════════════════════════════════════════════════════════════

const MARGIN = 32;
const LOGO_SIZE = 20;
const HEADER_TOP = 18;
const HEADER_RULE_Y = HEADER_TOP + LOGO_SIZE + 6;
const DOC_TITLE_Y = HEADER_RULE_Y + 20;
const TABLE_START_Y = DOC_TITLE_Y + 16;

const COLUMNS = ["Title", "Type", "Priority", "Status", "Time Estimate", "Assignee"];

// Same status IDs/order/labels as the board columns in pages/pmx/PmxExecution.tsx.
const STATUS_GROUPS: Array<{ id: PmxExecutionTask["status"]; label: string }> = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "In Review" },
  { id: "done", label: "Completed" },
];

function statusLabel(status: string): string {
  return STATUS_GROUPS.find(g => g.id === status)?.label ?? status;
}

function sectionHeaderRow(label: string, count: number): RowInput {
  return [
    {
      content: `${label} (${count})`,
      colSpan: COLUMNS.length,
      styles: { fontStyle: "bold", fillColor: [230, 230, 236], textColor: [30, 30, 30], halign: "left" },
    },
  ];
}

// Draws the shared STAROX letterhead — logo, wordmark, and brand-color rule
// — used identically across every generated PDF (see PmxDocumentPdf.tsx).
function drawHeader(doc: jsPDF, logoDataUri: string, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.addImage(logoDataUri, "PNG", MARGIN, HEADER_TOP, LOGO_SIZE, LOGO_SIZE);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...STAROX_BRAND_COLOR_RGB);
  doc.text("STAROX", MARGIN + LOGO_SIZE + 8, HEADER_TOP + LOGO_SIZE / 2 + 4);

  doc.setDrawColor(...STAROX_BRAND_COLOR_RGB);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, HEADER_RULE_Y, pageWidth - MARGIN, HEADER_RULE_Y);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(title, MARGIN, DOC_TITLE_Y);
}

// jsPDF itself is synchronous, but drawing the shared logo requires loading
// its bytes first (jsPDF's addImage can't fetch a URL the way
// @react-pdf/renderer's <Image> can) — see brand.ts's loadStaroxLogoDataUri.
export async function generateTasksPdfBlob(title: string, tasks: PmxExecutionTask[]): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const logoDataUri = await loadStaroxLogoDataUri();
  drawHeader(doc, logoDataUri, title);

  const body: RowInput[] = [];
  for (const group of STATUS_GROUPS) {
    const groupTasks = tasks.filter(t => t.status === group.id);
    if (groupTasks.length === 0) continue;

    body.push(sectionHeaderRow(group.label, groupTasks.length));
    for (const t of groupTasks) {
      body.push([
        t.title,
        t.type,
        t.priority,
        statusLabel(t.status),
        t.timeEstimate || "",
        t.assignee || "",
      ]);
    }
  }

  autoTable(doc, {
    startY: TABLE_START_Y,
    head: [COLUMNS],
    body,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: "auto" } },
  });

  return doc.output("blob");
}
