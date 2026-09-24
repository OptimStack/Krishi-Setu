# Krishi-Setu — Project Masterplan
**SIH 2026 · PS ID 26132 · Team KS-SAND**
**"Strengthening Market Linkages and Price Discovery for Farmers"**

> This file is the single source of truth for the Antigravity agent. Follow the milestones in
> Section 8 strictly in order — each milestone assumes every prior one is done and tested.
> Do not skip ahead. Do not write code until a milestone is reached.

---

## 0. Tech Stack Decision Note — read this first

You asked for **Node.js + Next.js using Vite**, TailwindCSS, hostable, JavaScript (not
TypeScript) — while keeping **Flask + Nginx** for the backend API since a real API is
needed. One thing to flag before locking this in: **Next.js and Vite are two different,
mutually-exclusive build systems** — Next.js ships its own bundler (Webpack/Turbopack)
and doesn't run on Vite. You can't have both under one frontend. So this masterplan
makes an explicit choice and documents *why*, rather than silently picking one:

**Decision: React + Vite (JavaScript, not TypeScript) + TailwindCSS, as a decoupled
frontend that talks to a Flask JSON API — reverse-proxied and served together by
Nginx.** This directly solves the hosting problem you ran into with server-rendered
Flask/Jinja templates:

- `npm run build` produces a folder of **plain static files** (HTML/CSS/JS, no Node.js
  process needed at runtime). Nginx just serves that folder directly — this is exactly
  what "I am unable to host the website" needs: one static bundle, one web server, no
  extra moving parts in production.
- Flask stops rendering HTML entirely and becomes a **pure JSON REST API** (this is the
  "best of both worlds" you asked for: modern JS frontend + Flask/Python where the ML
  model testing and business logic actually lives).
- Nginx does one job it's already good at: serve `/  → dist/` (the built React app) and
  `/api/ → gunicorn:8000` (the Flask API), on the same domain, so there's no CORS
  headache and no separate hosting account needed.
- Node.js is only required **on the build machine** (or as a CI step) to run
  `npm run build` — it is never a runtime dependency on the Azure VM.
- **Nothing about your day-to-day npm workflow changes.** `npm install`,
  `npm run dev` (local dev server on port 5173, hot-reload, the usual Vite experience),
  and `npm run build` all work exactly like any normal Vite/React project — there's no
  special CLI, no custom Node runtime, nothing exotic to learn. The *only* difference
  from a typical "npm app you `npm start` on a server" setup is the very last step:
  instead of running a Node process in production, you hand Nginx the folder that
  `npm run build` already produced (`frontend/dist/`) and it serves that. Everything
  up to that point is standard npm.

**If you specifically want Next.js instead** (e.g. for server-side rendering or
file-based routing) later: swap Section 3's `frontend/` app for a Next.js app, run it
under Node.js via `systemd` + `pm2`/`node server.js` on a second port, and change the
Nginx block in Section 9.2 to proxy `/` to that Node port instead of serving static
files. The backend API, database, and ML sections of this masterplan **do not change**
either way — that's the point of keeping them decoupled. This masterplan builds the
Vite version because it is simpler to host correctly under time pressure; the Next.js
swap is a same-day change later if you genuinely need SSR.

---

## 1. Executive Summary & Goals

### 1.1 What we are building
Krishi-Setu is a **double-auction market-linkage platform** connecting smallholder
farmers/FPOs directly with institutional and bulk buyers — replacing informal,
immediate-post-harvest sales (weak bargaining power) with a transparent, price-discovered,
two-sided marketplace.

**Who it's for:**
- **Farmers/FPOs** — list produce ("asks"), get AI-assisted quality grading, see
  real-time and forecasted mandi prices, get pooled with nearby farmers to meet buyer
  volume needs, get paid reliably and traceably.
- **Buyers** (processors, institutional buyers, traders) — place bids, source
  quality-verified, pooled volumes without individually vetting dozens of small farmers.
- **Government of Maharashtra / MSAMB** — better market visibility, digital records,
  improved silo/warehouse utilization.

### 1.2 Core mechanism
1. Farmers submit **asks** (crop, quantity, quality, minimum acceptable price).
2. Produce is optionally **AI-graded** from a photo (instant quality estimate).
3. Small farmer lots are **pooled** across nearby farmers into buyer-ready batches.
4. Buyers submit **bids** (crop, quantity needed, max price, quality requirement).
5. A **double auction engine** runs at fixed batch intervals, matches bids to pooled
   asks, and determines a fair clearing price.
6. A **price forecasting model** gives farmers a "sell now vs. hold" signal.
7. On match, payment settles via **Razorpay**, with traceable per-farmer payout even
   for pooled trades.
8. Farmers can locate nearby **warehouses/silos** while waiting for a better price.

### 1.3 Goals for the hackathon build
- **G1 (MVP):** A working end-to-end flow — farmer lists → gets graded → gets pooled →
  buyer bids → auction matches → payment settles — as a **hosted, deployed** web app
  (React/Vite frontend + Flask API backend).
- **G2 (MVP):** Real (or credibly real-looking) market price data pulled from at least
  one public source (eNAM/Agmarknet/data.gov.in).
- **G3 (MVP — this is the part currently being actively tested):** A working ML
  price-forecast model and a working AI grading model, reachable and testable through
  dedicated backend API endpoints **before** they're wired into the full auction flow
  — see Section 6, which exists specifically because a model is being tested right now.
- **G4 (Stretch/Phase 2):** SMS/kiosk multi-channel access, MSAMB pledge-loan
  integration, anchor-buyer subscriptions, live warehouse availability, offline mode.
- **G5 (MVP):** A deployable, judge-proof demo: Vite build + Flask API on one Azure VM,
  Nginx in front, Cloudflare on top — this masterplan's Section 9 is written so hosting
  is no longer the blocker it was.

### 1.4 Scope validation note
The official Expected Solution text for SIH26132 is intentionally broad. This
masterplan makes concrete interpretive choices (double auction + pooling + AI grading +
price forecasting) to make the problem buildable in a hackathon timeframe. **Re-confirm
this scope interpretation against the live PS text on sih.gov.in before final submission**
— it was compiled from a third-party PS dataset copy.

