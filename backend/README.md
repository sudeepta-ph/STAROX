# STAROX Backend - Deploy Ready

Production-ready Node.js + Express backend for STAROX AI workspace.

## Architecture

- **Framework**: Express.js (TypeScript)
- **Database**: MongoDB (via Mongoose)
- **Security**: Helmet, CORS middleware
- **Credits System**: Plan-based tier (Free/Starter/Pro)
- **AI Integration**: Multi-provider routing (OpenAI/Claude/Gemini)

## Structure

```
backend/
├── src/
│   ├── index.ts              # Express server entrypoint
│   ├── config/env.ts         # Environment validation
│   ├── config/database.ts    # DB client (Mongoose/MongoDB)
│   ├── types.ts              # TypeScript interfaces
│   ├── middleware/           # Express middleware
│   ├── services/             # Business logic
│   │   ├── cdx.ts            # CDX-1/CDX-2 generation
│   │   ├── credits.ts        # Plan & credit enforcement
│   │   └── modelRouter.ts    # AI provider routing
│   └── api/routes/           # API endpoints
│       ├── health.ts         # Health check
│       └── cdx.ts            # CDX generation routes
└── models/                   # Mongoose schemas
```

## Quick Start (Local Development)

```bash
# 1. Setup environment
cp .env.example .env
# Fill in MONGODB_URI, CLOUDINARY_*, DEEPSEEK_API_KEY, CLERK_SECRET_KEY

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
# Server runs on port 8080

# 4. Test health endpoint
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

Collections are defined by the Mongoose models in `src/models/` (User, Blog, Media, Pmx, Placeholders) and created automatically on first write — no manual migration step.

## Deploy to Render

### 1. Connect GitHub repo to Render
https://dashboard.render.com/

### 2. New Web Service
- Runtime: Node.js
- Build: `npm run build`
- Start: `npm start`

### 3. Environment variables
```
PORT=8080
NODE_ENV=production
FRONTEND_ORIGIN=https://yourfrontenddomain.vercel.app
MONGODB_URI=your_mongodb_atlas_uri
CLERK_SECRET_KEY=sk_live_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
DEEPSEEK_API_KEY=...
```

### 4. Update frontend API base
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

## Next Steps

1. Integrate real AI provider calls (currently returns mock structure)
2. Add Firebase token verification middleware
3. Implement streaming responses for long-running generations
4. Add retry/fallback logic between providers
5. Enable integration endpoints (GitHub/Jira/Notion/PostHog)
