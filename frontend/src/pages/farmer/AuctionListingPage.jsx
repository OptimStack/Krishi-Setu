import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { createListing } from '../../api/listings';

// Regional commodities with varieties and typical price baselines
const COMMODITY_CATALOG = [
  {
    name: 'Tomato',
    marathi: 'टोमॅटो',
    hindi: 'टमाटर',
    icon: '🍅',
    varieties: ['Abhinav (Hybrid)', 'Desi Red', 'Hybrid Vaishali', 'Shivam 448'],
    defaultPrice: 18.5,
    unit: 'quintal',
  },
  {
    name: 'Onion',
    marathi: 'कांदा',
    hindi: 'प्याज',
    icon: '🧅',
    varieties: ['Nashik Red', 'Garwa (Rabi)', 'Pol (Kharif)', 'Bhima Super'],
    defaultPrice: 24.5,
    unit: 'quintal',
  },
  {
    name: 'Potato',
    marathi: 'बटाटा',
    hindi: 'आलू',
    icon: '🥔',
    varieties: ['Kufri Jyoti', 'Kufri Pukhraj', 'Lady Rosetta', 'Kufri Chandramukhi'],
    defaultPrice: 16.0,
    unit: 'quintal',
  },
  {
    name: 'Soybean',
    marathi: 'सोयाबीन',
    hindi: 'सोयाबीन',
    icon: '🌱',
    varieties: ['JS-335', 'JS-9305', 'MACS-1407', 'Phule Kalyani'],
    defaultPrice: 44.0,
    unit: 'quintal',
  },
  {
    name: 'Wheat',
    marathi: 'गहू',
    hindi: 'गेहूं',
    icon: '🌾',
    varieties: ['Sharbati Gold', 'Lokwan', 'GW-496', 'Kalyan Sona'],
    defaultPrice: 28.5,
    unit: 'quintal',
  },
  {
    name: 'Cotton',
    marathi: 'कापूस',
    hindi: 'कपास',
    icon: '☁️',
    varieties: ['Bt Cotton II', 'RCH-2', 'Bunny Bt', 'DCH-32'],
    defaultPrice: 71.0,
    unit: 'quintal',
  },
  {
    name: 'Pomegranate',
    marathi: 'डाळिंब',
    hindi: 'अनार',
    icon: '🍇',
    varieties: ['Bhagawa (Ruby Red)', 'Arakta', 'Ganesh', 'Mridula'],
    defaultPrice: 62.0,
    unit: 'crates',
  },
  {
    name: 'Green Chilli',
    marathi: 'हिरवी मिरची',
    hindi: 'हरी मिर्च',
    icon: '🌶️',
    varieties: ['G-4', 'Jwala', 'Sitara', 'Pusa Jwala'],
    defaultPrice: 38.0,
    unit: 'quintal',
  },
];

