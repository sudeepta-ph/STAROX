---
description: Ship a SaaS MVP — complete audit, fill gaps, polish UI, update branding, verify build, and validate in browser.
---

A comprehensive workflow to transform Starox.space from a work-in-progress AI workspace into a production-ready SaaS MVP.

Starox is an AI-powered product development workspace that helps founders and developers build, analyze, optimize, and document software products using intelligent agents.

The MVP focuses on delivering three core AI agents:

• Product Intelligence – AI Product Manager
• Experience & Improvement – UX & Product Optimization Agent
• Documentation & Business – Documentation & Startup Operations Agent

This workflow ensures the system moves from prototype → stable SaaS MVP through auditing, feature completion, UI polish, build verification, and browser validation.

Phase 1 — Project Audit & Gap Analysis
1. Inventory the Entire Codebase

Perform a full inspection of the repository and document the current state of the application.

Create a structured inventory of:

Frontend

Pages

Layouts

Components

Navigation routes

State stores (Zustand or similar)

Backend

API routes

Agent orchestration services

Model integration services

Database layer

AI Agents

Product Intelligence

Experience & Improvement

Documentation & Business

Check for the following issues.

Placeholder Routes

Identify unfinished pages containing placeholder content such as:

"Coming Soon"

"Under Construction"

Empty dashboards

Stub agent outputs

Replace these with real functionality.

Hardcoded Dummy Data

Locate and remove static placeholder values including:

fake emails

test usernames

hardcoded API responses

demo product data

Replace with:

real API calls

database queries

agent outputs

Legacy Branding

Remove any references to previous names or templates such as:

CodocX

Lovable

Template app names

Replace them with:

Starox.space

Ensure branding is consistent across:

UI

documentation

metadata

environment variables

SEO & Metadata Verification

Every page should contain correct metadata.

Example:

<title>Starox — AI Workspace for Building and Optimizing Software</title>

<meta name="description" content="Starox is an AI-powered development workspace that helps teams build, improve, and document software products using intelligent agents." />

Also configure Open Graph metadata.

2. Create a Gap Checklist

Create a task.md file listing all issues and incomplete features.

Example:

# Starox MVP Task List

## Frontend
- [ ] Replace dummy project data
- [ ] Connect dashboard to backend APIs
- [ ] Implement agent result panels
- [ ] Fix mobile layout issues

## Backend
- [ ] Create agent orchestration service
- [ ] Implement Product Intelligence endpoints
- [ ] Implement UX analysis endpoint
- [ ] Implement documentation generator

## Database
- [ ] Project storage
- [ ] Feature planning storage
- [ ] Agent results storage

## AI Integration
- [ ] LLM model routing
- [ ] Agent prompt pipelines
- [ ] Structured JSON outputs
Phase 2 — Fill Placeholder Pages

Every navigation route must lead to a complete functional page.

Create full pages for each major workspace module.

Product Intelligence Page

Purpose: Help founders define and structure product ideas.

Features:

Idea input field

Product analysis output

Market research insights

Feature roadmap

Architecture suggestions

UI Components:

Idea input card

Roadmap timeline

Market insights panel

Architecture visualization

Experience & Improvement Page

Purpose: Analyze applications and improve product experience.

Features:

Application input or project selection

UX improvement suggestions

Feature upgrade recommendations

Performance optimization suggestions

UI Components:

Analysis dashboard

UX insight cards

Improvement checklist

Documentation & Business Page

Purpose: Generate product and startup documentation.

Features:

Technical documentation generator

API documentation generator

Product reports

Investor pitch summaries

UI Components:

Documentation panels

Generated report viewer

Export options

Maintain Existing Design System

All pages must follow the current UI design system.

Use existing patterns such as:

Glass cards

glass-card

Gradients

gradient-starox
gradient-text

Motion

framer-motion entrance animations

Maintain consistent spacing, typography, and layout structure.

Do not redesign existing UI, only extend it.

Phase 3 — Branding & Copy Cleanup

Ensure consistent Starox branding across the project.

Replace all previous references with:

Starox.space

Update:

product descriptions

UI labels

marketing text

documentation

metadata

Rewrite README

Example README for the project.

# Starox.space

Starox is an AI-powered development workspace that helps founders and developers build, analyze, optimize, and document software products.

The platform provides intelligent agents that act as:

• Product Managers
• UX Analysts
• Documentation Engineers

These agents help teams transform ideas into fully structured products.

## Core Agents

Product Intelligence
Analyzes product ideas and generates product strategy, feature planning, and architecture.

Experience & Improvement
Evaluates applications and suggests UX improvements and product enhancements.

Documentation & Business
Creates documentation, reports, and startup business materials.

## Tech Stack

Frontend
React + TypeScript + Vite

Backend
FastAPI or Node.js

AI
LLM-based agent architecture

Database
PostgreSQL / Supabase

Remove all template boilerplate.

Phase 4 — UI Polish & Antigravity Design Pass

Apply Antigravity Design principles across the UI.

Weightlessness

Use layered soft shadows:

shadow-xl
shadow-black/20
Spatial Depth

Add hover transforms for interactive elements.

Example:

transform hover:scale-105
Glassmorphism

Use translucent cards with blur effects.

Example:

backdrop-filter: blur(16px)
background: rgba(255,255,255,0.08)
border: 1px solid rgba(255,255,255,0.15)
Motion

Use Framer Motion for entrance animations.

Example:

initial={{ opacity:0, y:20 }}
animate={{ opacity:1, y:0 }}

Ensure animations respect:

prefers-reduced-motion

for accessibility.

Phase 5 — Build & Lint Verification
Build
// turbo
npm run build

Ensure:

zero errors

zero warnings

correct asset compilation

Lint
// turbo
npm run lint

Fix:

unused variables

formatting issues

incorrect imports

Tests
// turbo
npm run test

Confirm all tests pass.

Add tests if missing for:

API routes

agent responses

core UI components

Phase 6 — Browser Validation

Launch the app locally.

http://localhost:5173

Verify the complete user experience.

Homepage

Check:

hero animations

product messaging

CTA buttons

Navigation

Ensure all navigation routes lead to real pages.

No routes should show:

Coming Soon
Agent Functionality

Test all three agents:

Product Intelligence
Experience & Improvement
Documentation & Business

Ensure they return live results from backend APIs.

Responsiveness

Test layouts for:

Desktop

Tablet

Mobile

Ensure proper UI scaling.

Theme Support

Verify:

dark mode

light mode

theme toggle behavior

Asset Verification

Ensure all assets load correctly:

logos

icons

images

Record Walkthrough

Record a complete walkthrough video showing:

homepage

dashboard

agents in action

documentation generation

Phase 7 — Walkthrough & Handoff

Create a walkthrough.md artifact describing the final MVP.

Example:

# Starox MVP Walkthrough

## Summary

Starox MVP is now ready for initial release with three working AI agents and a full SaaS interface.

## Major Changes

- Implemented Product Intelligence agent
- Implemented Experience & Improvement agent
- Implemented Documentation & Business agent
- Connected frontend to backend APIs
- Completed branding migration to Starox
- Removed placeholder pages

## Testing

Build: Passed
Lint: Passed
Browser Validation: Completed

## Known Issues

- Multi-agent chaining limited
- Advanced analytics pending

## Next Milestones

- multi-agent orchestration
- team collaboration
- plugin integrations

If you want, I can also create the next workflow that every real SaaS needs after this:

“Ship a SaaS Infrastructure”

It will add:

• Authentication
• User accounts
• Projects workspace
• Stripe billing
• API keys
• Rate limits
• Deployment