# Krishi-Setu: Evaluator Q&A Defense Guide
**Team:** KS-SAND (Smart India Hackathon 2026)  
**Problem Statement:** SIH26132 — AI-Driven Decentralized Agricultural Marketplace  
**Target:** Technical Judges, Domain Experts & Evaluators  

---

## 🏛️ Category 1: Data Provenance & Ground Truth

### Q1: "Is your ML model trained on synthetic or real data? How do you guarantee its validity?"
**Defense Answer:**
> "We use a rigorous **hybrid data architecture** grounded in real-world agricultural datasets:
> 1. **Price Forecasting Engine:** Ground truth is derived directly from official government daily mandi reports via **Agmarknet (Ministry of Agriculture & Farmers Welfare) / Data.gov.in**. We ingest historical time-series spanning multiple Maharashtra APMCs (Lasalgaon, Pune, Solapur, Ahmednagar) for our primary crops (Onion, Tomato, Soybean, Wheat).
> 2. **Produce Quality Grading Engine:** Our feature extractor is calibrated on physical agricultural metrics: normalized color space distributions (RGB / Hue saturation), surface roughness variance (Laplacian texture analysis), and edge defect density.
> 3. **Validation Rigor:** As documented in our `ml/evaluation/test_report.md`, we never evaluate on training data. We enforce an 80/20 train/test held-out split. The grading classifier achieves **97.5% validation accuracy** and an **F1-score of 0.97** across Grade A, B, and C produce.
> Evaluators can verify this live right now via our `/api/ml/model-status` endpoint."

---

## 🤖 Category 2: Machine Learning vs. Business Rules

### Q2: "Why use Machine Learning? Couldn't simple static rules or lookup tables do this?"
**Defense Answer:**
> "Simple rules fail in two critical agricultural dimensions:
> 1. **Non-Linear Biological Variation:** A tomato or onion does not degrade linearly. Blemishes, discoloration, and surface texture exhibit complex non-linear interactions across lighting conditions and mobile sensors. A rule like `if green > 100` fails under direct sunlight or fluorescent bulbs. Our Gradient Boosting classifier learns boundary planes across 8 orthogonal features simultaneously.
> 2. **Dynamic Volatility vs Static MSP:** Government Minimum Support Price (MSP) is static, while mandi prices fluctuate daily based on arrivals, seasonal rainfall, and regional demand. A static rule cannot advise a farmer whether holding for 7 days in cold storage will offset storage fees. Our time-series forecasting model predicts directional trend probability so the farmer makes an economically sound decision.
> 3. **Probabilistic Uncertainty:** Most importantly, rules provide a false binary yes/no. Our ML model outputs calibrated class probabilities. If confidence falls below 70%, it explicitly routes to the **Human Review Queue** instead of making an unjustified guess."

---

## 🛡️ Category 3: System Resilience, Fail-Safes & Graceful Degradation

### Q3: "What happens when an external service or ML model crashes during live operation?"
**Defense Answer:**
> "KrishiSetu is built on a **zero-silent-failure architecture**:
> - **Grading Model Failure / Unclear Photo (Edge Case 4):** If the ML model artifact is unreachable or the photo is noisy, the API never blocks the farmer. It marks the listing as `needs_human_review: true` with a provisional Grade B heuristic and places it in the admin review queue.
> - **Sparse / Missing Market Data (Edge Case 5):** If a farmer selects an uncommon crop or remote mandi without historical data, the forecast engine degrades gracefully to a 30-day moving average. It visibly renders a `fallback_used: true` badge on the UI ('Estimate based on recent average, not trained model') rather than fabricating false projections.
> - **External Scraper / Agmarknet Outage (Edge Case 6):** Our ingestion pipeline isolates each data source with try/catch handlers, caches the last successful ingest, and surfaces a `last_synced_at` timestamp on the UI.
> - **Payment Failure (Edge Case 9):** If a buyer's payment fails after auction matching, the trade status changes to `failed`, and the constituent pooled lots are automatically reopened for the next auction round rather than being lost in limbo."

---

## ⚡ Category 4: Economic Mechanism & Double-Auction Engine

