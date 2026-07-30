# Connectors — setup & status

The official PMX connector ecosystem is **11 connectors**:
GitHub, Google Analytics 4, Notion, Slack, Mixpanel, Amplitude, Microsoft
Clarity, Intercom, Stripe, HubSpot, Canny.

Two systems power this:

- **OAuth connectors** (GitHub, Google/GA4, Notion, Slack) — each lives in
  its own router: `backend/src/workspaces/pmx/routes/github.ts`, `google.ts`,
  `notion.ts`, `slack.ts`. Same shape for all four: sign-in popup → code
  exchange → token stored per user → the popup closes itself via
  `postMessage` back to the opener. Google additionally requests offline
  access so a refresh token is stored (access tokens are silently refreshed
  before every API call) and shows a property picker (backed by the GA4
  Admin API) after connecting; Slack does the same if the app has token
  rotation enabled. Slack's tokens are also encrypted at rest (see
  `backend/src/lib/tokenCrypto.ts`) and revoked server-side (Slack's
  `auth.revoke`) on disconnect. Each connector needs a registered OAuth
  app/client — see below.
- **Generic connector registry** — `backend/src/workspaces/pmx/routes/connectors.ts`.
  API-key / personal-access-token based. The user pastes their own
  credential into a modal on `/connectors`; the backend makes one real,
  minimal call to that provider's API to verify it before saving anything.
  No app registration needed on our side for these — nothing to configure
  in `.env`.

Nothing here is a mock. If a connector shows "Connected", a real API call
to that provider succeeded.

---

## ⚠️ Slack — code complete, needs real OAuth credentials

The Slack connector is fully implemented (routes, encrypted token storage,
live verification, revoke-on-disconnect, frontend wiring) but is **not
usable yet** — `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` in `backend/.env`
are empty. Until they're filled in, "Connect" on Slack will show "Slack
OAuth is not configured on the server." See the Slack section below for
exactly what's needed.

## ✅ 10 connectors — fully working, no action needed

### GitHub (OAuth)
Configured in `backend/.env`:
```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:8080/api/pmx/github/callback
```
If you deploy to production, add a **second** OAuth App (or update the
callback URL) pointing at your production API host — GitHub OAuth Apps only
accept one callback URL each.

### Google Analytics 4 (OAuth)
Configured in `backend/.env`:
```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8080/api/pmx/google/callback
```
The Google Cloud project behind this client needs the **Google Analytics
Admin API** and **Google Analytics Data API** enabled, and the OAuth
consent screen needs the `analytics.readonly` scope. Flow: "Connect" opens
a Google sign-in popup → on success PMX lists the user's GA4 properties via
the Admin API → the user picks one → that's what future analysis reads
from. Same production caveat as GitHub: register a second redirect URI (or
a second client) for your deployed API host.

### Notion (OAuth)
Configured in `backend/.env`:
```
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=http://localhost:8080/api/pmx/notion/callback
```
Needs a **public integration** registered at notion.so/my-integrations, with
the redirect URI above added under OAuth Domain & URIs. Flow: "Connect"
opens a Notion sign-in popup → the user picks which workspace and pages to
grant access to → on success PMX stores the access token (Notion tokens
don't expire, so there's no refresh step). Same production caveat as
GitHub/Google: register a second redirect URI for your deployed API host.

### Slack (OAuth) — needs credentials, see warning above
Configure in `backend/.env`:
```
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=http://localhost:8080/api/pmx/slack/callback
```
Get these from a Slack app at api.slack.com/apps → **Basic Information** →
App Credentials (Client ID / Client Secret), and add the redirect URI above
under **OAuth & Permissions** → Redirect URLs, exactly as it appears there.
The app's Bot Token Scopes need: `channels:read`, `channels:history`,
`channels:join`, `groups:read`, `groups:history`, `users:read`, `team:read`.

Flow: "Connect" opens a Slack sign-in popup → user authorizes for a
workspace → backend exchanges the code, verifies the issued token with a
live `auth.test` call, fetches team info, and stores everything (encrypted)
against that user. `/pmx/slack/status` re-verifies live against Slack on
every check, so an externally revoked token is detected and cleared
automatically rather than showing a stale "Connected." Note: even with
`channels:history`/`groups:history` granted, Slack still requires the bot
to be a *member* of a channel before it can read messages from it —
`channels:join` lets PMX add the bot to public channels itself; private
channels need a manual `/invite @yourapp` from a workspace member. Same
production caveat as the others: register a second redirect URI for your
deployed API host.

Also requires `TOKEN_ENCRYPTION_KEY` in `backend/.env` — a 32-byte
hex-encoded key used to encrypt Slack's stored tokens at rest. Generate one
with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
and keep it stable once set (rotating it invalidates already-stored tokens).

### 7 API-key connectors
These need **zero backend configuration**. Each user connects their own
account by pasting a credential in the `/connectors` modal, which the
backend verifies live against the provider. Where to get each credential
(also shown inline in the app):

| Connector | Credential | Where to get it |
|---|---|---|
| Mixpanel | Project Token + API Secret | mixpanel.com/settings/project → Access Keys |
| Amplitude | API Key + Secret Key | analytics.amplitude.com/settings/projects → General |
| Microsoft Clarity | API Token | clarity.microsoft.com → project → Settings → Data Export |
| Intercom | Access Token | app.intercom.com/a/developer-hub → your app → Authentication |
| Canny | API Key | canny.io/admin/settings/api |
| Stripe | Secret Key | dashboard.stripe.com/apikeys |
| HubSpot | Private App Access Token | app.hubspot.com/private-apps → Create a private app |

---

## Scope

This is the complete, closed connector list. Nothing else is planned,
partially built, disabled, or pending — FullStory, Zendesk, Freshdesk,
GitLab, Looker, Salesforce, Google Docs, Power BI, Hotjar, and UserVoice
were removed entirely (frontend catalog, backend registry, credential
schemas, help links). If a new connector is needed later, add it fresh to
both `backend/src/workspaces/pmx/routes/connectors.ts` (fields + a real
`verify()` call) and the `CONNECTORS` catalog in `Frontend/src/pages/Connectors.tsx`.

## Env vars reference (backend/.env)

GitHub, Google, Notion, and Slack are the only ones needing anything here —
every other connector's credentials are supplied per-user at connect time
and never touch `.env`.

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:8080/api/pmx/github/callback

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8080/api/pmx/google/callback

NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=http://localhost:8080/api/pmx/notion/callback

SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=http://localhost:8080/api/pmx/slack/callback

# Encrypts Slack's stored tokens at rest — not tied to any external
# provider, generate your own and keep it stable.
TOKEN_ENCRYPTION_KEY=...
```
