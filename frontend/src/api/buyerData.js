/**
 * Buyer Marketplace, RFQs, Deliveries, and Pool Datasets.
 * Grounded in AGMARKNET / MSAMB FPO linkages and RBI-compliant escrow protocol.
 */

export const CROP_GRADIENTS = {
  Tomato: "from-red-800 via-rose-700 to-amber-800",
  Onion: "from-purple-900 via-violet-800 to-indigo-900",
  Soyabean: "from-emerald-900 via-green-800 to-teal-900",
  Cotton: "from-slate-800 via-zinc-800 to-stone-800",
  Grapes: "from-purple-950 via-purple-900 to-indigo-950",
  Pomegranate: "from-pink-900 via-rose-800 to-red-900",
  Turmeric: "from-amber-800 via-yellow-700 to-orange-800",
  Banana: "from-stone-900 via-amber-950 to-stone-800",
  Wheat: "from-amber-800 via-yellow-800 to-orange-800",
  default: "from-stone-800 via-stone-700 to-stone-800",
};

export const CROP_IMAGES = {
  Banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80",
  Tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
  Onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80",
  Cotton: "https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&w=800&q=80",
  Soyabean: "https://images.unsplash.com/photo-1599827552599-eaee46979207?auto=format&fit=crop&w=800&q=80",
  Grapes: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=800&q=80",
  Pomegranate: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80",
  Turmeric: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=800&q=80",
  Wheat: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80",
  default: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
};

