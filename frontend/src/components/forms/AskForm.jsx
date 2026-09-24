import { useState } from 'react';
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

export default function AskForm({ onSubmit, loading }) {
  const [crop, setCrop] = useState('Onion');
  const [customCrop, setCustomCrop] = useState('');
  const [variety, setVariety] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [askPricePerKg, setAskPricePerKg] = useState('');
  const [minAcceptablePricePerKg, setMinAcceptablePricePerKg] = useState('');
  const [qualityGrade, setQualityGrade] = useState('ungraded');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [validationError, setValidationError] = useState('');

  const handleCropSelect = (selected) => {
    setCrop(selected);
    if (selected !== 'other') {
      setCustomCrop('');
    }
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const finalCrop = crop === 'other' ? customCrop.trim() : crop;
    if (!finalCrop) {
      setValidationError('Please select or enter a crop name.');
      return;
    }

    const qty = parseFloat(quantityKg);
    if (isNaN(qty) || qty <= 0) {
      setValidationError('Quantity must be greater than 0 kg.');
      return;
    }

    const ask = parseFloat(askPricePerKg);
    if (isNaN(ask) || ask <= 0) {
      setValidationError('Ask price must be greater than ₹0/kg.');
      return;
    }

    let min = ask;
    if (minAcceptablePricePerKg) {
      min = parseFloat(minAcceptablePricePerKg);
      if (isNaN(min) || min <= 0) {
        setValidationError('Minimum acceptable price must be greater than ₹0/kg.');
        return;
      }
      if (min > ask) {
        setValidationError('Minimum acceptable price cannot be higher than your ask price.');
        return;
      }
    }

    // Prepare FormData for multipart/form-data submission
    const formData = new FormData();
    formData.append('crop', finalCrop);
    formData.append('variety', variety.trim());
    formData.append('quantity_kg', qty);
    formData.append('ask_price_per_kg', ask);
    formData.append('min_acceptable_price_per_kg', min);
    formData.append('quality_grade', qualityGrade);
    formData.append('harvest_date', harvestDate);

    if (photo) {
      formData.append('photo', photo);
    }

    onSubmit(formData);
  };

  const qtyNumber = parseFloat(quantityKg) || 0;
  const askNumber = parseFloat(askPricePerKg) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {validationError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
          {validationError}
        </div>
      )}

      {/* Crop Selection */}
      <div>
        <label className="block text-sm font-semibold text-stone-800 mb-2">
          Select Crop / पीक निवडा <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_CROPS.map((c) => (
            <button
              type="button"
              key={c.name}
              onClick={() => handleCropSelect(c.name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                crop === c.name
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              {c.name} <span className="opacity-75 text-xs">({c.local})</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleCropSelect('other')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              crop === 'other'
                ? 'bg-green-700 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            Other / इतर
          </button>
        </div>

        {crop === 'other' && (
          <Input
            label="Enter Crop Name"
            placeholder="e.g. Pomegranate, Turmeric, Ginger"
            value={customCrop}
            onChange={(e) => setCustomCrop(e.target.value)}
            required
          />
        )}
      </div>

      {/* Variety */}
      <Input
        label="Variety / जात (Optional)"
        placeholder="e.g. Nashik Red, Garva, Sharbati, Desi"
        value={variety}
        onChange={(e) => setVariety(e.target.value)}
      />

      {/* Quantity & Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="Total Quantity (kg) / प्रमाण"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 1000"
            value={quantityKg}
            onChange={(e) => setQuantityKg(e.target.value)}
            required
          />
          {qtyNumber > 0 && (
            <p className="text-xs text-stone-500 mt-1">
              ≈ <strong>{(qtyNumber / 100).toFixed(2)}</strong> Quintals ({qtyNumber.toLocaleString('en-IN')} kg)
            </p>
          )}
        </div>

        <div>
          <Input
            label="Ask Price (₹/kg) / अपेक्षित दर"
            type="number"
            min="0.1"
            step="0.01"
            placeholder="e.g. 24.50"
            value={askPricePerKg}
            onChange={(e) => setAskPricePerKg(e.target.value)}
            required
          />
          {askNumber > 0 && (
            <p className="text-xs text-stone-500 mt-1">
              ≈ <strong>₹{(askNumber * 100).toLocaleString('en-IN')}</strong> / Quintal
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="Minimum Acceptable Price (₹/kg)"
            type="number"
            min="0.1"
            step="0.01"
            placeholder={askPricePerKg || "e.g. 20.00"}
            value={minAcceptablePricePerKg}
            onChange={(e) => setMinAcceptablePricePerKg(e.target.value)}
          />
          <p className="text-xs text-stone-500 mt-1">
            Lowest price you'll accept in double auction (defaults to Ask Price).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Quality Grade / गुणवत्ता प्रत
          </label>
          <select
            value={qualityGrade}
            onChange={(e) => setQualityGrade(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="ungraded">Ungraded (Pending AI grading / verification)</option>
            <option value="A">Grade A (Export / Premium)</option>
            <option value="B">Grade B (Standard Market)</option>
            <option value="C">Grade C (Industrial / Processing)</option>
          </select>
          <p className="text-xs text-stone-500 mt-1">
            If left as ungraded, our AI system will grade it upon photo upload.
          </p>
        </div>
      </div>

      {/* Harvest Date */}
      <div>
        <Input
          label="Harvest Date / कापणी तारीख"
          type="date"
          value={harvestDate}
          onChange={(e) => setHarvestDate(e.target.value)}
        />
      </div>

      {/* Photo Upload & Preview */}
      <div className="border-2 border-dashed border-stone-300 rounded-xl p-4 bg-stone-50">
        <label className="block text-sm font-semibold text-stone-800 mb-1">
          Produce Photo / पिकाचा फोटो (for AI Quality Verification)
        </label>
        <p className="text-xs text-stone-500 mb-3">
          Upload a clear, well-lit photo of your harvest. Supported formats: JPG, PNG, WEBP.
        </p>

        {previewUrl ? (
          <div className="relative inline-block mt-2">
            <img
              src={previewUrl}
              alt="Produce Preview"
              className="w-48 h-36 object-cover rounded-lg border border-stone-300 shadow-sm"
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
              title="Remove photo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-xs text-stone-600 mt-1 truncate max-w-xs">{photo?.name}</p>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center p-6 border border-stone-200 rounded-lg bg-white cursor-pointer hover:bg-stone-50 transition">
            <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-stone-700">Click to upload or take photo</span>
            <span className="text-xs text-stone-400 mt-1">PNG, JPG up to 10MB</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      <Button type="submit" className="w-full py-3 text-base font-semibold shadow-md" disabled={loading}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Submitting Listing & AI Grading...
          </span>
        ) : (
          'Submit Produce Listing / नोंदणी करा'
        )}
      </Button>
    </form>
  );
}
