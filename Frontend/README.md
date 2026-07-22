# Starox.space

**Starox** is an AI-powered product development workspace that helps founders and developers build, analyze, optimize, and document software products using intelligent agents.

## Core AI Agents

| Agent | Role | Capabilities |
|-------|------|-------------|
| **STAROX-1** | Product Intelligence | Idea analysis, market research, feature roadmaps, architecture planning |
| **STAROX-2** | Experience & Improvement | UX audits, conversion optimization, accessibility, performance analysis |

## Tech Stack

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Framer Motion · Recharts · Zustand  
**Backend:** Express · Supabase · OpenAI · Stripe · Puppeteer  
**Testing:** Vitest · Testing Library

## Getting Started

```bash
# Install frontend dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Production build
npm run build
```

### Backend

```bash
cd backend
npm install
cp .env.example .env   # Fill in your API keys
npm run dev
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level pages
├── lib/            # API client, store, utilities
├── hooks/          # Custom React hooks
└── test/           # Test setup and specs

backend/
├── src/
│   ├── api/        # REST API routes
│   ├── agents/     # AI agent orchestration
│   ├── services/   # Core business logic
│   ├── database/   # Database layer
│   └── middleware/  # Express middleware
└── supabase-schema.sql
```

## License

© 2026 Starox. All rights reserved.
