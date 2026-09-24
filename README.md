# Krishi-Setu (कृषि-सेतु)

> **SIH 2026 · Problem Statement ID: 26132 · Team KS-SAND**  
> *"Strengthening Market Linkages and Price Discovery for Farmers"*

Krishi-Setu is a modern double-auction market-linkage platform engineered to connect smallholder farmers and Farmer Producer Organizations (FPOs) directly with institutional, processing, and bulk buyers. By combining AI-assisted visual produce grading, multi-farmer lot pooling, real-time double-auction clearing, predictive price forecasting, and automated pro-rata settlement via Razorpay, Krishi-Setu replaces fragmented informal post-harvest sales with an equitable, transparent two-sided marketplace.

---

## 🌾 Key Capabilities

1. **Farmer Asks & AI Quality Grading:**
   - Farmers list produce (crop, variety, quantity, minimum reserve price).
   - Computer vision models provide instant preliminary quality grading (Grade A/B/C) with human-in-the-loop fallback review for low-confidence estimates.
2. **Cross-Farmer Pooling:**
   - Aggregates small, fragmented lots from nearby farms matching the same crop and grade into commercial-scale batches to satisfy bulk buyer volume requirements.
3. **Double-Auction Matching Engine:**
   - Periodic batch auctions clear bids and asks where supply intersects demand, determining a single fair clearing price per round.
4. **Price Discovery & Forecasting:**
   - Integrates historical mandi price feeds (eNAM, Agmarknet, MSAMB) and scikit-learn forecasting models to deliver actionable "sell now vs. hold" guidance.
5. **Traceable Pro-Rata Settlement:**
   - Integrates Razorpay escrow/order creation, automatically dispersing funds pro-rata across contributing farmers upon trade clearance.
6. **Warehouse & Silo Linkages:**
   - Geospatial locator for state and private storage facilities (warehouses/silos/cold storage) so farmers can store crops when holding for better market prices.

---

## 🛠 Tech Stack Summary

| Component | Technology | Rationale / Details |
|---|---|---|
| **Frontend** | React 18, Vite, TailwindCSS | Fast single-page application (SPA), JavaScript (`.jsx`), zero runtime Node.js dependency in production (static bundle served by Nginx). |
| **Frontend Routing** | React Router v6 | Client-side routing with role-based route protection (`/farmer/*`, `/buyer/*`, `/admin/*`). |
| **Backend API** | Python 3.11+, Flask (RESTful) | Decoupled JSON-only API using Application Factory pattern, Blueprints, and JWT authentication (`flask-jwt-extended`). |
| **Database** | MongoDB Atlas (NoSQL) | Flexible document store with `$jsonSchema` validation and 2dsphere geospatial indexing. |
| **Auction & Jobs** | APScheduler (In-Process) | Periodic batch auction matching and pooling window management with single-instance locking. |
| **Machine Learning** | scikit-learn, OpenCV / PyTorch | Random Forest regression for price forecasting; lightweight image classifier for visual crop grading. |
| **Payments** | Razorpay REST API | Test and live mode payment processing, automated signature verification, and multi-seller split calculations. |
| **Web Server / Reverse Proxy**| Nginx | Serves static React build (`dist/`), reverse-proxies `/api/` to Gunicorn, and serves static `/uploads/`. |
| **Process Manager** | Systemd + Gunicorn | Production WSGI app server with auto-restart resilience (`Restart=always`). |
| **CDN & DNS** | Cloudflare | DNS management, automatic SSL termination, DDoS protection, edge caching. |

---

## 📋 Prerequisites

Before running Krishi-Setu locally or deploying to production, ensure you have:

