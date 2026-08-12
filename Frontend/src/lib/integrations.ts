/**
 * Starox 1 integrations — exactly the 5 sources defined in the spec:
 *
 * USER BEHAVIOR:  PostHog · Mixpanel · Google Analytics 4
 * USER VOICE:     Slack · Discord
 *
 * All other integrations (GitHub, Jira, Vercel, Notion, Intercom, Zendesk)
 * have been removed — they are not part of Starox 1's data model.
 */
import { onSnapshot, collection, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";

export type IntegrationId =
  | "posthog"
  | "mixpanel"
  | "google_analytics"
  | "slack"
  | "discord";

export interface Integration {
  id: IntegrationId;
  connectedAt: string;
  // PostHog
  posthogHost?: string;
  posthogProjectId?: string;
  // Mixpanel
  mixpanelProjectId?: string;
  // Google Analytics 4
  gaEmail?: string;
  gaPropertyId?: string;
  // Slack
  slackWorkspace?: string;
  slackChannel?: string;
  // Discord
  discordServer?: string;
  discordChannel?: string;
}

export const ALL_INTEGRATION_IDS: IntegrationId[] = [
  "posthog",
  "mixpanel",
  "google_analytics",
  "slack",
  "discord",
];

const emptyConnected = (): Record<IntegrationId, Integration | null> =>
  Object.fromEntries(ALL_INTEGRATION_IDS.map((id) => [id, null])) as Record<IntegrationId, Integration | null>;

export function subscribeIntegrations(
  userId: string,
  callback: (integrations: Record<IntegrationId, Integration | null>) => void
): Unsubscribe {
  const ref = collection(db, "users", userId, "integrations");
  return onSnapshot(ref, (snap) => {
    const result = emptyConnected();
    snap.forEach((d) => {
      const id = d.id as IntegrationId;
      if (ALL_INTEGRATION_IDS.includes(id)) {
        result[id] = d.data() as Integration;
      }
    });
    callback(result);
  });
}
