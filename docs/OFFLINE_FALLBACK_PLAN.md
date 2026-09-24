# Krishi-Setu: Offline & Disaster Recovery Demo Plan
**Team:** KS-SAND (Smart India Hackathon 2026)  
**Objective:** Zero-downtime presentation guarantee if venue Wi-Fi, Azure VM, Cloudflare DNS, or internet connectivity fails during judging.

---

## ⚡ The 3-Tier Demo Redundancy Matrix

| Tier | Environment | Target URL | Failure Trigger | Activation Time |
|:---:|---|---|---|:---:|
| **Tier 1 (Primary)** | Deployed Cloud Instance | `https://krishi-setu.vercel.app` (or custom domain) | Normal judging conditions with internet | 0 seconds |
| **Tier 2 (Local)** | Local Offline Instance | `http://localhost:5173` | Cloudflare DNS timeout, Azure VM drop, or venue Wi-Fi failure | < 30 seconds |
| **Tier 3 (Static Backup)** | Interactive Screen Capture / Offline Fixtures | Local Browser / Fixtures | Complete OS / hardware failure | < 10 seconds |

---

## 🛠️ Tier 2: Instant Local Offline Activation (Step-by-Step)

If the cloud URL fails or the evaluator venue has no internet, follow these exact terminal commands:

### Step 1: Start Backend API (Offline Mock Mode)
Open PowerShell Terminal 1:
```powershell
cd E:\KrishiSetu
$env:TESTING = "True"
.\backend\venv\Scripts\python.exe -m flask --app backend/run.py run --port 5000
```
> **Note:** In `$env:TESTING="True"` mode, the backend automatically uses `mongomock` in-memory database with zero external internet dependencies!

### Step 2: Seed Offline Demo Data
Open PowerShell Terminal 2:
```powershell
cd E:\KrishiSetu
.\backend\venv\Scripts\python.exe scripts/seed_db.py --export-only
```
> The seed script outputs the full offline fixture dataset to `backend/demo_fixtures.json`.

### Step 3: Start Frontend Dev Server
In PowerShell Terminal 2:
```powershell
cd E:\KrishiSetu\frontend
npm run dev
```
> Open `http://localhost:5173` in Google Chrome or Microsoft Edge.
> The Vite dev proxy will automatically forward all `/api/*` calls to the local Flask backend on `http://127.0.0.1:5000`.

---

## 🎭 Live CLI Triggers (Impress Evaluators in Offline Mode)

If you want to demonstrate the backend auction engine in real-time right in front of the judges:

### 1. Trigger Cross-Farmer Pooling Manually:
```powershell
.\backend\venv\Scripts\python.exe scripts/run_pooling_cli.py
```
*Evaluator takeaway:* Shows immediate terminal log of smallholder lots being clustered into a unified wholesale batch.

### 2. Trigger Double-Auction Engine Manually:
```powershell
.\backend\venv\Scripts\python.exe scripts/run_batch_auction_cli.py --crop Onion
```
*Evaluator takeaway:* Demonstrates orderbook sorting, uniform market clearing price computation, and exact pro-rata farmer share payouts printed in real-time.

---

## 🔒 Pre-Demo Checklist (Complete 15 Minutes Before Stage)
- [ ] Laptop fully charged (or connected to AC power).
- [ ] Chrome browser tabs opened in advance:
  - Tab 1: Farmer Dashboard (`/farmer`)
  - Tab 2: Buyer Dashboard (`/buyer`)
  - Tab 3: Admin Operations Center (`/admin`)
  - Tab 4: `/api/ml/model-status` (Health evidence)
- [ ] Credentials pre-filled in password manager or notepad for instant copy-paste:
  - Farmer: `9876543210` / `demo123`
  - Buyer: `9876543220` / `demo123`
  - Admin: `9000000000` / `demo123`
- [ ] Offline terminal windows minimized and ready in the background.
