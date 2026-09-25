/**
 * KrishiSetu FPO Data Management & Clearing Store
 * 
 * Provides centralized state and actions for:
 * 1. Physical lot verification and weigh-bridge inspection
 * 2. Multi-farmer freight pools & consolidation
 * 3. Verified B2B buyer directory
 * 4. CVRPTW logistics routing & dispatch pipeline
 * 5. Two-way synchronization with Farmer and Buyer portals
 */

import mockService from './mockService';

const FPO_POOLS_STORAGE_KEY = 'krishisetu_fpo_pools_v1';
const FPO_VERIFIED_BUYERS_KEY = 'krishisetu_fpo_buyers_v1';

export const INITIAL_FPO_POOLS = [
  {
    id: "POOL-PAR-COT-02",
    crop: "Cotton",
    variety: "Long Staple White Gold",
    targetKg: 6000,
    currentKg: 5400,
    pricePerQtl: 7750,
    status: "Open",
    destinationMandi: "Nagpur Cotton Yard & Kalamna APMC",
    collectionHub: "Parbhani & Gangakhed Hub",
    sharedFreightSavingsPct: 33.0,
    closesAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-COT-1102", grade: "Grade A", quantityKg: 1500 },
      { farmerName: "Ramesh Patil", lotId: "LOT-COT-1103", grade: "Grade A", quantityKg: 1500 },
      { farmerName: "Balasaheb Kadam", lotId: "LOT-COT-0922", grade: "Grade A", quantityKg: 2400 },
    ],
  },
  {
    id: "POOL-PBN-SOY-10",
    crop: "Soyabean",
    variety: "Yellow Bold 9305",
    targetKg: 4000,
    currentKg: 2900,
    pricePerQtl: 4850,
    status: "Open",
    destinationMandi: "Latur Oilseed & Dal Market Yard",
    collectionHub: "Parbhani & Jintur Hub",
    sharedFreightSavingsPct: 31.5,
    closesAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A", "Grade B"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Suresh Deshmukh", lotId: "LOT-SOY-4401", grade: "Grade A", quantityKg: 1800 },
      { farmerName: "Ramesh Patil", lotId: "LOT-SOY-4482", grade: "Grade A", quantityKg: 1100 },
    ],
  },
  {
    id: "POOL-PUNE-TOM-01",
    crop: "Tomato",
    variety: "Abhinav (Hybrid)",
    targetKg: 1200,
    currentKg: 750,
    pricePerQtl: 2150,
    status: "Open",
    destinationMandi: "Pune Gultekdi Market Yard",
    collectionHub: "Baramati APMC Yard Hub",
    sharedFreightSavingsPct: 28.5,
    closesAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-TOM-1076", grade: "Grade A", quantityKg: 500 },
      { farmerName: "Santosh Pawar", lotId: "LOT-TOM-1188", grade: "Grade A", quantityKg: 250 },
    ],
  },
  {
    id: "POOL-VASHI-ONI-02",
    crop: "Onion",
    variety: "Unhali Red Garva",
    targetKg: 3500,
    currentKg: 2400,
    pricePerQtl: 4400,
    status: "Open",
    destinationMandi: "Mumbai Vashi APMC",
    collectionHub: "Lasalgaon & Nashik Hub",
    sharedFreightSavingsPct: 34.0,
    closesAt: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A", "Grade B"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-ONI-5542", grade: "Grade A", quantityKg: 1200 },
      { farmerName: "Suresh Deshmukh", lotId: "LOT-ONI-5599", grade: "Grade A", quantityKg: 1200 },
    ],
  },
  {
    id: "POOL-NASHIK-GRP-08",
    crop: "Grapes",
    variety: "Thompson Seedless Export",
    targetKg: 2000,
    currentKg: 1450,
    pricePerQtl: 8200,
    status: "Open",
    destinationMandi: "Mumbai JNPT Port Reefer CFS",
    collectionHub: "Dindori & Pimpalgaon Packhouse",
    sharedFreightSavingsPct: 38.5,
    closesAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-GRP-3310", grade: "Grade A", quantityKg: 1450 },
    ],
  },
  {
    id: "POOL-SOLAPUR-POM-03",
    crop: "Pomegranate",
    variety: "Bhagwa Export Grade",
    targetKg: 1000,
    currentKg: 680,
    pricePerQtl: 9500,
    status: "Open",
    destinationMandi: "Solapur APMC & Port CFS",
    collectionHub: "Sangola & Solapur Hub",
    sharedFreightSavingsPct: 32.5,
    closesAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-POM-7219", grade: "Grade A", quantityKg: 680 },
    ],
  },
  {
    id: "POOL-SANGLI-TUR-04",
    crop: "Turmeric",
    variety: "Salem Polished",
    targetKg: 2500,
    currentKg: 1900,
    pricePerQtl: 15500,
    status: "Open",
    destinationMandi: "Sangli Spices Exchange",
    collectionHub: "Sangli & Kolhapur Hub",
    sharedFreightSavingsPct: 36.5,
    closesAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-TUR-9011", grade: "Grade A", quantityKg: 1900 },
    ],
  },
  {
    id: "POOL-LATUR-SOY-05",
    crop: "Soyabean",
    variety: "Yellow High Protein",
    targetKg: 5000,
    currentKg: 4100,
    pricePerQtl: 4850,
    status: "Open",
    destinationMandi: "Latur Oilseed Processing Cluster",
    collectionHub: "Latur & Ahmedpur Hub",
    sharedFreightSavingsPct: 31.0,
    closesAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A", "Grade B"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-SOY-8812", grade: "Grade A", quantityKg: 4100 },
    ],
  },
  {
    id: "POOL-NGP-ORG-11",
    crop: "Cotton",
    variety: "Long Staple Premium",
    targetKg: 6000,
    currentKg: 4200,
    pricePerQtl: 7750,
    status: "Open",
    destinationMandi: "Nagpur Cotton Yard & Kalamna APMC",
    collectionHub: "Nagpur & Kalmeshwar Hub",
    sharedFreightSavingsPct: 35.0,
    closesAt: new Date(Date.now() + 16 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-COT-3341", grade: "Grade A", quantityKg: 4200 },
    ],
  },
  {
    id: "POOL-JALGAON-BAN-07",
    crop: "Banana",
    variety: "Grand Naine (G-9)",
    targetKg: 6000,
    currentKg: 5200,
    pricePerQtl: 2100,
    status: "Open",
    destinationMandi: "Delhi Azadpur Reefer Express",
    collectionHub: "Jalgaon & Raver Cold-Chain Hub",
    sharedFreightSavingsPct: 42.0,
    closesAt: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    allowedGrades: ["Grade A"],
    transporter: {
      name: "MahaKisan Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    contributions: [
      { farmerName: "Ramesh Patil", lotId: "LOT-BAN-5201", grade: "Grade A", quantityKg: 5200 },
    ],
  },
];

