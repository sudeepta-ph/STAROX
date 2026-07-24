# STAROX Production Deployment Guide

Complete step-by-step instructions to deploy the STAROX platform to production using **MongoDB Atlas**, **Render** (Backend), **Vercel** (Frontend), and **Clerk** (Auth).

---

## 📁 System Architecture

```
┌────────────────────────┐
│    Frontend (Vite)     │
│   Deployed on Vercel   │
└───────────┬────────────┘
            │ HTTPS API Calls (Bearer Token Auth)
            ▼
┌────────────────────────┐
│  Backend (Node/Express)│
│   Deployed on Render   │
└───────────┬────────────┘
            │ MongoDB Connection URI
            ▼
┌────────────────────────┐
│      Database          │
│   MongoDB Atlas Cloud  │
└────────────────────────┘
```

---

## 1. Step-by-Step MongoDB Atlas Setup

Deploy your production database on MongoDB Atlas.

### 1.1 Create Atlas Account & Org
1. Go to [MongoDB Atlas Cloud](https://www.mongodb.com/cloud/atlas).
2. Register for a free account.
3. Create an organization and name your new project (e.g. `STAROX-Prod`).

### 1.2 Create Database Cluster
1. Click **Create** to deploy a new cluster database.
2. Select **M0 (Shared Free Tier)**.
3. Choose your Cloud Provider (AWS, GCP, or Azure) and select a region close to your target users (e.g., `us-east-1` or `eu-central-1`).
4. Keep the Cluster Name as `Cluster0` (or name it `starox-prod-db`).
5. Click **Create Cluster**.

### 1.3 Configure Security Access
1. **Create Database User:**
   - Under **Security** → **Database Access** → Click **Add New Database User**.
   - Select Authentication Method: **Password**.
   - Input username (e.g., `starox_admin`) and generate a secure password. **Save these credentials securely.**
   - Set Database User Privileges to: `Read and write to any database`.
2. **Whitelist IP Address:**
   - Under **Security** → **Network Access** → Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) to allow Render backend servers to connect, then click **Confirm**.

### 1.4 Retrieve Connection URI
1. Go to the **Deployment** → **Database** menu in the sidebar.
2. Click **Connect** on your active cluster.
3. Select **Drivers** (Node.js).
4. Copy the connection string. It will look like this:
   `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
5. Replace `<username>` and `<password>` with the credentials created in **Step 1.3**, and specify the target database name as `starox` right before the `?` query parameters:
   `mongodb+srv://starox_admin:secure_password@cluster0.xxxx.mongodb.net/starox?retryWrites=true&w=majority`

---

## 2. Transition Clerk Auth from Dev to Production

Move your authentication layer from development sandbox settings to a live domain.

### 2.1 Activate Production Instance
1. Log in to the [Clerk Dashboard](https://dashboard.clerk.com).
2. Select your application card.
3. In the top navbar/header, click the **"Deploy to Production"** button.
4. Follow the setup wizard to connect your production domain (e.g. `starox.vercel.app` or your custom domain `starox.space`).

### 2.2 Configure DNS Records
1. Clerk will supply a list of CNAME records for authentication subdomains (e.g., `clerk.yourdomain.com`).
2. Log in to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.).
3. Navigate to **DNS Management** and add the Clerk CNAME records.
4. Wait a few minutes for changes to propagate.

### 2.3 Grab Production Keys
1. Go to **API Keys** under settings in your Clerk Production Instance dashboard.
2. Copy the production key strings:
   - **Frontend publishable key:** Starts with `pk_live_...`
   - **Backend secret key:** Starts with `sk_live_...`

---

## 3. Deploy Backend on Render

Deploy the Node/Express server on Render.

### 3.1 Link Repository
1. Log in to [Render](https://render.com).
2. Click **New +** (top right) → Select **Web Service**.
3. Link your GitHub account and import the repository.

### 3.2 Define Build Settings
* **Name:** `starox-backend`
* **Region:** Select a region matching your MongoDB cluster region.
* **Branch:** `main` (or your active release branch)
* **Runtime:** `Node`
* **Root Directory:** `backend`
* **Build Command:** `npm install && npm run build`
* **Start Command:** `node dist/index.js`
* **Instance Type:** `Free` (or higher)

### 3.3 Set Environment Variables
In the Render Web Service dashboard, navigate to **Environment** → **Add Env Var**:

| Variable Name | Production Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | `10000` | Render default web port |
| `FRONTEND_ORIGIN` | `https://starox.vercel.app` | **Your Vercel live URL** (CORS whitelist) |
| `MONGODB_URI` | `mongodb+srv://...` | **MongoDB Atlas connection URI** from Step 1.4 |
| `CLERK_SECRET_KEY` | `sk_live_...` | **Clerk Production Secret Key** from Step 2.3 |
| `DEEPSEEK_API_KEY` | Your DeepSeek API key | DeepSeek API authentication key |

### 3.4 Puppeteer Nixpacks Configuration (Screenshot Captures)
Render uses **Nixpacks** by default to build Node.js applications. To launch Chromium for screenshot capturing on Render, we need to install system packages.
1. Create a `nixpacks.toml` file in your **`backend/`** root directory if it is not present.
2. Ensure it contains the following config block:
   ```toml
   [phases.setup]
   nixPkgs = ["...", "chromium"]
   ```
3. Set these environment variables in your Render panel:
   * `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` = `true`
   * `PUPPETEER_EXECUTABLE_PATH` = `/usr/bin/chromium`
4. Click **Save Changes** and deploy. Render will compile your service and start listening on port `10000`.

---

## 4. Deploy Frontend on Vercel

Deploy the Vite/React frontend.

### 4.1 Import Project
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → Select **Project**.
3. Select your repository.

### 4.2 Configure Project Settings
* **Root Directory:** `Frontend`
* **Framework Preset:** `Vite`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`

### 4.3 Configure Environment Variables
Expand **Environment Variables** in the Vercel build dashboard and set:

| Variable Name | Production Value | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://starox-backend.onrender.com/api` | **Your Render service base URL** |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | **Clerk Production Publishable Key** |

4. Click **Deploy**. Vercel will build the frontend assets bundle and host it at a production URL.

---

## 5. Post-Deployment Verification

Make sure the services connect correctly:

1. **Verify Health Check:**
   - Query: `GET https://starox-backend.onrender.com/health`
   - Expected Output: `{ "status": "ok", "service": "starox-backend" }`
2. **Verify CORS:**
   - Log in to your live frontend Vercel URL.
   - Navigate to the **Sources** or **Analysis** workspace pages.
   - Trigger an import or visual review snapshot to verify that Clerk headers, cookies, and CORS policies resolve without warning blocks.
