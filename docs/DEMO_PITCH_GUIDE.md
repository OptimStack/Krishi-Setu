# Krishi-Setu: 5-Minute Live Pitch & Demo Script
**Team:** KS-SAND (Smart India Hackathon 2026)  
**Problem Statement:** SIH26132 — AI-Driven Decentralized Agricultural Marketplace  
**Demo Target:** Deployed Production App / Local Backup Instance  
**Estimated Time:** Exactly 4 minutes 45 seconds (leaving 15s buffer)

---

## ⏱️ Pitch Timeline Overview

| Timestamp | Module / Persona | Primary Screen & Action | Key Message / Impact |
|---|---|---|---|
| **0:00 - 0:45** | **The Hook** | Landing Page (`/`) | Fragmented smallholder crisis, middleman cartels, and 20-30% distress selling. |
| **0:45 - 2:00** | **Farmer Flow** | Farmer Dashboard (`/farmer`) | AI Computer Vision Grading, Cross-Farmer Pooling, Price Forecast Intelligence. |
| **2:00 - 3:00** | **Buyer Flow** | Buyer Dashboard (`/buyer`) | Institutional procurement of pooled batches, Orderbook & Double Auction clearing. |
| **3:00 - 3:45** | **Settlement & Storage** | Payouts & Warehouses | Instant Razorpay escrow, pro-rata farmer payouts, nearby cold storage locator. |
| **3:45 - 4:45** | **Admin & Tech Defense** | Admin Console (`/admin`) | Live ML Model Health, Human Grading Review Queue, Audit Logs, and Edge Cases. |

---

## 🎯 Scene-by-Scene Walkthrough Script

### 🎬 Scene 1: The Problem & The Hook (0:00 – 0:45)
- **Visual:** Open browser on the KrishiSetu Landing Page (`/`).
- **Speaker:**
  > "Honorable evaluators, 86% of Indian farmers are smallholders with sub-hectare landholdings. When harvest comes, a single farmer with only 300 to 500 kilograms of produce cannot attract institutional buyers like ITC or Reliance Retail. They are forced into local APMC mandis where cartelized middlemen take 6 to 10% commission, arbitrarily downgrade quality by hand, and trigger severe distress sales.
  >
  > Welcome to **Krishi-Setu** — India’s first AI-powered decentralized agricultural marketplace with intelligent cross-farmer lot pooling, automated computer-vision grading, and transparent periodic double-auctions."

---

### 🎬 Scene 2: The Farmer Journey (0:45 – 2:00)
- **Credentials:** Phone: `9876543210` | Password: `demo123` (Ramesh Patil, Niphad, Nashik)
- **Click Path:** Click **Login** -> enter credentials -> land on `/farmer`.

#### Step 2.1: Computer Vision Produce Grading (0:45 – 1:15)
- **Action:** Click **"List New Produce"**. Fill: Crop: `Onion (Nashik Red)`, Quantity: `400 kg`, Ask Price: `₹25.00/kg`. Click **"Upload Produce Photo"** (or use the visual grading tool).
- **Speaker:**
  > "Watch how Ramesh lists his harvest. Instead of relying on a middleman's subjective mood, our lightweight Computer Vision model inspects physical features — color uniformity, surface texture variance, and defect ratios.
  > In less than 100 milliseconds, it classifies the produce as **Grade A** with **94% confidence**. Notice that if lighting or image quality were ambiguous, the platform never hallucinates: it flags it with `needs_human_review: true` and routes it to the operator queue."

#### Step 2.2: Cross-Farmer Proximity Pooling (1:15 – 1:40)
- **Visual:** Point to the **Active Listings & Pooling Status** card.
- **Speaker:**
  > "Here is our core breakthrough: Ramesh only has 400 kg. Alone, he is ignored by wholesale buyers. But within a 15 km radius in Niphad and Lasalgaon, Suresh has 350 kg and Santosh has 250 kg of the exact same **Grade A Onion**.
  > KrishiSetu’s geo-spatial pooling algorithm automatically clusters them into a **1,000 kg unified wholesale batch**. Smallholders gain the pricing power and order-matching eligibility of large commercial farms, while our rules strictly guarantee that different grades or distant farmers are never co-mingled."

#### Step 2.3: Price Intelligence & Decision Support (1:40 – 2:00)
- **Visual:** Point to the **Price Forecast Widget** ("Sell Now vs. Hold").
- **Speaker:**
  > "Ramesh also sees our Price Forecast model trained on daily Agmarknet historical trends. It predicts a 6% price surge in the next 10 days and recommends 'HOLD with cold storage'. And if data for a rare crop is sparse, it gracefully degrades to a 30-day moving average, visibly flagged with `fallback_used: true`."

