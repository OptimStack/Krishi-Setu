import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import FarmMandiMap from '../../components/widgets/FarmMandiMap';
import LocationChangeModal from '../../components/widgets/LocationChangeModal';
import PriceForecastWidget from '../../components/widgets/PriceForecastWidget';
import WarehouseFinderWidget from '../../components/widgets/WarehouseFinderWidget';
import { getListings, cancelListing } from '../../api/listings';
import { getIncomingBuyerBids, acceptBuyerBid, getActivePool } from '../../api/bids';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { staggerIn } from '../../utils/animations';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { isOnline, lastSavedLocation, offlineQueue } = useOffline();

  const [listings, setListings] = useState([]);
  const [buyerBids, setBuyerBids] = useState([]);
  const [activePool, setActivePool] = useState({
    id: 'batch_fpo_pune',
    name: 'Pune FPO Hub — Pune Gultekdi Market',
    crop: 'Tomato',
    variety: 'Abhinav Hybrid',
    quality_grade: 'A',
    current_quantity_kg: 750,
    target_quantity_kg: 1200,
    price_per_kg: 16.55,
    status: 'open',
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [acceptingBidId, setAcceptingBidId] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isMapPinMode, setIsMapPinMode] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [listRes, bidsRes, poolRes] = await Promise.allSettled([
        getListings(),
        getIncomingBuyerBids(),
        getActivePool(),
      ]);
      if (listRes.status === 'fulfilled' && listRes.value?.data) {
        setListings(listRes.value.data);
      }
      if (bidsRes.status === 'fulfilled' && bidsRes.value?.data) {
        setBuyerBids(bidsRes.value.data);
      }
      if (poolRes.status === 'fulfilled' && poolRes.value?.data) {
        setActivePool(poolRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load listings, buyer bids or active pool:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchListings = fetchData;

  useEffect(() => {
    fetchData();
    // Poll for updates every 8 seconds so bids, auctions, and settlements update live
    const interval = setInterval(fetchData, 8000);

    const handleSync = (e) => {
      if (e?.detail?.pool) {
        setActivePool(e.detail.pool);
      }
      fetchData();
    };

    window.addEventListener('krishisetu_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('krishisetu_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchData]);

  const handleAcceptBid = async (bid, matchingListing) => {
    const bidId = bid._id || bid.id;
    const targetListing = matchingListing || listings.find(
      (l) => (l.crop || '').toLowerCase() === (bid.crop || '').toLowerCase() && l.status === 'open'
    );
    if (!targetListing) {
      setFeedback({
        text: `You do not have an open listing for ${bid.crop} to accept this offer. Please submit a listing for this crop first.`,
        type: 'error',
      });
      return;
    }
    const listingId = targetListing._id || targetListing.id;
    setAcceptingBidId(bidId);
    setFeedback({ text: '', type: '' });
    try {
      const res = await acceptBuyerBid({ bid_id: bidId, listing_id: listingId });
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to accept offer', type: 'error' });
      } else {
        const qty = parseFloat(bid.quantity_needed_kg || targetListing.quantity_kg || 100);
        const price = parseFloat(bid.max_price_per_kg || 25);
        const gross = qty * price;
        setFeedback({
          text: `Offer accepted! ₹${gross.toLocaleString('en-IN')} has been added to your payouts.`,
          type: 'success',
        });
        fetchData();
      }
    } catch (err) {
      setFeedback({ text: 'Error accepting buyer offer.', type: 'error' });
    } finally {
      setAcceptingBidId(null);
    }
  };

  const handleCancel = async (listingId) => {
    if (!window.confirm('Are you sure you want to cancel this listing?')) return;
    setActionLoading(listingId);
    try {
      const res = await cancelListing(listingId);
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to cancel listing', type: 'error' });
      } else {
        setFeedback({ text: 'Listing cancelled successfully.', type: 'success' });
        fetchListings();
      }
    } catch (err) {
      setFeedback({ text: 'Error cancelling listing', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics computation
  const totalListings = listings.length;
  const openListings = listings.filter((l) => l.status === 'open');
  const pooledListings = listings.filter((l) => l.status === 'pooled');
  const matchedOrSettled = listings.filter((l) => l.status === 'matched' || l.status === 'settled');

  const filteredListings = filterStatus === 'all'
    ? listings
    : listings.filter((l) => (l.status || '').toLowerCase() === filterStatus.toLowerCase());

  const statsRef = useRef(null);

  useEffect(() => {
    if (statsRef.current) {
      const cards = statsRef.current.querySelectorAll('.kpi-card');
      staggerIn(cards, { stagger: 0.08, y: 15 });
    }
  }, []);

  // Standard recent lots matching screenshot
  const standardRecentLots = [
    {
      id: 'lot_tom_1',
      crop: 'Tomato (Abhinav (Hybrid))',
      quantityKg: 450,
      lotNumber: 'LOT-TOM-8491',
      date: '9/7/2026',
      status: 'Verified',
      grade: 'Grade A',
    },
    {
      id: 'lot_oni_1',
      crop: 'Onion (Unhali Red Garva)',
      quantityKg: 1200,
      lotNumber: 'LOT-ONI-3912',
      date: '9/8/2026',
      status: 'Pooled',
      grade: 'Grade A',
    },
    {
      id: 'lot_pom_1',
      crop: 'Pomegranate (Bhagwa Export Grade)',
      quantityKg: 600,
      lotNumber: 'LOT-POM-7219',
      date: '8/8/2026',
      status: 'Draft',
      grade: 'Grade A',
    },
  ];

  // Standard nearby mandis matching screenshot
  const nearbyMandisList = [
    {
      name: 'Baramati APMC',
      distance: '0 km',
      time: '15 min',
      price: '₹1,655/qtl',
      status: 'Live',
    },
    {
      name: 'Pune Gultekdi Market Yard',
      distance: '84.5 km',
      time: '2 hr 36 min',
      price: '₹1,820/qtl',
      status: null,
    },
    {
      name: 'Pandharpur APMC',
      distance: '95.2 km',
      time: '2 hr 54 min',
      price: '₹1,740/qtl',
      status: 'Live',
    },
    {
      name: 'Manchar APMC',
      distance: '116.2 km',
      time: '3 hr 24 min',
      price: '₹1,690/qtl',
      status: 'Live',
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. TOP GREETING & START SELLING CTA (Matching Screenshot) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pt-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2 tracking-tight">
            <span>{t('greeting', 'Namaste')}, {user?.name ? user.name.split(' ')[0] : 'Ramesh'} 👋</span>
          </h1>
          <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 font-medium mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>
              {isOnline
                ? t('online_status_line', 'Online • Real-Time Pune APMC Connected • Live Market Feed Active')
                : t('offline_status_line', 'Offline Mode • Local Queue Active • Cached Mandi Rates')}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link to="/farmer/submit-ask">
            <button className="bg-[#0b4d26] hover:bg-[#07361b] text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 text-xs md:text-sm cursor-pointer border border-[#D3D67A]/30">
              <span>📷</span>
              <span>{t('start_selling', 'Start Selling')}</span>
            </button>
          </Link>
          <button
            onClick={fetchListings}
            className="p-2.5 rounded-xl bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-emerald-950 transition cursor-pointer shadow-xs"
            title="Refresh Data"
          >
            ↻
          </button>
        </div>
      </div>

      {/* 2. CURRENT FARM LOCATION CARD (Matching Screenshot) */}
      <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl p-4 md:p-5 border border-stone-200/90 dark:border-emerald-800/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#D3D67A] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-lg shrink-0">
            📍
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                {t('current_farm_location', 'Current Farm Location')}: {lastSavedLocation}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {t('accuracy_manual', 'Accuracy: Manual (Taluka/District)')}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              18.1517° N, 74.5772° E • Last updated: just now • 1000 km radius
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLocationModal(true)}
          className="self-start sm:self-auto text-xs font-bold text-stone-700 dark:text-stone-200 hover:text-emerald-700 dark:hover:text-[#D3D67A] px-3.5 py-2 rounded-xl border border-stone-300 dark:border-emerald-800/60 hover:border-emerald-500 transition cursor-pointer bg-stone-50 dark:bg-[#162719] flex items-center gap-1.5"
        >
          <span>📍</span>
          <span>{t('change_location', 'Change Location')}</span>
        </button>
      </div>

      {/* 3. OFFLINE MODE CARD / BANNER (Requested by User) */}
      {!isOnline && (
        <div className="bg-amber-50/95 dark:bg-[#201809]/95 rounded-2xl p-5 md:p-6 border-2 border-amber-400/80 dark:border-amber-600/50 shadow-xl transition-all">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div className="space-y-2 text-stone-800 dark:text-amber-100 flex-1">
              <p className="font-bold text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                {t('offline_banner_title', 'You are offline. Crop drafts and pool requests are safely queued in your local browser and will sync automatically when back online.')}
              </p>

              <div className="bg-white/70 dark:bg-black/30 p-3 rounded-xl border border-amber-300/60 dark:border-amber-700/40">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 mb-1">
                  {t('offline_mode_badge', 'Offline Mode')}
                </span>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-normal">
                  {t('offline_mode_desc', 'Simulated local storage queue is active. You can create lots and join pools; they will synchronize when connection is restored.')}
                </p>
              </div>

              <div className="text-xs font-medium text-stone-700 dark:text-amber-200/90 pt-1 space-y-1">
                <p>📍 {t('offline_bullet_1', `Last saved location: ${lastSavedLocation}`)}</p>
                <p>•</p>
                <p>📊 {t('offline_bullet_2', 'Cached mandi rates available')}</p>
                <p>•</p>
                <p>🔒 {t('offline_bullet_3', 'Live buyer offers and payments pause until back online')}</p>
              </div>

              {offlineQueue.length > 0 && (
                <div className="pt-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  📦 {offlineQueue.length} item{offlineQueue.length > 1 ? 's' : ''} currently queued in browser memory.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback.text && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold shadow-md ${
            feedback.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* 4. FOUR KPI CARDS (Matching Screenshot) */}
      <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Card 1: Today's Best Net */}
        <div className="kpi-card bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              {t('todays_best_net', "Today's Best Net")}
            </span>
            <span className="text-emerald-700 dark:text-[#D3D67A] font-bold text-sm">₹</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 mt-2">
            ₹1,655 <span className="text-sm font-medium text-stone-500">/qtl</span>
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
            Tomato • Baramati APMC
          </p>
        </div>

        {/* Card 2: Current Crop Grade */}
        <div className="kpi-card bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              {t('current_crop_grade', 'Current Crop Grade')}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 text-sm">🌱</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-700 dark:text-[#D3D67A] mt-2">
            Grade A
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
            {t('external_ai_estimate', 'External Visual AI Estimate')}
          </p>
        </div>

        {/* Card 3: Active Pool Progress */}
        <div id="pool-card-kpi" className="kpi-card bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              {t('active_pool_progress', 'Active Pool Progress')}
            </span>
            <span className="text-amber-500 text-sm">🥞</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 mt-2">
            {Math.round(activePool.current_quantity_kg || 0)}{' '}
            <span className="text-sm font-medium text-stone-500">/ {activePool.target_quantity_kg || 1200} kg</span>
          </p>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    Math.round(
                      ((activePool.current_quantity_kg || 0) / (activePool.target_quantity_kg || 1200)) * 100
                    )
                  )
                )}%`,
              }}
            ></div>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5 font-medium truncate">
            {activePool.name || 'Pune FPO Hub — Pune Gultekdi Market'}
          </p>
        </div>

        {/* Card 4: Pending Payment */}
        <div className="kpi-card bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              {t('pending_payment', 'Pending Payment')}
            </span>
            <span className="text-emerald-700 dark:text-[#D3D67A] font-bold text-sm">₹</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-700 dark:text-[#D3D67A] mt-2">
            ₹8,420
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
            {t('released_in_nodal', 'Released in Nodal Account')}
          </p>
        </div>
      </div>

      {/* 5. FARM & NEARBY MANDI MAP (Matching Screenshot) */}
      <div id="farm-map-section">
        <FarmMandiMap
          isPinDropMode={isMapPinMode}
          onPinDropped={() => setIsMapPinMode(false)}
        />
      </div>

      {/* 6. END-TO-END MARKET LINKAGE JOURNEY STEPPER (Matching Screenshot) */}
      <div className="bg-white/95 dark:bg-[#132215]/95 p-4 md:p-5 rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 shadow-xs overflow-x-auto">
        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-[#D3D67A] mb-3">
          {t('journey_title', 'END-TO-END MARKET LINKAGE JOURNEY')}
        </p>

        <div className="flex items-center gap-2 min-w-max">
          <span className="bg-[#0b4d26] text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs">
            {t('step1', '1. Capture 3 Photos')}
          </span>
          <span className="text-stone-400 font-bold">→</span>

          <span className="bg-stone-100 dark:bg-[#172a1a] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            {t('step2', '2. External AI Grade')}
          </span>
          <span className="text-stone-400 font-bold">→</span>

          <span className="bg-stone-100 dark:bg-[#172a1a] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            {t('step3', '3. Net Mandi Compare')}
          </span>
          <span className="text-stone-400 font-bold">→</span>

          <span className="bg-stone-100 dark:bg-[#172a1a] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            {t('step4', '4. FPO Group Pooling')}
          </span>
          <span className="text-stone-400 font-bold">→</span>

          <span className="bg-stone-100 dark:bg-[#172a1a] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            {t('step5', '5. Nodal Payout')}
          </span>
        </div>
      </div>

      {/* 7. TWO-COLUMN SECTION: RECENT LOTS & NEARBY MANDIS (Matching Screenshot) */}
      <div id="recent-lots-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Recent Lots */}
        <div className="lg:col-span-2 bg-white/95 dark:bg-[#132215]/95 rounded-2xl p-5 md:p-6 border border-stone-200/90 dark:border-emerald-800/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {t('recent_lots', 'Recent Lots')}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {t('recent_lots_subtitle', 'Your active and verified crop lots in the system')}
                </p>
              </div>

              <Link
                to="/farmer/submit-ask"
                className="text-xs font-bold text-emerald-700 dark:text-[#D3D67A] hover:underline shrink-0"
              >
                {t('my_products', 'My Products')} →
              </Link>
            </div>

            {/* Standard Screenshot Cards */}
            <div className="space-y-3">
              {standardRecentLots.map((lot) => (
                <div
                  key={lot.id}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-emerald-900/40 bg-stone-50/60 dark:bg-[#162719] flex items-center justify-between gap-3 hover:border-emerald-400 transition"
                >
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {lot.crop} - {lot.quantityKg} kg
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Lot: {lot.lotNumber} • {lot.date}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lot.status === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : lot.status === 'Pooled'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {lot.status}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-[#D3D67A]">
                      {lot.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right (1 Col): Nearby Mandis */}
        <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl p-5 md:p-6 border border-stone-200/90 dark:border-emerald-800/40 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {t('nearby_mandis', 'Nearby Mandis')}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t('near_baramati', `Near ${lastSavedLocation.split(',')[0]}`)}
            </p>
          </div>

          <div className="space-y-2.5">
            {nearbyMandisList.map((m) => (
              <div
                key={m.name}
                className="p-3 rounded-xl border border-stone-200 dark:border-emerald-900/40 bg-stone-50/60 dark:bg-[#162719] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      {m.name}
                    </span>
                    {m.status && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {m.status}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                    🚗 {m.distance} • ⏱️ {m.time}
                  </span>
                </div>

                <span className="font-extrabold text-xs text-emerald-700 dark:text-[#D3D67A]">
                  {m.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. PRESERVED FUNCTIONAL MODULES ("don't remove any of the other stuff") */}

      {/* 8A. Direct Buyer Offers Section */}
      <div id="buyer-offers-section" className="bg-white/95 dark:bg-[#132215]/95 p-5 md:p-6 rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 shadow-lg border-t-2 border-t-amber-500 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200/70 dark:border-amber-800/40">
              🤝
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>{t('direct_buyer_offers', 'Direct Buyer Offers')}</span>
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">खरेदीदारांच्या थेट ऑफर्स</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {t('direct_buyer_offers_subtitle', 'Verified buyers offering to buy your produce directly.')}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/80 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700 shrink-0">
            {buyerBids.length} Active Offer{buyerBids.length === 1 ? '' : 's'}
          </span>
        </div>

        {buyerBids.length === 0 ? (
          <div className="p-5 bg-stone-50 dark:bg-[#101b12] rounded-xl border border-dashed border-stone-200 dark:border-stone-700/60 text-center">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              No buyer offers at the moment. When buyers submit purchase offers matching your crops, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {buyerBids.map((bid) => {
              const bId = bid._id || bid.id;
              const qty = parseFloat(bid.quantity_needed_kg || bid.quantity || 100);
              const price = parseFloat(bid.max_price_per_kg || bid.price || 25);
              const grossAmount = qty * price;
              const matchingListing = listings.find(
                (l) => (l.crop || '').toLowerCase() === (bid.crop || '').toLowerCase() && l.status === 'open'
              );

              return (
                <div
                  key={bId}
                  className="p-4 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200/90 dark:border-emerald-900/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-stone-300 dark:hover:border-emerald-700/60 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm capitalize">
                        {bid.buyer_name || 'Agribusiness Buyer'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Verified Buyer
                      </span>
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-300 flex flex-wrap items-center gap-3">
                      <span className="font-medium text-stone-900 dark:text-stone-100 capitalize">
                        🌾 {bid.crop} ({bid.min_quality_grade || 'Grade A'})
                      </span>
                      <span>•</span>
                      <span>Quantity: <strong>{formatQuantity(qty)}</strong> ({(qty / 100).toFixed(1)} Qtl)</span>
                      <span>•</span>
                      <span>Offered Rate: <strong className="text-emerald-700 dark:text-[#D3D67A]">{formatCurrency(price)}/kg</strong></span>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      Total Value: <strong className="text-stone-900 dark:text-stone-100">{formatCurrency(grossAmount)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {matchingListing ? (
                      <button
                        type="button"
                        disabled={acceptingBidId === bId}
                        onClick={() => handleAcceptBid(bid, matchingListing)}
                        className="bg-[#2A5124] hover:bg-[#1c3917] dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] text-white dark:text-[#1c3618] font-bold text-xs px-4 py-2.5 rounded-xl shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {acceptingBidId === bId ? 'Accepting...' : `Accept Offer (${formatCurrency(grossAmount)})`}
                      </button>
                    ) : (
                      <span className="text-xs text-stone-500 dark:text-stone-400 italic">
                        Requires open {bid.crop} listing
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8B. Complete Harvest Produce Listings Table */}
      <Card highlight={true} className="border-[#D3D67A]/30 dark:border-emerald-800/50 shadow-xl border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {t('your_harvest_listings', 'Your Harvest Produce Lots')}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Manage your listed crops, active double-auction bids, and settlement payouts
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-700/60">
            {['all', 'open', 'pooled', 'matched', 'settled'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-md capitalize transition cursor-pointer ${
                  filterStatus === st
                    ? 'bg-white dark:bg-emerald-800 text-green-900 dark:text-emerald-100 shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12 px-4">
            <span className="text-4xl mb-3 block">🌾</span>
            <h4 className="text-base font-semibold text-stone-800 dark:text-stone-200">No produce lots found</h4>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 max-w-sm mx-auto">
              {filterStatus === 'all'
                ? "You haven't listed any produce lots yet. Submit your first harvest lot to discover fair market prices!"
                : `No produce lots currently in '${filterStatus}' state.`}
            </p>
            <div className="mt-4">
              <Link to="/farmer/submit-ask">
                <Button>Submit Produce Listing</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Produce</th>
                  <th className="pb-3 font-semibold">Quantity</th>
                  <th className="pb-3 font-semibold">Ask / Min</th>
                  <th className="pb-3 font-semibold">Grade</th>
                  <th className="pb-3 font-semibold">Offers</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Listed On</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {filteredListings.map((listing) => {
                  const id = listing._id || listing.id;
                  const qty = parseFloat(listing.quantity_kg) || 0;
                  const askPrice = parseFloat(listing.ask_price_per_kg) || 0;
                  const minPrice = parseFloat(listing.min_acceptable_price_per_kg) || askPrice;
                  const matchingBids = buyerBids.filter((b) => (b.crop || '').toLowerCase() === (listing.crop || '').toLowerCase());

                  return (
                    <tr key={id} className="hover:bg-stone-50/70 dark:hover:bg-emerald-950/20 transition">
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-3">
                          {listing.image_url ? (
                            <img
                              src={listing.image_url}
                              alt={listing.crop}
                              className="w-10 h-10 object-cover rounded-md border border-stone-200 dark:border-stone-700 flex-shrink-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800/60 rounded-md flex items-center justify-center text-lg flex-shrink-0">
                              🌾
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-stone-900 dark:text-stone-100 block capitalize">{listing.crop}</span>
                            {listing.variety && (
                              <span className="text-xs text-stone-500 dark:text-stone-400">{listing.variety}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{formatQuantity(qty)}</span>
                        <span className="text-xs text-stone-400 dark:text-stone-400 block">
                          {(qty / 100).toFixed(1)} Qtl
                        </span>
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className="font-bold text-green-700 dark:text-[#D3D67A]">{formatCurrency(askPrice)}/kg</span>
                        {minPrice !== askPrice && (
                          <span className="text-xs text-stone-400 dark:text-stone-400 block">
                            Min: {formatCurrency(minPrice)}/kg
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <StatusBadge status={listing.quality_grade || 'ungraded'} />
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        {matchingBids.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {matchingBids.length} Offer{matchingBids.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <StatusBadge status={listing.status} />
                      </td>
                      <td className="py-3.5 whitespace-nowrap text-xs text-stone-500 dark:text-stone-400">
                        {formatDate(listing.created_at)}
                      </td>
                      <td className="py-3.5 whitespace-nowrap text-right">
                        {listing.status === 'open' ? (
                          <button
                            onClick={() => handleCancel(id)}
                            disabled={actionLoading === id}
                            className="text-xs border border-red-500/40 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer"
                          >
                            {actionLoading === id ? '...' : 'Cancel'}
                          </button>
                        ) : listing.status === 'settled' ? (
                          <Link
                            to="/farmer/payouts"
                            className="text-xs text-emerald-700 dark:text-[#D3D67A] font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 hover:underline inline-flex items-center gap-1"
                          >
                            View Payout →
                          </Link>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 8C. MANDI PRICE FORECAST & WAREHOUSE FINDER WIDGETS */}
      <div id="map-forecast-section" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div id="price-forecast-widget">
          <PriceForecastWidget crop="Tomato" mandiName="Baramati" showSelector={true} />
        </div>
        <div id="warehouse-finder-widget">
          <WarehouseFinderWidget initialCrop="Tomato" />
        </div>
      </div>

      {/* Footer Attribution (Matching Screenshot) */}
      <div className="pt-6 pb-2 text-center text-xs text-stone-500 dark:text-stone-400 border-t border-stone-200/80 dark:border-emerald-900/40">
        Official Agricultural Market Intelligence: Integrated AGMARKNET and MSAMB live mandi price feeds. RBI-regulated nodal escrow settlement.
      </div>

      {/* Location Switcher Modal */}
      <LocationChangeModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onChooseOnMap={() => {
          setIsMapPinMode(true);
        }}
      />
    </div>
  );
}