- **Python:** Version `3.11` or higher
- **Node.js:** Version `18.x` or higher (LTS recommended) and `npm 9+`
- **Database:** A running MongoDB Atlas cluster (free M0 tier or higher) or a local MongoDB 6.0+ instance
- **Razorpay Account:** Test Key ID and Key Secret (from [Razorpay Dashboard](https://dashboard.razorpay.com/))
- **Git:** For version control

---

## 🚀 Quick Start Instructions

### 1. Repository Setup

```bash
git clone https://github.com/your-org/krishi-setu.git
cd krishi-setu
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
# On Linux/macOS:
python3 -m venv venv
source venv/bin/activate

# On Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and Razorpay keys
```

### 3. Frontend Setup

```bash
# Open a separate terminal and navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Configure environment variables
cp .env.example .env
# Default VITE_API_BASE_URL is /api (proxied in Vite dev server)
```

---

## 💻 Local Development Workflow

To develop locally, run the backend and frontend simultaneously in separate terminals:

### Terminal 1: Backend API (Flask)
```bash
cd backend
# Ensure virtual environment is activated
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
flask run --port 8000
```
*The Flask API will run at `http://localhost:8000`.*

### Terminal 2: Frontend Client (Vite Dev Server)
```bash
cd frontend
npm run dev
```
*The React SPA will run at `http://localhost:5173`.*

> **Note on Local Proxying:**  
> Vite's development server is configured in `vite.config.js` to automatically proxy all `/api` requests to `http://localhost:8000`. This eliminates CORS issues in development and mirrors the exact same-origin reverse-proxy architecture used in production Nginx.

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Example / Default |
|---|---|---|
| `FLASK_ENV` | Application environment (`development` or `production`) | `development` |
| `SECRET_KEY` | Flask secret key for signing session elements | `your-secret-key-here` |
| `JWT_SECRET_KEY` | Secret key used to sign and verify JWT tokens | `your-jwt-super-secret` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/krishi_setu?retryWrites=true&w=majority` |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID (test or live) | `rzp_test_xxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret | `xxxxxxxxxxxxxxxxxxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification secret from Razorpay dashboard | `whsec_xxxxxxxxxxxx` |
| `AUCTION_BATCH_INTERVAL_MINUTES` | Frequency of automated double-auction matching rounds | `15` |
| `POOLING_MIN_QUANTITY_KG` | Minimum volume threshold to trigger lot pooling | `500` |
| `POOLING_MAX_WAIT_MINUTES` | Maximum time a listing waits in pool before matching | `60` |
| `GRADING_CONFIDENCE_THRESHOLD` | Threshold below which grading requests route to human review | `0.7` |
| `CORS_ALLOWED_ORIGIN` | Allowed cross-origin origin for development mode | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Value |
|---|---|---|
| `VITE_API_BASE_URL` | Base endpoint path for backend API requests | `/api` |

---

## 🏗 Project Structure Overview

```text
krishi-setu/
├── .gitignore                      # Git exclusion rules
├── README.md                       # Main project documentation
├── masterplan.md                   # Single source of truth / architecture guide
│
├── frontend/                       # React 18 + Vite + TailwindCSS SPA
│   ├── package.json                # Dependencies and scripts
│   ├── vite.config.js              # Vite config with /api reverse proxy
│   ├── tailwind.config.js          # Crop-green & earth-tone design tokens
│   ├── index.html                  # HTML entry point
│   └── src/
│       ├── main.jsx                # Application root and router
│       ├── api/                    # API client wrappers (JWT auth, listings, ML)
│       ├── context/                # React Contexts (AuthContext)
│       ├── components/             # Reusable UI widgets and forms
│       └── pages/                  # Role-based pages (farmer, buyer, admin)
│
├── backend/                        # Flask JSON REST API
│   ├── requirements.txt            # Python dependencies
│   ├── run.py                      # Production WSGI entry point
│   ├── config.py                   # Configuration loader
│   ├── app/
│   │   ├── __init__.py             # Application factory (Flask, CORS, JWT)
│   │   ├── extensions.py           # Singletons (MongoDB, Razorpay, Scheduler)
│   │   ├── auth/                   # Authentication & token endpoints
│   │   ├── farmer/                 # Farmer listings & payout endpoints
│   │   ├── buyer/                  # Buyer bids & batch discovery endpoints
│   │   ├── auction_engine/         # Double auction matcher, pooling, scheduler
│   │   ├── grading/                # Produce visual quality inference
│   │   ├── price_forecast/         # Price regression model inference
│   │   ├── ml_testing/             # Isolated testing surface for ML models
│   │   ├── payments/               # Razorpay order creation & webhook handlers
│   │   ├── market_data/            # Mandi price ingestion & aggregation
│   │   └── models/                 # MongoDB collection data-access schemas
│   └── uploads/                    # Farmer-submitted produce photos
│
├── ml/                             # Machine learning pipelines & artifacts
│   ├── datasets/                   # Raw and preprocessed price/image datasets
│   ├── notebooks/                  # EDA and model experimentation notebooks
│   ├── saved_models/               # Serialized model binaries (.pkl, etc.)
│   ├── evaluation/                 # Metrics reports and validation logs
│   └── training_scripts/           # Reproducible model training scripts
│
├── deployment/                     # Production infrastructure configurations
│   ├── nginx/                      # Nginx reverse proxy configuration
│   ├── systemd/                    # Linux systemd service unit for Gunicorn
│   ├── azure/                      # Ubuntu VM deployment and setup notes
│   └── cloudflare/                 # Cloudflare DNS, SSL/TLS, and proxy setup
│
└── tests/                          # Automated test suites
    ├── backend/                    # Pytest test cases (auth, auction, ML)
    └── frontend/                   # Component test harness
```

---

## 🌐 Production Deployment Overview

In production, Krishi-Setu runs on an Ubuntu Azure Virtual Machine fronted by Cloudflare:

1. **Build Step:** The React frontend is compiled to static assets (`frontend/dist/`) via `npm run build`.
2. **Reverse Proxy (Nginx):**
   - Serves the static React application from `/var/www/krishi-setu/frontend/dist`.
   - Proxies `/api/*` calls to the Gunicorn WSGI server running locally at `127.0.0.1:8000`.
   - Serves user-uploaded media directly from `/var/www/krishi-setu/backend/uploads/`.
3. **Application Server (Gunicorn):**
   - Managed via a dedicated `systemd` service (`krishi-setu-api.service`) with automated restart on failure.
4. **Cloudflare Security & CDN:**
   - DNS proxying, SSL/TLS termination (Full / Strict mode), and caching of static assets.

For step-by-step production setup, refer to:
- [Azure VM Setup Guide](file:///e:/KrishiSetu/deployment/azure/setup_notes.md)
- [Nginx Configuration](file:///e:/KrishiSetu/deployment/nginx/krishi-setu.conf)
- [Systemd Service Unit](file:///e:/KrishiSetu/deployment/systemd/krishi-setu-api.service)
- [Cloudflare DNS & SSL Guide](file:///e:/KrishiSetu/deployment/cloudflare/dns_ssl_notes.md)

---

## 🧪 Running Tests

```bash
# Run backend test suite
cd backend
source venv/bin/activate
pytest ../tests/backend -v
```

---

## 📄 License
This project is developed for the Smart India Hackathon (SIH 2026). All rights reserved.
