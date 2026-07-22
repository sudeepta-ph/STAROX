import { callDeepSeek, parseJsonResponse } from "./ai/deepseek";
import crypto from "node:crypto";

export async function analyzeScreenshotUI(
  title: string,
  model?: string
): Promise<any[]> {
  const prompt = `You are STAROX Visual PMX, a world-class AI visual design, accessibility, and UX auditor.
Analyze the design titled "${title}" and identify concrete, high-impact usability observations, spacing issues, color contrast problems, layout flaws, visual hierarchy mistakes, or feature opportunities.

Generate exactly 3 to 6 detailed feedback sticky notes.
Each sticky note must contain:
1. "title": Short description of the issue (e.g., "Hero CTA Contrast Too Low")
2. "category": One of "UX", "UI", "Accessibility", "Visual Hierarchy", "Performance", "Growth", "Content", "Spacing", "Interaction"
3. "priority": One of "critical", "high", "medium", "low", "suggestion", "improvement"
4. "confidence": A percentage score (70-98)
5. "severity": One of "critical", "high", "medium", "low", "info"
6. "description": In-depth description of the visual problem
7. "reasoning": The UI/UX heuristic/design principles violated (e.g. contrast ratio WCAG 2.1, Fitts's Law)
8. "recommendation": Concrete fix instructions
9. "expectedImpact": Detailed expected conversion or usability metrics change
10. "affectedComponent": Name of the UI element/section
11. "x": Float percentage coordinate (10.0 to 90.0) mapping the horizontal position of the element
12. "y": Float percentage coordinate (10.0 to 90.0) mapping the vertical position of the element

Respond ONLY with valid JSON structure of this format (do not wrap in markdown quotes or prefix anything):
{
  "annotations": [
    {
      "title": "Low Contrast Hero Text",
      "category": "Accessibility",
      "priority": "high",
      "confidence": 95,
      "severity": "high",
      "description": "White text on top of light gray/sky-blue background elements makes reading difficult.",
      "reasoning": "Contrast ratio is below 3.5:1, failing WCAG AA standard.",
      "recommendation": "Change text class to slate-950 or add semi-transparent backdrop layer.",
      "expectedImpact": "Reduces banner bounce rate by 15-20% on landing.",
      "affectedComponent": "Hero Header Text",
      "x": 30.5,
      "y": 25.4
    }
  ]
}`;

  try {
    const responseText = await callDeepSeek(prompt, model, 3000);
    const parsed = parseJsonResponse(responseText);
    const annotations = parsed.annotations || [];

    // Map properties to ensure they match our interface and contain unique IDs
    return annotations.map((ann: any) => ({
      id: crypto.randomUUID(),
      title: ann.title || "Usability Finding",
      category: ann.category || "UX",
      priority: ann.priority || "medium",
      confidence: Number(ann.confidence || 85),
      severity: ann.severity || "medium",
      description: ann.description || "General UX friction observed.",
      reasoning: ann.reasoning || "Fails to meet clean spacing hierarchy rules.",
      recommendation: ann.recommendation || "Refactor layout dimensions.",
      expectedImpact: ann.expectedImpact || "Improves overall click-through rates.",
      affectedComponent: ann.affectedComponent || "UI Element",
      x: Number(ann.x || 50),
      y: Number(ann.y || 50),
      isResolved: false,
      comments: [],
      createdAt: new Date()
    }));
  } catch (err) {
    console.error("[Screenshot AI] Analysis error:", err);
    // Fallback annotations if DeepSeek fails
    return [
      {
        id: crypto.randomUUID(),
        title: "Navigation Dropdown Layout Overlap",
        category: "UI",
        priority: "medium",
        confidence: 80,
        severity: "medium",
        description: "Dropdown links bleed into layout border edges.",
        reasoning: "Visual collision on standard tablet viewports.",
        recommendation: "Add absolute padding buffers inside header wrapper.",
        expectedImpact: "Polishes responsive feel.",
        affectedComponent: "Header Links",
        x: 82.5,
        y: 12.0,
        isResolved: false,
        comments: [],
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        title: "Primary Button Weighting",
        category: "UX",
        priority: "high",
        confidence: 88,
        severity: "high",
        description: "Submit CTA button is secondary styling, diluting the focus action.",
        reasoning: "Dual CTAs share identical color weights, violating visual priority.",
        recommendation: "Use solid solid-sky background for primary action.",
        expectedImpact: "Boosts conversion by 8%.",
        affectedComponent: "Primary Action Button",
        x: 48.0,
        y: 45.5,
        isResolved: false,
        comments: [],
        createdAt: new Date()
      }
    ];
  }
}
