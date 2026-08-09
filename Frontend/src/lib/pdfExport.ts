import jsPDF from "jspdf";
import type { Starox2Output, PageScreenshot, Starox1Output, S1PageScreenshot } from "./store";
import { checkAndConsume } from "./usageLimit";
import { useAuthStore } from "./authStore";

// ══════════════════════════════════════════════════════════════════════════════
// PMX DEVELOPMENT PRD EXPORT — renders the live markdown DOM node to a
// paginated PDF via jsPDF's html() plugin (bundles html2canvas internally).
// Unlike the hand-drawn STAROX reports above, this content is an
// AI-authored markdown document of arbitrary length/structure, so we
// capture the already-rendered HTML rather than redrawing every element.
// ══════════════════════════════════════════════════════════════════════════════
export async function exportPrdPDF(el: HTMLElement, filename: string): Promise<void> {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 24;

  await new Promise<void>((resolve, reject) => {
    pdf.html(el, {
      callback: (doc) => { doc.save(filename); resolve(); },
      x: margin,
      y: margin,
      width: pageWidth - margin * 2,
      windowWidth: el.scrollWidth || 800,
      autoPaging: "text",
      html2canvas: { scale: 0.55, useCORS: true, backgroundColor: "#0a0a0f" },
    }).catch(reject);
  });
}

// ── Shared palette ─────────────────────────────────────────────────────────────
const PRIMARY  = [59, 130, 246]  as const;
const ACCENT   = [168, 85, 247]  as const;
const DARK     = [15, 15, 20]    as const;
const LIGHT    = [240, 240, 245] as const;
const MUTED    = [120, 120, 140] as const;
const GREEN    = [34, 197, 94]   as const;
const AMBER    = [245, 158, 11]  as const;
const RED      = [239, 68, 68]   as const;
const PURPLE   = [168, 85, 247]  as const;

const SEV_COLOR: Record<string, [number, number, number]> = {
  critical: [239, 68, 68],
  high:     [249, 115, 22],
  medium:   [245, 158, 11],
  low:      [148, 163, 184],
};

const TYPE_COLOR: Record<string, [number, number, number]> = {
  problem: [239, 68, 68],
  feature: [34, 197, 94],
  market:  [59, 130, 246],
  insight: [168, 85, 247],
};

// ── Shared helpers ─────────────────────────────────────────────────────────────
function checkPage(doc: jsPDF, y: number, pageH: number, needed = 20): number {
  if (y > pageH - needed) { doc.addPage(); return 30; }
  return y;
}

function newPage(doc: jsPDF, pageW: number, pageH: number): void {
  doc.addPage();
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, pageH, "F");
}

function sectionBar(doc: jsPDF, text: string, y: number, color: readonly [number, number, number] = PRIMARY): number {
  doc.setFillColor(...color);
  doc.rect(14, y, 3, 6, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LIGHT);
  doc.text(text, 20, y + 5);
  return y + 13;
}

function pill(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  bg: readonly [number, number, number],
  accent: readonly [number, number, number],
  title: string,
  body: string,
  contentW: number
): number {
  doc.setFillColor(...bg);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 3, h, 1, 1, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LIGHT);
  doc.text(title, x + 6, y + 6);
  if (body) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(body, contentW - 10);
    doc.text(lines.slice(0, 2), x + 6, y + 12);
  }
  return y + h + 4;
}