export const INITIAL_VERIFIED_BUYERS = [
  {
    id: "BUY-01",
    name: "FreshMart Foods Pvt. Ltd.",
    category: "Retail Supermarket Chain",
    gstin: "27AABCF1234F1Z8",
    location: "Hadapsar Hub, Pune",
    reliabilityScore: 98.4,
    paymentTerm: "RBI Nodal Escrow Instant Release on Acceptance",
    cropPreferences: ["Tomato (Grade A)", "Onion", "Capsicum"],
    qualityRequirement: "Strict Grade A, Breaker-to-turning ripeness, uniform crates",
    tradeVolumeQuintal: 4500,
    phone: "+91 20 2426 8900",
  },
  {
    id: "BUY-02",
    name: "Sahyadri Fresh Direct",
    category: "Agri-Processor",
    gstin: "27AALCS9821K1ZP",
    location: "Daund Processing Unit, Pune",
    reliabilityScore: 95.8,
    paymentTerm: "Digital Delivery Acceptance within 12h",
    cropPreferences: ["Tomato (Grade A/B for Puree)", "Pomegranate"],
    qualityRequirement: "Grade A or B accepted with transparent Brix/ripeness grading",
    tradeVolumeQuintal: 12000,
    phone: "+91 2117 224500",
  },
  {
    id: "BUY-03",
    name: "MahaKisan Wholesale Aggregators",
    category: "Wholesale Aggregator",
    gstin: "27AAECK5543D1ZT",
    location: "Vashi Navi Mumbai Yard",
    reliabilityScore: 92.1,
    paymentTerm: "Partner Regulated Bank Transfer",
    cropPreferences: ["Tomato", "Potato", "Green Chilli"],
    qualityRequirement: "Bulk crates, minimum 20 quintal lots",
    tradeVolumeQuintal: 28000,
    phone: "+91 22 2789 6500",
  },
];

export const INITIAL_LOGISTICS_ROUTE = {
  routeId: "CVRPTW-MH12-RN5821",
  vehicle: "MH-12-RN-5821 (10-Ton Eicher Pro)",
  driver: "Vithalrao Shinde (+91 98223 88120)",
  totalDistanceKm: 142.6,
  estCostInr: 3450,
  loadUtilizationPct: 88,
  stops: [
    {
      stopNumber: 1,
      locationName: "Malegaon BK Farmer Cluster (Ramesh Patil)",
      window: "06:30 - 07:15 AM",
      lat: "18.1517",
      lng: "74.5772",
      pickupKg: 1500,
    },
    {
      stopNumber: 2,
      locationName: "Bhigwan Indapur Hub (Suresh Deshmukh)",
      window: "07:45 - 08:30 AM",
      lat: "18.1150",
      lng: "75.0250",
      pickupKg: 1800,
    },
    {
      stopNumber: 3,
      locationName: "Baramati Krushi Main Hub Unload & Weigh",
      window: "09:15 - 10:00 AM",
      lat: "18.1517",
      lng: "74.5772",
      pickupKg: 0,
    },
  ],
};