---

## 2. System Architecture & Tech Stack Details

### 2.1 High-level architecture (decoupled frontend + API backend)

```
                     ┌────────────┐
                     │   Browser   │  (Farmer / Buyer / Admin)
                     │ React SPA   │
                     └──────┬──────┘
                            │ HTTPS
                     ┌──────▼──────┐
                     │  Cloudflare  │  DNS proxy, SSL, DDoS/WAF, CDN for static assets
                     └──────┬──────┘
                            │
                     ┌──────▼───────────────────────────────────┐
                     │                Azure VM                    │
                     │  ┌────────────────────────────────────┐   │
                     │  │               Nginx                  │   │
                     │  │  location /       → dist/ (static)   │   │
                     │  │  location /api/   → 127.0.0.1:8000   │   │
                     │  │  location /uploads/ → static media    │   │
                     │  └───────────────┬──────────────────────┘   │
                     │                  │ proxy_pass                │
                     │          ┌───────▼────────┐                  │
                     │          │ gunicorn        │  (systemd svc)   │
                     │          │  → Flask app    │                  │
                     │          │  (JSON REST API │                  │
                     │          │   ONLY — no     │                  │
                     │          │   Jinja HTML)   │                  │
                     │          └───┬───┬───┬────┘                  │
                     └──────────────┼───┼───┼──────────────────────┘
                                     │   │   │
                  ┌──────────────────┘   │   └───────────────────┐
                  ▼                      ▼                        ▼
        ┌──────────────────┐   ┌────────────────┐     ┌──────────────────┐
        │  MongoDB Atlas    │   │  ml/ (models)   │     │ Razorpay REST API │
        │  users, listings, │   │  grading model  │     │ order create,     │
        │  bids, trades,    │   │  price-forecast │     │ webhook verify     │
        │  payments, prices │   │  model (.pkl)   │     └──────────────────┘
        └────────┬──────────┘   └───────┬────────┘
                  │                       │
                  │              ┌────────▼─────────┐
                  │              │ ml/datasets/      │
                  │              └───────────────────┘
        ┌─────────▼─────────────────────────────┐
        │  External market data sources           │
        │  eNAM · Agmarknet · MSAMB · data.gov.in │
        └──────────────────────────────────────────┘

  Build-time only (never on the VM at runtime):
  Node.js + npm → `frontend/` (React + Vite + Tailwind) → `npm run build` → dist/
```

**Key rule:** Flask never renders HTML again. Every Flask route under `/api/*` returns
JSON. The React app is the only thing that renders UI. This is what makes the frontend
independently deployable/testable (you can `npm run dev` it against a local or remote
API) and what makes Nginx's job simple and reliable to host.

### 2.2 Tech stack (final)

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | **React 18, built with Vite** | JavaScript (`.jsx`), **not TypeScript**, per your requirement. Vite gives fast dev server + a static `dist/` production build — no runtime Node.js needed in prod. |
| Frontend styling | **TailwindCSS** (via `@tailwindcss/vite` plugin or PostCSS) | Utility-first; configure `tailwind.config.js` with the project's color palette (crop-green / earth-tone accents, per the deck's design language). |
| Frontend routing | **React Router v6** | Client-side routes: `/login`, `/farmer/*`, `/buyer/*`, `/admin/*`. |
| Frontend state/data fetching | **`fetch`/`axios` + React Context** (or lightweight `@tanstack/react-query` if time allows for caching/polling) | Keep it simple for MVP: a small `api/client.js` wrapper is enough. |
| Frontend build tool | **Vite** | `npm run dev` (local), `npm run build` (produces `frontend/dist/`), `npm run preview` (sanity-check the prod build locally). |
| Backend framework | **Python 3.11+, Flask**, **API-only** (`flask-cors` for local dev cross-origin, `flask-restful`/plain Blueprints for routes) | Application factory pattern, Blueprints per module, every response is `jsonify(...)`. |
| Backend auth | **JWT** (e.g. `flask-jwt-extended`) instead of server-side sessions | Needed because the frontend is now a separate SPA, not server-rendered — sessions/cookies get awkward across a decoupled frontend; a short-lived access token + refresh token is the standard fit. |
| Real-time updates | **Polling** (`setInterval` + `fetch` in React) for MVP; **Flask-SocketIO** upgrade only if there's slack time | Same reasoning as before: a flaky WebSocket failing live in front of judges is worse than a 5-second poll. |
| Background jobs | **APScheduler** (in-process) for MVP | Runs the fixed-interval batch auction job inside the same Flask/gunicorn process. |
| Database | **MongoDB Atlas** (managed NoSQL) | `pymongo`; collections in Section 5. |
| ML — price forecasting | **Python, scikit-learn** (start with Linear/Random Forest Regressor) | Served via a dedicated `/api/ml/*` testing surface — see Section 6. |
| ML — quality grading | **Lightweight CV classifier** (small pretrained CNN fine-tune, or classical CV + heuristic if time-constrained) | Same — dedicated testable endpoint before it's wired into the ask flow. |
| Payments | **Razorpay REST API** (Orders + Payments + Webhooks) | Test mode keys during dev. |
| Reverse proxy | **Nginx** | Serves the built React app as static files **and** reverse-proxies `/api/` to gunicorn — see Section 9.2 for the exact config. |
| App server | **gunicorn**, managed by **systemd** | Auto-restart on crash — critical for demo stability. |
| Hosting | **Azure VM** (Ubuntu) | One VM runs Nginx + gunicorn/Flask; Node.js is a build-time-only tool (can even build on your laptop/CI and just `scp` the `dist/` folder up). |
| Edge/CDN/Security | **Cloudflare** | DNS, proxy, DDoS protection, HTTPS, CDN for static assets. |
| Version control / methodology | **Git**, Agile iterative sprints, modular design | `frontend/` and `backend/` as two clearly separated top-level packages (Section 4) so they can be worked on in parallel. |