export const DEFAULT_FPO_POOLS = [
  {
    id: "POOL-PBN-COT-09",
    crop: "Cotton",
    variety: "Long Staple White Gold",
    target_kg: 5000,
    current_kg: 3400,
    price_per_qtl: 7750,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Nagpur Cotton Yard & Kalamna APMC",
    collection_hub: "Parbhani & Gangakhed Hub",
    shared_freight_savings_pct: 33.0,
    fpoName: "Parbhani Agro FPO Cooperative",
    transporter: {
      name: "Vidarbha Agri Express Logistics",
      vehicleNumber: "MH-22-AT-9012",
      contact: "+91 94221 88401",
    },
  },
  {
    id: "POOL-PBN-SOY-10",
    crop: "Soyabean",
    variety: "Yellow Bold 9305",
    target_kg: 4000,
    current_kg: 2900,
    price_per_qtl: 4850,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Latur Oilseed & Dal Market Yard",
    collection_hub: "Parbhani & Jintur Hub",
    shared_freight_savings_pct: 31.5,
    fpoName: "Marathwada Kisan Producer Co.",
    transporter: {
      name: "Latur Oil Freight Fleet",
      vehicleNumber: "MH-24-F-3419",
      contact: "+91 98230 45521",
    },
  },
  {
    id: "POOL-PUNE-TOM-01",
    crop: "Tomato",
    variety: "Abhinav (Hybrid)",
    target_kg: 1200,
    current_kg: 750,
    price_per_qtl: 2150,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Pune Gultekdi Market Yard",
    collection_hub: "Baramati APMC Yard Hub",
    shared_freight_savings_pct: 28.5,
    fpoName: "Saksham Baramati Krushi PC",
    transporter: {
      name: "Sahyadri Cold Chain Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
  },
  {
    id: "POOL-VASHI-ONI-02",
    crop: "Onion",
    variety: "Unhali Red Garva",
    target_kg: 3500,
    current_kg: 2400,
    price_per_qtl: 4400,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Mumbai Vashi APMC",
    collection_hub: "Lasalgaon & Nashik Hub",
    shared_freight_savings_pct: 34.0,
    fpoName: "Godavari Valley FPO Network",
    transporter: {
      name: "Maha Express Cargo Lines",
      vehicleNumber: "MH-15-EG-4402",
      contact: "+91 91580 99201",
    },
  },
  {
    id: "POOL-NASHIK-GRP-08",
    crop: "Grapes",
    variety: "Thompson Seedless Export",
    target_kg: 2000,
    current_kg: 1450,
    price_per_qtl: 8200,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Mumbai JNPT Port Reefer CFS",
    collection_hub: "Dindori & Pimpalgaon Packhouse",
    shared_freight_savings_pct: 38.5,
    fpoName: "Sahyadri Farmers Producer Co. Ltd.",
    transporter: {
      name: "JNPT Cold Reefer Carrier",
      vehicleNumber: "MH-43-BB-8819",
      contact: "+91 98200 44102",
    },
  },
  {
    id: "POOL-SOLAPUR-POM-03",
    crop: "Pomegranate",
    variety: "Bhagwa Export Grade",
    target_kg: 1000,
    current_kg: 680,
    price_per_qtl: 9500,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Raipur APMC & Port CFS",
    collection_hub: "Sangola & Solapur Hub",
    shared_freight_savings_pct: 32.5,
    fpoName: "Solapur Bhagwa Growers Union",
    transporter: {
      name: "Deccan Perishables Haulage",
      vehicleNumber: "MH-13-CU-1902",
      contact: "+91 94230 67104",
    },
  },
  {
    id: "POOL-SANGLI-TUR-04",
    crop: "Turmeric",
    variety: "Salem Polished",
    target_kg: 2600,
    current_kg: 1900,
    price_per_qtl: 15500,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Sangli Spices Exchange",
    collection_hub: "Sangli & Kolhapur Hub",
    shared_freight_savings_pct: 36.5,
    fpoName: "Krishna River Valley Spice FPO",
    transporter: {
      name: "Western Ghats Freight Movers",
      vehicleNumber: "MH-10-Q-5511",
      contact: "+91 98901 22910",
    },
  },
  {
    id: "POOL-LATUR-SOY-05",
    crop: "Soyabean",
    variety: "Yellow High Protein",
    target_kg: 5000,
    current_kg: 4100,
    price_per_qtl: 4850,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Latur Oilseed Processing Cluster",
    collection_hub: "Latur & Ahmedpur Hub",
    shared_freight_savings_pct: 31.0,
    fpoName: "Vikas Marathwada Agri FPO",
    transporter: {
      name: "Maha Kisan Bulk Carriers",
      vehicleNumber: "MH-24-AA-7712",
      contact: "+91 94220 55182",
    },
  },
  {
    id: "POOL-NGP-COT-06",
    crop: "Cotton",
    variety: "Long Staple Premium",
    target_kg: 6000,
    current_kg: 4200,
    price_per_qtl: 7750,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Nagpur Cotton Yard & Kalamna APMC",
    collection_hub: "Nagpur & Kalmeshwar Hub",
    shared_freight_savings_pct: 35.0,
    fpoName: "Nagpur Agro Consortium FPO",
    transporter: {
      name: "Vidarbha Cotton Route Line",
      vehicleNumber: "MH-31-CB-9090",
      contact: "+91 98225 33019",
    },
  },
  {
    id: "POOL-JALGAON-BAN-07",
    crop: "Banana",
    variety: "Grand Naine (G-9)",
    target_kg: 6000,
    current_kg: 5200,
    price_per_qtl: 2100,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Open",
    destination_mandi: "Delhi Azadpur Reefer Express",
    collection_hub: "Jalgaon & Raver Cold-Chain Hub",
    shared_freight_savings_pct: 42.0,
    fpoName: "Tapi Valley Banana FPC",
    transporter: {
      name: "Kisan Rail & Reefer Line",
      vehicleNumber: "MH-19-BF-1002",
      contact: "+91 94215 77890",
    },
  },
];

export const DEFAULT_DIRECT_LOTS = [
  {
    id: "LOT-BAN-3129",
    crop: "Banana",
    variety: "Grand Naine (G-9)",
    locationName: "Baramati FPO Hub #1, Pune",
    quantity: 500,
    unit: "metric_ton",
    askingPrice: 1800,
    grade: "Grade A",
    producer: "Verified Member (FPO Network)",
    confidenceScore: 91,
    coverImageUrl: CROP_IMAGES.Banana,
    harvestDate: "2026-09-22",
    description: "GI-tagged uniform fruit calibers, cold-chain precooled at collection hub, zero mechanical bruising.",
    specs: {
      brix: "19.5°",
      firmness: "14.2 lbs",
      residueTest: "Certified Residue Free (NABL)",
      moisture: "78%",
      avgWeight: "165g per finger",
    },
  },
  {
    id: "LOT-BAN-9879",
    crop: "Banana",
    variety: "Grand Naine (G-9)",
    locationName: "Baramati FPO Hub #1, Pune",
    quantity: 500,
    unit: "metric_ton",
    askingPrice: 1800,
    grade: "Grade A",
    producer: "Verified Member (FPO Network)",
    confidenceScore: 91,
    coverImageUrl: CROP_IMAGES.Banana,
    harvestDate: "2026-09-23",
    description: "Export batch packed in 13kg corrugated export cartons with food-grade plastic liners.",
    specs: {
      brix: "19.8°",
      firmness: "14.5 lbs",
      residueTest: "APEDA Export Standard Passed",
      moisture: "77%",
      avgWeight: "170g per finger",
    },
  },
  {
    id: "LOT-TOM-1278",
    crop: "Tomato",
    variety: "Abhinav (Hybrid)",
    locationName: "Baramati FPO Hub #1, Pune",
    quantity: 500,
    unit: "crates",
    askingPrice: 1800,
    grade: "Grade A",
    producer: "Verified Member (FPO Network)",
    confidenceScore: 91,
    coverImageUrl: CROP_IMAGES.Tomato,
    harvestDate: "2026-09-24",
    description: "Dense pericarp hybrid tomatoes sorted into standard 25kg plastic crates. Optimum breaker-turning stage.",
    specs: {
      brix: "4.8°",
      firmness: "9.2 kg/cm²",
      residueTest: "Zero Organophosphate Detected",
      colorIndex: "Deep Orange-Red (Grade A)",
      crateSize: "25 kg crate",
    },
  },
  {
    id: "LOT-ONI-4190",
    crop: "Onion",
    variety: "Unhali Red Garva",
    locationName: "Lasalgaon FPO Center, Nashik",
    quantity: 1200,
    unit: "quintal",
    askingPrice: 2200,
    grade: "Grade A",
    producer: "Verified Member (FPO Network)",
    confidenceScore: 94,
    coverImageUrl: CROP_IMAGES.Onion,
    harvestDate: "2026-09-20",
    description: "Cured single-centered bulb onion with tight outer skin. Excellent shelf life for long-haul transport.",
    specs: {
      bulbDiameter: "55-65 mm",
      moisture: "12.8%",
      residueTest: "Govt Testing Lab Certified",
      curing: "14-day field shade cured",
    },
  },
  {
    id: "LOT-COT-5104",
    crop: "Cotton",
    variety: "Long Staple White Gold",
    locationName: "Akola FPO Aggregation Yard",
    quantity: 850,
    unit: "quintal",
    askingPrice: 7600,
    grade: "Grade A",
    producer: "Verified Member (FPO Network)",
    confidenceScore: 93,
    coverImageUrl: CROP_IMAGES.Cotton,
    harvestDate: "2026-09-18",
    description: "Moisture-controlled seed cotton, staple length 30+ mm, low trash percentage (under 2.5%).",
    specs: {
      stapleLength: "31.2 mm",
      mic: "4.1",
      trashContent: "2.1%",
      strength: "29.5 g/tex",
    },
  },
  {
    id: "LOT-POM-7219",
    crop: "Pomegranate",
    variety: "Bhagwa Export Grade",
    locationName: "Sangola Packhouse, Solapur",
    quantity: 600,
    unit: "crates",
    askingPrice: 8900,
    grade: "Grade A",
    producer: "Verified Member (FPO Network)",
    confidenceScore: 92,
    coverImageUrl: CROP_IMAGES.Pomegranate,
    harvestDate: "2026-09-21",
    description: "Ruby-red arils, gloss finished skin, individual fruit foaming sleeves in ventilated telescopic boxes.",
    specs: {
      fruitCount: "9 to 12 per 3.5kg box",
      avgWeight: "350g",
      brix: "16.4°",
      defects: "0% sunburn, 0% thrips mark",
    },
  },
  {
    id: "LOT-TUR-6301",
    crop: "Turmeric",
    variety: "Salem Polished",
    locationName: "Sangli Spices Hub",
    quantity: 950,
    unit: "quintal",
    askingPrice: 14800,
    grade: "Grade A",
    producer: "Verified Member (FPO Network)",
    confidenceScore: 95,
    coverImageUrl: CROP_IMAGES.Turmeric,
    harvestDate: "2026-09-15",
    description: "Steam-boiled and mechanically finger-polished. Verified high curcumin content (above 4.8%).",
    specs: {
      curcumin: "4.85%",
      moisture: "9.2%",
      extraneousMatter: "0.2%",
      polish: "Double Machine Polished",
    },
  },
];

export const DEFAULT_RFQS = [
  {
    id: "RFQ-2026-081",
    crop: "Tomato",
    variety: "Abhinav (Hybrid)",
    gradeRequired: "Grade A",
    quantityQuintal: 10,
    total_quantity_needed_kg: 1000,
    fulfilled_quantity_kg: 720,
    min_supply_per_farmer_kg: 100,
    maxPricePerQtl: 2150,
    deliveryHub: "FreshMart Hadapsar Central Warehouse, Pune",
    status: "Matched with Pool",
    createdAt: "2026-09-07",
    validTill: "2026-09-10",
    fulfillments: [
      {
        farmer_name: "Ramesh Patil",
        farmer_phone: "+91 98221 44510",
        village: "Baramati, Pune",
        quantity_kg: 420,
        mandi_price: 21.5,
        total_payout: 9030,
        fulfilled_at: "2026-09-08",
      },
      {
        farmer_name: "Suresh Deshmukh",
        farmer_phone: "+91 94220 89123",
        village: "Indapur, Pune",
        quantity_kg: 300,
        mandi_price: 21.5,
        total_payout: 6450,
        fulfilled_at: "2026-09-09",
      },
    ],
  },
  {
    id: "RFQ-2026-079",
    crop: "Tomato",
    variety: "Desi/Local",
    gradeRequired: "Grade A or B",
    quantityQuintal: 15,
    total_quantity_needed_kg: 1500,
    fulfilled_quantity_kg: 450,
    min_supply_per_farmer_kg: 100,
    maxPricePerQtl: 1950,
    deliveryHub: "FreshMart Hadapsar Central Warehouse, Pune",
    status: "Active RFQ",
    createdAt: "2026-09-08",
    validTill: "2026-09-12",
    fulfillments: [
      {
        farmer_name: "Dnyaneshwar Shinde",
        farmer_phone: "+91 98902 77412",
        village: "Narayangaon, Junnar",
        quantity_kg: 450,
        mandi_price: 19.5,
        total_payout: 8775,
        fulfilled_at: "2026-09-08",
      },
    ],
  },
  {
    id: "RFQ-2026-074",
    crop: "Onion",
    variety: "Nashik Red Garva",
    gradeRequired: "Grade A",
    quantityQuintal: 40,
    total_quantity_needed_kg: 4000,
    fulfilled_quantity_kg: 4000,
    min_supply_per_farmer_kg: 200,
    maxPricePerQtl: 2400,
    deliveryHub: "FreshMart Vashi Cold Storage Hub, Mumbai",
    status: "Active RFQ",
    createdAt: "2026-09-09",
    validTill: "2026-09-15",
    fulfillments: [
      {
        farmer_name: "Balasaheb Kadam",
        farmer_phone: "+91 94222 31094",
        village: "Lasalgaon, Nashik",
        quantity_kg: 2500,
        mandi_price: 24.0,
        total_payout: 60000,
        fulfilled_at: "2026-09-10",
      },
      {
        farmer_name: "Nitin Jagtap",
        farmer_phone: "+91 98231 66890",
        village: "Pimpalgaon Baswant, Nashik",
        quantity_kg: 1500,
        mandi_price: 24.0,
        total_payout: 36000,
        fulfilled_at: "2026-09-11",
      },
    ],
  },
];

const STORAGE_KEYS = {
  RESERVED_POOLS: "krishisetu_buyer_reserved_pools",
  RFQS: "krishisetu_buyer_rfqs",
  CUSTOM_DIRECT_ORDERS: "krishisetu_buyer_direct_orders",
};

export const DEFAULT_ACTIVE_DELIVERIES = [
  {
    id: "POOL-PBN-COT-09",
    reservationId: "RES-849201",
    crop: "Cotton",
    variety: "Long Staple White Gold",
    target_kg: 5000,
    current_kg: 3400,
    price_per_qtl: 7750,
    allowedGrades: ["Grade A", "Grade B"],
    status: "Dispatched",
    destination_mandi: "Nagpur Cotton Yard & Kalamna APMC",
    collection_hub: "Parbhani & Gangakhed Hub",
    shared_freight_savings_pct: 33.0,
    fpoName: "Parbhani Agro FPO Cooperative",
    transporter: {
      name: "Vidarbha Agri Express Logistics",
      vehicleNumber: "MH-22-AT-9012",
      contact: "+91 94221 88401",
    },
    reservedAt: "2026-09-24T10:30:00.000Z",
  },
  {
    id: "POOL-PUN-TOM-01",
    reservationId: "RES-849202",
    crop: "Tomato",
    variety: "Abhinav (Hybrid)",
    target_kg: 1000,
    current_kg: 750,
    price_per_qtl: 2150,
    allowedGrades: ["Grade A"],
    status: "Reserved",
    destination_mandi: "Hadapsar Central Warehouse, Pune",
    collection_hub: "Baramati FPC Hub #1",
    shared_freight_savings_pct: 28.5,
    fpoName: "Saksham Baramati Krushi PC",
    transporter: {
      name: "Sahyadri Cold Chain Logistics",
      vehicleNumber: "MH-12-RN-5821",
      contact: "+91 98220 12345",
    },
    reservedAt: "2026-09-25T08:15:00.000Z",
  }
];

export function getStoredReservedPools() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESERVED_POOLS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RESERVED_POOLS, JSON.stringify(DEFAULT_ACTIVE_DELIVERIES));
      return DEFAULT_ACTIVE_DELIVERIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_ACTIVE_DELIVERIES;
    }
    return parsed;
  } catch {
    return DEFAULT_ACTIVE_DELIVERIES;
  }
}

