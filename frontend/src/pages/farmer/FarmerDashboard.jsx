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

  // Harvest produce lots derived from active listings or realistic lots matching demo
  const standardHarvestLots = [
    {
      id: 'LOT-TOM-8491',
      crop: 'Tomato',
      variety: 'Abhinav (Hybrid)',
      quantityKg: 450,
      lotNumber: 'LOT-TOM-8491',
      date: '9/7/2026',
      status: 'Verified',
      grade: 'Grade A',
    },
    {
      id: 'LOT-ONI-3912',
      crop: 'Onion',
      variety: 'Unhali Red Garva',
      quantityKg: 1200,
      lotNumber: 'LOT-ONI-3912',
      date: '9/8/2026',
      status: 'Pooled',
      grade: 'Grade A',
    },
    {
      id: 'LOT-POM-7219',
      crop: 'Pomegranate',
      variety: 'Bhagwa Export Grade',
      quantityKg: 600,
      lotNumber: 'LOT-POM-7219',
      date: '8/8/2026',
      status: 'Draft',
      grade: 'Grade A',
    },
  ];

  const harvestProduceLots = listings.length > 0 ? listings.slice(0, 4) : standardHarvestLots;

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
            <button className="bg-gradient-to-r from-[#255919] via-[#3f702b] to-[#D1BF4B] hover:opacity-95 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 text-xs md:text-sm cursor-pointer border border-[#D1BF4B]/40">
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
      <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl p-4 md:p-5 border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] hover:shadow-md transition-all duration-300">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#255919] dark:text-[#D1BF4B] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-lg shrink-0">
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
          className="self-start sm:self-auto text-xs font-bold text-stone-700 dark:text-stone-200 hover:text-[#255919] dark:hover:text-[#D1BF4B] px-3.5 py-2 rounded-xl border border-stone-300 dark:border-[#D1BF4B]/40 hover:border-[#D1BF4B] transition cursor-pointer bg-stone-50 dark:bg-[#162719] flex items-center gap-1.5"
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
        <div className="kpi-card bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#D1BF4B]/60 transition-all duration-300 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              {t('todays_best_net', "Today's Best Net")}
            </span>
            <span className="text-[#255919] dark:text-[#D1BF4B] font-bold text-sm">₹</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 mt-2">
            ₹1,655 <span className="text-sm font-medium text-stone-500">/qtl</span>
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
            Tomato • Baramati APMC
          </p>
        </div>

        {/* Card 2: Current Crop Grade */}
        <Link
          to="/farmer/grade"
          className="kpi-card bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#D1BF4B]/60 transition-all duration-300 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300 group-hover:text-[#255919] dark:group-hover:text-[#D1BF4B] transition-colors">
              {t('current_crop_grade', 'Current Crop Grade')}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 text-sm">🌱</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#255919] dark:text-[#D1BF4B] mt-2 flex items-center justify-between">
            <span>Grade A</span>
            <span className="text-xs font-bold text-stone-400 group-hover:text-[#255919] dark:group-hover:text-[#D1BF4B] transition-colors">Grade Now →</span>
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
            {t('external_ai_estimate', 'External Visual AI Estimate')}
          </p>
        </Link>

        {/* Card 3: Active Pool Progress */}
        <div id="pool-card-kpi" className="kpi-card bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#D1BF4B]/60 transition-all duration-300 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              {t('active_pool_progress', 'Active Pool Progress')}
            </span>
            <span className="text-[#D1BF4B] text-sm">🥞</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 mt-2">
            {Math.round(activePool.current_quantity_kg || 0)}{' '}
            <span className="text-sm font-medium text-stone-500">/ {activePool.target_quantity_kg || 1200} kg</span>
          </p>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#255919] to-[#D1BF4B] h-1.5 rounded-full transition-all duration-500"
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
        <div className="kpi-card bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#D1BF4B]/60 transition-all duration-300 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
              {t('pending_payment', 'Pending Payment')}
            </span>
            <span className="text-[#255919] dark:text-[#D1BF4B] font-bold text-sm">₹</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#255919] dark:text-[#D1BF4B] mt-2">
            ₹8,420
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
            {t('released_in_nodal', 'Released in Nodal Account')}
          </p>
        </div>
      </div>

      {/* 5. FARM & NEARBY MANDI MAP (Matching Screenshot) */}
      <div id="farm-map-section" className="rounded-2xl overflow-hidden border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] shadow-xs hover:shadow-md transition-all duration-300">
        <FarmMandiMap
          isPinDropMode={isMapPinMode}
          onPinDropped={() => setIsMapPinMode(false)}
        />
      </div>

      {/* 6. END-TO-END MARKET LINKAGE JOURNEY STEPPER (Matching Screenshot) */}
      <div className="bg-white/95 dark:bg-[#132215]/95 p-4 md:p-5 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#D1BF4B] shadow-xs hover:shadow-md transition-all duration-300 overflow-x-auto">
        <p className="text-[11px] font-black uppercase tracking-wider text-[#255919] dark:text-[#D1BF4B] mb-3">
          {t('journey_title', 'END-TO-END MARKET LINKAGE JOURNEY')}
        </p>

        <div className="flex items-center gap-2 min-w-max">
          <Link
            to="/farmer/grade"
            className="bg-gradient-to-r from-[#255919] to-[#3f702b] text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs hover:opacity-95 transition"
          >
            {t('step1', '1. Capture 3 Photos')}
          </Link>
          <span className="text-stone-400 font-bold">→</span>

          <Link
            to="/farmer/grade"
            className="bg-stone-100 hover:bg-emerald-50 dark:bg-[#172a1a] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full text-xs font-semibold transition"
          >
            {t('step2', '2. External AI Grade')}
          </Link>
          <span className="text-stone-400 font-bold">→</span>

          <Link
            to="/farmer/market"
            className="bg-stone-100 hover:bg-emerald-50 dark:bg-[#172a1a] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full text-xs font-semibold transition"
          >
            {t('step3', '3. Net Mandi Compare')}
          </Link>
          <span className="text-stone-400 font-bold">→</span>

          <Link
            to="/farmer/pooling"
            className="bg-stone-100 hover:bg-emerald-50 dark:bg-[#172a1a] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full text-xs font-semibold transition"
          >
            {t('step4', '4. FPO Group Pooling')}
          </Link>
          <span className="text-stone-400 font-bold">→</span>

          <Link
            to="/farmer/payouts"
            className="bg-stone-100 hover:bg-emerald-50 dark:bg-[#172a1a] text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full text-xs font-semibold transition"
          >
            {t('step5', '5. Nodal Payout')}
          </Link>
        </div>
      </div>

      {/* 7. DIRECT BUYER OFFERS SECTION (Moved above Harvest Produce Lots and Nearby Mandis) */}
      <div id="buyer-offers-section" className="bg-white/95 dark:bg-[#132215]/95 p-5 md:p-6 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md border-t-2 border-t-[#D1BF4B] transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-amber-50 dark:bg-amber-950/40 text-[#D1BF4B] rounded-xl border border-amber-200/70 dark:border-[#D1BF4B]/30">
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
                  className="p-4 bg-stone-50/70 dark:bg-[#162719] rounded-xl border border-stone-200/90 dark:border-emerald-900/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#D1BF4B]/60 hover:-translate-y-0.5 transition-all duration-200"
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
                      <span>Offered Rate: <strong className="text-[#255919] dark:text-[#D1BF4B]">{formatCurrency(price)}/kg</strong></span>
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
                        className="bg-gradient-to-r from-[#255919] to-[#D1BF4B] hover:opacity-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
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

      {/* 8. MERGED UNIFIED HARVEST PRODUCE LOTS & NEARBY MANDIS */}
      <div id="harvest-lots-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Unified "Your Harvest Produce Lots" */}
        <div className="lg:col-span-2 bg-white/95 dark:bg-[#132215]/95 rounded-2xl p-5 md:p-6 border border-stone-200/90 dark:border-[#D1BF4B]/25 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B]">
          <div>
            {/* Header: Title, Description, Status Tabs & CTAs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800/60">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>🌾 {t('your_harvest_produce_lots', 'Your Harvest Produce Lots')}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#255919]/10 text-[#255919] dark:bg-[#D1BF4B]/15 dark:text-[#D1BF4B] border border-[#D1BF4B]/30">
                    {filteredListings.length > 0 ? filteredListings.length : harvestProduceLots.length} {filteredListings.length === 1 ? 'Lot' : 'Lots'}
                  </span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {t('your_harvest_produce_lots_desc', 'Your active, graded, and verified harvest produce lots in the system')}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/farmer/products"
                  className="text-xs font-bold text-[#255919] dark:text-[#D1BF4B] hover:underline"
                >
                  {t('my_products', 'My Products')} →
                </Link>
                <Link
                  to="/farmer/submit-ask"
                  className="text-xs font-bold bg-gradient-to-r from-[#255919] to-[#D1BF4B] text-white px-3 py-1.5 rounded-lg shadow-xs hover:opacity-90 transition active:scale-95 flex items-center gap-1"
                >
                  <span>+</span>
                  <span>{t('start_selling', 'New Lot')}</span>
                </Link>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 bg-stone-100/80 dark:bg-stone-800/60 p-1 rounded-xl text-xs font-medium border border-stone-200/80 dark:border-stone-700/60 w-fit">
              {['all', 'open', 'pooled', 'matched', 'settled'].map((st) => {
                const count = st === 'all'
                  ? (listings.length > 0 ? listings.length : harvestProduceLots.length)
                  : listings.filter((l) => (l.status || '').toLowerCase() === st).length;

                return (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterStatus === st
                        ? 'bg-gradient-to-r from-[#255919] to-[#3a6e29] text-white shadow-xs font-bold'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    <span>{st}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      filterStatus === st ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content List */}
            {loading ? (
              <div className="py-10 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (filteredListings.length === 0 && filterStatus !== 'all') ? (
              <div className="p-8 text-center bg-stone-50/60 dark:bg-[#162719]/60 rounded-xl border border-dashed border-stone-200 dark:border-stone-700/70">
                <span className="text-3xl mb-2 block">🌾</span>
                <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                  No produce lots currently in '{filterStatus}' state
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                  Switch filter or submit a new produce listing to list in this category.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    Show All Lots
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(filteredListings.length > 0 ? filteredListings : harvestProduceLots).map((lot) => {
                  const id = lot._id || lot.id;
                  const qty = parseFloat(lot.quantity_kg || lot.quantityKg || 0);
                  const askPrice = parseFloat(lot.ask_price_per_kg || 0);
                  const minPrice = parseFloat(lot.min_acceptable_price_per_kg || askPrice);
                  const matchingBids = buyerBids.filter(
                    (b) => (b.crop || '').toLowerCase() === (lot.crop || '').toLowerCase()
                  );
                  const cropName = lot.crop + (lot.variety ? ` • ${lot.variety}` : '');
                  const lotNum = lot.lotNumber || lot.id || `LOT-${(lot.crop || 'CRP').substring(0, 3).toUpperCase()}-101`;
                  const dateStr = lot.created_at ? formatDate(lot.created_at) : (lot.date || 'Today');
                  const grade = lot.quality_grade || lot.grade || lot.aiGrade || 'Grade A';
                  const rawStatus = (lot.status || 'open').toLowerCase();

                  return (
                    <div
                      key={id}
                      className="p-3.5 md:p-4 rounded-xl border border-stone-200/90 dark:border-emerald-900/40 bg-stone-50/70 dark:bg-[#162719] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#D1BF4B]/70 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        {lot.image_url || lot.coverImageUrl ? (
                          <img
                            src={lot.image_url || lot.coverImageUrl}
                            alt={lot.crop}
                            className="w-12 h-12 object-cover rounded-xl border border-stone-200 dark:border-emerald-900/60 shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#255919]/15 to-[#D1BF4B]/25 border border-[#D1BF4B]/30 flex items-center justify-center text-xl shrink-0">
                            🌾
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#255919] dark:group-hover:text-[#D1BF4B] transition">
                              {cropName}
                            </h4>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              {grade}
                            </span>
                          </div>

                          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>Lot: <strong className="font-mono text-stone-700 dark:text-stone-300">{lotNum}</strong></span>
                            <span>•</span>
                            <span>Qty: <strong className="text-stone-800 dark:text-stone-200">{formatQuantity(qty)}</strong> ({(qty / 100).toFixed(1)} Qtl)</span>
                            {askPrice > 0 && (
                              <>
                                <span>•</span>
                                <span>Rate: <strong className="text-[#255919] dark:text-[#D1BF4B]">{formatCurrency(askPrice)}/kg</strong></span>
                              </>
                            )}
                            <span>•</span>
                            <span>{dateStr}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-stone-800/60">
                        {matchingBids.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            🤝 {matchingBids.length} Offer{matchingBids.length > 1 ? 's' : ''}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                            rawStatus === 'open' || rawStatus === 'verified' || rawStatus === 'published'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : rawStatus === 'pooled'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : rawStatus === 'settled'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {rawStatus}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/farmer/products/${id}`}
                            className="text-xs font-bold text-stone-700 dark:text-stone-200 hover:text-[#255919] dark:hover:text-[#D1BF4B] px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-[#D1BF4B] transition bg-white dark:bg-[#132215]"
                          >
                            View →
                          </Link>

                          {rawStatus === 'open' && (
                            <button
                              onClick={() => handleCancel(id)}
                              disabled={actionLoading === id}
                              className="text-xs border border-red-500/30 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded-lg font-semibold transition cursor-pointer"
                              title="Cancel listing"
                            >
                              {actionLoading === id ? '...' : '✕'}
                            </button>
                          )}

                          {rawStatus === 'settled' && (
                            <Link
                              to="/farmer/payouts"
                              className="text-xs text-emerald-700 dark:text-[#D1BF4B] font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:underline"
                            >
                              Payout
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right (1 Col): Nearby Mandis */}
        <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl p-5 md:p-6 border border-stone-200/90 dark:border-[#D1BF4B]/25 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between border-t-2 border-t-[#D1BF4B]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800/60">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <span>🏛️ {t('nearby_mandis', 'Nearby Mandis')}</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {t('near_baramati', `Near ${lastSavedLocation.split(',')[0]}`)}
                </p>
              </div>

              <Link
                to="/farmer/market"
                className="text-xs font-bold text-[#255919] dark:text-[#D1BF4B] hover:underline shrink-0"
              >
                Compare →
              </Link>
            </div>

            <div className="space-y-2.5">
              {nearbyMandisList.map((m) => (
                <div
                  key={m.name}
                  className="p-3 rounded-xl border border-stone-200 dark:border-emerald-900/40 bg-stone-50/70 dark:bg-[#162719] flex items-center justify-between gap-3 hover:border-[#D1BF4B]/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
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

                  <span className="font-black text-xs text-[#255919] dark:text-[#D1BF4B]">
                    {m.price}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/60 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span>Live MSAMB/AGMARKNET</span>
            <Link to="/farmer/market" className="font-bold text-[#255919] dark:text-[#D1BF4B] hover:underline">
              Net Calculator →
            </Link>
          </div>
        </div>
      </div>

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
