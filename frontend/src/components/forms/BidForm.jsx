import { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';

const COMMON_CROPS = [
  { name: 'Onion', local: 'कांदा' },
  { name: 'Tomato', local: 'टोमॅटो' },
  { name: 'Soybean', local: 'सोयाबीन' },
  { name: 'Wheat', local: 'गहू' },
  { name: 'Cotton', local: 'कापूस' },
  { name: 'Gram (Chana)', local: 'हरभरा' },
  { name: 'Maize', local: 'मका' },
];

export default function BidForm({ onSubmit, loading, initialData = null, batchLocked = false }) {
  const [crop, setCrop] = useState(initialData?.crop || 'Soybean');
  const [customCrop, setCustomCrop] = useState('');
  const [quantityKg, setQuantityKg] = useState(initialData?.quantity_needed_kg || initialData?.quantity || '');
  const [maxPricePerKg, setMaxPricePerKg] = useState(initialData?.max_price_per_kg || initialData?.price || '');
  const [minQualityGrade, setMinQualityGrade] = useState(initialData?.quality_grade || initialData?.min_quality_grade || 'B');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (initialData?.crop) setCrop(initialData.crop);
    if (initialData?.quality_grade) setMinQualityGrade(initialData.quality_grade);
    if (initialData?.total_quantity_kg && !quantityKg) {
      setQuantityKg(initialData.total_quantity_kg);
    }
    if (initialData?.current_highest_bid && !maxPricePerKg) {
      setMaxPricePerKg(Math.round((initialData.current_highest_bid + 1.0) * 10) / 10);
    }
  }, [initialData]);

  const handleCropSelect = (selected) => {
    setCrop(selected);
    if (selected !== 'other') {
      setCustomCrop('');
    }
  };

  const handleQuickAddQty = (amount) => {
    const current = parseFloat(quantityKg) || 0;
    setQuantityKg(current + amount);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const finalCrop = crop === 'other' ? customCrop.trim() : crop;
    if (!finalCrop) {
      setValidationError('Please select or enter a commodity/crop name.');
      return;
    }

    const qty = parseFloat(quantityKg);
    if (isNaN(qty) || qty <= 0) {
      setValidationError('Quantity needed must be greater than 0 kg.');
      return;
    }

    const price = parseFloat(maxPricePerKg);
    if (isNaN(price) || price <= 0) {
      setValidationError('Maximum bid price must be greater than ₹0/kg.');
      return;
    }

    if (initialData?.current_highest_bid && price <= initialData.current_highest_bid) {
      setValidationError(`Your bid (₹${price}/kg) should ideally exceed the current highest bid (₹${initialData.current_highest_bid}/kg).`);
    }

    onSubmit({
      crop: finalCrop,
      quantity_needed_kg: qty,
      max_price_per_kg: price,
      min_quality_grade: minQualityGrade,
      batch_id: initialData?.batch_id || initialData?._id || initialData?.id || undefined,
    });
  };

  const parsedQty = parseFloat(quantityKg) || 0;
  const parsedPrice = parseFloat(maxPricePerKg) || 0;
  const quintals = (parsedQty / 100).toFixed(2);
  const totalCommitment = (parsedQty * parsedPrice).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Commodity / Crop Selection */}
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-2">
          Commodity / Crop <span className="text-red-500">*</span>
        </label>
        {batchLocked ? (
          <div className="flex items-center gap-3 p-3 bg-stone-100 border border-stone-300 rounded-lg">
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-bold text-stone-800 text-base">{crop}</p>
              <p className="text-xs text-stone-500">Locked to selected pooled batch</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_CROPS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleCropSelect(c.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    crop === c.name
                      ? 'bg-green-700 text-white border-green-700 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {c.name} <span className="opacity-70">({c.local})</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleCropSelect('other')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  crop === 'other'
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                Other
              </button>
            </div>

            {crop === 'other' && (
              <Input
                label="Custom Crop Name"
                placeholder="e.g. Bajra, Tur, Groundnut"
                value={customCrop}
                onChange={(e) => setCustomCrop(e.target.value)}
                required
              />
            )}
          </div>
        )}
      </div>

      {/* Quantity Needed */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="block text-sm font-semibold text-stone-700">
            Quantity Needed (kg) <span className="text-red-500">*</span>
          </label>
          {parsedQty > 0 && (
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
              ≈ {quintals} Quintals (क्विंटल)
            </span>
          )}
        </div>
        <Input
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 5000"
          value={quantityKg}
          onChange={(e) => setQuantityKg(e.target.value)}
          required
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-stone-500">Quick add:</span>
          {[500, 1000, 2500, 5000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleQuickAddQty(amt)}
              className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
            >
              +{amt >= 1000 ? `${amt / 1000}T` : `${amt}kg`}
            </button>
          ))}
          {initialData?.total_quantity_kg && (
            <button
              type="button"
              onClick={() => setQuantityKg(initialData.total_quantity_kg)}
              className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 font-semibold rounded ml-auto"
            >
              Max Batch Qty ({initialData.total_quantity_kg} kg)
            </button>
          )}
        </div>
      </div>

      {/* Maximum Bid Price */}
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1">
          Maximum Bid Price (₹/kg) <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-stone-500 mb-2">
          Double auction ceiling: you will never pay more than this price per kg.
        </p>
        <Input
          type="number"
          min="0.1"
          step="0.1"
          placeholder="e.g. 45.0"
          value={maxPricePerKg}
          onChange={(e) => setMaxPricePerKg(e.target.value)}
          required
        />
      </div>

      {/* Minimum Quality Grade */}
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1">
          Minimum Acceptable Quality Grade <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-stone-500 mb-2">
          Your bid will only clear against farmer produce meeting or exceeding this grade.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { grade: 'A', title: 'Grade A', desc: 'Premium / Export quality only' },
            { grade: 'B', title: 'Grade B', desc: 'Standard commercial & Grade A' },
            { grade: 'C', title: 'Grade C', desc: 'Fair, Processing & all grades' },
          ].map((g) => (
            <button
              key={g.grade}
              type="button"
              onClick={() => setMinQualityGrade(g.grade)}
              className={`p-3 rounded-lg border text-left transition-all ${
                minQualityGrade === g.grade
                  ? 'border-green-600 bg-green-50 ring-2 ring-green-600/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              <div className="font-bold text-sm text-stone-800 flex items-center justify-between">
                <span>{g.title}</span>
                {minQualityGrade === g.grade && <span className="text-green-600 text-xs">✓</span>}
              </div>
              <p className="text-xs text-stone-500 mt-1">{g.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Live Financial Commitment Summary */}
      {parsedQty > 0 && parsedPrice > 0 && (
        <div className="p-4 bg-green-50/70 border border-green-200 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-sm text-green-900 font-medium">
            <span>Total Max Bid Commitment</span>
            <span className="text-lg font-bold text-green-800">₹{totalCommitment}</span>
          </div>
          <div className="flex justify-between text-xs text-green-700">
            <span>Rate per Quintal (100 kg)</span>
            <span>₹{(parsedPrice * 100).toLocaleString('en-IN')} / quintal</span>
          </div>
          <p className="text-[11px] text-green-600 italic">
            Funds will only be requested for escrow once the double-auction engine clears matching supply.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-base font-semibold shadow-md"
      >
        {loading ? 'Submitting Bid...' : 'Place Bid into Auction'}
      </Button>
    </form>
  );
}