export function saveReservedPool(pool, buyerUser) {
  try {
    const existing = getStoredReservedPools();
    const newReservation = {
      ...pool,
      reservationId: `RES-${Date.now().toString().slice(-6)}`,
      buyerId: buyerUser?.id || "buyer_default",
      buyerName: buyerUser?.name || "FreshMart Foods Pvt. Ltd.",
      status: "Reserved", // "Reserved" | "Dispatched" | "Accepted" | "Disputed"
      reservedAt: new Date().toISOString(),
      escrowLockedPaise: Math.round((pool.current_kg / 100) * pool.price_per_qtl * 100),
      transporter: pool.transporter || {
        name: "Sahyadri Cold Chain Logistics",
        vehicleNumber: "MH-12-RN-5821",
        contact: "+91 98220 12345",
      },
    };
    const updated = [newReservation, ...existing];
    localStorage.setItem(STORAGE_KEYS.RESERVED_POOLS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("krishisetu_buyer_pool_reserved", { detail: newReservation }));
    return newReservation;
  } catch (err) {
    console.error("Failed saving reserved pool:", err);
    return null;
  }
}

export function updateDeliveryStatus(reservationId, status, details = {}) {
  try {
    const existing = getStoredReservedPools();
    const updated = existing.map((p) => {
      if (p.reservationId === reservationId || p.id === reservationId) {
        return { ...p, status, ...details, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.RESERVED_POOLS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("krishisetu_buyer_delivery_updated", { detail: { reservationId, status } }));
    return true;
  } catch {
    return false;
  }
}

export function getStoredRFQs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RFQS);
    if (!raw) return DEFAULT_RFQS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_RFQS;
  } catch {
    return DEFAULT_RFQS;
  }
}

