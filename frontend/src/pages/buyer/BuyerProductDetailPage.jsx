import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DEFAULT_DIRECT_LOTS, CROP_IMAGES, saveReservedPool } from '../../api/buyerData';

export default function BuyerProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderProcessing, setOrderProcessing] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, []);

  // Find product by id from default lots or generate dynamic
  const product = useMemo(() => {
    const found = DEFAULT_DIRECT_LOTS.find((l) => l.id === id);
    if (found) return found;

    // Fallback if not directly matched by id
    return {
      id: id || 'LOT-BAN-3129',
      crop: 'Banana',
      variety: 'Grand Naine (G-9)',
      locationName: 'Baramati FPO Hub #1, Pune',
      quantity: 500,
      unit: 'metric_ton',
      askingPrice: 1800,
      grade: 'Grade A',
      producer: 'Verified Member (FPO Network)',
      confidenceScore: 91,
      coverImageUrl: CROP_IMAGES.Banana,
      harvestDate: '2026-09-22',
      description: 'GI-tagged uniform fruit calibers, cold-chain precooled at collection hub, zero mechanical bruising.',
      specs: {
        brix: '19.5°',
        firmness: '14.2 lbs',
        residueTest: 'Certified Residue Free (NABL)',
        moisture: '78%',
        avgWeight: '165g per finger',
      },
    };
  }, [id]);

  const images = [
    product.coverImageUrl || CROP_IMAGES[product.crop] || CROP_IMAGES.default,
    CROP_IMAGES[product.crop] || CROP_IMAGES.default,
    CROP_IMAGES.default,
  ];

  const totalValue = product.quantity * product.askingPrice;

  // Recommendations
  const recommendations = DEFAULT_DIRECT_LOTS.filter((l) => l.id !== product.id).slice(0, 3);

  const handleConfirmOrder = async () => {
    setOrderProcessing(true);
    try {
      const pseudoPool = {
        id: product.id,
        crop: product.crop,
        variety: product.variety,
        target_kg: product.quantity,
        current_kg: product.quantity,
        price_per_qtl: product.askingPrice * 100,
        status: 'Reserved',
        destination_mandi: 'FreshMart Hadapsar Central Warehouse, Pune',
        collection_hub: product.locationName,
        shared_freight_savings_pct: 25.0,
        fpoName: 'Saksham Baramati Krushi PC',
        transporter: {
          name: 'Sahyadri Cold Chain Logistics',
          vehicleNumber: 'MH-12-RN-5821',
          contact: '+91 98220 12345',
        },
      };
      saveReservedPool(pseudoPool, user);
      setIsOrderModalOpen(false);
      navigate('/buyer/delivery');
    } catch (err) {
      console.error(err);
    } finally {
      setOrderProcessing(false);
    }
  };

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Breadcrumb matching Farmer side */}
      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <Link to="/buyer/marketplace" className="hover:text-[#255919] dark:hover:text-[#D1BF4B] transition-colors">
          {t('buyer_nav_marketplace', 'Marketplace')}
        </Link>
        <span>/</span>
        <span className="font-semibold text-stone-800 dark:text-stone-200">
          {product.crop} ({product.id})
        </span>
      </div>

      {/* Main Grid: Multi-Angle Gallery + Specs & Procurement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Multi-Angle Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-stone-900 border border-stone-200 dark:border-emerald-900/40 shadow-sm">
            <img
              src={images[selectedPhotoIdx]}
              alt={product.crop}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-xs px-3 py-1 rounded-xl font-bold">
              Angle {selectedPhotoIdx + 1} of {images.length}
            </div>

            <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-300 block font-medium">Inspected Angle:</span>
                <span className="font-bold text-sm">
                  {selectedPhotoIdx === 0
                    ? 'Top Surface & Color Caliber'
                    : selectedPhotoIdx === 1
                    ? 'Side Symmetry & Uniformity'
                    : 'Crate & Harvest Lot View'}
                </span>
              </div>
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md">
                <span>🛡️</span> FPO Inspected
              </span>
            </div>
          </div>

          {/* Thumbnails */}
          <div className="grid grid-cols-3 gap-3">
            {images.map((imgUrl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedPhotoIdx(i)}
                className={`aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedPhotoIdx === i
                    ? 'border-[#255919] dark:border-[#D1BF4B] ring-2 ring-emerald-500/30'
                    : 'border-stone-200 dark:border-emerald-900/40 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={imgUrl} alt={`Thumbnail ${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Specifications & Procurement (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-3xl p-6 space-y-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400 font-bold bg-stone-100 dark:bg-[#182b1c] px-2.5 py-1 rounded-md border border-stone-200 dark:border-emerald-800/40">
                  {product.id}
                </span>
                <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-md">
                  {product.grade}
                </span>
              </div>

              <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100">
                {product.crop}{' '}
                <span className="text-base font-normal text-stone-500 dark:text-stone-400">
                  ({product.variety})
                </span>
              </h1>

              <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mt-1">
                <span>📍</span>
                <span>{product.locationName}</span>
              </div>
            </div>

            {/* Pricing and Volume Box */}
            <div className="p-4 bg-stone-50 dark:bg-[#182b1c] rounded-2xl border border-stone-200 dark:border-emerald-800/40 space-y-3">
              <div className="flex justify-between items-end pb-2 border-b border-stone-200 dark:border-emerald-800/30">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">
                    Available Volume
                  </span>
                  <strong className="text-xl font-black text-stone-900 dark:text-stone-100">
                    {product.quantity} {product.unit}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">
                    Asking Rate
                  </span>
                  <strong className="text-xl font-black text-[#255919] dark:text-[#D1BF4B]">
                    ₹{product.askingPrice}
                  </strong>
                  <span className="text-xs text-stone-400">/{product.unit}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-stone-700 dark:text-stone-300">
                  Estimated Total Value:
                </span>
                <span className="font-black text-stone-900 dark:text-stone-100 text-base">
                  ₹{totalValue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quality Specs */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-emerald-900/30">
                <span className="text-stone-400">Producer:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{product.producer}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-emerald-900/30">
                <span className="text-stone-400">AI Quality Score:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">
                  {product.confidenceScore}% (High Assurance)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-emerald-900/30">
                <span className="text-stone-400">Harvest Date:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{product.harvestDate}</span>
              </div>

              {product.specs && (
                <div className="pt-2 grid grid-cols-2 gap-2">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div
                      key={k}
                      className="p-2 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40 text-[11px]"
                    >
                      <span className="text-stone-400 capitalize block">{k}</span>
                      <strong className="text-stone-800 dark:text-stone-200">{v}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div>
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-black text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🛡️</span>
                <span>Procure via Nodal Escrow (₹{totalValue.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Alternatives */}
      {recommendations.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-stone-200 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                Recommended Available Farm Lots
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Other verified farm lots ready for immediate procurement
              </p>
            </div>
            <Link
              to="/buyer/marketplace"
              className="text-xs text-[#255919] dark:text-[#D1BF4B] hover:underline font-bold"
            >
              View All Marketplace Lots →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-2xl overflow-hidden shadow-xs hover:border-emerald-500/50 transition"
              >
                <div className="aspect-video relative bg-stone-900">
                  <img
                    src={rec.coverImageUrl || CROP_IMAGES.default}
                    alt={rec.crop}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {rec.grade}
                  </div>
                </div>
                <div className="p-4 space-y-2 text-xs">
                  <h4 className="font-black text-sm text-stone-900 dark:text-stone-100">
                    {rec.crop} ({rec.variety})
                  </h4>
                  <div className="flex justify-between text-stone-500 dark:text-stone-400">
                    <span>Volume: {rec.quantity} {rec.unit}</span>
                    <strong className="text-[#255919] dark:text-[#D1BF4B] font-black">
                      ₹{rec.askingPrice}/{rec.unit}
                    </strong>
                  </div>
                  <Link to={`/buyer/products/${rec.id}`} className="block pt-2">
                    <button className="w-full py-2 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition cursor-pointer">
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-emerald-900/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="font-black text-lg text-stone-900 dark:text-stone-100">
                  Confirm Escrow Procurement
                </h3>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Place an RBI-compliant escrow hold of <strong>₹{totalValue.toLocaleString()}</strong> for{' '}
              <strong>{product.quantity} {product.unit}</strong> of {product.crop}. Funds remain protected until digital weigh-slip inspection.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-emerald-950/30 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={orderProcessing}
                onClick={handleConfirmOrder}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {orderProcessing ? 'Confirming...' : 'Confirm Escrow Hold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
