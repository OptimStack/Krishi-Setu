import { useState, useRef, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { fadeIn } from '../../utils/animations';

const CROPS = [
  { id: 'onion', name: 'Onion', marathi: 'कांदा', defaultVariety: 'Nashik Red' },
  { id: 'tomato', name: 'Tomato', marathi: 'टोमॅटो', defaultVariety: 'Hybrid Vaishali' },
  { id: 'soybean', name: 'Soybean', marathi: 'सोयाबीन', defaultVariety: 'JS-335' },
  { id: 'wheat', name: 'Wheat', marathi: 'गहू', defaultVariety: 'Sharbati' },
  { id: 'cotton', name: 'Cotton', marathi: 'कापूस', defaultVariety: 'Bt Cotton II' },
  { id: 'chana', name: 'Gram (Chana)', marathi: 'हरभरा', defaultVariety: 'Vijay' },
  { id: 'maize', name: 'Maize', marathi: 'मका', defaultVariety: 'African Tall' },
];

const FPO_OPTIONS = [
  'Sahyadri Farmers Producer Company (Nashik)',
  'Maharashtra State Kisan FPO Federation',
  'Nashik District Smallholder Vegetable Pool',
  'Pune Agro Producer Co-operative Ltd',
  'Solapur Pulses & Oilseeds FPO Cluster',
];

export default function AskForm({ onSubmit, loading }) {
  const { user } = useAuth();
  const formRef = useRef(null);

  // Section 1: Farmer & Crop Details
  const [farmerName, setFarmerName] = useState(user?.name || 'Ramesh Patil');
  const [farmerPhone, setFarmerPhone] = useState(user?.phone || '9876543210');
  const [crop, setCrop] = useState('onion');
  const [variety, setVariety] = useState('Nashik Red');
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Section 2: Quality Verification & AI Grading
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [certNumber, setCertNumber] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('system_ai');
  const [selfDeclaredGrade, setSelfDeclaredGrade] = useState('A');

  // Section 3: Quantity
  const [totalQuantity, setTotalQuantity] = useState('400');
  const [quantityUnit, setQuantityUnit] = useState('kg'); // 'kg' | 'quintal' | 'tonnes'
  const [minSellQuantity, setMinSellQuantity] = useState('100');

  // Section 4: FPO Pooling
  const [addToFpoPool, setAddToFpoPool] = useState(true);
  const [selectedFpo, setSelectedFpo] = useState(FPO_OPTIONS[0]);
  const [poolingConsent, setPoolingConsent] = useState(true);

  // Section 5: Location
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Nashik');
  const [village, setVillage] = useState('Niphad');
  const [pickupAddress, setPickupAddress] = useState('Gat No. 142, Niphad, Nashik');

  // Section 6: Storage & Documentation (eNWR)
  const [storageType, setStorageType] = useState('Farm On-Field Storage');
  const [hasEnwr, setHasEnwr] = useState(false);
  const [enwrNumber, setEnwrNumber] = useState('');
  const [enwrQuantity, setEnwrQuantity] = useState('');

  // Section 7: Pricing
  const [priceUnit, setPriceUnit] = useState('kg');
  const [minAskPrice, setMinAskPrice] = useState('24.50');
  const [preferredTargetPrice, setPreferredTargetPrice] = useState('26.00');

  // Section 8: Availability
  const [availableFrom, setAvailableFrom] = useState(new Date().toISOString().split('T')[0]);
  const [availableUntil, setAvailableUntil] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // Section 9: Delivery & Logistics
  const [deliveryType, setDeliveryType] = useState('Buyer pickup');
  const [maxDistanceKm, setMaxDistanceKm] = useState('30');
  const [packagingDetails, setPackagingDetails] = useState('50 kg Jute Gunny Bags');

  // Section 10: Settlement & Declaration
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('rameshpatil@okaxis');
  const [bankAccount, setBankAccount] = useState('50100412345678');
  const [bankIfsc, setBankIfsc] = useState('HDFC0001234');
  const [confirmOwnership, setConfirmOwnership] = useState(true);

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (formRef.current) {
      fadeIn(formRef.current, { duration: 0.4 });
    }
  }, []);

  const handlePhotoSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCropChange = (cropId) => {
    setCrop(cropId);
    const found = CROPS.find((c) => c.id === cropId);
    if (found) {
      setVariety(found.defaultVariety);
    }
  };

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Section completion status
  const sectionStatus = {
    1: Boolean(farmerName && farmerPhone && crop && variety),
    2: Boolean(photo || certNumber || verificationStatus),
    3: Boolean(parseFloat(totalQuantity) > 0),
    4: Boolean(poolingConsent),
    5: Boolean(state && district && village && pickupAddress),
    6: Boolean(storageType),
    7: Boolean(parseFloat(minAskPrice) > 0),
    8: Boolean(availableFrom && availableUntil),
    9: Boolean(deliveryType && packagingDetails),
    10: Boolean(confirmOwnership),
  };

  const completedCount = Object.values(sectionStatus).filter(Boolean).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!confirmOwnership) {
      setValidationError('You must confirm authorization/ownership to sell this harvest.');
      scrollToSection(10);
      return;
    }

    const qtyNumber = parseFloat(totalQuantity);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      setValidationError('Please specify a valid total quantity.');
      scrollToSection(3);
      return;
    }

    // Convert to kg for standard double-auction math
    let normalizedQtyKg = qtyNumber;
    if (quantityUnit === 'quintal') normalizedQtyKg = qtyNumber * 100;
    if (quantityUnit === 'tonnes') normalizedQtyKg = qtyNumber * 1000;

    const askPriceNumber = parseFloat(minAskPrice);
    if (isNaN(askPriceNumber) || askPriceNumber <= 0) {
      setValidationError('Please enter a valid asking price.');
      scrollToSection(7);
      return;
    }

    // Convert price to ₹/kg
    let normalizedPricePerKg = askPriceNumber;
    if (priceUnit === 'quintal') normalizedPricePerKg = askPriceNumber / 100;

    const formData = new FormData();
    formData.append('crop', crop);
    formData.append('variety', variety);
    formData.append('quantity_kg', normalizedQtyKg);
    formData.append('ask_price_per_kg', normalizedPricePerKg);
    formData.append('min_acceptable_price_per_kg', normalizedPricePerKg * 0.92);
    formData.append('quality_grade', selfDeclaredGrade);
    formData.append('farmer_name', farmerName);
    formData.append('farmer_phone', farmerPhone);
    formData.append('fpo_name', addToFpoPool ? selectedFpo : '');
    formData.append('village', village);
    formData.append('district', district);
    formData.append('state', state);
    formData.append('storage_type', storageType);
    formData.append('enwr_number', hasEnwr ? enwrNumber : '');
    formData.append('available_from', availableFrom);
    formData.append('available_until', availableUntil);
    formData.append('delivery_type', deliveryType);
    formData.append('packaging', packagingDetails);
    formData.append('upi_id', paymentMethod === 'upi' ? upiId : '');

    if (photo) {
      formData.append('photo', photo);
    }

    onSubmit(formData);
  };

  const navSections = [
    { id: 1, label: '1. Crop', icon: '🌾' },
    { id: 2, label: '2. Quality & AI', icon: '🔬' },
    { id: 3, label: '3. Quantity', icon: '⚖️' },
    { id: 4, label: '4. FPO Pool', icon: '🤝' },
    { id: 5, label: '5. Location', icon: '📍' },
    { id: 6, label: '6. Storage', icon: '🏬' },
    { id: 7, label: '7. Pricing', icon: '💰' },
    { id: 8, label: '8. Dates', icon: '📅' },
    { id: 9, label: '9. Logistics', icon: '🚚' },
    { id: 10, label: '10. Payout', icon: '✅' },
  ];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 text-stone-900 dark:text-stone-100">
      {validationError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm font-semibold sticky top-20 z-40 shadow-md">
          ⚠️ {validationError}
        </div>
      )}

      {/* Sticky Quick-Jump Down-Scroll Navigator */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-[#121c13]/95 backdrop-blur-md p-3 rounded-2xl border border-stone-200 dark:border-emerald-800/50 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Produce Registration Steps
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
              {completedCount}/10 Sections Ready
            </span>
          </div>
          <span className="text-[11px] text-stone-400 dark:text-stone-400 hidden sm:inline">
            Scroll down or click any step to jump
          </span>
        </div>

        <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-none">
          {navSections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition border border-transparent hover:border-emerald-500/30"
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
              {sectionStatus[sec.id] && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: CROP & FARMER DETAILS */}
      <div id="section-1" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌾</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              1. Crop & Farmer / FPO Details
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 1 of 10</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Farmer / FPO Name"
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            value={farmerPhone}
            onChange={(e) => setFarmerPhone(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1.5">
            Select Crop / Commodity <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CROPS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCropChange(c.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  crop === c.id
                    ? 'border-[#2A5124] dark:border-[#D3D67A] bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 font-bold text-[#2A5124] dark:text-[#D3D67A] shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400">{c.marathi}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Variety / जात"
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            placeholder="e.g. Nashik Red / Hybrid"
            required
          />
          <Input
            label="Expected Availability Date"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(2)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to Quality & AI Grading ↓
          </button>
        </div>
      </div>

      {/* SECTION 2: QUALITY VERIFICATION & AI */}
      <div id="section-2" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔬</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              2. Quality Verification & AI Computer Vision Grading
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 2 of 10</span>
        </div>

        {/* AI Photo Upload */}
        <div className="p-4 rounded-xl border border-dashed border-[#2A5124] dark:border-[#D3D67A] bg-emerald-50/50 dark:bg-emerald-950/30">
          <label className="block text-sm font-bold text-[#2A5124] dark:text-[#D3D67A] mb-1">
            📸 Upload Produce Photo for Real-Time AI Grading
          </label>
          <p className="text-xs text-stone-600 dark:text-stone-300 mb-3">
            Our automated computer vision algorithm analyzes surface texture, color uniformity, and defect ratios to classify Grade A, B, or C.
          </p>

          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="text-xs text-stone-600 dark:text-stone-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2A5124] file:text-white dark:file:bg-[#D3D67A] dark:file:text-[#182d15] cursor-pointer"
            />
            {photoPreview && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-400 flex-shrink-0 shadow-xs">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Quality Testing Certificate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Upload / Scan Quality Testing Certificate (Optional)
            </label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setCertFile(e.target.files?.[0])}
              className="w-full text-xs text-stone-600 dark:text-stone-300 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-stone-200 dark:file:bg-stone-800"
            />
          </div>
          <Input
            label="Certificate / Test Report Number"
            value={certNumber}
            onChange={(e) => setCertNumber(e.target.value)}
            placeholder="e.g. AGMARK-QC-2026-904"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Verification Status
            </label>
            <select
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm text-stone-900 dark:text-stone-100"
            >
              <option value="system_ai">AI Computer Vision Model Analysis</option>
              <option value="committee_certified">APMC Mandi Grading Committee Certified</option>
              <option value="third_party">Third-Party Assayer (NCML / National Collateral)</option>
              <option value="self_declared">Self-Declared by Farmer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Self-Declared Grade (Fallback)
            </label>
            <select
              value={selfDeclaredGrade}
              onChange={(e) => setSelfDeclaredGrade(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm font-bold text-stone-900 dark:text-stone-100"
            >
              <option value="A">Grade A (Export / Premium Wholesale Quality)</option>
              <option value="B">Grade B (Standard Market Wholesale)</option>
              <option value="C">Grade C (Processing / Economy)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(3)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to Quantity Available ↓
          </button>
        </div>
      </div>

      {/* SECTION 3: QUANTITY */}
      <div id="section-3" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              3. Quantity Available & Minimum Sell Limits
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 3 of 10</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Total Quantity Available"
              type="number"
              min="1"
              step="any"
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Unit of Measurement
            </label>
            <select
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm font-bold text-stone-900 dark:text-stone-100"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="quintal">Quintals (100 kg)</option>
              <option value="tonnes">Metric Tonnes (1,000 kg)</option>
            </select>
          </div>
        </div>

        <Input
          label="Minimum Quantity Willing to Sell (Partial Fill Limit)"
          type="number"
          min="1"
          step="any"
          value={minSellQuantity}
          onChange={(e) => setMinSellQuantity(e.target.value)}
          placeholder="e.g. 100 kg"
        />

        <div className="p-3 bg-stone-50 dark:bg-stone-900/80 rounded-xl text-xs text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800">
          💡 <strong>Smallholder note:</strong> If your total quantity is under 500 kg, our smart pooling engine will aggregate your produce with nearby farmers to unlock wholesale institutional pricing!
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(4)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to FPO Pooling ↓
          </button>
        </div>
      </div>

      {/* SECTION 4: FPO POOLING */}
      <div id="section-4" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤝</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              4. FPO & Cross-Farmer Lot Pooling
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 4 of 10</span>
        </div>

        <label className="flex items-start gap-3 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/40 cursor-pointer">
          <input
            type="checkbox"
            checked={addToFpoPool}
            onChange={(e) => setAddToFpoPool(e.target.checked)}
            className="mt-1 w-4 h-4 text-[#2A5124] rounded"
          />
          <div>
            <span className="font-bold text-sm text-[#2A5124] dark:text-[#D3D67A]">
              Add produce to FPO / Regional Farmer Pool
            </span>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              Eligible produce is grouped into a certified high-volume batch. Smallholders receive proportional pro-rata payouts with zero middleman deductions.
            </p>
          </div>
        </label>

        {addToFpoPool && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Select FPO / Regional Cluster
            </label>
            <select
              value={selectedFpo}
              onChange={(e) => setSelectedFpo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm text-stone-900 dark:text-stone-100"
            >
              {FPO_OPTIONS.map((fpo) => (
                <option key={fpo} value={fpo}>
                  {fpo}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 cursor-pointer">
          <input
            type="checkbox"
            checked={poolingConsent}
            onChange={(e) => setPoolingConsent(e.target.checked)}
            className="w-4 h-4 text-[#2A5124] rounded"
          />
          <span>
            I consent to combine produce of identical quality grade with nearby farmers.
          </span>
        </label>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(5)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to Geographic Location ↓
          </button>
        </div>
      </div>

      {/* SECTION 5: LOCATION */}
      <div id="section-5" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              5. Geographic Location
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 5 of 10</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="State / राज्य"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
          <Input
            label="District / जिल्हा"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
          />
          <Input
            label="Village / Taluk / गाव"
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            required
          />
        </div>

        <Input
          label="Exact Pickup / Farmgate Storage Address"
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          placeholder="e.g. Survey No. 42, Lasalgaon Road, Niphad"
          required
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(6)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to Storage & eNWR ↓
          </button>
        </div>
      </div>

      {/* SECTION 6: STORAGE & eNWR */}
      <div id="section-6" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏬</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              6. Storage Location & eNWR Documentation
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 6 of 10</span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
            Storage Type
          </label>
          <select
            value={storageType}
            onChange={(e) => setStorageType(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm text-stone-900 dark:text-stone-100"
          >
            <option value="Farm On-Field Storage">Farm On-Field Storage (ताजे काढलेले)</option>
            <option value="Local Farmer Shed">Local Farmer Storage Shed (स्थानिक शेड)</option>
            <option value="WDRA Certified Warehouse">WDRA Certified Warehouse (नोंदणीकृत वखार)</option>
            <option value="Cold Storage Facility">Cold Storage Facility (शीतगृह)</option>
          </select>
        </div>

        {/* eNWR Section */}
        <div className="p-4 rounded-xl border border-stone-300 dark:border-emerald-900/50 bg-stone-50 dark:bg-stone-900/50 space-y-3">
          <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hasEnwr}
              onChange={(e) => setHasEnwr(e.target.checked)}
              className="w-4 h-4 text-[#2A5124] rounded"
            />
            <span>Produce is registered under an Electronic Negotiable Warehouse Receipt (eNWR)</span>
          </label>

          {hasEnwr && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                label="eNWR Number"
                value={enwrNumber}
                onChange={(e) => setEnwrNumber(e.target.value)}
                placeholder="e.g. eNWR-MSWC-2026-901"
              />
              <Input
                label="Quantity Covered by eNWR (kg)"
                type="number"
                value={enwrQuantity}
                onChange={(e) => setEnwrQuantity(e.target.value)}
                placeholder="e.g. 400"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(7)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to Reserve Pricing ↓
          </button>
        </div>
      </div>

      {/* SECTION 7: PRICING */}
      <div id="section-7" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              7. Double-Auction Reserve & Target Pricing
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 7 of 10</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Pricing Rate Unit
            </label>
            <select
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm font-bold text-stone-900 dark:text-stone-100"
            >
              <option value="kg">₹ per kg</option>
              <option value="quintal">₹ per Quintal (100 kg)</option>
            </select>
          </div>
          <Input
            label="Minimum Acceptable Price (Reserve Ask)"
            type="number"
            step="0.1"
            value={minAskPrice}
            onChange={(e) => setMinAskPrice(e.target.value)}
            placeholder="e.g. 24.50"
            required
          />
          <Input
            label="Preferred Target Price (Optional)"
            type="number"
            step="0.1"
            value={preferredTargetPrice}
            onChange={(e) => setPreferredTargetPrice(e.target.value)}
            placeholder="e.g. 26.00"
          />
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
          📊 <strong>Fair Price Guarantee:</strong> In the double auction, your produce will never clear below your minimum acceptable price. If buyer bids exceed your ask, you automatically receive the higher market clearing equilibrium price!
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(8)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to Availability Deadlines ↓
          </button>
        </div>
      </div>

      {/* SECTION 8: AVAILABILITY */}
      <div id="section-8" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              8. Availability Windows & Delivery Deadlines
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 8 of 10</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Available From / केव्हापासून उपलब्ध"
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            required
          />
          <Input
            label="Available Until / Delivery Deadline"
            type="date"
            value={availableUntil}
            onChange={(e) => setAvailableUntil(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(9)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to Delivery & Logistics ↓
          </button>
        </div>
      </div>

      {/* SECTION 9: DELIVERY & LOGISTICS */}
      <div id="section-9" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border border-stone-200 dark:border-emerald-800/40 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚚</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              9. Delivery & Logistics Options
            </h3>
          </div>
          <span className="text-xs text-stone-400">Step 9 of 10</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Logistics Arrangement
            </label>
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm font-medium text-stone-900 dark:text-stone-100"
            >
              <option value="Buyer pickup">Buyer Pickup at Farmgate (खरेदीदार उचल करेल)</option>
              <option value="Farmer delivery">Farmer Delivery to Regional Hub (शेतकरी पोहोचवेल)</option>
              <option value="Warehouse transfer">Warehouse In-Situ Transfer (वखार हस्तांतरण)</option>
            </select>
          </div>
          <Input
            label="Maximum Delivery Distance (km)"
            type="number"
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(e.target.value)}
            placeholder="e.g. 50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
            Loading & Packaging Details
          </label>
          <select
            value={packagingDetails}
            onChange={(e) => setPackagingDetails(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm text-stone-900 dark:text-stone-100"
          >
            <option value="50 kg Jute Gunny Bags">50 kg Standard Jute Gunny Bags (बारदान पोते)</option>
            <option value="25 kg Plastic Ventilated Crates">25 kg Plastic Ventilated Crates (प्लास्टिक क्रेट्स)</option>
            <option value="Bulk Loose Trolley">Bulk / Loose in Tractor Trolley (खुला माल)</option>
            <option value="Custom Box Packaging">Custom Corrugated Box Packaging</option>
          </select>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => scrollToSection(10)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Continue to Review & Payout Confirmation ↓
          </button>
        </div>
      </div>

      {/* SECTION 10: SETTLEMENT & FINAL DECLARATION */}
      <div id="section-10" className="scroll-mt-36 p-5 rounded-2xl bg-white dark:bg-[#121c13] border-2 border-[#2A5124]/40 dark:border-[#D3D67A]/50 shadow-lg space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              10. Direct Payout Settlement & Final Confirmation
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-[#D3D67A]">Final Step</span>
        </div>

        {/* Payment Details */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-900/40 bg-stone-50/50 dark:bg-stone-900/50 space-y-3">
          <label className="block text-sm font-bold text-stone-800 dark:text-stone-200">
            Escrow Payout Settlement Details
          </label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="payMethod"
                value="upi"
                checked={paymentMethod === 'upi'}
                onChange={() => setPaymentMethod('upi')}
              />
              <span className="font-semibold text-stone-800 dark:text-stone-200">UPI ID</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="payMethod"
                value="bank"
                checked={paymentMethod === 'bank'}
                onChange={() => setPaymentMethod('bank')}
              />
              <span className="font-semibold text-stone-800 dark:text-stone-200">Bank Account (NEFT / RTGS)</span>
            </label>
          </div>

          {paymentMethod === 'upi' ? (
            <Input
              label="UPI ID for Instant Direct Credit"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. 9876543210@upi"
              required
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Account Number"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g. 50100412345678"
                required
              />
              <Input
                label="Bank IFSC Code"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                placeholder="e.g. HDFC0001234"
                required
              />
            </div>
          )}
        </div>

        {/* Summary Overview */}
        <div className="p-4 rounded-xl bg-[#2A5124]/10 dark:bg-[#D3D67A]/10 border border-[#2A5124]/30 dark:border-[#D3D67A]/30 text-xs space-y-2">
          <h4 className="font-bold text-sm text-[#2A5124] dark:text-[#D3D67A] flex items-center gap-1.5">
            <span>📋</span> Harvest Listing Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-stone-700 dark:text-stone-300">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Crop</span>
              <strong className="text-sm text-stone-900 dark:text-stone-100">{crop.toUpperCase()}</strong> ({variety})
            </div>
            <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Quantity</span>
              <strong className="text-sm text-stone-900 dark:text-stone-100">{totalQuantity} {quantityUnit}</strong>
            </div>
            <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Reserve Price</span>
              <strong className="text-sm text-emerald-700 dark:text-[#D3D67A]">₹{minAskPrice}/{priceUnit}</strong>
            </div>
            <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Quality Grade</span>
              <strong className="text-sm text-stone-900 dark:text-stone-100">Grade {selfDeclaredGrade}</strong>
            </div>
            <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Location</span>
              <strong className="text-sm text-stone-900 dark:text-stone-100">{village}, {district}</strong>
            </div>
            <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Pooling Setup</span>
              <strong className="text-sm text-stone-900 dark:text-stone-100">{addToFpoPool ? 'FPO Pool Enabled' : 'Solo Lot'}</strong>
            </div>
          </div>
        </div>

        {/* Legal Ownership Checkbox */}
        <label className="flex items-start gap-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={confirmOwnership}
            onChange={(e) => setConfirmOwnership(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-[#2A5124] rounded"
            required
          />
          <span>
            I confirm that I am the verified owner / legal representative of this harvest and agree to the Krishi-Setu transparent double-auction clearing and escrow settlement rules.
          </span>
        </label>

        {/* Prominent Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-base font-extrabold bg-[#2A5124] hover:bg-[#1d3a19] dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] dark:text-[#182d15] text-white rounded-xl shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            {loading ? 'Submitting to Marketplace...' : 'Submit Harvest Listing to Marketplace 🌾'}
          </Button>
        </div>
      </div>
    </form>
  );
}