### 2.3 Why this is "the best of both worlds"
- **Flask** keeps doing what it's good at and what you already have working: the
  auction engine, pooling logic, ML model serving, Razorpay integration, MongoDB
  access — all pure Python, all unit-testable, none of it rewritten.
- **Nginx** keeps doing what it's good at: TLS termination, static file serving,
  reverse proxying — it now also solves the actual hosting problem by serving a
  static `dist/` folder instead of needing Flask to render every page.
- **React + Vite + Tailwind** gives you a modern, fast, properly hostable frontend
  build without introducing a second always-on Node.js server process to manage,
  monitor, and keep alive on the same VM as Flask.

### 2.4 External data sources (for market data ingestion) — unchanged
- Mandi arrival & price info: `https://www.msamb.com/ApmcDetail/APMCPriceInformation`
- MSAMB Market Network: `https://www.msamb.com/Projects/MarketNetwork`
- National Agriculture Market (eNAM): `https://enam.gov.in/`
- Open Government Data: `https://www.data.gov.in/`
- AgMarkNet: `https://agmarknet.gov.in/home`

Cross-check at least two sources for any price shown to a user.

---

## 3. Complete Directory & File Structure Tree

```
krishi-setu/
├── masterplan.md
├── README.md
├── .gitignore
│
├── frontend/                        # React + Vite + Tailwind (JavaScript, no TS)
│   ├── package.json
│   ├── vite.config.js               # includes dev-server proxy: /api -> localhost:8000
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── .env.example                 # VITE_API_BASE_URL=...
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx                 # React root, router setup
│       ├── App.jsx
│       ├── index.css                # Tailwind directives
│       ├── api/
│       │   ├── client.js            # fetch wrapper, attaches JWT, base URL
│       │   ├── auth.js
│       │   ├── listings.js
│       │   ├── bids.js
│       │   ├── auctions.js
│       │   ├── payments.js
│       │   └── ml.js                # calls the model-testing endpoints (Section 6)
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.jsx
│       │   │   └── ProtectedRoute.jsx
│       │   ├── forms/
│       │   │   ├── AskForm.jsx
│       │   │   └── BidForm.jsx
│       │   ├── widgets/
│       │   │   ├── PriceForecastWidget.jsx
│       │   │   └── GradingResultCard.jsx
│       │   └── ui/                  # buttons, cards, inputs (Tailwind-styled)
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── farmer/
│       │   │   ├── FarmerDashboard.jsx
│       │   │   ├── SubmitAskPage.jsx
│       │   │   └── PayoutsPage.jsx
│       │   ├── buyer/
│       │   │   ├── BuyerDashboard.jsx
│       │   │   ├── BrowseBatchesPage.jsx
│       │   │   └── SubmitBidPage.jsx
│       │   └── admin/
│       │       ├── AuctionMonitorPage.jsx
│       │       └── GradingReviewQueuePage.jsx
│       └── utils/
│           └── format.js
│
├── backend/                         # Flask JSON API only — no Jinja templates
│   ├── requirements.txt
│   ├── run.py                       # entry point
│   ├── config.py                    # reads .env: MONGODB_URI, JWT_SECRET, RAZORPAY_*
│   ├── .env.example
│   │
│   ├── app/
│   │   ├── __init__.py              # create_app(): CORS, JWT, blueprints, extensions
│   │   ├── extensions.py            # mongo client, razorpay client, scheduler
│   │   │
│   │   ├── models/                  # thin Mongo data-access wrappers
│   │   │   ├── user.py
│   │   │   ├── produce_listing.py
│   │   │   ├── bid.py
│   │   │   ├── pooled_batch.py
│   │   │   ├── auction_round.py
│   │   │   ├── trade.py
│   │   │   ├── payment.py
│   │   │   ├── market_price.py
│   │   │   ├── grading_record.py
│   │   │   └── warehouse.py
│   │   │
│   │   ├── auth/
│   │   │   ├── routes.py            # POST /api/auth/register, /login, /refresh
│   │   │   └── utils.py             # password hashing, JWT issuing
│   │   │
│   │   ├── farmer/
│   │   │   └── routes.py            # /api/farmer/listings, /api/farmer/payouts
│   │   ├── buyer/
│   │   │   └── routes.py            # /api/buyer/bids, /api/buyer/batches
│   │   ├── admin/
│   │   │   └── routes.py            # /api/admin/auctions, /api/admin/review-queue
│   │   │
│   │   ├── auction_engine/
│   │   │   ├── matcher.py
│   │   │   ├── pooling.py
│   │   │   ├── batch_scheduler.py
│   │   │   └── settlement_trigger.py
│   │   │
│   │   ├── grading/
│   │   │   ├── model_loader.py
│   │   │   ├── infer.py
│   │   │   └── review_queue.py
│   │   │
│   │   ├── price_forecast/
│   │   │   ├── train.py
│   │   │   ├── model.py
│   │   │   └── predict.py
│   │   │
│   │   ├── ml_testing/               # NEW — see Section 6
│   │   │   └── routes.py            # /api/ml/predict-price, /api/ml/grade-produce, /api/ml/model-status
│   │   │
│   │   ├── payments/
│   │   │   ├── razorpay_client.py
│   │   │   ├── routes.py
│   │   │   └── payout_split.py
│   │   │
│   │   ├── market_data/
│   │   │   ├── sources/
│   │   │   │   ├── enam.py
│   │   │   │   ├── agmarknet.py
│   │   │   │   └── data_gov_in.py
│   │   │   ├── ingest.py
│   │   │   └── routes.py            # /api/market/prices
│   │   │
│   │   ├── warehouse/
│   │   │   └── routes.py
│   │   │
│   │   └── utils/
│   │       ├── validators.py
│   │       ├── decorators.py        # @jwt_required, @role_required("farmer")
│   │       ├── geo.py
│   │       └── logger.py
│   │
│   └── uploads/                     # produce photos (served by Nginx as static media)
│
├── ml/
│   ├── datasets/
│   │   ├── raw/
│   │   └── processed/
│   ├── notebooks/
│   ├── saved_models/
│   │   ├── price_forecast_model.pkl
│   │   └── grading_model.<ext>
│   ├── evaluation/                  # NEW — metrics from the model currently being tested
│   │   ├── price_forecast_metrics.json
│   │   ├── grading_confusion_matrix.png
│   │   └── test_report.md
│   └── training_scripts/
│       ├── train_price_forecast.py
│       └── train_grading_model.py
│
├── deployment/
│   ├── nginx/
│   │   └── krishi-setu.conf         # exact config — see Section 9.2
│   ├── systemd/
│   │   └── krishi-setu-api.service  # gunicorn/Flask as a managed service
│   ├── azure/
│   │   └── setup_notes.md
│   └── cloudflare/
│       └── dns_ssl_notes.md
│
├── scripts/
│   ├── seed_db.py
│   └── run_batch_auction_cli.py
│
└── tests/
    ├── backend/
    │   ├── test_auth.py
    │   ├── test_auction_engine.py
    │   ├── test_pooling.py
    │   ├── test_payments.py
    │   ├── test_grading.py
    │   └── test_price_forecast.py
    └── frontend/
        └── (component tests, if time allows — Vitest + React Testing Library)
```

