# STAROX Backend - Deploy Ready

Production-ready Node.js + Express backend for STAROX AI workspace.

## Architecture

- **Framework**: Express.js (TypeScript)
- **Database**: PostgreSQL (via Supabase)
- **Security**: Helmet, CORS middleware
- **Credits System**: Plan-based tier (Free/Starter/Pro)
- **AI Integration**: Multi-provider routing (OpenAI/Claude/Gemini)

## Structure

```
backend/
├── src/
│   ├── index.ts              # Express server entrypoint
│   ├── config/env.ts         # Environment validation
│   ├── database/supabase.ts  # DB client
│   ├── types.ts              # TypeScript interfaces
│   ├── middleware/           # Express middleware
│   ├── services/             # Business logic
│   │   ├── cdx.ts            # CDX-1/CDX-2 generation
│   │   ├── credits.ts        # Plan & credit enforcement
│   │   └── modelRouter.ts    # AI provider routing
│   └── api/routes/           # API endpoints
│       ├── health.ts         # Health check
│       └── cdx.ts            # CDX generation routes
└── migrations/
    └── 001_init_starox.sql   # Database schema
```

## Quick Start (Local Development)

```bash
# 1. Setup environment
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 2. Install dependencies
npm install

# 3. Create database tables (run in Supabase SQL editor)
cat migrations/001_init_starox.sql

# 4. Start dev server
npm run dev
# Server runs on port 8080

# 5. Test health endpoint
curl http://localhost:8080/health
```

## API Endpoints

### Health Check
```bash
GET /health
→ { "status": "ok", "service": "starox-backend" }
```

### CDX-1: Product Intelligence
```bash
POST /api/cdx1/generate
{
  "userId": "user123",
  "projectId": "proj456",
  "prompt": "...",
  "model": "gpt-4",
  "planTier": "starter"
}
→ { "type": "cdx1", "output": { "sections": [...], "model": "...", "provider": "..." } }
```

### CDX-2: Experience & Improvements
```bash
POST /api/cdx2/generate
{
  "userId": "user123",
  "projectId": "proj456",
  "prompt": "...",
  "model": "claude-3",
  "planTier": "free"
}
→ { "type": "cdx2", "output": { "sections": [...], "model": "...", "provider": "..." } }
```

## Credit Tiers

| Plan    | Credits | CDX-1 Cost | CDX-2 Cost |
|---------|---------|-----------|-----------|
| Free    | 5       | 2         | 1         |
| Starter | 100     | 2         | 1         |
| Pro     | 1M      | 2         | 1         |

Error on insufficient credits: `HTTP 402 Payment Required`

## Database Schema

Auto-migrates on first request. Schema includes:
- `user_credits`: Tracks per-user credit balance and plan tier
- `generation_audit`: Immutable log of all generations (cost tracking, compliance)

## Deploy to Railway

### 1. Connect GitHub repo to Railway
https://railway.app/new

### 2. Set environment variables
```
PORT=8080
NODE_ENV=production
FRONTEND_ORIGIN=https://yourfrontenddomain.vercel.app
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### 3. Configure build & start
- Build: `npm run build`
- Start: `npm start`
- Port: Detected from `PORT` env var (8080)

### 4. Run migrations
In Supabase, paste `migrations/001_init_starox.sql` into SQL editor and execute.

### 5. Update frontend API base
In frontend `.env`:
```
VITE_API_URL=https://yourbackendname.railway.app/api
```

## Deploy to Render

### 1. Connect GitHub repo to Render
https://dashboard.render.com/

### 2. New Web Service
- Runtime: Node.js
- Build: `npm run build`
- Start: `npm start`

### 3. Environment variables
Same as Railway setup above.

### 4. Run migrations
Same as Railway.

### 5. Update frontend API base
```
VITE_API_URL=https://yourservicename.onrender.com/api
```

## Health Checks & Monitoring

Health endpoint available at `GET /health` for load balancers.

Logs streamed via Morgan HTTP logger in production.

## Error Handling

- **400 Bad Request**: Invalid input (Zod validation)
- **402 Payment Required**: Insufficient credits
- **500 Internal Error**: Server error (logged to console)

All errors return JSON: `{ "error": "MESSAGE" }`

## Development

```bash
npm run dev       # Start with hot reload (tsx watch)
npm run typecheck # Validate TypeScript
npm run build     # Compile to dist/
npm run lint      # ESLint (optional)
```

## Database Migrations

Migrations stored in `backend/migrations/` directory.

To add a new migration:
1. Create `002_next_feature.sql` in `backend/migrations/`
2. Run in Supabase SQL editor
3. Commit to version control

## Next Steps

1. Integrate real AI provider calls (currently returns mock structure)
2. Add Firebase token verification middleware
3. Implement streaming responses for long-running generations
4. Add retry/fallback logic between providers
5. Enable integration endpoints (GitHub/Jira/Notion/PostHog)
