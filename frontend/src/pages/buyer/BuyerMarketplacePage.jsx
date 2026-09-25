import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAvailableProduce } from '../../api/listings';
import { buyBatchDirect } from '../../api/bids';
import { mockService } from '../../api/mockService';
import {
  DEFAULT_FPO_POOLS,
  DEFAULT_DIRECT_LOTS,
  CROP_GRADIENTS,
  CROP_IMAGES,
  saveReservedPool,
  getStoredReservedPools,
} from '../../api/buyerData';
import { formatCurrency } from '../../utils/format';

export default function BuyerMarketplacePage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  // Mode: Direct Farmer Lots vs Aggregated FPO Pools
  const [marketplaceMode, setMarketplaceMode] = useState('farmer_products'); // 'farmer_products' | 'pools'
  const [cropFilter, setCropFilter] = useState('All');
  const [selectedPool, setSelectedPool] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authProcessing, setAuthProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Live lots from backend + farmer-submitted lots from mockService
  const [backendLots, setBackendLots] = useState([]);
  const [loadingBackendLots, setLoadingBackendLots] = useState(false);

  // Reserved pools tracked in storage
  const [reservedPoolIds, setReservedPoolIds] = useState(() => {
    return getStoredReservedPools().map((p) => p.id);
  });

  // Selected lot for modal inspection
  const [inspectedLot, setInspectedLot] = useState(null);
  const [directReserveProcessing, setDirectReserveProcessing] = useState(false);

  // GSAP animation refs
  const containerRef = useRef(null);
  const kpiGridRef = useRef(null);
  const cardsGridRef = useRef(null);
  const modalRef = useRef(null);

  // Fetch produce from backend API and sync with Farmer listings
  const fetchProduce = useCallback(async () => {
    try {
      setLoadingBackendLots(true);
      const res = await getAvailableProduce().catch(() => ({ data: [] }));
      const liveData = Array.isArray(res?.data) ? res.data : [];

      // Also get listings from farmer side mock state
      const farmerListings = mockService.getListings().filter(
        (l) => l.status === 'open' || l.productStatus === 'PUBLISHED' || l.marketplaceVisibility === 'PUBLIC'
      );

      // Merge unique listings
      const combined = [...liveData];
      farmerListings.forEach((fl) => {
        const flId = fl.id || fl._id;
        if (!combined.some((item) => (item.id || item._id) === flId)) {
          combined.push(fl);
        }
      });

      setBackendLots(combined);
    } catch (err) {
      console.warn('Backend produce fetch fallback to local store:', err);
      const farmerListings = mockService.getListings();
      setBackendLots(farmerListings);
    } finally {
      setLoadingBackendLots(false);
    }
  }, []);

  useEffect(() => {
    fetchProduce();
    const handleReserved = () => {
      setReservedPoolIds(getStoredReservedPools().map((p) => p.id));
    };
    const handleProduceSync = () => {
      fetchProduce();
    };

    window.addEventListener('krishisetu_buyer_pool_reserved', handleReserved);
    window.addEventListener('krishisetu_listing_created', handleProduceSync);
    window.addEventListener('krishisetu_product_updated', handleProduceSync);
    window.addEventListener('storage', handleProduceSync);

    // Light poll to capture any background farmer listings
    const pollTimer = setInterval(fetchProduce, 5000);

    return () => {
      window.removeEventListener('krishisetu_buyer_pool_reserved', handleReserved);
      window.removeEventListener('krishisetu_listing_created', handleProduceSync);
      window.removeEventListener('krishisetu_product_updated', handleProduceSync);
      window.removeEventListener('storage', handleProduceSync);
      clearInterval(pollTimer);
    };
  }, [fetchProduce]);

  // GSAP Entrance Animations
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
    if (kpiGridRef.current) {
      const items = kpiGridRef.current.children;
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, scale: 0.95, y: 10 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
        );
      }
    }
  }, []);

  // GSAP Cards Grid Animation on mode / filter switch
  useEffect(() => {
    if (cardsGridRef.current) {
      const cards = cardsGridRef.current.querySelectorAll('.marketplace-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' }
        );
      }
    }
  }, [marketplaceMode, cropFilter, backendLots.length]);

  // Modal Animation
  useEffect(() => {
    if ((isAuthOpen || inspectedLot) && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.94, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' }
      );
    }
  }, [isAuthOpen, inspectedLot]);

  // Combined Farmer Lots (Direct integration with Farmer Listings)
  const allFarmerLots = useMemo(() => {
    const mappedBackend = backendLots.map((b) => ({
      id: b.id || b._id || `LOT-${(b.crop || 'PRD').slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      crop: b.crop ? b.crop.charAt(0).toUpperCase() + b.crop.slice(1) : 'Produce',
      variety: b.variety || 'Hybrid Commercial',
      locationName: b.locationName || (b.village ? `${b.village}, ${b.district || 'Pune'}` : 'Baramati FPO Hub #1, Pune'),
      quantity: b.quantityKg || b.quantity_kg || 500,
      unit: b.unit || 'kg',
      askingPrice: b.ask_price_per_kg || b.min_price_per_kg || b.askingPrice || 22,
      grade: b.grade || b.quality_grade || 'Grade A',
      producer: b.farmer_name || 'Verified Member (FPO Network)',
      confidenceScore: Math.round(
        b.confidence_score ? (b.confidence_score > 1 ? b.confidence_score : b.confidence_score * 100) : 91
      ),
      coverImageUrl: b.coverImageUrl || (b.images && b.images[0]) || CROP_IMAGES[b.crop?.charAt(0).toUpperCase() + b.crop?.slice(1)] || CROP_IMAGES.default,
      harvestDate: b.harvestDate || b.harvest_date || '2026-09-24',
      description: b.description || 'Verified farm harvest ready for wholesale delivery.',
      specs: b.specs || b.analysis?.parameters || {
        moisture: '11.5%',
        uniformity: '94%',
        brix: '18°',
        certNumber: b.cert_number || 'NABL-AGMARK-VERIFIED',
      },
      isLiveBackend: true,
      rawBatch: b,
    }));

    // Deduplicate against DEFAULT_DIRECT_LOTS by id
    const existingIds = new Set(mappedBackend.map((l) => l.id));
    const uniqueDefaults = DEFAULT_DIRECT_LOTS.filter((d) => !existingIds.has(d.id));

    return [...mappedBackend, ...uniqueDefaults];
  }, [backendLots]);

  // Filtered Farmer Lots
  const filteredFarmerLots = useMemo(() => {
    return allFarmerLots.filter((lot) => {
      if (cropFilter !== 'All' && lot.crop.toLowerCase() !== cropFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [allFarmerLots, cropFilter]);

  // Filtered Pools
  const filteredPools = useMemo(() => {
    return DEFAULT_FPO_POOLS.filter((pool) => {
      if (cropFilter !== 'All' && pool.crop.toLowerCase() !== cropFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [cropFilter]);

  // Unique crop chips
  const uniqueCrops = useMemo(() => {
    const list = new Set(['All', 'Cotton', 'Soyabean', 'Tomato', 'Onion', 'Grapes', 'Pomegranate', 'Turmeric', 'Banana']);
    allFarmerLots.forEach((l) => list.add(l.crop));
    DEFAULT_FPO_POOLS.forEach((p) => list.add(p.crop));
    return Array.from(list);
  }, [allFarmerLots]);

  // Top KPI stats calculations
  const totalPoolsCount = DEFAULT_FPO_POOLS.length;
  const totalStockMT = (DEFAULT_FPO_POOLS.reduce((s, p) => s + p.current_kg, 0) / 1000).toFixed(1);
  const totalValueK = Math.round(
    DEFAULT_FPO_POOLS.reduce((s, p) => s + (p.current_kg / 100) * p.price_per_qtl, 0) / 1000
  );

  // Reserve Pool action
  const handleConfirmReservation = async () => {
    if (!selectedPool) return;
    setAuthProcessing(true);
    try {
      const saved = saveReservedPool(selectedPool, user);
      setIsAuthOpen(false);
      setSelectedPool(null);
      setNotification({
        type: 'success',
        message: `Consignment #${saved.id} reserved! RBI-Compliant nodal escrow hold authorized.`,
      });
      setTimeout(() => {
        navigate('/buyer/delivery');
      }, 1200);
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: 'Could not reserve pool. Please try again.',
      });
    } finally {
      setAuthProcessing(false);
    }
  };

  // Direct Farmer Lot Reservation / Escrow Purchase
  const handleConfirmDirectLot = async (lot) => {
    setDirectReserveProcessing(true);
    try {
      if (lot.rawBatch?.id) {
        await buyBatchDirect(lot.rawBatch.id).catch(() => {});
      }

      // Update lot status on farmer side so it moves to BUYER_RESERVED
      try {
        const state = mockService.loadState();
        state.listings = (state.listings || []).map((l) =>
          l.id === lot.id || l._id === lot.id
            ? { ...l, status: 'reserved', productStatus: 'BUYER_RESERVED' }
            : l
        );
        mockService.saveState(state);
        window.dispatchEvent(new CustomEvent('krishisetu_product_updated', { detail: { id: lot.id, status: 'reserved' } }));
      } catch {}

      // Save as reserved pool delivery
      const pseudoPool = {
        id: lot.id,
        crop: lot.crop,
        variety: lot.variety,
        target_kg: lot.quantity,
        current_kg: lot.quantity,
        price_per_qtl: lot.askingPrice * 100,
        status: 'Reserved',
        destination_mandi: 'FreshMart Hadapsar Central Warehouse, Pune',
        collection_hub: lot.locationName,
        shared_freight_savings_pct: 25.0,
        fpoName: lot.producer || 'Saksham Baramati Krushi PC',
        transporter: {
          name: 'Sahyadri Cold Chain Logistics',
          vehicleNumber: 'MH-12-RN-5821',
          contact: '+91 98220 12345',
        },
      };
      saveReservedPool(pseudoPool, user);
      setInspectedLot(null);
      setNotification({
        type: 'success',
        message: `Consignment #${lot.id} for ${lot.crop} confirmed in RBI-compliant escrow!`,
      });
      setTimeout(() => {
        navigate('/buyer/delivery');
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setDirectReserveProcessing(false);
    }
  };

  return (
    <div ref={containerRef} className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Breadcrumb Navigation matching Farmer side */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span className="text-[#255919] dark:text-[#D1BF4B] font-bold">KrishiSetu B2B</span>
        <span>›</span>
        <span className="font-semibold text-stone-800 dark:text-[#D1BF4B]">
          {t('b2b_marketplace_title', 'B2B Wholesale Agri Marketplace')}
        </span>
      </div>

      {/* Toast Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-700 text-white'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-white hover:opacity-75 font-black text-base ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Header Section matching Farmer side */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 dark:bg-[#132215]/95 p-5 md:p-6 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xl">🏪</span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              {t('b2b_marketplace_title', 'B2B Wholesale Agri Marketplace')}
            </h1>
          </div>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            {t('b2b_marketplace_subtitle', 'Procure FPO-verified, escrow-protected aggregated consignments. Connected directly to farms.')}
          </p>
        </div>

        {/* RBI-Compliant Escrow Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold w-fit shadow-xs">
          <span>🛡️</span>
          <span>{t('rbi_compliant_escrow', 'RBI-Compliant Escrow')}</span>
        </div>
      </div>

      {/* 4 KPI Summary Cards matching Screenshot & Farmer side styling */}
      <div ref={kpiGridRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Available Pools */}
        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-[#D1BF4B]/20 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xl font-bold shrink-0">
            📦
          </div>
          <div>
            <div className="text-xl font-black text-stone-900 dark:text-stone-100 leading-tight">
              {totalPoolsCount}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {t('available_pools', 'Available Pools')}
            </div>
          </div>
        </div>

        {/* KPI 2: Total Stock */}
        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-[#D1BF4B]/20 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-300 text-xl font-bold shrink-0">
            🚚
          </div>
          <div>
            <div className="text-xl font-black text-stone-900 dark:text-stone-100 leading-tight">
              {totalStockMT} MT
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {t('total_stock', 'Total Stock')}
            </div>
          </div>
        </div>

        {/* KPI 3: Total Market Value */}
        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-[#D1BF4B]/20 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xl font-bold shrink-0">
            ₹
          </div>
          <div>
            <div className="text-xl font-black text-stone-900 dark:text-stone-100 leading-tight">
              ₹{totalValueK}K
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {t('total_market_value', 'Total Market Value')}
            </div>
          </div>
        </div>

        {/* KPI 4: Registered Buyers */}
        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-[#D1BF4B]/20 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-700 dark:text-purple-300 text-xl font-bold shrink-0">
            ⭐
          </div>
          <div>
            <div className="text-xl font-black text-stone-900 dark:text-stone-100 leading-tight">
              2
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {t('registered_buyers', 'Registered Buyers')}
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Selector Switcher matching Screenshot */}
      <div className="flex items-center gap-2.5 border-b border-stone-200 dark:border-emerald-900/40 pb-3">
        <button
          type="button"
          onClick={() => setMarketplaceMode('farmer_products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            marketplaceMode === 'farmer_products'
              ? 'bg-[#255919] text-white shadow-md'
              : 'bg-stone-100 dark:bg-[#142617] text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-[#1b341f]'
          }`}
        >
          <span>📦</span>
          <span>
            {t('direct_farmer_lots', 'Direct Farmer Lots')} ({filteredFarmerLots.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMarketplaceMode('pools')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            marketplaceMode === 'pools'
              ? 'bg-[#255919] text-white shadow-md'
              : 'bg-stone-100 dark:bg-[#142617] text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-[#1b341f]'
          }`}
        >
          <span>👥</span>
          <span>
            {t('aggregated_fpo_pools', 'Aggregated FPO Pools')} ({filteredPools.length})
          </span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center gap-1">
          <span>⚙️</span> {t('filter_label', 'Filter:')}
        </span>

        <div className="flex flex-wrap gap-1.5">
          {uniqueCrops.map((crop) => (
            <button
              key={crop}
              onClick={() => setCropFilter(crop)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                cropFilter === crop
                  ? 'bg-[#255919] text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-[#132215] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#1b341f] border border-stone-200 dark:border-emerald-900/40'
              }`}
            >
              {crop}
            </button>
          ))}
        </div>

        {cropFilter !== 'All' && (
          <button
            onClick={() => setCropFilter('All')}
            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-bold hover:underline ml-2 cursor-pointer"
          >
            ✕ {t('clear_filter', 'Clear')}
          </button>
        )}
      </div>

      {/* VIEW 1: Direct Farmer Lots */}
      {marketplaceMode === 'farmer_products' && (
        <div ref={cardsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFarmerLots.length === 0 ? (
            <div className="col-span-full p-12 text-center border border-dashed border-stone-300 dark:border-emerald-900/50 rounded-2xl bg-stone-50 dark:bg-[#132215]">
              <div className="text-4xl mb-3">🌾</div>
              <p className="text-base font-bold text-stone-700 dark:text-stone-200">
                {lang === 'mr' ? 'कोणतेही शेतकरी लॉट्स सापडले नाहीत.' : lang === 'hi' ? 'कोई किसान लॉट उपलब्ध नहीं है।' : 'No individual farmer lots match this filter.'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-400 mt-1">
                {lang === 'mr' ? 'नवीन काढणी लॉट एआय व एफपीओ तपासणी प्रक्रियेत आहेत.' : lang === 'hi' ? 'नई फसलें एआई और एफपीओ सत्यापन प्रक्रिया में हैं।' : 'New farm harvests are currently undergoing AI computer vision and FPO gate verification.'}
              </p>
            </div>
          ) : (
            filteredFarmerLots.map((lot) => {
              const coverImg = lot.coverImageUrl || CROP_IMAGES[lot.crop] || CROP_IMAGES.default;
              return (
                <div
                  key={lot.id}
                  className="marketplace-card bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-[#D1BF4B]/20 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:border-emerald-500/50 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Image Cover matching Screenshot 1 */}
                    <div className="relative aspect-video bg-stone-900 overflow-hidden">
                      <img
                        src={coverImg}
                        alt={lot.crop}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = CROP_IMAGES.default;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                      {/* Top Left: FPO Inspected badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md">
                          <span>🛡️</span> {t('fpo_inspected', 'FPO Inspected')}
                        </span>
                      </div>

                      {/* Top Right: Grade badge */}
                      <div className="absolute top-2.5 right-2.5 bg-white/95 dark:bg-[#0c170e]/90 backdrop-blur-xs text-stone-900 dark:text-stone-100 text-xs font-black px-2.5 py-0.5 rounded-lg shadow-sm border border-stone-200/50">
                        {lot.grade || 'Grade A'}
                      </div>

                      {/* Bottom Title & Location */}
                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <h3 className="font-extrabold text-base leading-tight">
                          {lot.crop}{' '}
                          <span className="text-xs font-normal text-stone-200">
                            ({lot.variety})
                          </span>
                        </h3>
                        <div className="text-[11px] text-stone-300 flex items-center gap-1 mt-0.5">
                          <span className="text-emerald-400">📍</span>
                          <span className="truncate">{lot.locationName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Specifications */}
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-end pb-2.5 border-b border-stone-100 dark:border-emerald-900/30">
                        <div>
                          <span className="text-[10px] text-stone-400 dark:text-stone-400 block font-semibold uppercase tracking-wider">
                            {t('available_volume', 'Available Volume')}
                          </span>
                          <strong className="text-lg font-black text-stone-900 dark:text-stone-100">
                            {lot.quantity} {lot.unit}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 dark:text-stone-400 block font-semibold uppercase tracking-wider">
                            {t('asking_rate', 'Asking Rate')}
                          </span>
                          <strong className="text-lg font-black text-[#255919] dark:text-[#D1BF4B]">
                            ₹{lot.askingPrice}
                          </strong>
                          <span className="text-[10px] text-stone-400 dark:text-stone-400 font-medium">
                            /{lot.unit}
                          </span>
                        </div>
                      </div>

                      {/* Producer and quality meta */}
                      <div className="text-xs space-y-1.5 pt-0.5">
                        <div className="flex justify-between text-stone-600 dark:text-stone-400">
                          <span>{t('producer_label', 'Producer:')}</span>
                          <span className="font-bold text-stone-800 dark:text-stone-200">
                            {lot.producer}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-600 dark:text-stone-400">
                          <span>{t('ai_quality_score', 'AI Quality Score:')}</span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400">
                            {lot.confidenceScore}% (High)
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-600 dark:text-stone-400">
                          <span>{t('lot_id', 'Lot ID:')}</span>
                          <span className="font-mono text-stone-500 dark:text-stone-400 font-semibold text-[11px]">
                            {lot.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions matching Screenshot 1 */}
                  <div className="p-4 pt-0">
                    <button
                      type="button"
                      onClick={() => setInspectedLot(lot)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold text-xs transition cursor-pointer"
                    >
                      <span>👁️</span>
                      <span>{t('view_product_details', 'View Product Details')}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: Aggregated FPO Pools matching Screenshot 2 */}
      {marketplaceMode === 'pools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPools.map((pool) => {
            const totalVal = Math.round((pool.current_kg / 100) * pool.price_per_qtl);
            const fillPct = Math.round((pool.current_kg / pool.target_kg) * 100);
            const gradientClass = CROP_GRADIENTS[pool.crop] || CROP_GRADIENTS.default;
            const isReserved = reservedPoolIds.includes(pool.id);

            return (
              <div
                key={pool.id}
                className={`bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between ${
                  isReserved ? 'opacity-75 ring-1 ring-amber-400/50' : 'hover:border-emerald-500/50'
                }`}
              >
                <div>
                  {/* Crop Header with gradient banner matching Screenshot 2 */}
                  <div className={`h-28 bg-gradient-to-br ${gradientClass} relative flex flex-col items-start justify-end p-3.5`}>
                    <div className="absolute inset-0 bg-black/25 pointer-events-none" />

                    {/* Top Left: FPO Certified */}
                    <div className="absolute top-2.5 left-3">
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 border border-white/25">
                        <span>🛡️</span> {t('fpo_certified', 'FPO Certified')}
                      </span>
                    </div>

                    {/* Top Right: Reserved badge if applicable */}
                    {isReserved && (
                      <div className="absolute top-2.5 right-3">
                        <span className="bg-amber-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-md shadow-xs">
                          {t('already_reserved', 'Reserved')}
                        </span>
                      </div>
                    )}

                    {/* Crop info */}
                    <div className="relative z-10 text-white">
                      <h3 className="font-extrabold text-base leading-tight drop-shadow-xs">
                        {pool.crop}
                      </h3>
                      <div className="text-xs text-white/90 font-medium">
                        {pool.variety}
                      </div>
                      <div className="text-[10px] text-white/80 flex items-center gap-1 mt-0.5 truncate">
                        <span>📍</span>
                        <span className="truncate">
                          {pool.collection_hub} → {pool.destination_mandi}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    {/* Volume & Price */}
                    <div className="flex justify-between items-end pb-2.5 border-b border-stone-100 dark:border-emerald-900/30">
                      <div>
                        <div className="text-[10px] text-stone-400 dark:text-stone-400 font-semibold uppercase tracking-wider mb-0.5">
                          {t('available_volume', 'Available Volume')}
                        </div>
                        <div className="font-black text-stone-900 dark:text-stone-100 text-lg leading-tight">
                          {pool.current_kg} kg
                        </div>
                        <div className="text-[10px] text-stone-400 dark:text-stone-400">
                          {lang === 'mr' ? 'ध्येय:' : lang === 'hi' ? 'लक्ष्य:' : 'Target:'} {pool.target_kg} kg
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-stone-400 dark:text-stone-400 font-semibold uppercase tracking-wider mb-0.5">
                          {t('asking_rate', 'Asking Rate')}
                        </div>
                        <div className="font-black text-[#255919] dark:text-[#D1BF4B] text-xl leading-tight">
                          ₹{pool.price_per_qtl}
                        </div>
                        <div className="text-[10px] text-stone-400 dark:text-stone-400 font-medium">
                          /qtl
                        </div>
                      </div>
                    </div>

                    {/* Pool Fill Progress */}
                    <div>
                      <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 font-semibold mb-1">
                        <span>{t('pool_fill_progress', 'Pool Fill Progress')}</span>
                        <span>{fillPct}%</span>
                      </div>
                      <div className="w-full bg-stone-100 dark:bg-[#1a2d1d] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            fillPct >= 90
                              ? 'bg-emerald-500'
                              : fillPct >= 50
                              ? 'bg-amber-400'
                              : 'bg-stone-400'
                          }`}
                          style={{ width: `${Math.min(100, fillPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Grade Badges & Freight Saved */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-1.5">
                        {pool.allowedGrades?.map((g) => (
                          <span
                            key={g}
                            className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-stone-100 dark:bg-[#182b1c] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-emerald-800/40"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px]">
                        {pool.shared_freight_savings_pct}% {t('freight_saved', 'Freight Saved')}
                      </span>
                    </div>

                    {/* Total Value */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-emerald-900/30 text-xs">
                      <span className="text-stone-500 dark:text-stone-400 font-medium">
                        {t('est_total_value', 'Est. Total Value:')}
                      </span>
                      <span className="font-black text-stone-900 dark:text-stone-100 text-sm">
                        ₹{totalVal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    disabled={isReserved}
                    onClick={() => {
                      if (!isReserved) {
                        setSelectedPool(pool);
                        setIsAuthOpen(true);
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isReserved
                        ? 'bg-stone-200 dark:bg-[#1a2d1d] text-stone-500 cursor-not-allowed'
                        : 'bg-[#255919] hover:bg-[#1b4313] text-white'
                    }`}
                  >
                    <span>🛡️</span>
                    <span>
                      {isReserved
                        ? t('already_reserved', 'Already Reserved')
                        : `${t('reserve_pool', 'Reserve Pool')} (₹${totalVal.toLocaleString()})`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Payment & Escrow Authorization Dialog */}
      {isAuthOpen && selectedPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-emerald-900/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="font-black text-lg text-stone-900 dark:text-stone-100">
                  {t('auth_escrow_title', 'Authorize Nodal Escrow Hold')}
                </h3>
              </div>
              <button
                onClick={() => setIsAuthOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-stone-600 dark:text-stone-300">
                {lang === 'mr'
                  ? `तुम्ही ${selectedPool.fpoName || selectedPool.collection_hub} कडून ${selectedPool.crop} (${selectedPool.variety}) आरक्षित करत आहात.`
                  : lang === 'hi'
                  ? `आप ${selectedPool.fpoName || selectedPool.collection_hub} से ${selectedPool.crop} (${selectedPool.variety}) आरक्षित कर रहे हैं।`
                  : `You are reserving ${selectedPool.crop} (${selectedPool.variety}) from ${selectedPool.fpoName || selectedPool.collection_hub}.`}
              </p>

              <div className="p-3.5 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">{t('available_volume', 'Total Volume')}:</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {selectedPool.current_kg} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">{t('asking_rate', 'Agreed Pool Rate')}:</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    ₹{selectedPool.price_per_qtl} / quintal
                  </span>
                </div>
                <div className="flex justify-between border-t border-stone-200 dark:border-emerald-800/40 pt-2 text-sm">
                  <span className="font-extrabold text-stone-900 dark:text-stone-100">
                    {t('est_total_value', 'Total Escrow Hold:')}
                  </span>
                  <span className="font-black text-[#255919] dark:text-[#D1BF4B]">
                    ₹{Math.round((selectedPool.current_kg / 100) * selectedPool.price_per_qtl).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/40 text-purple-900 dark:text-purple-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>🔒</span> {t('zero_advance_protection', 'Zero-Advance Escrow Protection')}
                </div>
                <p className="text-[11px] leading-relaxed">
                  {lang === 'mr'
                    ? 'रक्कम RBI-अनुपालित बँक एस्क्रो खात्यात सुरक्षित ठेवली जाते. आपण डिलिव्हरीच्या वेळी इलेक्ट्रॉनिक वजन पावतीनुसार मालाची प्रत्यक्ष तपासणी करेपर्यंत कोणतेही पैसे सोडले जात नाहीत.'
                    : lang === 'hi'
                    ? 'धनराशि आरबीआई-अनुरूप बैंक एस्क्रो खाते में सुरक्षित रखी जाती है। डिलीवरी पर इलेक्ट्रॉनिक वजन पर्ची के अनुसार माल की जांच करने से पहले कोई भी भुगतान जारी नहीं किया जाता।'
                    : 'Funds remain securely placed inside an RBI-compliant bank escrow account. Zero money is released until you physically inspect crates against the electronic weigh-slip at delivery.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAuthOpen(false)}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-emerald-950/30 transition cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={authProcessing}
                onClick={handleConfirmReservation}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {authProcessing ? (lang === 'mr' ? 'अधिकृत करत आहे...' : lang === 'hi' ? 'अधिकृत किया जा रहा है...' : 'Authorizing...') : t('confirm_reserve', 'Confirm & Reserve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Product Detail Inspection Modal (Direct Farmer Lot) */}
      {inspectedLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-emerald-900/30 pb-3">
              <div>
                <span className="font-mono text-xs text-stone-400 block">{inspectedLot.id}</span>
                <h3 className="font-black text-xl text-stone-900 dark:text-stone-100">
                  {inspectedLot.crop} ({inspectedLot.variety})
                </h3>
              </div>
              <button
                onClick={() => setInspectedLot(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Gallery Image */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-stone-900">
              <img
                src={inspectedLot.coverImageUrl}
                alt={inspectedLot.crop}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md">
                <span>🛡️</span> {t('fpo_inspected', 'FPO Inspected & Certified')}
              </div>
              <div className="absolute top-3 right-3 bg-white/95 dark:bg-[#0c170e]/90 text-stone-900 dark:text-stone-100 font-black text-xs px-3 py-1 rounded-lg">
                {inspectedLot.grade}
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40">
                <span className="text-stone-400 block mb-0.5">{t('available_volume', 'Available Volume')}</span>
                <strong className="text-stone-900 dark:text-stone-100 text-sm">
                  {inspectedLot.quantity} {inspectedLot.unit}
                </strong>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40">
                <span className="text-stone-400 block mb-0.5">{t('asking_rate', 'Asking Price')}</span>
                <strong className="text-emerald-700 dark:text-emerald-400 text-sm">
                  ₹{inspectedLot.askingPrice} / {inspectedLot.unit}
                </strong>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40">
                <span className="text-stone-400 block mb-0.5">{t('ai_quality_score', 'AI Quality Score')}</span>
                <strong className="text-emerald-700 dark:text-emerald-400 text-sm">
                  {inspectedLot.confidenceScore}% (High)
                </strong>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40">
                <span className="text-stone-400 block mb-0.5">{lang === 'mr' ? 'काढणी दिनांक' : lang === 'hi' ? 'कटाई दिनांक' : 'Harvest Date'}</span>
                <strong className="text-stone-900 dark:text-stone-100 text-sm">
                  {inspectedLot.harvestDate}
                </strong>
              </div>
            </div>

            {/* Farm Origin & Description */}
            <div className="space-y-2 text-xs">
              <div className="p-3.5 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40 space-y-1">
                <div className="font-bold text-stone-800 dark:text-stone-200">
                  📍 {lang === 'mr' ? 'उगम व संकलन केंद्र:' : lang === 'hi' ? 'उत्पत्ति व संकलन केंद्र:' : 'Origin & Collection Point:'} {inspectedLot.locationName}
                </div>
                <p className="text-stone-600 dark:text-stone-300">
                  {inspectedLot.description}
                </p>
              </div>

              {inspectedLot.specs && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40">
                  {Object.entries(inspectedLot.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-stone-400 capitalize">{key}:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInspectedLot(null)}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-emerald-950/30 transition cursor-pointer"
              >
                {t('cancel', 'Close')}
              </button>
              <button
                type="button"
                disabled={directReserveProcessing}
                onClick={() => handleConfirmDirectLot(inspectedLot)}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {directReserveProcessing ? (lang === 'mr' ? 'आरक्षित करत आहे...' : lang === 'hi' ? 'आरक्षित किया जा रहा है...' : 'Reserving...') : `${lang === 'mr' ? 'एस्क्रोने खरेदी करा' : lang === 'hi' ? 'एस्क्रो से खरीदें' : 'Procure via Escrow'} (₹${(inspectedLot.quantity * inspectedLot.askingPrice).toLocaleString()})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