---

## 4. Frontend ↔ Backend Contract

Because the frontend and backend are now two separate apps, this contract is what
keeps them in sync — treat it as authoritative and update it whenever a route changes.

- **Base URL:** frontend reads `VITE_API_BASE_URL` from `frontend/.env` (e.g.
  `http://localhost:8000/api` in dev, `/api` in production since Nginx proxies it on
  the same domain — no CORS needed in production at all).
- **Dev-time CORS:** only needed because `npm run dev` (Vite, port 5173) and
  `flask run` (port 8000) are different origins locally. Two options — pick one and
  document it in `README.md`:
  1. `flask-cors` allowing `http://localhost:5173` in dev config, **or**
  2. Vite's dev-server proxy (`vite.config.js` → `server.proxy['/api']`) so the
     browser only ever talks to Vite's own origin, and Vite forwards `/api/*` to
     Flask. **Recommended** — it also means the frontend code never needs to special-case
     dev vs. prod API URLs.
- **Auth:** every authenticated request sends `Authorization: Bearer <JWT>`. The
  frontend's `api/client.js` attaches this automatically and redirects to `/login` on
  a `401`.
- **Response shape:** every endpoint returns `{ "data": ..., "error": null }` on
  success and `{ "data": null, "error": { "code": "...", "message": "..." } }` on
  failure — one consistent shape the frontend never has to guess about.
- **Route inventory (fill in as built; keep this list current):**

  | Method | Path | Purpose |
  |---|---|---|
  | POST | `/api/auth/register` | Create user (role: farmer/buyer) |
  | POST | `/api/auth/login` | Returns JWT access + refresh token |
  | GET | `/api/farmer/listings` | Farmer's own asks |
  | POST | `/api/farmer/listings` | Submit a new ask (multipart: fields + photo) |
  | GET | `/api/farmer/payouts` | Trade/payout history |
  | GET | `/api/buyer/batches` | Open pooled batches to bid on |
  | POST | `/api/buyer/bids` | Submit a bid |
  | GET | `/api/admin/auctions` | Live auction round monitor |
  | GET | `/api/admin/review-queue` | Low-confidence grading records |
  | POST | `/api/ml/predict-price` | **Model-testing endpoint** — see Section 6 |
  | POST | `/api/ml/grade-produce` | **Model-testing endpoint** — see Section 6 |
  | GET | `/api/ml/model-status` | **Model-testing endpoint** — see Section 6 |
  | POST | `/api/payments/create-order` | Create Razorpay order for a trade |
  | POST | `/api/payments/webhook` | Razorpay webhook receiver |
  | GET | `/api/market/prices` | Ingested/cross-checked mandi price series |
  | GET | `/api/warehouse/nearby` | Warehouse/silo search (stretch) |

---

## 5. Core Data Models / Database Schema (MongoDB Atlas)

Unchanged from the underlying data model — this is backend-internal and doesn't care
whether the frontend is server-rendered or a SPA. All collections use MongoDB's native
`_id` (ObjectId). Timestamps are ISO 8601 UTC. Use MongoDB **schema validation**
(`$jsonSchema`) on each collection — this directly answers the evaluator's "does it
degrade gracefully or just break" question.

### 5.1 `users`
```json
{
  "_id": "ObjectId",
  "role": "farmer | buyer | fpo | admin",
  "name": "string",
  "phone": "string (unique, indexed)",
  "email": "string (optional)",
  "password_hash": "string",
  "language_pref": "string (e.g. 'mr', 'hi', 'en')",
  "location": {
    "village_or_city": "string", "district": "string", "state": "string",
    "geo": { "type": "Point", "coordinates": ["lng", "lat"] }
  },
  "kyc_verified": "boolean",
  "fpo_id": "ObjectId | null",
  "created_at": "datetime", "updated_at": "datetime"
}
```

### 5.2 `produce_listings` (farmer "asks")
```json
{
  "_id": "ObjectId",
  "farmer_id": "ObjectId -> users",
  "crop": "string", "variety": "string",
  "quantity_kg": "number", "quantity_remaining_kg": "number",
  "ask_price_per_kg": "number", "min_acceptable_price_per_kg": "number",
  "quality_grade": "A | B | C | ungraded",
  "grading_record_id": "ObjectId -> grading_records | null",
  "status": "open | pooled | matched | settled | expired | cancelled",
  "pooled_batch_id": "ObjectId -> pooled_batches | null",
  "harvest_date": "datetime",
  "location": { "geo": { "type": "Point", "coordinates": ["lng", "lat"] } },
  "created_at": "datetime", "updated_at": "datetime"
}
```

### 5.3 `pooled_batches`
```json
{
  "_id": "ObjectId", "crop": "string", "quality_grade": "A | B | C",
  "total_quantity_kg": "number",
  "listing_ids": ["ObjectId -> produce_listings"],
  "region": "string",
  "status": "open | locked_for_auction | matched | partially_matched | closed",
  "created_at": "datetime"
}
```

