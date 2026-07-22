# 🚀 STAROX PMX
## AI-Powered Visual Product Management Operating System

STAROX PMX is an AI-powered visual product review workspace and product intelligence platform that aggregates signals, tracks customer evidence, discovers opportunities, and formulates prioritized implementation decisions.

---

## 🛠️ Stack & Technologies

* **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion (for animations), Radix UI (for styled select & checkbox components).
* **Backend:** Node.js, Express.js, TypeScript, Mongoose/MongoDB.
* **AI Engine:** DeepSeek (vision models for visual contrast, layout, and UX audits).
* **Crawlers & Capture:** Puppeteer (for native resolution website capture).
* **Authentication:** Clerk Auth.

---

## 🏗️ Folder Structure

```
STAROX/
├── Frontend/                 # React 19 Client SPA
│   ├── src/
│   │   ├── components/       # Reusable UI widgets & Visual Zoom/Pan Canvas
│   │   ├── pages/pmx/        # PMX Module Workspace views
│   │   ├── lib/              # Zustand PMX store & api client
│   │   └── main.tsx
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/                  # Express.js Server
│   ├── src/
│   │   ├── models/           # Mongoose Schemas (Input, Session, Evidence, problem, Opportunity)
│   │   ├── services/         # AI API integrations & layout crawlers
│   │   ├── workspaces/pmx/   # Route controllers
│   │   └── app.ts
│   └── package.json
├── DEPLOY.md                 # Step-by-step MongoDB, Vercel & Render deploy guide
└── README.md                 # This file
```

---

## 🔥 Key Implemented Features

### 1. Visual Review Canvas Workspace (`/pmx/analysis`)
* **Interactive Canvas:** An overlay mapping system supporting pan, zoom, and coordinate pinning.
* **AI Visual Audits:** Powered by DeepSeek Vision completion APIs to audit design contrast, accessibility, and visual hierarchy.
* **Manual Annotations:** Double-click anywhere on screenshots to pin sticky notes and reply threads.
* **Figma-style Comments:** Live feedback drawers with resolve actions and Markdown reports downloads.

### 2. Checkboxed Source Selection & Custom Filters (`/pmx/sources`)
* **Explicit Context Selection:** Checkboxes on every source card to customize which dataset is processed by the AI pipeline.
* **Rich Filters:** Quick filter lists (`All`, `Selected`, `Unselected`, `Processed`, `Pending`) and type-based selectors.
* **Keyboard Shortcuts:** `Ctrl+A` to select all filtered nodes, `Escape` to clear.
* **CSV Uploader:** Customer Review drag-and-drop file uploader parsing `.csv` spreadsheet files into input signals.

### 3. Pipeline Run Confirmation Modal & Status Badges
* **Pre-run Validation:** Summary modal presenting the list of selected sources, counts, and estimated processing times (~45s).
* **Real-time Badges:** Glowing source cards displaying current pipeline state (`Queued`, `Processing`, `Analyzing`, `Completed`, `Failed`, `Skipped`).

### 4. PMX Intelligence Runs History (`/pmx/history`)
* **Pipeline Sessions History:** Tab containing log cards detailing past run timestamps, models used, duration metrics, and selected sources lists.
* **Rerun Selection:** Instantly reload selections and execute the pipeline cascade with a single click.

---

## ⚡ Local Setup & Installation

### Prerequisite Environment Configuration

#### Backend Env (`backend/.env`):
```env
PORT=8080
MONGO_URI=mongodb+srv://...
CLERK_SECRET_KEY=sk_test_...
DEEPSEEK_API_KEY=REDACTED_DEEPSEEK_API_KEY
```

#### Frontend Env (`Frontend/.env`):
```env
VITE_API_URL=http://localhost:8080/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Running Backend (Node/Express)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the hot-reloading development server:
   ```bash
   npm run dev
   ```

### Running Frontend (Vite/React)
1. Navigate to the Frontend directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch Vite client:
   ```bash
   npm run dev
   ```
4. Access the app in your browser at `http://localhost:5173`.
