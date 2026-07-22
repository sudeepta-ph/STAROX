import type { IntegrationId, Integration } from "./integrations";

export interface IntegrationSignals {
  id: IntegrationId;
  signals: string[];
}

export async function pullAllIntegrationSignals(
  connected: Partial<Record<IntegrationId, Integration | null>>
): Promise<IntegrationSignals[]> {
  const results: IntegrationSignals[] = [];

  for (const [id, integration] of Object.entries(connected) as [IntegrationId, Integration | null][]) {
    if (!integration) continue;

    const signals: string[] = [];

    switch (id) {
      case "posthog":
        signals.push(`PostHog connected (project: ${integration.posthogProjectId ?? "unknown"})`);
        signals.push("Event tracking active — behavior signals available");
        break;
      case "mixpanel":
        signals.push(`Mixpanel connected (project: ${integration.mixpanelProjectId ?? "unknown"})`);
        signals.push("User event pipeline active");
        break;
      case "google_analytics":
        signals.push(`Google Analytics 4 connected (property: ${integration.gaPropertyId ?? "unknown"})`);
        signals.push("Traffic and conversion data available");
        break;
      case "slack":
        signals.push(`Slack connected (workspace: ${integration.slackWorkspace ?? "unknown"}, channel: ${integration.slackChannel ?? "unknown"})`);
        signals.push("Team feedback signals available");
        break;
      case "discord":
        signals.push(`Discord connected (server: ${integration.discordServer ?? "unknown"}, channel: ${integration.discordChannel ?? "unknown"})`);
        signals.push("Community feedback signals available");
        break;
    }

    if (signals.length > 0) {
      results.push({ id, signals });
    }
  }

  return results;
}

export function formatSignalsForPrompt(signals: IntegrationSignals[]): string {
  if (signals.length === 0) return "";

  return signals
    .map(({ id, signals: s }) => `[${id.toUpperCase()}]\n${s.map(sig => `• ${sig}`).join("\n")}`)
    .join("\n\n");
}