### 5.4 `bids`
```json
{
  "_id": "ObjectId", "buyer_id": "ObjectId -> users", "crop": "string",
  "quantity_needed_kg": "number", "quantity_remaining_kg": "number",
  "max_price_per_kg": "number", "min_quality_grade": "A | B | C",
  "status": "open | matched | partially_matched | expired | cancelled",
  "created_at": "datetime", "updated_at": "datetime"
}
```

### 5.5 `auction_rounds`
```json
{
  "_id": "ObjectId", "crop": "string",
  "window_start": "datetime", "window_end": "datetime",
  "status": "scheduled | running | completed | no_match",
  "clearing_price_per_kg": "number | null",
  "matched_trade_ids": ["ObjectId -> trades"],
  "created_at": "datetime"
}
```

### 5.6 `trades`
```json
{
  "_id": "ObjectId", "auction_round_id": "ObjectId -> auction_rounds",
  "buyer_id": "ObjectId -> users", "pooled_batch_id": "ObjectId -> pooled_batches",
  "farmer_shares": [
    { "farmer_id": "ObjectId", "quantity_kg": "number", "payout_amount": "number" }
  ],
  "crop": "string", "quantity_kg": "number", "clearing_price_per_kg": "number",
  "total_amount": "number",
  "status": "pending_payment | payment_processing | settled | failed | disputed",
  "created_at": "datetime", "settled_at": "datetime | null"
}
```

### 5.7 `payments`
```json
{
  "_id": "ObjectId", "trade_id": "ObjectId -> trades",
  "razorpay_order_id": "string", "razorpay_payment_id": "string | null",
  "razorpay_signature": "string | null",
  "amount": "number", "currency": "INR",
  "status": "created | authorized | captured | failed | refunded",
  "webhook_verified": "boolean",
  "created_at": "datetime", "updated_at": "datetime"
}
```

### 5.8 `grading_records`
```json
{
  "_id": "ObjectId", "listing_id": "ObjectId -> produce_listings",
  "image_url": "string", "predicted_grade": "A | B | C", "confidence": "number (0-1)",
  "needs_human_review": "boolean", "manual_override_grade": "A | B | C | null",
  "reviewed_by": "ObjectId -> users | null", "created_at": "datetime"
}
```

### 5.9 `market_prices`
```json
{
  "_id": "ObjectId", "crop": "string", "mandi_name": "string",
  "source": "enam | agmarknet | msamb | data_gov_in", "date": "date",
  "min_price_per_quintal": "number", "max_price_per_quintal": "number",
  "modal_price_per_quintal": "number", "ingested_at": "datetime"
}
```

### 5.10 `warehouses`
```json
{
  "_id": "ObjectId", "name": "string", "type": "warehouse | silo | cold_storage",
  "location": { "geo": { "type": "Point", "coordinates": ["lng", "lat"] } },
  "capacity_tonnes": "number", "crop_types_supported": ["string"],
  "contact_phone": "string", "source": "string"
}
```

### 5.11 Indexes
- `users.phone` — unique
- `produce_listings.status`, `.crop`, `.location.geo` (2dsphere)
- `bids.status`, `.crop`
- `pooled_batches.status`, `.crop`
- `trades.status`
- `market_prices.{crop, mandi_name, date}` — compound
- `warehouses.location.geo` (2dsphere)

---

## 6. ML Model Testing & Serving Strategy

This section exists because a model is actively being tested right now — it defines
how a model goes from "training script output" to "something the API can serve and
the frontend can call," **with an explicit testing stage in between**, so an
unfinished/unreliable model never silently breaks the auction flow.

### 6.1 The three stages every model goes through
1. **Offline training & evaluation** (`ml/training_scripts/`, `ml/evaluation/`) —
   happens outside the running app. Produces a `.pkl`/model artifact plus a written
   metrics report (`ml/evaluation/test_report.md`): accuracy/F1 for grading,
   MAE/RMSE for price forecasting, on a held-out test split. **Do not skip the held-out
   split** — testing on training data is how you end up demoing a model that silently
   fails on real inputs.
2. **Isolated API testing** (`backend/app/ml_testing/routes.py`) — the model is loaded
   and exposed on its own endpoints (`/api/ml/predict-price`, `/api/ml/grade-produce`,
   `/api/ml/model-status`) **independently of the ask/auction flow**. This is the stage
   you're at right now: you can `curl`/Postman/call these directly from the frontend's
   `api/ml.js` to sanity-check real predictions before anything downstream depends on
   them.
3. **Wired into the product flow** — only after Stage 2 passes manual + automated
   checks does `grading/infer.py` / `price_forecast/predict.py` get called from the
   real ask-submission and dashboard code paths (Milestones 7–8 in Section 8).

### 6.2 `/api/ml/model-status` (GET)
Returns which models are currently loaded, their version/trained-on date, and basic
health, e.g.:
```json
{
  "data": {
    "grading_model": { "loaded": true, "version": "2026-09-20", "trained_on_n_images": 240 },
    "price_forecast_model": { "loaded": true, "version": "2026-09-22", "mae_inr_per_quintal": 145.2 }
  },
  "error": null
}
```
The frontend can show this on the admin dashboard as a simple "model health" widget —
useful during judging if someone asks "how do you know your model works."

### 6.3 `/api/ml/predict-price` (POST)
Input: `{ crop, mandi_name, date }` (or feature vector, depending on final training
design). Output: `{ predicted_price_per_quintal, confidence_interval, fallback_used: bool }`.
- `fallback_used: true` whenever the moving-average fallback (Section 10, edge case 5)
  kicks in instead of the trained model — the frontend should visibly flag this
  ("estimate based on recent average, not the trained model") rather than hide it.

### 6.4 `/api/ml/grade-produce` (POST)
Input: multipart form with an image file (+ optional crop type). Output:
`{ predicted_grade, confidence, needs_human_review }`.
- Below `GRADING_CONFIDENCE_THRESHOLD` (env var, default `0.7`) →
  `needs_human_review: true`; the frontend's `GradingResultCard.jsx` should show this
  plainly rather than presenting an uncertain guess as a confident grade.