export function saveRFQ(rfqData) {
  try {
    const current = getStoredRFQs();
    const newRfq = {
      id: `RFQ-2026-${Math.floor(100 + Math.random() * 900)}`,
      status: "Active RFQ",
      createdAt: new Date().toISOString().split("T")[0],
      validTill: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      total_quantity_needed_kg: (rfqData.quantityQuintal || 10) * 100,
      fulfilled_quantity_kg: 0,
      fulfillments: [],
      ...rfqData,
    };
    const updated = [newRfq, ...current];
    localStorage.setItem(STORAGE_KEYS.RFQS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("krishisetu_buyer_rfq_created", { detail: newRfq }));
    return newRfq;
  } catch (err) {
    console.error("Failed saving RFQ:", err);
    return null;
  }
}

export function recordRfqFulfillment(targetIdOrCrop, fulfillment) {
  try {
    const current = getStoredRFQs();
    let matched = false;
    const updated = current.map((rfq) => {
      const matchId = rfq.id === targetIdOrCrop || rfq._id === targetIdOrCrop;
      const matchCrop = !matched && !matchId && rfq.crop?.toLowerCase() === (targetIdOrCrop || '').toLowerCase();
      if (matchId || matchCrop) {
        matched = true;
        const existingFulfillments = Array.isArray(rfq.fulfillments) ? rfq.fulfillments : [];
        const newFulfilledQty = (rfq.fulfilled_quantity_kg || 0) + (fulfillment.quantity_kg || 0);
        const totalNeeded = rfq.total_quantity_needed_kg || (rfq.quantityQuintal ? rfq.quantityQuintal * 100 : 1000);
        const isComplete = newFulfilledQty >= totalNeeded;
        return {
          ...rfq,
          fulfilled_quantity_kg: newFulfilledQty,
          status: isComplete ? 'Fulfilled' : 'Partially Fulfilled',
          fulfillments: [fulfillment, ...existingFulfillments],
        };
      }
      return rfq;
    });

    if (!matched) {
      const cropName = fulfillment.crop || (typeof targetIdOrCrop === 'string' && !targetIdOrCrop.startsWith('req_') ? targetIdOrCrop : 'Produce');
      const formattedCrop = cropName.charAt(0).toUpperCase() + cropName.slice(1);
      const totalKg = Math.max(1000, Math.round((fulfillment.quantity_kg || 500) * 1.5));
      const newEntry = {
        id: typeof targetIdOrCrop === 'string' && !targetIdOrCrop.includes(' ') ? targetIdOrCrop : `RFQ-2026-${Math.floor(100 + Math.random() * 900)}`,
        crop: formattedCrop,
        variety: fulfillment.variety || 'Hybrid Quality',
        gradeRequired: 'Grade A',
        quantityQuintal: Math.round(totalKg / 100),
        total_quantity_needed_kg: totalKg,
        fulfilled_quantity_kg: fulfillment.quantity_kg || 0,
        min_supply_per_farmer_kg: 100,
        maxPricePerQtl: Math.round((fulfillment.mandi_price || 22) * 100),
        deliveryHub: 'FreshMart Central Logistics Hub, Pune',
        status: (fulfillment.quantity_kg || 0) >= totalKg ? 'Fulfilled' : 'Partially Fulfilled',
        createdAt: new Date().toISOString().split('T')[0],
        validTill: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        fulfillments: [fulfillment],
      };
      updated.unshift(newEntry);
    }

    localStorage.setItem(STORAGE_KEYS.RFQS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("krishisetu_requirement_fulfilled", { detail: { targetIdOrCrop, fulfillment, updated } }));
    return updated;
  } catch (err) {
    console.error("Failed recording RFQ fulfillment:", err);
    return null;
  }
}

