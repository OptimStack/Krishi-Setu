# KrishiSetu — Vercel Deployment Guide

This guide details how to deploy **KrishiSetu** to [Vercel](https://vercel.com). You can choose between two deployment approaches depending on your architecture preference:

---

## Architecture Options

| Option | Best For | What Runs on Vercel | Where Backend Runs |
| :--- | :--- | :--- | :--- |
| **Option A (Recommended)** | Production / Hackathon Demo | React + Vite Frontend (Global Edge CDN) | Azure VM / Render / Railway |
| **Option B (Serverless)** | Quick Zero-Server Preview | React Frontend + Python Serverless Functions | Fully on Vercel |

---

## Option A: Deploying Frontend to Vercel (Recommended)

In this setup, your React frontend is distributed across Vercel’s global Edge network with sub-millisecond static file delivery, while your Flask auction engine and MongoDB Atlas connection run continuously on a cloud host.

### Step 1: Connect Repository to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your `KrishiSetu` GitHub repository.

### Step 2: Configure Project Settings
In the Vercel project configuration screen:
- **Framework Preset**: `Vite`
- **Root Directory**: Click `Edit` and select **`frontend`**
- **Build Command**: `npm run build` (detected automatically)
- **Output Directory**: `dist` (detected automatically)
- **Install Command**: `npm install`

### Step 3: Set Environment Variables
Under the **Environment Variables** section on Vercel, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://your-api-domain.com/api` | The public URL of your deployed Flask backend |

*(If deploying locally for testing, you can use ngrok or your VM’s public IP / Cloudflare domain).*

### Step 4: Deploy & Verify
1. Click **Deploy**.
2. Vercel will install dependencies and build the Vite bundle (typically ~30–45 seconds).
3. The SPA routing rewrites in [`frontend/vercel.json`](file:///e:/KrishiSetu/frontend/vercel.json) ensure that refreshing routes like `/farmer/dashboard`, `/buyer/browse`, or `/admin/auctions` will never throw a 404 error.

---

## Option B: Deploying Full-Stack Monorepo to Vercel

In this setup, Vercel hosts both the React static SPA and executes the Flask backend via Vercel's Python Serverless Runtime (`@vercel/python`).

### Project Files in Place:
- **[`vercel.json`](file:///e:/KrishiSetu/vercel.json)**: Directs `/api/*` traffic to `api/index.py` and all other paths to the React frontend.
- **[`api/index.py`](file:///e:/KrishiSetu/api/index.py)**: WSGI entrypoint initializing the Flask `app`.
- **[`requirements.txt`](file:///e:/KrishiSetu/requirements.txt)**: Specifies Python packages for Vercel's serverless runtime.

### Step 1: Configure Vercel Project
- **Root Directory**: Leave as `./` (repository root).
- Vercel automatically detects [`vercel.json`](file:///e:/KrishiSetu/vercel.json) and configures both the Python builder and static builder.

### Step 2: Set Environment Variables
Add the following in Vercel Project Settings → Environment Variables:

| Variable | Example / Description |
| :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/krishisetu?retryWrites=true&w=majority` |
| `JWT_SECRET_KEY` | Strong 32+ character random string |
| `FLASK_ENV` | `production` |
| `RAZORPAY_KEY_ID` | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Your Razorpay test secret key |
| `RAZORPAY_WEBHOOK_SECRET` | Your webhook secret |
| `AUCTION_BATCH_INTERVAL_MINUTES` | `15` |
| `POOLING_MIN_QUANTITY_KG` | `500` |
| `POOLING_MAX_WAIT_MINUTES` | `60` |

### Step 3: Whitelist Vercel in MongoDB Atlas
Because Vercel serverless functions use dynamic IP addresses:
1. Open [MongoDB Atlas Dashboard](https://cloud.mongodb.com).
2. Go to **Network Access** → **IP Access List**.
3. Add entry: `0.0.0.0/0` (Allow Access from Anywhere) with a comment like `Vercel Serverless Functions`.

---

## Troubleshooting Common Vercel Deployment Issues

### 1. Route 404 on Refreshing Sub-Pages (e.g. `/farmer/dashboard`)
- **Cause**: Client-side router needs SPA fallback.
- **Fix**: Verified! [`frontend/vercel.json`](file:///e:/KrishiSetu/frontend/vercel.json) includes:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### 2. CORS Errors When Frontend Calls Backend
- **Cause**: Browser blocking cross-origin requests from `*.vercel.app` to your API domain.
- **Fix**: In `backend/config.py`, add your Vercel URL to `CORS_ALLOWED_ORIGINS` or set `CORS_ALLOWED_ORIGIN=*` during hackathon demo phase.

### 3. Serverless Execution Timeout on Heavy Operations
- **Cause**: Vercel Serverless Hobby tier functions have a default timeout of 10 seconds.
- **Fix**: Under Option A (VM/Gunicorn backend), the APScheduler daemon runs continuously in the background without serverless timeouts.