### 6.5 Test harness for the model currently being tested
- `tests/backend/test_grading.py` / `test_price_forecast.py`: load the saved model
  artifact, run it against a small fixed sample set checked into
  `ml/datasets/processed/sample_test_cases/`, and assert predictions fall within
  expected bounds — this catches "the model file changed and now predicts garbage"
  before it ever reaches the frontend.
- Manually exercise `/api/ml/predict-price` and `/api/ml/grade-produce` with a handful
  of real and deliberately-bad inputs (blurry photo, a crop/date combo with zero
  training data) and confirm the responses degrade the way Section 10 describes —
  never a raw 500 error reaching the frontend.
- Record results in `ml/evaluation/test_report.md` as you iterate — this becomes your
  answer to the evaluator's "how do you know it works" and "what happens with real
  production-scale data" questions.

---

## 7. Hosting & Deployment Deep-Dive

This section is the direct fix for "I am unable to host the website."

### 7.1 What actually needs to run on the Azure VM at all times
- **Nginx** (always running, systemd-managed by the OS package itself)
- **gunicorn running the Flask app** (systemd service you write — Section 7.3)
- **MongoDB Atlas** — not on the VM at all, it's a managed cloud service; the VM just
  needs outbound network access to it.

**Node.js/npm is NOT a runtime dependency on the VM.** You build the frontend
(`npm run build`) either on your own machine or in a CI step, and only upload the
resulting `frontend/dist/` folder to the server. This is the single biggest fix
compared to the earlier Flask/Jinja approach where the whole page had to be rendered
server-side.

### 7.2 Nginx config (`deployment/nginx/krishi-setu.conf`)
Document the following structure precisely (write it as a real file, don't leave it as
a description):

```nginx
server {
    listen 80;
    server_name your-domain.example;

    # Serve the built React app
    root /var/www/krishi-setu/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;   # SPA client-side routing fallback
    }

    # Reverse proxy API calls to Flask/gunicorn
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve uploaded produce photos directly (not through Flask)
    location /uploads/ {
        alias /var/www/krishi-setu/backend/uploads/;
    }
}
```
(Add the HTTPS/443 server block once Cloudflare "Full (strict)" + an origin certificate
are set up — document that as a second server block in the same file.)

### 7.3 systemd service for the API (`deployment/systemd/krishi-setu-api.service`)
```ini
[Unit]
Description=Krishi-Setu Flask API (gunicorn)
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/krishi-setu/backend
EnvironmentFile=/var/www/krishi-setu/backend/.env
ExecStart=/var/www/krishi-setu/backend/venv/bin/gunicorn -w 4 -b 127.0.0.1:8000 run:app
Restart=always

[Install]
WantedBy=multi-user.target
```
`Restart=always` is what keeps a crash from ending the demo — the process comes back
on its own.

### 7.4 Deploy steps (document these exactly, in order)
1. On the VM: `git clone` the repo (or `git pull` on redeploy) into `/var/www/krishi-setu`.
2. **Backend:** create a Python venv, `pip install -r backend/requirements.txt`,
   populate `backend/.env` from `.env.example`, enable + start the systemd service
   from Section 7.3.
3. **Frontend:** either (a) run `npm install && npm run build` directly on the VM
   inside `frontend/`, or (b) build locally/in CI and `scp`/`rsync` the resulting
   `dist/` folder to `/var/www/krishi-setu/frontend/dist` on the VM. Either is fine —
   (b) keeps Node.js off the VM entirely if you want the smallest possible server footprint.
4. Install the Nginx config from Section 7.2, `nginx -t` to validate, `systemctl reload nginx`.
5. Point Cloudflare DNS at the VM's public IP, proxy ON, SSL/TLS mode "Full (strict)"
   once an origin certificate is installed — document exact steps in
   `deployment/cloudflare/dns_ssl_notes.md`.
6. **Smoke test:** hit `https://your-domain/` (loads the React app) and
   `https://your-domain/api/ml/model-status` (returns JSON) from a browser that has
   never talked to the VM before (rules out "works on my machine" / stale-cache false positives).