### Q4: "Why did you implement a Periodic Double Auction instead of continuous trading or a simple fixed-price catalog?"
**Defense Answer:**
> "1. **Rural Connectivity Reality:** Continuous limit order books (like NASDAQ or Zerodha) favor algorithmic high-frequency traders with low latency. Rural farmers on 3G/4G would be front-run and outmaneuvered. A **periodic discrete batch auction** (e.g. run every 15 minutes) collects all supply and demand in a window and matches everyone at the exact same uniform clearing price.
> 2. **Fair Price Discovery:** In traditional mandis, commission agents artificially widen the bid-ask spread. Our double-auction algorithm sorts asks ascending and bids descending, finding the equilibrium intersection that **maximizes traded volume** and social welfare.
> 3. **Equilibrium Clearing:** The market clearing price sits halfway between the marginal matched bid and ask (`(bid + ask) / 2`), ensuring both farmers and buyers capture mutual economic surplus."

### Q5: "How does Partial Fill and Cross-Farmer Payout math work when a batch is only partially matched?"
**Defense Answer:**
> "Our auction matcher handles partial fills strictly through **pro-rata allocation**:
> - If a pooled batch has 1,000 kg across Farmer A (600 kg = 60%) and Farmer B (400 kg = 40%), and a buyer only buys 700 kg:
>   - Farmer A fills: `700 * (600/1000) = 420 kg` (remaining: 180 kg).
>   - Farmer B fills: `700 * (400/1000) = 280 kg` (remaining: 120 kg).
> - Payouts are computed using exact decimal shares: `Farmer Payout = Matched Qty * Clearing Price * (1 - Platform Fee)`.
> - This math is verified by automated unit tests (`tests/backend/test_edge_cases_qa.py::test_edge_case_2_partial_fill_exact_pro_rata`) with zero rounding loss."

---

## 📈 Category 5: Scale, Concurrency & Database Design

### Q6: "How does the system prevent double-matching and race conditions at production scale?"
**Defense Answer:**
> "1. **Optimistic Concurrency & Atomic Filtering:** All state transitions mutate state conditioned on the existing state. A batch or bid can only be matched if `status == 'open'`. MongoDB atomic queries prevent two concurrent scheduler workers from matching the same document.
> 2. **APScheduler Singleton Execution:** The auction background scheduler is configured with `max_instances=1` and database-level locking, ensuring auction rounds never overlap.
> 3. **Webhook Idempotency (Edge Case 8):** Payment webhooks are keyed uniquely on `razorpay_order_id`. If Razorpay retries a webhook 3 times, our database validates the existing transaction state and acknowledges the request without creating duplicate payouts or ledger entries."

---

## 🌾 Category 6: Farmer Adoption, Inclusion & Business Viability

### Q7: "How will rural smallholders adopt this when smartphone penetration and digital literacy vary?"
**Defense Answer:**
> "1. **FPO / Cooperative Intermediary Model:** In our user model, we support the `fpo` (Farmer Producer Organization) role. Local FPO leaders and rural youth can operate KrishiSetu on behalf of 50 to 100 illiterate farmers in their village.
> 2. **Mobile-First Responsive Interface:** The frontend is lightweight (<325 KB gzipped), with high-contrast text, large tap targets, and clean icons that work seamlessly on budget Android smartphones.
> 3. **Roadmap to WhatsApp / IVR (Phase 2):** Because our backend architecture is 100% API-driven, adding a Twilio/Gupshup WhatsApp chatbot or IVR voice assistant for listing produce requires zero refactoring of the core auction engine."

### Q8: "What are your post-deployment success metrics?"
**Defense Answer:**
> "We measure impact across 4 concrete KPIs:
> 1. **Farmer Net Price Realization Uplift:** Target: **+15% to +22%** higher revenue per quintal compared to local APMC mandis by bypassing traditional commission agents.
> 2. **Transaction Fee Reduction:** APMC traders charge 6–10% total commission. KrishiSetu operates sustainably on a **1% platform fee**, saving farmers 5–9% immediately.
> 3. **Reduction in Post-Harvest Distress Sales:** Measured by the percentage of farmers who utilize the Warehouse & Silo Finder to store produce when the forecast advises 'HOLD'.
> 4. **Settlement Turnaround Time:** From an average of **7–14 days** in traditional mandis down to **< 24 hours** via automated digital escrow."
