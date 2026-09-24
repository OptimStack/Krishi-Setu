import { useState, useRef, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { fadeIn, staggerIn, modalEnter } from '../../utils/animations';

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

  // Active accordion section
  const [activeSection, setActiveSection] = useState(1);

  useEffect(() => {
    if (formRef.current) {
      fadeIn(formRef.current, { duration: 0.5 });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!confirmOwnership) {
      setValidationError('You must confirm authorization/ownership to sell this harvest.');
      return;
    }

    const qtyNumber = parseFloat(totalQuantity);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      setValidationError('Please specify a valid total quantity.');
      return;
    }

    // Convert to kg for standard double-auction math
    let normalizedQtyKg = qtyNumber;
    if (quantityUnit === 'quintal') normalizedQtyKg = qtyNumber * 100;
    if (quantityUnit === 'tonnes') normalizedQtyKg = qtyNumber * 1000;

    const askPriceNumber = parseFloat(minAskPrice);
    if (isNaN(askPriceNumber) || askPriceNumber <= 0) {
      setValidationError('Please enter a valid asking price.');
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

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 text-stone-900 dark:text-stone-100">
      {validationError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm font-semibold">
          ⚠️ {validationError}
        </div>
      )}

      {/* Progress Tabs Header */}
      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/40 text-xs font-semibold scrollbar-none">
        {[
          { id: 1, label: '1. Crop Details' },
          { id: 2, label: '2. Quality & AI' },
          { id: 3, label: '3. Quantity' },
          { id: 4, label: '4. FPO Pooling' },
          { id: 5, label: '5. Location' },
          { id: 6, label: '6. Storage & eNWR' },
          { id: 7, label: '7. Pricing' },
          { id: 8, label: '8. Availability' },
          { id: 9, label: '9. Logistics' },
          { id: 10, label: '10. Confirm' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeSection === tab.id
                ? 'bg-[#2A5124] text-white dark:bg-[#D3D67A] dark:text-[#182d15] shadow-sm'
                : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: CROP & FARMER DETAILS */}
      {activeSection === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">🌾</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              1. Crop & Farmer/FPO Details
            </h3>
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
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Select Crop / Commodity
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CROPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCropChange(c.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    crop === c.id
                      ? 'border-[#2A5124] dark:border-[#D3D67A] bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 font-bold text-[#2A5124] dark:text-[#D3D67A]'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900'
                  }`}
                >
                  <div className="text-sm">{c.name}</div>
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

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => setActiveSection(2)}>
              Next: Quality & AI Grading &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 2: QUALITY VERIFICATION & AI */}
      {activeSection === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">🔬</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              2. Quality Verification & AI Computer Vision Grading
            </h3>
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
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-400">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Quality Testing Certificate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm"
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
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm font-bold"
              >
                <option value="A">Grade A (Export / Premium Wholesale Quality)</option>
                <option value="B">Grade B (Standard Market Wholesale)</option>
                <option value="C">Grade C (Processing / Economy)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(1)}>
              &larr; Back
            </Button>
            <Button type="button" onClick={() => setActiveSection(3)}>
              Next: Quantity &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 3: QUANTITY */}
      {activeSection === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">⚖️</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              3. Quantity Available & Minimum Sell Limits
            </h3>
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
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm font-bold"
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

          <div className="p-3 bg-stone-50 dark:bg-stone-900/80 rounded-lg text-xs text-stone-600 dark:text-stone-300">
            💡 <strong>Smallholder note:</strong> If your total quantity is under 500 kg, our smart pooling engine will aggregate your produce with nearby farmers to unlock wholesale institutional pricing!
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(2)}>
              &larr; Back
            </Button>
            <Button type="button" onClick={() => setActiveSection(4)}>
              Next: FPO Pooling &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 4: FPO POOLING */}
      {activeSection === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">🤝</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              4. FPO & Cross-Farmer Lot Pooling
            </h3>
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
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm"
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

          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(3)}>
              &larr; Back
            </Button>
            <Button type="button" onClick={() => setActiveSection(5)}>
              Next: Location &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 5: LOCATION */}
      {activeSection === 5 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">📍</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              5. Geographic Location
            </h3>
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

          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(4)}>
              &larr; Back
            </Button>
            <Button type="button" onClick={() => setActiveSection(6)}>
              Next: Storage & eNWR &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 6: STORAGE & eNWR */}
      {activeSection === 6 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">🏬</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              6. Storage Location & eNWR Documentation
            </h3>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
              Storage Type
            </label>
            <select
              value={storageType}
              onChange={(e) => setStorageType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm"
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

          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(5)}>
              &larr; Back
            </Button>
            <Button type="button" onClick={() => setActiveSection(7)}>
              Next: Pricing &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 7: PRICING */}
      {activeSection === 7 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">💰</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              7. Double-Auction Reserve & Target Pricing
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
                Pricing Rate Unit
              </label>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm font-bold"
              >
                <option value="kg">₹ per kg</option>
                <option value="quintal">₹ per Quintal (100 kg)</option>
              </select>
            </div>
            <Input
              label={`Minimum Acceptable Price (Reserve Ask)`}
              type="number"
              step="0.1"
              value={minAskPrice}
              onChange={(e) => setMinAskPrice(e.target.value)}
              placeholder="e.g. 24.50"
              required
            />
            <Input
              label={`Preferred Target Price (Optional)`}
              type="number"
              step="0.1"
              value={preferredTargetPrice}
              onChange={(e) => setPreferredTargetPrice(e.target.value)}
              placeholder="e.g. 26.00"
            />
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
            📊 <strong>Fair Price Guarantee:</strong> In the double auction, your produce will never clear below your minimum acceptable price. If buyer bids exceed your ask, you automatically receive the higher market clearing equilibrium price!
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(6)}>
              &larr; Back
            </Button>
            <Button type="button" onClick={() => setActiveSection(8)}>
              Next: Availability &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 8: AVAILABILITY */}
      {activeSection === 8 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">📅</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              8. Availability Windows & Delivery Deadlines
            </h3>
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

          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(7)}>
              &larr; Back
            </Button>
            <Button type="button" onClick={() => setActiveSection(9)}>
              Next: Delivery & Logistics &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 9: DELIVERY & LOGISTICS */}
      {activeSection === 9 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">🚚</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              9. Delivery & Logistics Options
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">
                Logistics Arrangement
              </label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm font-medium"
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
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#0f1a10] border-stone-300 dark:border-emerald-900/60 text-sm"
            >
              <option value="50 kg Jute Gunny Bags">50 kg Standard Jute Gunny Bags (बारदान पोते)</option>
              <option value="25 kg Plastic Ventilated Crates">25 kg Plastic Ventilated Crates (प्लास्टिक क्रेट्स)</option>
              <option value="Bulk Loose Trolley">Bulk / Loose in Tractor Trolley (खुला माल)</option>
              <option value="Custom Box Packaging">Custom Corrugated Box Packaging</option>
            </select>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(8)}>
              &larr; Back
            </Button>
            <Button type="button" onClick={() => setActiveSection(10)}>
              Next: Review & Submit &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 10: SETTLEMENT & FINAL DECLARATION */}
      {activeSection === 10 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-emerald-900/30">
            <span className="text-xl">✅</span>
            <h3 className="text-base font-bold text-[#2A5124] dark:text-[#D3D67A]">
              10. Direct Payout Settlement & Final Confirmation
            </h3>
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
                <span>UPI ID</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="payMethod"
                  value="bank"
                  checked={paymentMethod === 'bank'}
                  onChange={() => setPaymentMethod('bank')}
                />
                <span>Bank Account (NEFT / RTGS)</span>
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
          <div className="p-4 rounded-xl bg-[#2A5124]/10 dark:bg-[#D3D67A]/10 border border-[#2A5124]/30 dark:border-[#D3D67A]/30 text-xs space-y-1.5">
            <h4 className="font-bold text-sm text-[#2A5124] dark:text-[#D3D67A] mb-1">
              📋 Harvest Listing Summary
            </h4>
            <div className="grid grid-cols-2 gap-2 text-stone-700 dark:text-stone-300">
              <div>• Crop: <strong>{crop.toUpperCase()}</strong> ({variety})</div>
              <div>• Quantity: <strong>{totalQuantity} {quantityUnit}</strong></div>
              <div>• Reserve Price: <strong>₹{minAskPrice}/{priceUnit}</strong></div>
              <div>• Grade: <strong>Grade {selfDeclaredGrade}</strong></div>
              <div>• Location: <strong>{village}, {district}</strong></div>
              <div>• Pooling: <strong>{addToFpoPool ? 'Enabled (FPO Pool)' : 'Solo Lot'}</strong></div>
            </div>
          </div>

          {/* Legal Ownership Checkbox */}
          <label className="flex items-start gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer pt-1">
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

          <div className="flex justify-between pt-4">
            <Button type="button" variant="secondary" onClick={() => setActiveSection(9)}>
              &larr; Back
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#2A5124] hover:bg-[#1d3a19] dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] dark:text-[#182d15] text-white font-extrabold px-6 py-2.5 rounded-lg shadow-lg text-sm"
            >
              {loading ? 'Submitting to Auction...' : 'Review Listing → Submit for Auction 🚀'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