// Local storage helpers
export function getStoredPools() {
  try {
    const raw = localStorage.getItem(FPO_POOLS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_FPO_POOLS;
}

export function saveStoredPools(pools) {
  try {
    localStorage.setItem(FPO_POOLS_STORAGE_KEY, JSON.stringify(pools));
    window.dispatchEvent(new CustomEvent('krishisetu_fpo_pools_updated', { detail: pools }));
  } catch {}
}

export function getStoredBuyers() {
  try {
    const raw = localStorage.getItem(FPO_VERIFIED_BUYERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_VERIFIED_BUYERS;
}

/**
 * Fetch all lots awaiting physical verification at FPO
 */
export function getPendingFPOLots() {
  const state = mockService.loadState();
  const listings = state.listings || [];
  return listings.filter(
    (l) => l.productStatus === 'AWAITING_FPO_VERIFICATION' || l.status === 'submitted' || l.status === 'Submitted'
  );
}

/**
 * Fetch all verified lots at FPO
 */
export function getVerifiedFPOLots() {
  const state = mockService.loadState();
  const listings = state.listings || [];
  return listings.filter(
    (l) => l.productStatus === 'VERIFIED' || l.productStatus === 'PUBLISHED' || l.productStatus === 'IN_POOL' || l.status === 'open' || l.status === 'Verified'
  );
}

/**
 * Approve & Verify a lot with certified physical weigh-slip
 */
export function verifyFPOLot(lotId, verifiedGrade, verifiedWeight, notes) {
  const state = mockService.loadState();
  const index = state.listings.findIndex((l) => l.id === lotId || l._id === lotId);
  if (index !== -1) {
    const lot = state.listings[index];
    lot.productStatus = 'VERIFIED';
    lot.status = 'open';
    lot.quality_grade = verifiedGrade;
    lot.grade = verifiedGrade;
    lot.quantityKg = verifiedWeight;
    lot.quantity_kg = verifiedWeight;
    lot.fpoVerified = true;
    lot.fpoVerifiedAt = new Date().toISOString();
    lot.fpoNotes = notes;
    lot.weighSlipId = `WS-FPO-${Date.now().toString().slice(-6)}`;
    mockService.saveState(state);

    window.dispatchEvent(
      new CustomEvent('krishisetu_lot_verified', {
        detail: { lotId, lot },
      })
    );
    return lot;
  }
  return null;
}

/**
 * Reject or return lot to farmer for re-sorting
 */
export function rejectFPOLot(lotId, reason) {
  const state = mockService.loadState();
  const index = state.listings.findIndex((l) => l.id === lotId || l._id === lotId);
  if (index !== -1) {
    const lot = state.listings[index];
    lot.productStatus = 'DRAFT';
    lot.status = 'draft';
    lot.rejectionReason = reason;
    mockService.saveState(state);

    window.dispatchEvent(
      new CustomEvent('krishisetu_lot_rejected', {
        detail: { lotId, lot },
      })
    );
    return lot;
  }
  return null;
}

/**
 * Dispatch an FPO Freight Pool (Notifies Buyer side)
 */
export function dispatchFPOPool(poolId, transporter) {
  const pools = getStoredPools();
  const pool = pools.find((p) => p.id === poolId);
  if (pool) {
    pool.status = "Dispatched";
    pool.transporter = transporter || pool.transporter;
    pool.dispatchedAt = new Date().toISOString();
    pool.weighSlipUrl = `https://krishisetu.gov.in/weighslip/${poolId}.pdf`;
    saveStoredPools(pools);

    // Also update mockService consignments so Buyer Delivery page sees it
    try {
      const state = mockService.loadState();
      state.active_consignments = state.active_consignments || [];
      state.active_consignments.unshift({
        id: `CNS-${poolId}`,
        poolId: pool.id,
        crop: pool.crop,
        variety: pool.variety,
        totalKg: pool.currentKg,
        transporter: pool.transporter?.name || "Patil Agro Logistics",
        vehicleNumber: pool.transporter?.vehicleNumber || "MH-12-RN-5821",
        driverContact: pool.transporter?.contact || "+91 98220 12345",
        originHub: pool.collectionHub,
        destinationHub: pool.destinationMandi,
        status: "In Transit",
        dispatchedAt: pool.dispatchedAt,
      });
      mockService.saveState(state);
    } catch {}

    window.dispatchEvent(
      new CustomEvent('krishisetu_pool_dispatched', {
        detail: { poolId, pool },
      })
    );
    return pool;
  }
  return null;
}