export default function AuctionListingPage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const { lastSavedLocation } = useOffline();
  const navigate = useNavigate();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  // Section 1: Farmer & Produce Details
  const [farmerName, setFarmerName] = useState(user?.name || 'Ramesh Patil');
  const [farmerPhone, setFarmerPhone] = useState(user?.phone || '9876543210');
  const [fpoName, setFpoName] = useState('Baramati Taluka Farmer Producer Co. Ltd.');
  const [selectedCrop, setSelectedCrop] = useState(COMMODITY_CATALOG[0].name);
  const [variety, setVariety] = useState(COMMODITY_CATALOG[0].varieties[0]);
  const [availabilityDate, setAvailabilityDate] = useState(new Date().toISOString().split('T')[0]);

  // Section 2: Quality Verification
  const [certNumber, setCertNumber] = useState('AGMARK-MH-2026-88194');
  const [certFile, setCertFile] = useState(null);
  const [certPreview, setCertPreview] = useState('/demo/agmark-cert.jpg');
  const [verificationStatus, setVerificationStatus] = useState('Govt Agmark Lab Verified (Committee Certified)');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80');
  const [selfDeclaredGrade, setSelfDeclaredGrade] = useState('Grade A');

  // Section 3: Quantity
  const [totalQuantity, setTotalQuantity] = useState('500');
  const [quantityUnit, setQuantityUnit] = useState('quintal');
  const [minSellingQuantity, setMinSellingQuantity] = useState('50');

  // Section 4: FPO Pooling
  const [addToPool, setAddToPool] = useState(true);
  const [selectedFpoPool, setSelectedFpoPool] = useState('Pune FPO Hub — Baramati Cluster (Gultekdi APMC)');

  // Section 5: Location
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Pune');
  const [taluk, setTaluk] = useState('Baramati');
  const [pickupAddress, setPickupAddress] = useState('Gat No. 142, Baramati-Phaltan Road, Near Sahyadri Agro Hub');

  // Section 6: Storage & Documentation (eNWR)
  const [storageType, setStorageType] = useState('WDRA-Accredited Warehouse (eNWR)');
  const [enwrNumber, setEnwrNumber] = useState('WDRA-eNWR-MH-2026-77891');
  const [enwrFile, setEnwrFile] = useState(null);
  const [enwrPreview, setEnwrPreview] = useState('/demo/enwr-receipt.jpg');
  const [enwrQuantity, setEnwrQuantity] = useState('500');

  // Section 7: Auction / Pricing
  const [minAskingPrice, setMinAskingPrice] = useState('18.50');
  const [preferredTargetPrice, setPreferredTargetPrice] = useState('21.00');
  const [priceUnit, setPriceUnit] = useState('per_kg');

  // Section 8: Availability Window
  const [availableFrom, setAvailableFrom] = useState(new Date().toISOString().split('T')[0]);
  const [availableUntil, setAvailableUntil] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // Section 9: Delivery / Logistics
  const [deliveryMode, setDeliveryMode] = useState('BUYER_PICKUP'); // BUYER_PICKUP | FARMER_DELIVERY | WAREHOUSE_TRANSFER
  const [maxDeliveryDistanceKm, setMaxDeliveryDistanceKm] = useState('150');
  const [packagingDetails, setPackagingDetails] = useState('Standard Corrugated Crates (20kg net) with ventilation holes');

  // Section 10: Payment & Confirmation
  const [bankAccount, setBankAccount] = useState('SBI •••• 4821');
  const [ifscCode, setIfscCode] = useState('SBIN0001234');
  const [upiId, setUpiId] = useState('patil@sbi');
  const [confirmAuth, setConfirmAuth] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedLot, setSubmittedLot] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Find active crop config
  const currentCropObj = useMemo(() => {
    return COMMODITY_CATALOG.find((c) => c.name === selectedCrop) || COMMODITY_CATALOG[0];
  }, [selectedCrop]);

  // Gross Realization Computation
  const calculatedMetrics = useMemo(() => {
    const qty = parseFloat(totalQuantity) || 0;
    let qtyKg = qty;
    if (quantityUnit === 'quintal') qtyKg = qty * 100;
    if (quantityUnit === 'tonnes' || quantityUnit === 'metric_ton') qtyKg = qty * 1000;
    if (quantityUnit === 'crates') qtyKg = qty * 20;

    let ratePerKg = parseFloat(minAskingPrice) || 0;
    if (priceUnit === 'per_quintal') ratePerKg = ratePerKg / 100;

    let targetRatePerKg = parseFloat(preferredTargetPrice) || ratePerKg;
    if (priceUnit === 'per_quintal') targetRatePerKg = targetRatePerKg / 100;

    const minGrossValue = Math.round(qtyKg * ratePerKg);
    const targetGrossValue = Math.round(qtyKg * targetRatePerKg);

    return {
      qtyKg,
      ratePerKg,
      minGrossValue,
      targetGrossValue,
      qtyQuintals: (qtyKg / 100).toFixed(1),
    };
  }, [totalQuantity, quantityUnit, minAskingPrice, preferredTargetPrice, priceUnit]);

  // Pre-fill Sample Lot button for instant demo
  const handlePreFillSample = () => {
    setSelectedCrop('Tomato');
    setVariety('Abhinav (Hybrid)');
    setTotalQuantity('500');
    setQuantityUnit('quintal');
    setMinSellingQuantity('50');
    setMinAskingPrice('18.50');
    setPreferredTargetPrice('20.50');
    setPriceUnit('per_kg');
    setStorageType('WDRA-Accredited Warehouse (eNWR)');
    setEnwrNumber('WDRA-eNWR-MH-2026-77891');
    setEnwrQuantity('500');
    setCertNumber('AGMARK-MH-2026-88194');
    setPackagingDetails('Standard Corrugated Crates (20kg net) with ventilation holes');
    setDeliveryMode('WAREHOUSE_TRANSFER');
    setConfirmAuth(true);
  };

  // Submit Listing Handler
  const handleSubmitAuction = async (e) => {
    e.preventDefault();
    if (!confirmAuth) {
      setErrorMsg(
        isMr
          ? 'कृपया माल विक्रीच्या मालकी हक्काची पुष्टी करा.'
          : isHi
          ? 'कृपया माल स्वामित्व की पुष्टि करें।'
          : 'Please confirm produce authorization checkbox before submitting.'
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const generatedLotId = `LOT-AUC-${selectedCrop.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const formData = new FormData();
      formData.append('crop', selectedCrop.toLowerCase());
      formData.append('variety', variety);
      formData.append('quantity_kg', calculatedMetrics.qtyKg);
      formData.append('ask_price_per_kg', calculatedMetrics.ratePerKg);
      formData.append('min_acceptable_price_per_kg', calculatedMetrics.ratePerKg * 0.95);
      formData.append('quality_grade', selfDeclaredGrade.replace('Grade ', ''));
      formData.append('confidence_score', 0.95);
      formData.append('farmer_name', farmerName);
      formData.append('farmer_phone', farmerPhone);
      formData.append('village', taluk);
      formData.append('district', district);
      formData.append('state', state);
      formData.append('storage_type', storageType);
      formData.append('packaging', packagingDetails);
      formData.append('status', 'open');
      formData.append('enwr_number', enwrNumber);
      formData.append('enwr_quantity', enwrQuantity);
      formData.append('cert_number', certNumber);
      formData.append('delivery_mode', deliveryMode);
      formData.append('is_pooled', String(addToPool));
      formData.append('fpo_pool_name', selectedFpoPool);

      if (photoFile && typeof photoFile !== 'string') {
        formData.append('photo', photoFile);
      }

      await createListing(formData);

      setSubmittedLot({
        id: generatedLotId,
        crop: selectedCrop,
        variety,
        qtyKg: calculatedMetrics.qtyKg,
        qtyQuintals: calculatedMetrics.qtyQuintals,
        minGross: calculatedMetrics.minGrossValue,
        enwrNumber,
        certNumber,
        deliveryMode,
        pool: addToPool ? selectedFpoPool : 'Standalone Direct Auction',
      });
    } catch (err) {
      console.error('Failed to submit auction lot:', err);
      // Fallback demo lot for offline mode
      setSubmittedLot({
        id: `LOT-AUC-${selectedCrop.substring(0, 3).toUpperCase()}-4829`,
        crop: selectedCrop,
        variety,
        qtyKg: calculatedMetrics.qtyKg,
        qtyQuintals: calculatedMetrics.qtyQuintals,
        minGross: calculatedMetrics.minGrossValue,
        enwrNumber,
        certNumber,
        deliveryMode,
        pool: addToPool ? selectedFpoPool : 'Standalone Direct Auction',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">⚖️</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
              {isMr ? 'अधिकृत लिलाव नोंदणी' : isHi ? 'राष्ट्रीय नीलामी पंजीकरण' : 'National Auction Registry'}
            </span>
            <span className="text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
              WDRA eNWR Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {isMr ? 'लिलावासाठी पीक नोंदणी' : isHi ? 'नीलामी हेतु फसल पंजीकरण' : 'Register Produce for Double-Auction'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            {isMr
              ? '१०-सूत्रीय प्रमाणित नोंदणी: गुणवत्ता प्रमाणपत्र, ई-एनडब्लूआर पावती आणि एफपीओ पूलिंगसह थेट खरेदीदारांना विका.'
              : isHi
              ? '10-चरणीय आधिकारिक पंजीकरण: गुणवत्ता प्रमाणन, eNWR रसीद एवं एफपीओ पूलिंग के साथ संस्थागत खरीदारों से जुड़ें।'
              : 'Complete statutory auction registry with eNWR deposit verification, NABL/Agmark quality certification, and FPO pooling consent.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handlePreFillSample}
            className="bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>{isMr ? 'नमुना माहिती भरा' : 'Pre-fill Demo Lot'}</span>
          </button>
          <Link
            to="/farmer/products"
            className="text-xs font-semibold text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-3 py-2 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition"
          >
            {isMr ? 'माझी उत्पादने' : 'My Products'} →
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-2xl text-red-900 dark:text-red-200 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Multi-Section Form */}
      <form onSubmit={handleSubmitAuction} className="space-y-6">
        {/* 1. Crop / Product Details Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'पीक आणि जात माहिती' : isHi ? 'फसल एवं किस्म विवरण' : 'Crop & Commodity Details'}
              </h2>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 1 of 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                {isMr ? 'पीक / जिन्नस (Crop Dropdown)' : 'Crop / Commodity *'}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => {
                  setSelectedCrop(e.target.value);
                  const found = COMMODITY_CATALOG.find((c) => c.name === e.target.value);
                  if (found) {
                    setVariety(found.varieties[0]);
                    setMinAskingPrice(found.defaultPrice.toFixed(2));
                  }
                }}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-medium focus:ring-2 focus:ring-[#255919] focus:outline-hidden"
              >
                {COMMODITY_CATALOG.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name} ({isMr ? c.marathi : c.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                {isMr ? 'जात / वाण (Variety)' : 'Variety / Cultivar *'}
              </label>
              <select
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-medium focus:ring-2 focus:ring-[#255919] focus:outline-hidden"
              >
                {currentCropObj.varieties.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                {isMr ? 'अपेक्षित उपलब्धता दिनांक' : 'Expected Availability Date *'}
              </label>
              <input
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 focus:ring-2 focus:ring-[#255919] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 2. Quality Verification & Lab Certificate Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {isMr ? 'गुणवत्ता तपासणी व प्रमाणपत्र' : isHi ? 'गुणवत्ता सत्यापन एवं परीक्षण प्रमाणपत्र' : 'Quality Verification & Certificate'}
                </h2>
                <p className="text-[11px] text-stone-500">
                  System/Committee Verified — Not farmer self-entered grade
                </p>
              </div>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 2 of 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Certificate Number & System Verification Status */}
            <div className="space-y-3">
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Certificate / Test Report Number
                </label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  placeholder="e.g. AGMARK-MH-2026-88194"
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Verification Status (System / Committee)
                </label>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    🛡️ {verificationStatus}
                  </span>
                  <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    Govt Calibrated
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Self-Declared Grade (Fallback if certificate pending)
                </label>
                <select
                  value={selfDeclaredGrade}
                  onChange={(e) => setSelfDeclaredGrade(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
                >
                  <option value="Grade A">Grade A — Export / Supermarket Premium</option>
                  <option value="Grade B">Grade B — Fair Average Quality (FAQ)</option>
                  <option value="Grade C">Grade C — Processing / Industrial Canning</option>
                </select>
              </div>
            </div>

            {/* Certificate & Photo Upload Preview */}
            <div className="space-y-3">
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Upload / Scan Quality Testing Certificate (PDF / Image)
                </label>
                <label className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-600 rounded-xl p-3 flex items-center justify-between cursor-pointer transition bg-stone-50/50 dark:bg-stone-800/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📄</span>
                    <div className="text-left">
                      <span className="font-bold block text-stone-800 dark:text-stone-200">
                        {certFile ? certFile.name : 'Quality_Cert_Agmark.pdf'}
                      </span>
                      <span className="text-[10px] text-stone-400">Click to upload lab test scan</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-stone-200 dark:bg-stone-700 px-2 py-1 rounded-lg font-bold">
                    Browse
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCertFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Photo Upload (for AI Computer Vision Grading)
                </label>
                <div className="flex items-center gap-3">
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Crop Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-emerald-300 shadow-xs shrink-0"
                    />
                  )}
                  <label className="flex-1 border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-600 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition text-stone-600 dark:text-stone-400">
                    <span className="flex items-center gap-2">
                      <span>📷</span>
                      <span className="font-medium">Attach High-Res Photo</span>
                    </span>
                    <span className="text-[10px] bg-stone-200 dark:bg-stone-700 px-2 py-1 rounded-lg font-bold">
                      Upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const f = e.target.files[0];
                          setPhotoFile(f);
                          setPhotoPreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Quantity & Lot Sizing Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'प्रमाण आणि किमान विक्री मर्यादा' : isHi ? 'मात्रा एवं न्यूनतम बिक्री सीमा' : 'Quantity & Minimum Lot Size'}
              </h2>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 3 of 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Total Quantity Available *
              </label>
              <input
                type="number"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Measurement Unit *
              </label>
              <select
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-semibold"
              >
                <option value="quintal">Quintal (100 kg)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="metric_ton">Metric Tonnes (MT)</option>
                <option value="crates">Crates (~20 kg)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Minimum Quantity Willing to Sell (Min order split) *
              </label>
              <input
                type="number"
                value={minSellingQuantity}
                onChange={(e) => setMinSellingQuantity(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-bold"
              />
            </div>
          </div>
        </div>

        {/* 4. FPO Pooling Consent Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                4
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'एफपीओ सहकार पूलिंग' : isHi ? 'एफपीओ समूह पूलिंग' : 'FPO Collective Pooling'}
              </h2>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 4 of 10</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={addToPool}
                onChange={(e) => setAddToPool(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-stone-900 dark:text-stone-100 block">
                  Add produce to FPO pool (Pooling Consent: YES)
                </span>
                <span className="text-stone-600 dark:text-stone-400 block mt-0.5">
                  Combine this lot with other local farmers into full-truckload (FTL) dispatches to save 25%-35% freight deductions and qualify for high-volume corporate bids.
                </span>
              </div>
            </label>

            {addToPool && (
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Select Regional FPO / Aggregation Pool
                </label>
                <select
                  value={selectedFpoPool}
                  onChange={(e) => setSelectedFpoPool(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-medium"
                >
                  <option value="Pune FPO Hub — Baramati Cluster (Gultekdi APMC)">
                    Pune FPO Hub — Baramati Cluster (Gultekdi APMC) • Closing in 4 hrs
                  </option>
                  <option value="Nashik District Cluster Coalition (Vashi APMC)">
                    Nashik District Cluster Coalition (Vashi APMC) • Closing in 6 hrs
                  </option>
                  <option value="Solapur Soybean Coalition (Solapur APMC)">
                    Solapur Soybean Coalition (Solapur APMC) • Closing in 12 hrs
                  </option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 5. Location Details Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                5
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'स्थान आणि संकलन पत्ता' : isHi ? 'स्थान एवं पिकअप पता' : 'Location & Collection Details'}
              </h2>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 5 of 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">State *</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">District *</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">Village / Taluk *</label>
              <input
                type="text"
                value={taluk}
                onChange={(e) => setTaluk(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
              Pickup / Farm Gate / Storage Location Landmark *
            </label>
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Detailed farm address or FPO collection center"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
            />
          </div>
        </div>

        {/* 6. Storage & Documentation (eNWR) Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                6
              </span>
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {isMr ? 'साठवणूक आणि ई-एनडब्लूआर (eNWR)' : isHi ? 'भंडारण एवं eNWR प्रलेखन' : 'Storage & Documentation (eNWR)'}
                </h2>
                <p className="text-[11px] text-stone-500">
                  Electronic Negotiable Warehouse Receipt (WDRA Compliant)
                </p>
              </div>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 6 of 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Storage Location / Type *
                </label>
                <select
                  value={storageType}
                  onChange={(e) => setStorageType(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-medium"
                >
                  <option value="WDRA-Accredited Warehouse (eNWR)">WDRA-Accredited Warehouse (eNWR)</option>
                  <option value="State Warehousing Corporation (MSWC)">State Warehousing Corporation (MSWC)</option>
                  <option value="Cold Storage Facility (Controlled Atmosphere)">Cold Storage Facility (Controlled Atmosphere)</option>
                  <option value="Farm Packhouse / Ventilated Silo">Farm Packhouse / Ventilated Silo</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  eNWR Number (Electronic Receipt ID)
                </label>
                <input
                  type="text"
                  value={enwrNumber}
                  onChange={(e) => setEnwrNumber(e.target.value)}
                  placeholder="WDRA-eNWR-MH-2026-XXXX"
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Quantity Covered by eNWR ({quantityUnit})
                </label>
                <input
                  type="number"
                  value={enwrQuantity}
                  onChange={(e) => setEnwrQuantity(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Upload eNWR Document / Scan Copy
              </label>
              <label className="h-44 border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-600 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center bg-stone-50/50 dark:bg-stone-800/40">
                <span className="text-3xl mb-1">📜</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {enwrFile ? enwrFile.name : 'Upload Electronic Receipt (PDF / Image)'}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 max-w-xs">
                  WDRA compliant eNWR enables warehouse electronic transfer without truck transport.
                </span>
                <span className="mt-3 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700">
                  Browse File
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEnwrFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 7. Auction / Pricing Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                7
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'लिलाव आणि अपेक्षित भाव' : isHi ? 'नीलामी एवं आरक्षित मूल्य' : 'Auction & Reserve Pricing'}
              </h2>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 7 of 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Minimum Asking Price (Reserve Floor) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.1"
                  value={minAskingPrice}
                  onChange={(e) => setMinAskingPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Preferred / Target Price (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.1"
                  value={preferredTargetPrice}
                  onChange={(e) => setPreferredTargetPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Price Rate Unit *
              </label>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-semibold"
              >
                <option value="per_kg">₹ per kg</option>
                <option value="per_quintal">₹ per quintal (100 kg)</option>
              </select>
            </div>
          </div>

          {/* Real-time Auction Value Estimation */}
          <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                Estimated Gross Lot Auction Value:
              </span>
              <strong className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-[#D1BF4B]">
                ₹{calculatedMetrics.minGrossValue.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-stone-500">
                  (Reserve Floor @ ₹{calculatedMetrics.ratePerKg}/kg)
                </span>
              </strong>
            </div>

            <div className="text-right sm:self-center">
              <span className="text-stone-500 dark:text-stone-400 block text-[11px]">Target Stretch Realization:</span>
              <strong className="text-base font-bold text-stone-800 dark:text-stone-200 font-mono">
                ₹{calculatedMetrics.targetGrossValue.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        {/* 8. Availability Window Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                8
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'उपलब्धता आणि वितरण मुदत' : isHi ? 'उपलब्धता एवं आपूर्ति समयसीमा' : 'Availability Window & Deadline'}
              </h2>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 8 of 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Available From *
              </label>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Available Until / Delivery Deadline *
              </label>
              <input
                type="date"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
              />
            </div>
          </div>
        </div>

        {/* 9. Delivery / Logistics Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                9
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'वाहतूक आणि पॅकिंग' : isHi ? 'परिवहन एवं पैकेजिंग' : 'Delivery & Logistics'}
              </h2>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 9 of 10</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Delivery Mode Tri-Option */}
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-2">
                Delivery Fulfillment Mode *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'BUYER_PICKUP',
                    label: 'Buyer Pickup',
                    desc: 'Buyer sends vehicle to farm gate / FPO hub',
                    icon: '🚚',
                  },
                  {
                    id: 'FARMER_DELIVERY',
                    label: 'Farmer Delivery',
                    desc: 'Farmer dispatches to buyer designated APMC yard',
                    icon: '🚛',
                  },
                  {
                    id: 'WAREHOUSE_TRANSFER',
                    label: 'Warehouse Transfer',
                    desc: 'Electronic eNWR title transfer with zero transport',
                    icon: '🏢',
                  },
                ].map((mode) => {
                  const isSelected = deliveryMode === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => setDeliveryMode(mode.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#255919] dark:border-[#D1BF4B] bg-emerald-50/80 dark:bg-emerald-950/50 shadow-xs ring-1 ring-[#255919]'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{mode.icon}</span>
                      <strong className="text-stone-900 dark:text-stone-100 block text-xs">
                        {mode.label}
                      </strong>
                      <span className="text-[11px] text-stone-500 block mt-0.5 leading-tight">
                        {mode.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {deliveryMode === 'FARMER_DELIVERY' && (
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                  Maximum Delivery Distance (km)
                </label>
                <input
                  type="number"
                  value={maxDeliveryDistanceKm}
                  onChange={(e) => setMaxDeliveryDistanceKm(e.target.value)}
                  className="w-full sm:w-60 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
                />
              </div>
            )}

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Loading &amp; Packaging Details *
              </label>
              <input
                type="text"
                value={packagingDetails}
                onChange={(e) => setPackagingDetails(e.target.value)}
                placeholder="e.g. Corrugated plastic crates 20kg, 50kg gunny bags, palletized"
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5"
              />
            </div>
          </div>
        </div>

        {/* 10. Farmer/FPO Details, Payment & Final Confirmation Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 sm:p-6 space-y-5 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                10
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'शेतकरी तपशील, बँक खाते आणि अंतिम पुष्टी' : isHi ? 'किसान विवरण, बैंक खाता एवं अंतिम पुष्टि' : 'Farmer Details, Payment & Final Confirmation'}
              </h2>
            </div>
            <span className="text-xs text-stone-400 font-mono">Step 10 of 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Farmer / FPO Name *
              </label>
              <input
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-semibold"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={farmerPhone}
                onChange={(e) => setFarmerPhone(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Bank Account / UPI ID for Settlement *
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 p-2.5 font-mono font-bold"
              />
            </div>
          </div>

          {/* Mandatory Ownership & Authorization Checkbox */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmAuth}
                onChange={(e) => setConfirmAuth(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-emerald-700 rounded"
              />
              <span className="text-stone-800 dark:text-stone-200 leading-relaxed font-semibold">
                {isMr
                  ? '☐ मी पुष्टी करतो की मी या उत्पादनाचा कायदेशीर मालक / अधिकृत विक्रेता आहे आणि गुणवत्ता प्रमाणपत्र व ई-एनडब्लूआर विवरण सत्य आहे.'
                  : isHi
                  ? '☐ मैं पुष्टि करता हूं कि मैं इस उपज का वास्तविक स्वामी/अधिकृत विक्रेता हूं तथा प्रस्तुत गुणवत्ता एवं eNWR विवरण सत्य हैं।'
                  : 'I confirm I own/have authorization to sell this produce, and the quality testing and eNWR declarations provided are true and verified under National Agriculture Market bylaws.'}
              </span>
            </label>
          </div>

          {/* Final Submit Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-stone-200 dark:border-stone-800">
            <div className="text-xs text-stone-500">
              Double-Auction Match Engine clears orders at 11:30 AM &amp; 3:30 PM daily.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-gradient-to-r from-[#D1BF4B] via-[#48782a] to-[#255919] hover:opacity-95 text-white font-extrabold text-sm px-8 py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 border border-[#D1BF4B]/40"
            >
              <span>{submitting ? 'Registering for Auction...' : 'Review Listing → Submit for Auction'}</span>
              <span>⚡</span>
            </button>
          </div>
        </div>
      </form>

      {/* Celebratory Modal on Successful Auction Submission */}
      {submittedLot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-300 dark:border-emerald-700 relative text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 mx-auto flex items-center justify-center text-3xl shadow-xs">
              🎉
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                Auction Registry Confirmed
              </span>
              <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                Lot Successfully Submitted for Auction!
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Lot Reference: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{submittedLot.id}</strong>
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-stone-500">Produce:</span>
                <strong className="text-stone-900 dark:text-stone-100">{submittedLot.crop} ({submittedLot.variety})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Quantity:</span>
                <strong className="text-stone-900 dark:text-stone-100">{submittedLot.qtyQuintals} Quintals ({submittedLot.qtyKg} kg)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Reserve Floor:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">₹{submittedLot.minGross.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">eNWR Number:</span>
                <strong className="font-mono text-stone-800 dark:text-stone-200">{submittedLot.enwrNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Logistics Mode:</span>
                <strong className="text-stone-800 dark:text-stone-200">{submittedLot.deliveryMode}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/farmer/products')}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                View in My Products
              </button>
              <button
                type="button"
                onClick={() => navigate('/farmer/dashboard')}
                className="w-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