### 7.5 Local development workflow (document in `README.md`)
- Terminal 1: `cd backend && flask run` (port 8000).
- Terminal 2: `cd frontend && npm run dev` (port 5173, proxies `/api` to 8000 per
  Section 4's Vite proxy config).
- This mirrors production closely enough that "works locally, fails on the VM" issues
  are mostly limited to environment variables and the Nginx routing itself.

---

## 8. Step-by-Step Implementation Roadmap

Milestones are **strictly sequential**. Tags: **[MVP]** = required for the hackathon
demo, **[STRETCH]** = only attempt after all [MVP] milestones are fully working and
demo-stable.

### Milestone 0 — Project Scaffolding (both apps) **[MVP]**
1. Initialize Git repo; create the `frontend/` and `backend/` split exactly as in Section 3.
2. **Backend:** Python venv; `requirements.txt` with `flask`, `flask-cors`,
   `flask-jwt-extended`, `pymongo`, `python-dotenv`, `razorpay`, `scikit-learn`,
   `pandas`, `numpy`, `apscheduler`, `gunicorn`, `pytest`. `config.py` reading
   `MONGODB_URI`, `JWT_SECRET_KEY`, `RAZORPAY_KEY_ID/SECRET`, `FLASK_ENV` from `.env`.
   `create_app()` factory registering CORS (dev only) + JWT + blueprints. `/api/health` route.
3. **Frontend:** `npm create vite@latest frontend -- --template react` (JavaScript
   template, not TS). Install `tailwindcss` + configure per Tailwind's Vite guide;
   install `react-router-dom`. Set up `vite.config.js`'s dev proxy per Section 4.
   Create `api/client.js` reading `import.meta.env.VITE_API_BASE_URL`.
4. **Smoke test:** `flask run` serves `/api/health` → `200`; `npm run dev` serves a
   blank Tailwind-styled page that successfully calls `/api/health` through the proxy
   and displays the result.

### Milestone 1 — Database Connection & Core Models **[MVP]**
1. Provision MongoDB Atlas free-tier cluster; whitelist dev + VM IPs.
2. `app/extensions.py` mongo client singleton — fail fast with a clear error if
   `MONGODB_URI` is missing/unreachable (see Section 10).
3. Create all collections from Section 5 with `$jsonSchema` validators + indexes
   (`scripts/init_db.py`).
4. Implement `app/models/` CRUD wrappers.
5. **Smoke test:** `scripts/seed_db.py` inserts demo farmers/buyers/listings/bids;
   verify in Atlas UI.

### Milestone 2 — Authentication (JWT) **[MVP]**
1. Backend: `POST /api/auth/register`, `POST /api/auth/login` issuing JWT
   access+refresh tokens; `@jwt_required`/`@role_required` decorators.
2. Frontend: `LoginPage.jsx`, `RegisterPage.jsx`, `AuthContext.jsx` storing the token
   (memory + `localStorage` for refresh), `ProtectedRoute.jsx` gating role-specific routes.
3. **Smoke test:** register/login a farmer and buyer from the actual React UI; confirm
   protected API calls succeed with the token and fail with a clean `401` without one.

### Milestone 3 — Farmer Module: Listings **[MVP]**
1. Backend: `GET/POST /api/farmer/listings` (multipart for photo upload), validators.
2. Frontend: `AskForm.jsx`, `FarmerDashboard.jsx` listing own asks with status badges.
3. **Smoke test:** submit an ask through the real UI; confirm it lands in
   `produce_listings` with `status: "open"` and appears on the dashboard.

### Milestone 4 — Buyer Module: Bids **[MVP]**
1. Backend: `GET/POST /api/buyer/bids`, `GET /api/buyer/batches`.
2. Frontend: `BidForm.jsx`, `BrowseBatchesPage.jsx`, `BuyerDashboard.jsx`.
3. **Smoke test:** submit a bid through the UI; confirm it lands in `bids`.

### Milestone 5 — Cross-Farmer Pooling **[MVP]**
1. `auction_engine/pooling.py`: group `open` listings by crop+grade+proximity into
   `pooled_batches` once a min-quantity threshold or max-wait timeout is hit.
2. **Smoke test:** seed 3 nearby matching listings; run pooling; confirm one
   `pooled_batches` doc referencing all 3.

### Milestone 6 — Double Auction Engine **[MVP]**
1. `auction_engine/matcher.py`: classic double-auction clearing (asks ascending, bids
   descending, clearing price where supply meets demand).
2. `auction_engine/batch_scheduler.py` (APScheduler, `max_instances=1`).
3. `auction_engine/settlement_trigger.py`: creates `trades` with correct pro-rata
   `farmer_shares` split, handles partial fills.
4. `scripts/run_batch_auction_cli.py` for manual triggering during the live demo.
5. **Smoke test:** CLI-trigger a round against seeded data; confirm correct `trades` doc.

### Milestone 7 — AI Quality Grading, wired in **[MVP]**
*(Assumes Stage 1–2 of Section 6 are already done for this model — this milestone is Stage 3.)*
1. Confirm `/api/ml/grade-produce` (Section 6.4) is passing its test harness.
2. Wire `grading/infer.py` into `POST /api/farmer/listings` photo upload — auto-fills
   `quality_grade`, respects `needs_human_review`.
3. Frontend: `GradingResultCard.jsx` shows grade + confidence + review-pending state.
4. Admin: `GradingReviewQueuePage.jsx` for manual overrides.
5. **Smoke test:** submit a clear photo → auto-graded; submit an ambiguous/blurry one
   → lands in the review queue, never silently mis-graded.

### Milestone 8 — Price Forecasting, wired in **[MVP]**
*(Same relationship to Section 6 as Milestone 7.)*
1. Confirm `/api/ml/predict-price` is passing its test harness, including the
   moving-average fallback path.
2. `market_data/ingest.py` + `sources/*.py`: pull + cross-check historical prices into
   `market_prices`.
3. Frontend: `PriceForecastWidget.jsx` on the farmer dashboard — "sell now vs. hold,"
   visibly flags when `fallback_used: true`.
4. **Smoke test:** widget renders for the demo crop with real ingested data, and
   degrades to a labeled fallback (never an error) for a crop/date with sparse data.

### Milestone 9 — Payments (Razorpay) **[MVP]**
1. `payments/razorpay_client.py`, `POST /api/payments/create-order`,
   `POST /api/payments/webhook` (signature verification), `payout_split.py`.
2. Idempotent recording keyed on `razorpay_order_id`.
3. Frontend: checkout trigger from a matched trade, payment status display, per-farmer
   payout breakdown on `PayoutsPage.jsx`.
4. **Smoke test:** full trade through Razorpay **test mode** end-to-end; `trades.status`
   becomes `settled`; each farmer's payout is correct and visible in the UI.

### Milestone 10 — Warehouse & Silo Finder **[STRETCH]**
1. Seed `warehouses`; `GET /api/warehouse/nearby` geo-search.
2. Frontend: simple "find storage" panel on the farmer dashboard.
3. **Smoke test:** returns nearby warehouses sorted by distance.

### Milestone 11 — Dashboard Polish (all roles) **[MVP]**
1. Round out farmer/buyer/admin dashboards with Tailwind styling consistent with the
   deck's visual language (clean cards, clear status colors, mobile-responsive).
2. Add polling-based live updates (`setInterval` in the relevant pages) for auction
   status and new matches.
3. **Smoke test:** full manual walkthrough of all three roles on desktop and mobile
   viewport widths.

### Milestone 12 — Deployment **[MVP]**
Follow Section 7 exactly: backend systemd service, Nginx config, frontend build +
upload, Cloudflare DNS/SSL.
**Smoke test:** full user journey (register → ask → grade → pool → bid → auction →
forecast → pay) works end-to-end against the deployed URL, from a fresh browser.

### Milestone 13 — Testing, Logging, QA Pass **[MVP]**
1. `tests/backend/`: auction matching correctness (partial-fill/pro-rata math), auth,
   payment idempotency, grading/price-forecast fallback behavior (Section 6.5).
2. Structured logging on every state transition (listings/bids/trades/payments) —
   fast live-demo debugging.
3. Run through every edge case in Section 10 manually against the deployed demo.
4. **Smoke test:** `pytest` passes; manual edge-case pass documented.

### Milestone 14 — Demo & Pitch Readiness **[MVP]**
1. Seed the deployed demo DB with a clean, realistic dataset.
2. Script a demo path hitting every module in under 5 minutes.
3. Prepare answers to the evaluator questions from the PS analysis: data provenance,
   what the AI adds over rules, graceful degradation, production-scale behavior,
   post-deployment success metrics — Section 6's `model-status`/`test_report.md` are
   your evidence here.
4. Fallback demo plan (pre-recorded capture or local backup instance) in case
   Azure/Cloudflare/live internet fails during judging.

---

## 9. Potential Edge Cases & Mitigations

| # | Edge Case | Mitigation |
|---|---|---|
| 1 | **No matching bid/ask in a batch auction window** | `auction_rounds.status = "no_match"`; unmatched pooled batch/bid carries forward to the next window instead of being dropped. |
| 2 | **Partial fill** (pooled batch qty ≠ bid qty) | `matcher.py` does partial matches; remainder stays open/`partially_matched`; pro-rata `farmer_shares` math is unit-tested. |
| 3 | **Concurrent bid/ask submissions during a batch run** | Atomic `findOneAndUpdate` with status checks (optimistic locking) so two auction runs can't double-match the same document. |
| 4 | **Grading model has low confidence / bad photo** | Route to `needs_human_review` (Section 6.4); never silently commit a low-confidence grade; never block ask submission on grading failure — fall back to `"ungraded"` + manual entry. |
| 5 | **Price forecast model has insufficient data for a crop/region** | Fall back to a moving average, flagged via `fallback_used: true` (Section 6.3); if zero data exists, show "insufficient data" rather than a fabricated number. |
| 6 | **External market data source down / blocks scraping** | Cache last successful ingestion; cross-check two sources; show a "last updated at" timestamp so staleness is visible, not hidden. |
| 7 | **MongoDB Atlas connection drop/latency spike** | `pymongo` connection pooling; retry-with-backoff on critical writes; clean "try again" message to the frontend instead of a raw 500. |
| 8 | **Razorpay webhook missing/late/duplicate** | Idempotent recording on `razorpay_order_id`; periodic reconciliation job polls Razorpay for any `payments` stuck beyond a timeout. |
| 9 | **Payment fails after auction match already committed** | `trades.status → failed`; the pooled batch/bid reopen for the next round instead of being treated as sold-and-lost. |
| 10 | **CORS misconfiguration between frontend and API** | Dev: Vite proxy (Section 4) avoids CORS entirely; Prod: same-origin via Nginx (Section 9.2) means CORS headers aren't even needed in production — a genuinely simpler failure mode than a cross-domain setup. |
| 11 | **Stale JWT / expired session mid-form-fill** | Frontend's `api/client.js` catches `401`, attempts a silent refresh via the refresh token, and only redirects to `/login` if that also fails — so a farmer doesn't lose a half-filled ask form to an expired token. |
| 12 | **Frontend build succeeds locally but breaks on the VM** | Always sanity-check with `npm run preview` (serves the actual production build) before deploying, and use the exact Node LTS version documented in `frontend/.gitignore`'s sibling `README.md` on both machines. |
| 13 | **Farmer has no smartphone / limited connectivity** | MVP is web-only by explicit scope decision (Section 1.3); SMS/kiosk/WhatsApp is Phase 2/STRETCH — say so plainly in the pitch. |
| 14 | **Distrust of AI grading among farmers** | Human review queue (edge case 4) doubles as a trust-building mechanism; show the AI's confidence score, not just a black-box grade. |
| 15 | **Input validation / malicious input (XSS, injection, absurd values)** | Server-side validation on every route; React auto-escapes rendered content by default (never use `dangerouslySetInnerHTML` on user content); parameterized Mongo queries via `pymongo`; JWT + role checks on every mutating endpoint. |
| 16 | **Auction scheduler job crashes or overlaps with itself** | APScheduler `max_instances=1` + try/except with logging so one bad run doesn't crash the app or double-run. |
| 17 | **Demo-day network/Azure/Cloudflare outage** | Fallback demo plan per Milestone 14.4. |
| 18 | **Evaluator asks "is this real or synthetic data?"** | Honest, specific per-module answer ready (Milestone 14.3), backed by `ml/evaluation/test_report.md`. |
| 19 | **Pooled batch sits open too long with too little volume** | Pooling enforces a max-wait timeout in addition to the volume threshold. |
| 20 | **Two farmers in a pool have different quality grades** | Pooling only groups listings with the **same** `quality_grade` — never mixes grades into one batch. |
| 21 | **Model file (`.pkl`) updated/retrained mid-hackathon and starts predicting garbage** | Section 6.5's fixed-sample test harness catches this before it reaches the frontend — run it after every retrain, not just once. |

---

## Appendix A — Environment Variables Reference

**`backend/.env`**
```
FLASK_ENV=development
JWT_SECRET_KEY=
MONGODB_URI=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
AUCTION_BATCH_INTERVAL_MINUTES=15
POOLING_MIN_QUANTITY_KG=500
POOLING_MAX_WAIT_MINUTES=60
GRADING_CONFIDENCE_THRESHOLD=0.7
CORS_ALLOWED_ORIGIN=http://localhost:5173
```

**`frontend/.env`**
```
VITE_API_BASE_URL=/api
```

## Appendix B — Source Material
Compiled from: the team's SIH26132 idea-submission deck ("Krishi-Setu", team
KS-SAND — platform overview, technical approach, feasibility/risks, impact slides),
the team's original architecture sketch (Cloudflare → Azure VM → Nginx → Flask →
Backend.py → MongoDB Atlas / Model.py / Datasets / Razorpay API / Templates), and a
third-party compiled analysis of the official SIH26132 problem statement. **Re-verify
the official PS wording on sih.gov.in before final submission.**
