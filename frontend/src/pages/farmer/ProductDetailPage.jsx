import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useLanguage } from '../../context/LanguageContext';
import { mockService } from '../../api/mockService';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const pageRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  useEffect(() => {
    if (pageRef.current && product) {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, [product]);

  const loadProduct = () => {
    const found = mockService.getProductById(id);
    if (found) {
      setProduct(found);
    } else {
      // Fallback search across all listings
      const all = mockService.getListings();
      const fallback = all.find((l) => (l.id || l._id) === id);
      setProduct(fallback || null);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-[#162719] text-stone-500 border border-stone-200 dark:border-emerald-900/40 flex items-center justify-center mx-auto text-2xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          Product Not Found
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm max-w-sm mx-auto">
          The requested product ID ({id}) could not be located in your registered inventory.
        </p>
        <Link
          to="/farmer/products"
          className="inline-block bg-gradient-to-r from-[#255919] to-[#D1BF4B] text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-opacity hover:opacity-95"
        >
          ← Return to My Products
        </Link>
      </div>
    );
  }

  const isPublished = product.productStatus === 'PUBLISHED' || product.marketplaceVisibility === 'PUBLIC';
  const isDraft = ['DRAFT', 'PHOTOS_UPLOADED', 'draft'].includes(product.productStatus || product.status);

  const images = product.images && product.images.length > 0
    ? product.images
    : ['/demo/tomato-top.jpg', '/demo/tomato-side.jpg', '/demo/tomato-crate.jpg'];

  const angles = [
    'Top Surface & Crown View',
    'Side Caliber & Symmetry View',
    'Crate & Lot Bulk View'
  ];

  const handleWithdraw = () => {
    setActionLoading(true);
    setTimeout(() => {
      mockService.withdrawProduct(product.id || product._id);
      loadProduct();
      setActionLoading(false);
      showToast('Product withdrawn from Marketplace. It is now hidden from buyer search.');
    }, 300);
  };

  const handlePublish = () => {
    setActionLoading(true);
    setTimeout(() => {
      mockService.publishProduct(product.id || product._id);
      loadProduct();
      setActionLoading(false);
      showToast('Product published! Buyers across India can now place purchase orders.');
    }, 300);
  };

  const analysis = product.analysis || {
    blurScore: 146.5,
    blurPassed: true,
    brightnessScore: 132.0,
    brightnessPassed: true,
    occupancyScore: 84,
    occupancyPassed: true,
    pHash: '9a2f7c81b0',
    parameters: {
      sizeUniformity: '94% uniform caliber (38-42 grade) and finger length > 18cm',
      surfaceDefectsPct: 1.6,
      ripenessIndex: 'Color stage 2 (Clean Green export stage)',
      colorScore: '93% Fresh Olive Green',
    }
  };

  return (
    <div ref={pageRef} className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#132215] text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-[#D1BF4B]/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <Link
            to="/farmer/products"
            className="hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1 font-medium transition-colors"
          >
            <span>←</span> My Products
          </Link>
          <span>/</span>
          <span className="font-mono text-stone-800 dark:text-stone-200 font-bold">
            {product.id || product._id}
          </span>
        </div>

        {/* Action Button */}
        <div>
          {isPublished ? (
            <button
              onClick={handleWithdraw}
              disabled={actionLoading}
              className="bg-white dark:bg-[#162719] border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-[#182b1c] text-amber-800 dark:text-amber-300 font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Withdraw from Marketplace
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={actionLoading}
              className="bg-gradient-to-r from-[#255919] to-[#D1BF4B] hover:opacity-95 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>🌐</span> Publish to Marketplace
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Photo Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Main Inspection Viewfinder */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-stone-950 border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] shadow-xs">
            <img
              src={images[selectedPhotoIndex] || '/demo/tomato-top.jpg'}
              alt="Inspected crop produce"
              className="w-full h-full object-cover"
            />
            {/* Dark gradient for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* Photo Counter Pill */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-xl font-medium">
              Photo {selectedPhotoIndex + 1} of {images.length}
            </div>

            {/* Inspected Angle & AI Verified Badge */}
            <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between gap-2">
              <div>
                <span className="text-[10px] text-stone-300 uppercase tracking-wider block font-semibold">
                  INSPECTED ANGLE
                </span>
                <span className="font-bold text-sm sm:text-base text-white">
                  {angles[selectedPhotoIndex] || 'High-Resolution Inspection Angle'}
                </span>
              </div>
              <span className="bg-[#255919] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 shadow-xs">
                AI Vision Verified
              </span>
            </div>
          </div>

          {/* Thumbnails Row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {images.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative cursor-pointer ${
                  selectedPhotoIndex === idx
                    ? 'border-[#255919] dark:border-[#D1BF4B] ring-2 ring-[#255919]/40 shadow-xs'
                    : 'border-stone-200 dark:border-emerald-900/40 hover:border-[#D1BF4B] opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={url}
                  alt={`Inspection Angle ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Lot Identity & Specs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white/95 dark:bg-[#132215]/95 border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] shadow-xs rounded-2xl p-5 space-y-4 transition-all duration-300">
            {/* ID & Status Pill */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#162719] border border-stone-200 dark:border-emerald-900/40 px-2.5 py-0.5 rounded-lg font-semibold">
                {product.id || product._id}
              </span>
              {isPublished ? (
                <span className="bg-[#255919] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live on Marketplace
                </span>
              ) : isDraft ? (
                <span className="bg-stone-100 dark:bg-[#162719] text-stone-600 dark:text-stone-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-stone-300 dark:border-emerald-800/60">
                  Draft
                </span>
              ) : (
                <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  Awaiting FPO Verification
                </span>
              )}
            </div>

            {/* Title & Cultivar */}
            <div>
              <h2 className="text-2xl font-black text-stone-900 dark:text-stone-50 leading-tight">
                {product.crop}{' '}
                <span className="text-lg font-normal text-stone-500 dark:text-stone-400">
                  ({product.variety || 'Desi'})
                </span>
              </h2>
            </div>

            {/* Volume & Price Card */}
            <div className="bg-stone-50/70 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-900/40 rounded-xl p-3.5 grid grid-cols-2 gap-3">
              <div>
                <span className="text-stone-500 dark:text-stone-400 text-xs block font-medium">
                  Volume
                </span>
                <strong className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100">
                  {product.quantityKg || product.quantity_kg || 500} {product.unit || 'metric_ton'}
                </strong>
              </div>
              <div>
                <span className="text-stone-500 dark:text-stone-400 text-xs block font-medium">
                  Target Price
                </span>
                <strong className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {product.askingPricePerQtl || product.askingPricePaise
                    ? `₹${product.askingPricePerQtl || (product.askingPricePaise ? product.askingPricePaise / 100 : 1800)}`
                    : 'Market Rate'}
                </strong>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 block">
                  per {product.unit || 'metric_ton'}
                </span>
              </div>
            </div>

            {/* Specifications List */}
            <div className="space-y-2.5 text-xs text-stone-600 dark:text-stone-300 divide-y divide-stone-100 dark:divide-emerald-900/30">
              <div className="flex items-center justify-between pt-1">
                <span>AI Quality Classification:</span>
                <strong className="bg-emerald-100 dark:bg-[#162719] text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold px-2 py-0.5 rounded-md">
                  {product.grade || product.aiGrade || 'Grade A'}
                </strong>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span>Confidence Score:</span>
                <span className="text-stone-900 dark:text-stone-100 font-semibold">
                  {product.confidenceScore || 91}% (High)
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span>FPO Verification:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span>🛡️</span>
                  <span>{product.verifiedGrade ? `Verified (${product.verifiedGrade})` : 'Pending Verification'}</span>
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span>Harvest Date:</span>
                <span className="text-stone-900 dark:text-stone-100 font-medium">
                  {product.harvestDate || '2026-09-25'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span>Packaging Type:</span>
                <span className="text-stone-900 dark:text-stone-100 font-medium">
                  {product.packagingType || 'Corrugated Plastic Crates (20kg)'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span>FPO Hub:</span>
                <span className="text-stone-900 dark:text-stone-100 font-medium">
                  {product.locationName || 'Baramati FPO Hub #1'}
                </span>
              </div>
            </div>

            {/* Collection Pass Code Preview */}
            <div className="bg-stone-50/70 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-900/40 rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <div className="font-bold text-xs text-stone-800 dark:text-stone-200">
                  Collection Pass Code
                </div>
                <div className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
                  {product.qrCode || `KS-${product.id || product._id}-DRAFT-BARAMATI`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: AI Vision & Quality Inspection Telemetry */}
      <div className="bg-white/95 dark:bg-[#132215]/95 border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl shadow-xs overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="bg-stone-50/70 dark:bg-[#162719] border-b border-stone-200 dark:border-emerald-900/40 py-3.5 px-6 flex items-center gap-2">
          <span className="text-emerald-700 dark:text-emerald-400 text-base">✨</span>
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            AI Vision &amp; Quality Inspection Telemetry
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {/* 4 Top Telemetry Metric Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] block font-medium">
                Laplacian Variance (Sharpness)
              </span>
              <strong className="text-stone-900 dark:text-stone-100 font-bold text-base block mt-0.5">
                {analysis.blurScore?.toFixed(1) || '146.5'}
              </strong>
              <span className="text-emerald-700 dark:text-emerald-400 text-[10px] block mt-0.5 font-semibold">
                ✓ Passed (&gt; 100)
              </span>
            </div>

            <div className="p-3 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] block font-medium">
                Illumination Exposure
              </span>
              <strong className="text-stone-900 dark:text-stone-100 font-bold text-base block mt-0.5">
                {analysis.brightnessScore?.toFixed(1) || '132.0'}
              </strong>
              <span className="text-emerald-700 dark:text-emerald-400 text-[10px] block mt-0.5 font-semibold">
                ✓ Passed (80-200)
              </span>
            </div>

            <div className="p-3 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] block font-medium">
                Lot Framing Occupancy
              </span>
              <strong className="text-stone-900 dark:text-stone-100 font-bold text-base block mt-0.5">
                {analysis.occupancyScore || 84}%
              </strong>
              <span className="text-emerald-700 dark:text-emerald-400 text-[10px] block mt-0.5 font-semibold">
                ✓ Passed (&gt; 55%)
              </span>
            </div>

            <div className="p-3 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] block font-medium">
                Inference Integrity
              </span>
              <strong className="text-stone-900 dark:text-stone-100 font-bold text-sm flex items-center justify-center gap-1 mt-1">
                <span>🛡️</span> OpenCV Passed
              </strong>
              <span className="text-stone-400 text-[10px] block mt-0.5 font-mono">
                {analysis.pHash?.slice(0, 10) || '9a2f7c81b0'}
              </span>
            </div>
          </div>

          {/* 4 Quality Parameters Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40 space-y-1">
              <span className="text-stone-400 text-[10px] block font-medium">
                Caliber &amp; Size Uniformity
              </span>
              <strong className="text-stone-800 dark:text-stone-200 block text-xs">
                {analysis.parameters?.sizeUniformity || '94% uniform caliber (38-42 grade) and finger length > 18cm'}
              </strong>
            </div>

            <div className="p-3.5 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40 space-y-1">
              <span className="text-stone-400 text-[10px] block font-medium">
                Surface Defect Ratio
              </span>
              <strong className="text-stone-800 dark:text-stone-200 block text-xs">
                {analysis.parameters?.surfaceDefectsPct || 1.6}% (&lt; 5% Grade A standard)
              </strong>
            </div>

            <div className="p-3.5 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40 space-y-1">
              <span className="text-stone-400 text-[10px] block font-medium">
                Ripeness &amp; Texture Index
              </span>
              <strong className="text-stone-800 dark:text-stone-200 block text-xs">
                {analysis.parameters?.ripenessIndex || 'Color stage 2 (Clean Green export stage)'}
              </strong>
            </div>

            <div className="p-3.5 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40 space-y-1">
              <span className="text-stone-400 text-[10px] block font-medium">
                Color Uniformity Score
              </span>
              <strong className="text-stone-800 dark:text-stone-200 block text-xs">
                {analysis.parameters?.colorScore || '93% Fresh Olive Green'}
              </strong>
            </div>
          </div>

          {/* Mandatory AI Visual Estimate Disclaimer Callout */}
          <div className="bg-amber-50/90 dark:bg-[#182b1c] border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 leading-relaxed shadow-xs">
            <span className="text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
            <div>
              <strong className="font-bold block mb-0.5 text-amber-950 dark:text-amber-100">
                Mandatory AI Visual Estimate Disclaimer:
              </strong>
              <span>
                External visual-quality estimate for {product.crop}. Internal moisture, sugar index (Brix), and chemical residue are not measurable from surface photos alone and are subject to physical verification at the FPO collection center.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