async function checkUsage(): Promise<void> {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) return;
  try {
    const status = await checkAndConsume(uid, "pdf");
    if (status.exceeded) throw new Error(`You've used all ${status.limit} free PDF exports. Upgrade to continue.`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("free PDF")) throw e;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STAROX-2 PDF EXPORT
// ══════════════════════════════════════════════════════════════════════════════
function s2Header(doc: jsPDF, title: string, subtitle: string, pageW: number) {
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFontSize(11); doc.setTextColor(...PRIMARY); doc.setFont("helvetica", "bold");
  doc.text("STAROX-2", 14, 14);
  doc.setFontSize(9); doc.setTextColor(...MUTED); doc.setFont("helvetica", "normal");
  doc.text("Experience & Improvement Report", 14, 20);
  doc.setFontSize(10); doc.setTextColor(...LIGHT); doc.setFont("helvetica", "bold");
  doc.text(title, pageW / 2, 14, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
  doc.text(subtitle, pageW / 2, 20, { align: "center" });
}

export async function exportStarox2PDF(
  analysis: Starox2Output,
  screenshots: PageScreenshot[],
  websiteUrl: string
): Promise<void> {
  await checkUsage();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 30;

  // Cover
  doc.setFillColor(...DARK); doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(...PRIMARY); doc.roundedRect(margin, 40, 40, 12, 3, 3, "F");
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("STAROX-2", margin + 5, 48);
  doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
  doc.text("Experience &", margin, 80); doc.text("Improvement Report", margin, 92);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
  doc.text(websiteUrl, margin, 105);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 113);
  if (analysis.uxSummary) {
    doc.setFillColor(30, 30, 40); doc.roundedRect(margin, 125, contentW, 30, 4, 4, "F");
    doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text("UX SUMMARY", margin + 5, 133);
    doc.setFontSize(9); doc.setTextColor(...LIGHT);
    doc.text(doc.splitTextToSize(analysis.uxSummary, contentW - 10).slice(0, 3), margin + 5, 140);
  }
  const stats = [
    { label: "UX Issues", value: String(analysis.uxIssues?.length ?? 0) },
    { label: "Enhancements", value: String(analysis.featureEnhancements?.length ?? 0) },
    { label: "Journey Fixes", value: String(analysis.userJourneyOptimizations?.length ?? 0) },
    { label: "Screenshots", value: String(screenshots.length) },
  ];
  const statW = contentW / stats.length;
  stats.forEach((s, i) => {
    const sx = margin + i * statW;
    doc.setFillColor(25, 25, 35); doc.roundedRect(sx, 165, statW - 3, 20, 3, 3, "F");
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...PRIMARY);
    doc.text(s.value, sx + statW / 2 - 1.5, 176, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
    doc.text(s.label, sx + statW / 2 - 1.5, 182, { align: "center" });
  });

  // Screenshots
  for (const shot of screenshots) {
    newPage(doc, pageW, pageH);
    s2Header(doc, "Annotated Screenshot", new URL(shot.url).pathname || "/", pageW);
    y = 30;
    const imgH = Math.min(100, (contentW * 9) / 16);
    try { doc.addImage(shot.dataUrl, "PNG", margin, y, contentW, imgH); }
    catch { doc.setFillColor(30, 30, 40); doc.rect(margin, y, contentW, imgH, "F"); }
    shot.annotations.forEach((ann, i) => {
      const ax = margin + (ann.x / 100) * contentW;
      const ay = y + (ann.y / 100) * imgH;
      const [r, g, b] = SEV_COLOR[ann.severity] ?? SEV_COLOR.medium;
      doc.setFillColor(r, g, b); doc.circle(ax, ay, 3, "F");
      doc.setFontSize(6); doc.setTextColor(255, 255, 255); doc.text(String(i + 1), ax - 1.5, ay + 2);
    });
    y += imgH + 8;
    for (const ann of shot.annotations) {
      y = checkPage(doc, y, pageH, 20);
      const [r, g, b] = SEV_COLOR[ann.severity] ?? SEV_COLOR.medium;
      doc.setFillColor(r, g, b); doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
      doc.text(ann.label, margin + 3, y + 5);
      doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(ann.recommendation, contentW - 6)[0] ?? "", margin + 3, y + 11);
      y += 17;
    }
  }

  // UX Issues
  newPage(doc, pageW, pageH);
  s2Header(doc, "UX Issues", `${analysis.uxIssues?.length ?? 0} issues identified`, pageW);
  y = 30; y = sectionBar(doc, "UX Issues", y);
  for (const issue of analysis.uxIssues ?? []) {
    y = checkPage(doc, y, pageH, 32);
    const [r, g, b] = SEV_COLOR[issue.severity] ?? SEV_COLOR.medium;
    doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 28, 3, 3, "F");
    doc.setFillColor(r, g, b); doc.roundedRect(margin, y, 3, 28, 1, 1, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
    doc.text(issue.issue, margin + 6, y + 7);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
    doc.text(`${issue.area} · ${issue.severity.toUpperCase()} · ${issue.complexity} effort`, margin + 6, y + 13);
    doc.setTextColor(180, 180, 200);
    doc.text(doc.splitTextToSize(issue.recommendation, contentW - 10).slice(0, 2), margin + 6, y + 20);
    y += 32;
  }

  // Feature Enhancements + Journey Optimizations
  if ((analysis.featureEnhancements?.length ?? 0) + (analysis.userJourneyOptimizations?.length ?? 0) > 0) {
    newPage(doc, pageW, pageH);
    s2Header(doc, "Enhancements & Journey", "", pageW);
    y = 30;
    if (analysis.featureEnhancements?.length) {
      y = sectionBar(doc, "Feature Enhancements", y);
      for (const f of analysis.featureEnhancements) {
        y = checkPage(doc, y, pageH, 30);
        doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 26, 3, 3, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
        doc.text(f.feature, margin + 5, y + 7);
        doc.setFontSize(7); doc.setFont("helvetica", "normal");
        doc.setTextColor(...RED); doc.text(`Now: ${f.currentState}`, margin + 5, y + 14);
        doc.setTextColor(...GREEN); doc.text(`Fix: ${f.improvement}`, margin + 5, y + 21);
        y += 30;
      }
    }
    if (analysis.userJourneyOptimizations?.length) {
      y = checkPage(doc, y + 4, pageH, 40);
      y = sectionBar(doc, "User Journey Optimizations", y);
      for (const j of analysis.userJourneyOptimizations) {
        y = checkPage(doc, y, pageH, 30);
        doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 26, 3, 3, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
        doc.text(j.flow, margin + 5, y + 7);
        doc.setFontSize(7); doc.setFont("helvetica", "normal");
        doc.setTextColor(...RED); doc.text(`Problem: ${j.problem}`, margin + 5, y + 14);
        doc.setTextColor(...GREEN); doc.text(`Solution: ${j.solution}`, margin + 5, y + 21);
        y += 30;
      }
    }
  }

  // Impact Forecast
  if (analysis.conversionPrediction) {
    y = checkPage(doc, y + 5, pageH, 60);
    y = sectionBar(doc, "Impact Forecast", y);
    const pred = analysis.conversionPrediction;
    const metrics = [
      { label: "Conversion Rate", val: pred.conversionRateChange },
      { label: "Bounce Rate", val: pred.bounceRateChange },
      { label: "Session Duration", val: pred.sessionDurationChange },
      { label: "Revenue Impact", val: pred.revenueImpact },
    ];
    const mW = contentW / 2 - 3;
    metrics.forEach((m, i) => {
      const mx = margin + (i % 2) * (mW + 6);
      const my = y + Math.floor(i / 2) * 22;
      doc.setFillColor(25, 25, 35); doc.roundedRect(mx, my, mW, 18, 3, 3, "F");
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.setTextColor(...(m.val >= 0 ? PRIMARY : ACCENT));
      doc.text(`${m.val >= 0 ? "+" : ""}${m.val}%`, mx + mW / 2, my + 10, { align: "center" });
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
      doc.text(m.label, mx + mW / 2, my + 16, { align: "center" });
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p); doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text(`Page ${p} of ${totalPages}  ·  STAROX-2 Report  ·  ${websiteUrl}`, pageW / 2, pageH - 6, { align: "center" });
  }
  doc.save(`starox2-report-${new URL(websiteUrl).hostname}-${Date.now()}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// STAROX-1 PDF EXPORT — COMPREHENSIVE
// ══════════════════════════════════════════════════════════════════════════════
function s1Header(doc: jsPDF, title: string, subtitle: string, pageW: number) {
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFontSize(11); doc.setTextColor(...PRIMARY); doc.setFont("helvetica", "bold");
  doc.text("STAROX-1", 14, 14);
  doc.setFontSize(9); doc.setTextColor(...MUTED); doc.setFont("helvetica", "normal");
  doc.text("Product Intelligence Report", 14, 20);
  doc.setFontSize(10); doc.setTextColor(...LIGHT); doc.setFont("helvetica", "bold");
  doc.text(title, pageW / 2, 14, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
  doc.text(subtitle, pageW / 2, 20, { align: "center" });
}

export async function exportStarox1PDF(
  analysis: Starox1Output,
  screenshots: S1PageScreenshot[],
  websiteUrl: string
): Promise<void> {
  await checkUsage();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 30;

  // ── Cover page ──────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK); doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(...PRIMARY); doc.roundedRect(margin, 40, 42, 12, 3, 3, "F");
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("STAROX-1", margin + 5, 48);
  doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
  doc.text("Product Intelligence", margin, 80); doc.text("Report", margin, 92);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
  doc.text(websiteUrl, margin, 105);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 113);

  // Product summary box
  if (analysis.productSummary) {
    doc.setFillColor(30, 30, 40); doc.roundedRect(margin, 125, contentW, 35, 4, 4, "F");
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
    doc.text(analysis.productSummary.name ?? "", margin + 5, 136);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(analysis.productSummary.oneLiner ?? "", contentW - 10).slice(0, 2), margin + 5, 143);
    doc.setFontSize(8); doc.setTextColor(...PRIMARY);
    doc.text(`Stage: ${analysis.productSummary.stage?.toUpperCase() ?? ""}  ·  ${analysis.productSummary.category ?? ""}`, margin + 5, 155);
  }

  // Stats row
  const stats = [
    { label: "Problems", value: String(analysis.problemsIdentified?.length ?? 0) },
    { label: "P0 Features", value: String(analysis.featureRecommendations?.p0?.length ?? 0) },
    { label: "Target Users", value: String(analysis.targetUsers?.length ?? 0) },
    { label: "Screenshots", value: String(screenshots.length) },
  ];
  const statW = contentW / stats.length;
  stats.forEach((s, i) => {
    const sx = margin + i * statW;
    doc.setFillColor(25, 25, 35); doc.roundedRect(sx, 168, statW - 3, 20, 3, 3, "F");
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...PRIMARY);
    doc.text(s.value, sx + statW / 2 - 1.5, 179, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
    doc.text(s.label, sx + statW / 2 - 1.5, 185, { align: "center" });
  });

  // ── Key Insights ────────────────────────────────────────────────────────────
  if (analysis.keyInsights?.length) {
    newPage(doc, pageW, pageH);
    s1Header(doc, "Key Insights", `${analysis.keyInsights.length} insights`, pageW);
    y = 30; y = sectionBar(doc, "Key Insights", y);
    for (const ins of analysis.keyInsights) {
      y = checkPage(doc, y, pageH, 28);
      y = pill(doc, margin, y, contentW, 24, [25, 25, 35], PRIMARY, ins.insight, ins.interpretation, contentW);
    }
  }

  // ── Target Users ────────────────────────────────────────────────────────────
  if (analysis.targetUsers?.length) {
    y = checkPage(doc, y + 4, pageH, 40);
    y = sectionBar(doc, "Target Users", y);
    for (const u of analysis.targetUsers) {
      y = checkPage(doc, y, pageH, 22);
      doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 18, 3, 3, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
      doc.text(u.persona, margin + 5, y + 7);
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
      doc.text(`Pain: ${u.painPoint}`, margin + 5, y + 13);
      y += 22;
    }
  }

  // ── Annotated screenshots ────────────────────────────────────────────────────
  for (const shot of screenshots) {
    newPage(doc, pageW, pageH);
    s1Header(doc, "Page Analysis", new URL(shot.url).pathname || "/", pageW);
    y = 28;
    const imgH = Math.min(95, (contentW * 9) / 16);
    try { doc.addImage(shot.dataUrl, "PNG", margin, y, contentW, imgH); }
    catch { doc.setFillColor(30, 30, 40); doc.rect(margin, y, contentW, imgH, "F"); }
    shot.annotations.forEach((ann, i) => {
      const ax = margin + (ann.x / 100) * contentW;
      const ay = y + (ann.y / 100) * imgH;
      const [r, g, b] = TYPE_COLOR[ann.type] ?? TYPE_COLOR.insight;
      doc.setFillColor(r, g, b); doc.circle(ax, ay, 3.5, "F");
      doc.setFontSize(6); doc.setTextColor(255, 255, 255); doc.text(String(i + 1), ax - 1.5, ay + 2);
    });
    y += imgH + 8;
    for (const ann of shot.annotations) {
      y = checkPage(doc, y, pageH, 20);
      const [r, g, b] = TYPE_COLOR[ann.type] ?? TYPE_COLOR.insight;
      doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 16, 2, 2, "F");
      doc.setFillColor(r, g, b); doc.roundedRect(margin, y, 3, 16, 1, 1, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
      doc.text(ann.label, margin + 6, y + 6);
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize(ann.detail, contentW - 10)[0] ?? "", margin + 6, y + 12);
      y += 20;
    }
  }

  // ── Problems Identified ──────────────────────────────────────────────────────
  if (analysis.problemsIdentified?.length) {
    newPage(doc, pageW, pageH);
    s1Header(doc, "Problems Identified", `${analysis.problemsIdentified.length} issues`, pageW);
    y = 30; y = sectionBar(doc, "Problems Identified", y);
    for (const p of analysis.problemsIdentified) {
      y = checkPage(doc, y, pageH, 28);
      const [r, g, b] = SEV_COLOR[p.severity] ?? SEV_COLOR.medium;
      y = pill(doc, margin, y, contentW, 24, [25, 25, 35], [r, g, b], p.problem, p.impact, contentW);
    }
  }

  // ── Feature Recommendations (P0 / P1 / P2) ──────────────────────────────────
  newPage(doc, pageW, pageH);
  s1Header(doc, "Feature Recommendations", "Prioritized by P0 / P1 / P2", pageW);
  y = 30;
  const tiers = [
    { key: "p0" as const, label: "P0 — Must Have", color: RED },
    { key: "p1" as const, label: "P1 — Should Have", color: AMBER },
    { key: "p2" as const, label: "P2 — Nice to Have", color: MUTED },
  ];
  for (const tier of tiers) {
    const items = analysis.featureRecommendations?.[tier.key];
    if (!items?.length) continue;
    y = checkPage(doc, y, pageH, 30);
    y = sectionBar(doc, tier.label, y, tier.color);
    for (const f of items) {
      y = checkPage(doc, y, pageH, 26);
      y = pill(doc, margin, y, contentW, 22, [25, 25, 35], tier.color, f.feature, f.why, contentW);
    }
    y += 4;
  }

  // ── Execution Plan (decisions array) ─────────────────────────────────────────
  if (analysis.executionPlan?.decisions?.length) {
    newPage(doc, pageW, pageH);
    s1Header(doc, "Execution Plan", `${analysis.executionPlan.decisions.length} decisions`, pageW);
    y = 30; y = sectionBar(doc, "Execution Plan", y);
    for (const dec of analysis.executionPlan.decisions) {
      y = checkPage(doc, y, pageH, 40);
      const tierColor = dec.priority === "P0" ? RED : dec.priority === "P1" ? AMBER : MUTED;
      doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 32, 3, 3, "F");
      doc.setFillColor(...tierColor); doc.roundedRect(margin, y, 3, 32, 1, 1, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
      doc.text(dec.feature, margin + 6, y + 7);
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
      doc.text(`Priority: ${dec.priority}  ·  ${dec.tasks?.length ?? 0} tasks`, margin + 6, y + 13);
      doc.setTextColor(180, 180, 200);
      doc.text(doc.splitTextToSize(dec.problem, contentW - 10)[0] ?? "", margin + 6, y + 19);
      doc.setTextColor(...GREEN);
      doc.text(`Impact: ${dec.impact.slice(0, 80)}`, margin + 6, y + 26);
      y += 36;
    }
  }

  // ── Evidence Mapping ─────────────────────────────────────────────────────────
  if (analysis.evidenceMapping?.problemToEvidence?.length) {
    newPage(doc, pageW, pageH);
    s1Header(doc, "Evidence Mapping", "Problem → Evidence", pageW);
    y = 30; y = sectionBar(doc, "Evidence Mapping", y);
    for (const ev of analysis.evidenceMapping.problemToEvidence.slice(0, 10)) {
      y = checkPage(doc, y, pageH, 24);
      doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 20, 3, 3, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...LIGHT);
      doc.text(ev.problem, margin + 5, y + 6);
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...PRIMARY);
      doc.text(`Source: ${ev.evidenceSource}`, margin + 5, y + 12);
      doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize(ev.evidence.join(" | "), contentW - 10)[0] ?? "", margin + 5, y + 17);
      y += 24;
    }
  }

  // ── Market Analysis ──────────────────────────────────────────────────────────
  if (analysis.marketAnalysis) {
    y = checkPage(doc, y + 5, pageH, 60);
    y = sectionBar(doc, "Market Analysis", y);
    const ma = analysis.marketAnalysis;
    if (ma.marketSize) {
      doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 18, 3, 3, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED);
      doc.text("MARKET SIZE", margin + 5, y + 6);
      doc.setFontSize(9); doc.setTextColor(...LIGHT); doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(ma.marketSize, contentW - 10)[0] ?? "", margin + 5, y + 13);
      y += 22;
    }
    if (ma.competitors?.length) {
      y = checkPage(doc, y, pageH, 20);
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED);
      doc.text("COMPETITORS", margin, y); y += 5;
      for (const c of ma.competitors.slice(0, 5)) {
        y = checkPage(doc, y, pageH, 12);
        y = pill(doc, margin, y, contentW, 10, [25, 25, 35], PRIMARY, c.name, c.weakness, contentW);
      }
    }
  }

  // ── Roadmap ──────────────────────────────────────────────────────────────────
  if (analysis.roadmap) {
    newPage(doc, pageW, pageH);
    s1Header(doc, "Roadmap", "MVP → V1 → Scale", pageW);
    y = 30; y = sectionBar(doc, "Execution Roadmap", y);
    const phases = [
      { key: "mvp" as const, label: "MVP", color: GREEN },
      { key: "v1" as const, label: "V1", color: PRIMARY },
      { key: "scale" as const, label: "Scale", color: PURPLE },
    ];
    for (const phase of phases) {
      const p = analysis.roadmap[phase.key];
      if (!p) continue;
      y = checkPage(doc, y, pageH, 40);
      const blockH = 14 + (p.features?.length ?? 0) * 6;
      doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, blockH, 3, 3, "F");
      doc.setFillColor(...phase.color); doc.roundedRect(margin, y, 3, blockH, 1, 1, "F");
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...phase.color);
      doc.text(phase.label, margin + 6, y + 8);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
      doc.text(p.timeline ?? "", margin + 30, y + 8);
      let fy = y + 14;
      for (const feat of p.features ?? []) {
        doc.setFontSize(7); doc.setTextColor(180, 180, 200);
        doc.text(`• ${feat}`, margin + 6, fy); fy += 6;
      }
      doc.setFontSize(7); doc.setTextColor(...phase.color);
      doc.text(`✓ ${p.successMetric ?? ""}`, margin + 6, fy + 2);
      y += blockH + 8;
    }
  }

  // ── Strategic Insights ───────────────────────────────────────────────────────
  if (analysis.strategicInsights) {
    y = checkPage(doc, y + 5, pageH, 60);
    y = sectionBar(doc, "Strategic Insights", y);
    const si = analysis.strategicInsights;
    if (si.productDirection) {
      doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 18, 3, 3, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED);
      doc.text("PRODUCT DIRECTION", margin + 5, y + 6);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...LIGHT);
      doc.text(doc.splitTextToSize(si.productDirection, contentW - 10)[0] ?? "", margin + 5, y + 13);
      y += 22;
    }
    if (si.monetizationIdeas?.length) {
      y = checkPage(doc, y, pageH, 30);
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED);
      doc.text("MONETIZATION", margin, y); y += 5;
      for (const m of si.monetizationIdeas.slice(0, 4)) {
        y = checkPage(doc, y, pageH, 10);
        doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
        doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...GREEN);
        doc.text(`$ ${m}`, margin + 4, y + 7); y += 13;
      }
    }
    if (si.keyRisks?.length) {
      y = checkPage(doc, y + 3, pageH, 30);
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED);
      doc.text("KEY RISKS", margin, y); y += 5;
      for (const r of si.keyRisks.slice(0, 4)) {
        y = checkPage(doc, y, pageH, 10);
        doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
        doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...AMBER);
        doc.text(`⚠ ${r}`, margin + 4, y + 7); y += 13;
      }
    }
  }

  // ── Architecture Plan ────────────────────────────────────────────────────────
  if (analysis.architecturePlan) {
    newPage(doc, pageW, pageH);
    s1Header(doc, "Architecture Plan", "Recommended stack & modules", pageW);
    y = 30; y = sectionBar(doc, "Architecture Plan", y);
    const ap = analysis.architecturePlan;
    if (ap.recommendedStack) {
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED);
      doc.text("RECOMMENDED STACK", margin, y); y += 5;
      Object.entries(ap.recommendedStack).forEach(([key, val]) => {
        doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
        doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(...PRIMARY);
        doc.text(`${key}:`, margin + 4, y + 7);
        doc.setFont("helvetica", "normal"); doc.setTextColor(...LIGHT);
        doc.text(val, margin + 25, y + 7); y += 13;
      });
    }
    if (ap.modules?.length) {
      y = checkPage(doc, y + 3, pageH, 30);
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...MUTED);
      doc.text("MODULES", margin, y); y += 5;
      for (const m of ap.modules.slice(0, 8)) {
        y = checkPage(doc, y, pageH, 12);
        y = pill(doc, margin, y, contentW, 10, [25, 25, 35], PRIMARY, m.name, m.purpose, contentW);
      }
    }
  }

  // ── Strategic Takeaways ──────────────────────────────────────────────────────
  if (analysis.strategicTakeaways?.length) {
    y = checkPage(doc, y + 5, pageH, 40);
    y = sectionBar(doc, "Strategic Takeaways", y);
    for (const t of analysis.strategicTakeaways.slice(0, 8)) {
      y = checkPage(doc, y, pageH, 12);
      doc.setFillColor(25, 25, 35); doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...LIGHT);
      doc.text(doc.splitTextToSize(t, contentW - 8)[0] ?? "", margin + 4, y + 7);
      y += 13;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p); doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text(`Page ${p} of ${totalPages}  ·  STAROX-1 Report  ·  ${websiteUrl}`, pageW / 2, pageH - 6, { align: "center" });
  }
  doc.save(`starox1-report-${new URL(websiteUrl).hostname}-${Date.now()}.pdf`);
}