---

### 🎬 Scene 3: The Institutional Buyer Journey (2:00 – 3:00)
- **Credentials:** Logout -> Login as Buyer: `9876543220` | Password: `demo123` (FreshFarm Retail Pvt Ltd, Pune).
- **Click Path:** Land on `/buyer`.

#### Step 3.1: Discovering Certified Batches & Bidding (2:00 – 2:30)
- **Visual:** Buyer dashboard showing available pooled batches.
- **Speaker:**
  > "Now we look through the eyes of an institutional corporate buyer — FreshFarm Retail. Previously, sourcing from hundreds of smallholders required an expensive army of field agents.
  > Here, FreshFarm sees a single verified 1,000 kg Grade A Onion batch with complete provenance. The buyer enters their maximum bid: `₹26.00/kg`."

#### Step 3.2: The Periodic Double-Auction Engine (2:30 – 3:00)
- **Visual:** Double-Auction Order Book / Market Clearing visualization.
- **Speaker:**
  > "Instead of continuous high-frequency trading that penalizes slow rural internet connections, KrishiSetu runs **periodic discrete double-auctions**.
  > The matching engine aggregates supply asks and buyer bids, sorts them, and finds the fair equilibrium clearing price where cumulative volume maximizes. In this round, the clearing price resolves to `₹24.80/kg`. Both parties win: Ramesh gets 15% more than the local mandi, and FreshFarm buys at fair market wholesale."

---

### 🎬 Scene 4: Settlement, Escrow & Logistics (3:00 – 3:45)
- **Visual:** Buyer checkout -> Razorpay test escrow -> Farmer Payouts tab (`/farmer/payouts`).
- **Speaker:**
  > "Payment is secured through automated digital escrow via Razorpay. Once captured, the platform calculates the exact pro-rata volume and monetary share for every constituent farmer down to the rupee.
  > On Ramesh's payout dashboard, his `₹9,920` net proceeds are credited directly with full audit trail references and zero middleman leakage.
  >
  > And if Ramesh decides to hold his crop based on our forecast, our **Warehouse & Cold Storage Locator** instantly pinpoints certified MSWC warehouses within 20 kilometers, showing live capacity, monthly rates, and direct contact numbers."

---

### 🎬 Scene 5: The Admin Console & Engineering Defense (3:45 – 4:45)
- **Credentials:** Logout -> Login as Admin: `9000000000` | Password: `demo123`.
- **Click Path:** Navigate to `/admin`.

#### Step 5.1: Live ML Model Health & Human Review Queue (3:45 – 4:15)
- **Visual:** Admin dashboard showing Model Health widget and Grading Review Queue.
- **Speaker:**
  > "Here in the Admin Operations Center, evaluators can inspect our live `/api/ml/model-status` endpoint. You can see the exact model weights version, active confidence threshold (0.70), and test accuracy.
  > Below it is the **Human Review Queue**: any produce submission where visual confidence drops below 70% appears here for an agronomist's manual verification before entering the auction pool. This completely eliminates algorithmic unfairness."

#### Step 5.2: Production Architecture & Reliability (4:15 – 4:45)
- **Visual:** Show active Auction Rounds tab & system status.
- **Speaker:**
  > "Under the hood, KrishiSetu is engineered for enterprise reliability:
  > - 116 automated backend tests with 100% pass rate.
  > - All 21 edge cases from our masterplan — from payment webhook idempotency to partial fill pro-rata math — are tested and verified.
  > - Structured state-transition telemetry logs every lifecycle event across listings, bids, trades, and payouts.
  > - Fully decoupled: Vite frontend on CDN and Flask/Gunicorn on resilient systemd architecture.
  >
  > KrishiSetu transforms fragmented Indian agriculture into a transparent, high-efficiency digital marketplace. Thank you, and we are ready for your questions!"

---

## 📋 Quick Demo Credentials Cheat-Sheet

| Role | Name | Phone Number | Password | Key Feature to Demo |
|---|---|---|---|---|
| **Farmer** | Ramesh Patil | `9876543210` | `demo123` | AI Grading, Cross-Farmer Pooling, Price Forecast |
| **Farmer** | Suresh Deshmukh | `9876543211` | `demo123` | Settled trade, Payouts breakdown & UTR reference |
| **Buyer** | FreshFarm Retail | `9876543220` | `demo123` | Browse pooled batches, Place bid, Razorpay checkout |
| **Buyer** | MahaAgri Traders | `9876543221` | `demo123` | Soybean batch bidding, Wholesale order tracking |
| **Admin** | Operations Admin | `9000000000` | `demo123` | Model Health status, Human Review queue, Trigger auction |
