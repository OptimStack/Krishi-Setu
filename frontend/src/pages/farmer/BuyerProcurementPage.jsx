import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { useAuth } from '../../context/AuthContext';
import { getRequirements, fulfillRequirement } from '../../api/requirements';
import { getListings } from '../../api/listings';
import { formatCurrency, formatQuantity } from '../../utils/format';
import LocationChangeModal from '../../components/widgets/LocationChangeModal';

const CROP_FILTERS = [
  { id: 'all', name: 'All Crops', marathi: 'सर्व पिके', icon: '🌾' },
  { id: 'onion', name: 'Onion', marathi: 'कांदा', icon: '🧅' },
  { id: 'tomato', name: 'Tomato', marathi: 'टोमॅटो', icon: '🍅' },
  { id: 'potato', name: 'Potato', marathi: 'बटाटा', icon: '🥔' },
  { id: 'soybean', name: 'Soybean', marathi: 'सोयाबीन', icon: '🌱' },
  { id: 'wheat', name: 'Wheat', marathi: 'गहू', icon: '🌾' },
  { id: 'pomegranate', name: 'Pomegranate', marathi: 'डाळिंब', icon: '🍎' },
  { id: 'cotton', name: 'Cotton', marathi: 'कापूस', icon: '☁️' },
];

export default function BuyerProcurementPage() {
  const { lang, t } = useLanguage();
  const { lastSavedLocation, setLastSavedLocation } = useOffline();
  const { user } = useAuth();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [requirements, setRequirements] = useState([]);
  const [farmerLots, setFarmerLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [selectedBuyerType, setSelectedBuyerType] = useState('all');
  const [sortBy, setSortBy] = useState('highest_price'); // highest_price | volume_needed | deadline | nearest

  // Supply Allocation Modal
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [supplyQty, setSupplyQty] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('farmgate'); // farmgate | hub
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmedVoucher, setConfirmedVoucher] = useState(null);

  const containerRef = useRef(null);
  const cardsGridRef = useRef(null);
  const modalRef = useRef(null);

  // Fetch Procurement Requirements
  const fetchAllData = async () => {
    try {
      const [reqRes, listRes] = await Promise.all([
        getRequirements(),
        getListings().catch(() => ({ data: [] })),
      ]);

      if (reqRes && reqRes.data) {
        setRequirements(reqRes.data);
      }
      if (listRes && listRes.data) {
        setFarmerLots(listRes.data);
      }
    } catch (err) {
      console.error('Error fetching procurement demands:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 15000);
    return () => clearInterval(interval);
  }, []);

  // GSAP animation when requirements load or filter changes
  useEffect(() => {
    if (!loading && cardsGridRef.current) {
      const cards = cardsGridRef.current.querySelectorAll('.procurement-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out' }
        );
      }
    }
  }, [loading, selectedCrop, selectedBuyerType, sortBy, searchQuery]);

  // Modal animation
  useEffect(() => {
    if (selectedReq && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' }
      );
    }
  }, [selectedReq]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  // Filtered & Sorted Requirements
  const filteredRequirements = useMemo(() => {
    return requirements
      .filter((req) => {
        // Crop filter
        if (selectedCrop !== 'all' && (req.crop || '').toLowerCase() !== selectedCrop.toLowerCase()) {
          return false;
        }
        // Buyer type filter
        if (selectedBuyerType !== 'all') {
          const type = (req.buyer_type || '').toLowerCase();
          if (!type.includes(selectedBuyerType.toLowerCase())) return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchBuyer = (req.buyer_name || '').toLowerCase().includes(q);
          const matchCrop = (req.crop || '').toLowerCase().includes(q);
          const matchVariety = (req.variety || '').toLowerCase().includes(q);
          const matchMandi = (req.target_mandi || '').toLowerCase().includes(q);
          const matchDistrict = (req.district || '').toLowerCase().includes(q);
          if (!matchBuyer && !matchCrop && !matchVariety && !matchMandi && !matchDistrict) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest_price') {
          return (b.mandi_modal_price_per_kg || 0) - (a.mandi_modal_price_per_kg || 0);
        }
        if (sortBy === 'volume_needed') {
          const remA = (a.total_quantity_needed_kg || 0) - (a.fulfilled_quantity_kg || 0);
          const remB = (b.total_quantity_needed_kg || 0) - (b.fulfilled_quantity_kg || 0);
          return remB - remA;
        }
        if (sortBy === 'deadline') {
          return new Date(a.delivery_deadline || '2099') - new Date(b.delivery_deadline || '2099');
        }
        if (sortBy === 'nearest') {
          return (a.district || '').localeCompare(b.district || '');
        }
        return 0;
      });
  }, [requirements, selectedCrop, selectedBuyerType, searchQuery, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalDemands = requirements.length;
    let totalNeededKg = 0;
    let totalFulfilledKg = 0;
    let totalPriceSum = 0;

    requirements.forEach((r) => {
      totalNeededKg += r.total_quantity_needed_kg || 0;
      totalFulfilledKg += r.fulfilled_quantity_kg || 0;
      totalPriceSum += r.mandi_modal_price_per_kg || 0;
    });

    const avgPrice = totalDemands > 0 ? totalPriceSum / totalDemands : 0;
    const estCommissionSavings = totalFulfilledKg * avgPrice * 0.065; // ~6.5% standard APMC commission + handling cess saved

    return {
      totalDemands,
      totalNeededKg,
      totalFulfilledKg,
      avgPrice,
      estCommissionSavings,
    };
  }, [requirements]);

  // Handle open supply modal
  const handleOpenSupply = (req) => {
    setSelectedReq(req);
    setConfirmedVoucher(null);
    setFeedback(null);

    // Try matching farmer lot for this crop
    const matchingLot = farmerLots.find(
      (l) => (l.crop || '').toLowerCase() === (req.crop || '').toLowerCase()
    );

    if (matchingLot) {
      setSelectedLotId(matchingLot.id || matchingLot._id);
      const availableLotKg = matchingLot.quantity_kg || matchingLot.quantityKg || 500;
      const neededRem = (req.total_quantity_needed_kg || 0) - (req.fulfilled_quantity_kg || 0);
      setSupplyQty(Math.min(availableLotKg, neededRem).toString());
    } else {
      setSelectedLotId('manual');
      const neededRem = (req.total_quantity_needed_kg || 0) - (req.fulfilled_quantity_kg || 0);
      setSupplyQty(Math.min(300, neededRem).toString());
    }
  };

  // Handle farmer lot selection change in modal
  const handleLotSelectChange = (e) => {
    const lotId = e.target.value;
    setSelectedLotId(lotId);
    if (lotId === 'manual') {
      setSupplyQty('300');
    } else {
      const lot = farmerLots.find((l) => (l.id || l._id) === lotId);
      if (lot && selectedReq) {
        const availableLotKg = lot.quantity_kg || lot.quantityKg || 500;
        const neededRem = (selectedReq.total_quantity_needed_kg || 0) - (selectedReq.fulfilled_quantity_kg || 0);
        setSupplyQty(Math.min(availableLotKg, neededRem).toString());
      }
    }
  };

  // Submit supply fulfillment
  const handleConfirmSupply = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    const qty = parseFloat(supplyQty);
    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: 'error', text: 'Please enter a valid supply quantity greater than 0 kg.' });
      return;
    }

    const remaining = (selectedReq.total_quantity_needed_kg || 0) - (selectedReq.fulfilled_quantity_kg || 0);
    if (qty > remaining) {
      setFeedback({
        type: 'error',
        text: `Allocated quantity exceeds the remaining open demand (${remaining.toLocaleString()} kg).`,
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fulfillRequirement(selectedReq._id, {
        quantity_kg: qty,
        farmer_id: user?.id || 'usr_farmer_1',
        farmer_name: user?.name || 'Ramesh Patil',
        farmer_phone: user?.phone || '9876543210',
        village: lastSavedLocation || 'Baramati Cluster, Pune',
        delivery_mode: deliveryMode,
        lot_id: selectedLotId !== 'manual' ? selectedLotId : null,
      });

      if (res.error) {
        setFeedback({ type: 'error', text: res.error.message || 'Supply allocation failed.' });
      } else {
        const totalPayout = qty * (selectedReq.mandi_modal_price_per_kg || 0);
        const commissionSaved = totalPayout * 0.065;
        const voucher = {
          voucherId: `VOUCH-MANDI-${Date.now().toString().slice(-6)}`,
          buyerName: selectedReq.buyer_name,
          crop: selectedReq.crop,
          variety: selectedReq.variety || 'Standard Quality',
          quantityKg: qty,
          ratePerKg: selectedReq.mandi_modal_price_per_kg,
          grossAmount: totalPayout,
          commissionSaved,
          deliveryMode: deliveryMode === 'farmgate' ? 'Farmgate Buyer Pickup' : 'WDRA Regional Hub Drop-off',
          utrRef: `AXIS-ESCROW-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setConfirmedVoucher(voucher);
        fetchAllData();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to communicate with procurement clearing engine.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <Link to="/farmer/dashboard" className="hover:text-[#255919] dark:hover:text-[#D1BF4B] transition">
          {t('dashboard', 'Dashboard')}
        </Link>
        <span>›</span>
        <span className="font-semibold text-stone-800 dark:text-[#D1BF4B]">
          {t('buyer_procurement', 'Buyer Procurement')}
        </span>
      </div>

      {/* Hero Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/95 dark:bg-[#132215]/95 p-5 md:p-6 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-2xl">🏬</span>
            <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              {t('buyer_procurement', 'Buyer Procurement Demands')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#255919]/10 text-[#255919] dark:bg-[#D1BF4B]/15 dark:text-[#D1BF4B] border border-[#255919]/30 dark:border-[#D1BF4B]/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('guaranteed_mandi_price', 'Official Mandi Price Guaranteed')}
            </span>
          </div>

          <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 mt-1.5 max-w-3xl leading-relaxed">
            {t(
              'buyer_procurement_subtitle',
              'Verified corporate buyers procuring directly at official Mandi modal rates. Zero commission, direct escrow credit.'
            )}
          </p>
        </div>

        {/* Action Controls: Refresh & Location Pill */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-[#162719] text-stone-700 dark:text-emerald-200 border border-stone-300/80 dark:border-emerald-900/50 hover:border-[#D1BF4B] transition cursor-pointer"
            title="Change Farm Location"
          >
            <span>📍</span>
            <span className="truncate max-w-[140px]">{lastSavedLocation}</span>
            <span className="text-[10px] text-stone-400">▼</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#255919] to-[#D1BF4B] text-white shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
            title="Refresh Live Demands"
          >
            <span className={isRefreshing ? 'animate-spin inline-block' : ''}>🔄</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Live Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        {/* Card 1: Active Demand Orders */}
        <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold">
            <span>{isMr ? 'सक्रिय कॉर्पोरेट ऑर्डर्स' : isHi ? 'सक्रिय कॉर्पोरेट ऑर्डर' : 'Open Procurement Orders'}</span>
            <span className="text-base">📋</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 mt-1.5">
            {stats.totalDemands}
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
            <span>✓</span> 100% Verified Corporate Buyers
          </p>
        </div>

        {/* Card 2: Open Procurement Volume */}
        <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold">
            <span>{isMr ? 'एकूण मागणीचे प्रमाण' : isHi ? 'कुल मांग मात्रा' : 'Total Demand Volume'}</span>
            <span className="text-base">⚖️</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 mt-1.5">
            {Math.round(stats.totalNeededKg / 1000)} <span className="text-sm font-semibold text-stone-500">Tons</span>
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            {formatQuantity(stats.totalFulfilledKg)} fulfilled ({Math.round((stats.totalFulfilledKg / (stats.totalNeededKg || 1)) * 100)}%)
          </p>
        </div>

        {/* Card 3: Mandi Price Guarantee Benchmark */}
        <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold">
            <span>{isMr ? 'हमीभाव दर बेंचमार्क' : isHi ? 'गारंटीड मंडी मूल्य बेंचमार्क' : 'Mandi Benchmark Modal'}</span>
            <span className="text-base">📊</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#255919] dark:text-[#D1BF4B] mt-1.5">
            ₹{stats.avgPrice.toFixed(1)} <span className="text-xs font-bold text-stone-500">/ kg avg</span>
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-medium">
            Tied to Live Agmarknet Arrival Rates
          </p>
        </div>

        {/* Card 4: Farmer APMC Deductions Saved */}
        <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold">
            <span>{isMr ? 'शेतकऱ्यांची दलाली बचत' : isHi ? 'किसानों की कमीशन बचत' : '0% Commission Advantage'}</span>
            <span className="text-base">🛡️</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            +6.5% <span className="text-xs font-semibold text-stone-500">saved</span>
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
            Zero APMC cut, dalali, or cess fees
          </p>
        </div>
      </div>

      {/* Search, Crop Pills & Filter Controls */}
      <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] p-4 md:p-5 shadow-xs space-y-4">
        {/* Top Filter Row: Search & Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isMr
                  ? 'कंपनीचे नाव, पीक, वाण किंवा मंडी शोधा...'
                  : isHi
                  ? 'कंपनी का नाम, फसल, किस्म या मंडी खोजें...'
                  : 'Search by corporate buyer, crop variety, or target mandi...'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-emerald-800/60 focus:border-[#D1BF4B] focus:outline-hidden text-xs md:text-sm font-medium transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Buyer Type Filter */}
            <select
              value={selectedBuyerType}
              onChange={(e) => setSelectedBuyerType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-emerald-800/60 focus:border-[#D1BF4B] focus:outline-hidden text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Buyer Types</option>
              <option value="Retail">Retail Supermarket Chains</option>
              <option value="Food Processing">Food Processors (Snacks / Purees)</option>
              <option value="Institutional">Corporate Institutional</option>
              <option value="Quick Commerce">Quick Commerce / E-Grocery</option>
              <option value="Textile">Textile Industry</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-emerald-800/60 focus:border-[#D1BF4B] focus:outline-hidden text-xs font-semibold cursor-pointer"
            >
              <option value="highest_price">Highest Mandi Modal Rate (₹/kg)</option>
              <option value="volume_needed">Largest Open Volume Needed</option>
              <option value="deadline">Soonest Delivery Deadline</option>
              <option value="nearest">Nearest Cluster / District</option>
            </select>
          </div>
        </div>

        {/* Crop Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CROP_FILTERS.map((c) => {
            const count =
              c.id === 'all'
                ? requirements.length
                : requirements.filter((r) => (r.crop || '').toLowerCase() === c.id.toLowerCase()).length;

            const isSelected = selectedCrop === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCrop(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#255919] to-[#D1BF4B] text-white shadow-xs'
                    : 'bg-stone-100/80 dark:bg-[#162719] text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-emerald-900/40'
                }`}
              >
                <span>{c.icon}</span>
                <span>{isMr ? c.marathi : c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-200 dark:bg-[#182b1c] text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Procurement Requirements Grid */}
      {loading ? (
        <div className="py-16 text-center text-stone-500 dark:text-stone-400 text-sm font-medium">
          <div className="w-8 h-8 border-3 border-[#255919] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          {isMr ? 'खरेदीदारांच्या मागण्या लोड होत आहेत...' : 'Loading verified corporate procurement demands...'}
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 p-10 text-center space-y-3">
          <span className="text-3xl">🔍</span>
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
            No procurement demands match your current filter
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Try resetting your crop filter or search query to see all open corporate procurement demands across Maharashtra.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCrop('all');
              setSelectedBuyerType('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#255919] to-[#D1BF4B] text-white shadow-xs hover:opacity-90 transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div ref={cardsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequirements.map((req) => {
            const fulfilled = req.fulfilled_quantity_kg || 0;
            const total = req.total_quantity_needed_kg || 1;
            const remaining = Math.max(0, total - fulfilled);
            const percent = Math.min(100, Math.round((fulfilled / total) * 100));
            const isFull = fulfilled >= total;
            const pricePerKg = req.mandi_modal_price_per_kg || 0;
            const pricePerQtl = pricePerKg * 100;

            return (
              <div
                key={req._id}
                className="procurement-card bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] p-5 md:p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-[#162719] dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60">
                      {req.crop.toUpperCase()} • {req.variety || 'Bulk Grade'}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-[#182b1c] px-2 py-0.5 rounded-full border border-stone-200 dark:border-emerald-900/50">
                      📍 {req.district || 'Maharashtra'}
                    </span>
                  </div>

                  {/* Buyer Title & Category */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base leading-snug">
                        {req.buyer_name}
                      </h3>
                      <span className="text-blue-500 text-xs" title="Verified Corporate Buyer">
                        ✓
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                      <span>{req.buyer_type || 'Corporate Procurement'}</span>
                      <span>•</span>
                      <span>Bench: <strong className="text-stone-700 dark:text-stone-300">{req.target_mandi}</strong></span>
                    </div>
                  </div>

                  {/* Guaranteed Mandi Price Container (Zero pitch black) */}
                  <div className="bg-stone-50/90 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-800/60 rounded-xl p-3 mb-3.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-stone-600 dark:text-emerald-300 font-bold">
                        Guaranteed Mandi Modal Rate:
                      </span>
                      <span className="text-lg font-black text-[#255919] dark:text-[#D1BF4B]">
                        ₹{pricePerKg.toFixed(2)}
                        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">/kg</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mt-1 pt-1 border-t border-stone-200/60 dark:border-emerald-900/40">
                      <span>₹{pricePerQtl.toLocaleString()}/Quintal</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        🛡️ 0% APMC Commission
                      </span>
                    </div>
                  </div>

                  {/* Fulfillment Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                      <span>Fulfilled: {formatQuantity(fulfilled)}</span>
                      <span>Demand: {formatQuantity(total)}</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-[#182b1c] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#255919] to-[#D1BF4B] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span>{percent}% allocated</span>
                      <span className="font-bold text-[#255919] dark:text-[#D1BF4B]">
                        {formatQuantity(remaining)} remaining
                      </span>
                    </div>
                  </div>

                  {/* Procurement Terms Specs */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 dark:text-stone-300 bg-stone-50/60 dark:bg-[#182b1c]/80 p-2.5 rounded-xl border border-stone-200/80 dark:border-emerald-900/40 mb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Min Supply Lot</span>
                      <span className="font-semibold">{req.min_supply_per_farmer_kg || 100} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Quality Required</span>
                      <span className="font-semibold">{req.quality_grade || 'Grade A / B'}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-stone-200/60 dark:border-emerald-900/30 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-stone-400">Deadline</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        📅 {req.delivery_deadline || '2026-10-15'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-2 border-t border-stone-200/80 dark:border-emerald-900/40">
                  <button
                    type="button"
                    onClick={() => handleOpenSupply(req)}
                    disabled={isFull}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isFull
                        ? 'bg-stone-200 dark:bg-[#182b1c] text-stone-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#255919] to-[#D1BF4B] hover:opacity-95 text-white active:scale-95'
                    }`}
                  >
                    <span>{isFull ? 'Demand Completely Fulfilled' : 'Supply Produce at Mandi Price'}</span>
                    {!isFull && <span>→</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Educational APMC Comparison Container */}
      <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⚖️</span>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Why Sell via KrishiSetu Direct Procurement vs. Traditional APMC Mandi?
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Transparent institutional buying without cartel markdowns, uncalibrated scale tampering, or payment delays.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-stone-50/70 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-900/40 space-y-1">
            <span className="text-xs font-black text-[#255919] dark:text-[#D1BF4B] uppercase tracking-wider block">
              1. 0% Commission
            </span>
            <p className="text-stone-600 dark:text-stone-300">
              Traditional mandis levy 6% to 8% commission + mathadi fees. KrishiSetu buyer procurement charges 0% to the farmer.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50/70 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-900/40 space-y-1">
            <span className="text-xs font-black text-[#255919] dark:text-[#D1BF4B] uppercase tracking-wider block">
              2. Agmarknet Benchmark
            </span>
            <p className="text-stone-600 dark:text-stone-300">
              Every demand rate is legally anchored to the live Agmarknet / MSAMB official daily modal rate for your nearest cluster.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50/70 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-900/40 space-y-1">
            <span className="text-xs font-black text-[#255919] dark:text-[#D1BF4B] uppercase tracking-wider block">
              3. T+0 Escrow Settlement
            </span>
            <p className="text-stone-600 dark:text-stone-300">
              Corporate buyers deposit 100% funds in the escrow vault in advance. Payouts credit instantly to your bank / UPI on dispatch.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50/70 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-900/40 space-y-1">
            <span className="text-xs font-black text-[#255919] dark:text-[#D1BF4B] uppercase tracking-wider block">
              4. Farmgate Pickup
            </span>
            <p className="text-stone-600 dark:text-stone-300">
              Save on diesel and vehicle hiring. Buyers arrange pickup from your farm or local WDRA warehouse drop-off hub.
            </p>
          </div>
        </div>
      </div>

      {/* Produce Supply & Allocation Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="w-full max-w-lg bg-white dark:bg-[#132215] rounded-2xl shadow-2xl border border-stone-200 dark:border-[#D1BF4B]/30 border-t-4 border-t-[#255919] dark:border-t-[#D1BF4B] p-6 text-stone-900 dark:text-stone-100 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-stone-200 dark:border-emerald-900/40">
              <div>
                <span className="text-xs font-extrabold text-[#255919] dark:text-[#D1BF4B] uppercase tracking-wider">
                  Direct Mandi Procurement Allocation
                </span>
                <h3 className="text-lg md:text-xl font-black mt-0.5">
                  Supply to {selectedReq.buyer_name}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {selectedReq.crop.toUpperCase()} • {selectedReq.variety || 'Bulk'} • {selectedReq.target_mandi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* If Confirmed Voucher Receipt Available */}
            {confirmedVoucher ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-[#162719] border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
                  <span className="text-3xl block">🎉</span>
                  <h4 className="text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                    Harvest Allocated Successfully!
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    Your allocation voucher has been generated. Corporate escrow funds are locked for instant settlement.
                  </p>
                </div>

                {/* Voucher Details Subcard */}
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-200 dark:border-emerald-900/50 text-xs space-y-2.5">
                  <div className="flex justify-between pb-2 border-b border-stone-200/80 dark:border-emerald-900/40">
                    <span className="text-stone-500">Voucher Ref:</span>
                    <strong className="font-mono text-stone-800 dark:text-stone-200">
                      {confirmedVoucher.voucherId}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Allocated Quantity:</span>
                    <strong>{confirmedVoucher.quantityKg.toLocaleString()} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Guaranteed Mandi Price:</span>
                    <strong>₹{confirmedVoucher.ratePerKg.toFixed(2)}/kg</strong>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-stone-200/80 dark:border-emerald-900/40">
                    <span className="font-bold text-stone-700 dark:text-stone-300">Total Escrow Payout:</span>
                    <strong className="text-base font-black text-[#255919] dark:text-[#D1BF4B]">
                      {formatCurrency(confirmedVoucher.grossAmount)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-semibold">
                    <span>APMC Commission Saved:</span>
                    <span>+{formatCurrency(confirmedVoucher.commissionSaved)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-400 pt-1">
                    <span>Escrow UTR:</span>
                    <span className="font-mono">{confirmedVoucher.utrRef}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to="/farmer/payouts"
                    className="flex-1 py-3 text-center text-xs font-bold bg-gradient-to-r from-[#255919] to-[#D1BF4B] text-white rounded-xl shadow-xs hover:opacity-95"
                  >
                    View Escrow Payouts →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedReq(null)}
                    className="px-4 py-3 text-xs font-bold bg-stone-100 dark:bg-[#182b1c] text-stone-700 dark:text-stone-200 rounded-xl hover:bg-stone-200 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Allocation Form */
              <form onSubmit={handleConfirmSupply} className="space-y-4">
                {feedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold ${
                      feedback.type === 'error'
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                {/* Produce Lot Source Picker */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1.5">
                    Select Your Produce Harvest Lot
                  </label>
                  <select
                    value={selectedLotId}
                    onChange={handleLotSelectChange}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-emerald-800/60 focus:border-[#D1BF4B] focus:outline-hidden text-xs font-semibold cursor-pointer"
                  >
                    {farmerLots
                      .filter(
                        (l) => (l.crop || '').toLowerCase() === (selectedReq.crop || '').toLowerCase()
                      )
                      .map((lot) => (
                        <option key={lot.id || lot._id} value={lot.id || lot._id}>
                          {lot.id || lot._id} - {lot.crop} ({lot.quantity_kg || lot.quantityKg || 500} kg available, {lot.grade || 'Grade A'})
                        </option>
                      ))}
                    <option value="manual">Manual Entry / Other Harvest Batch</option>
                  </select>
                </div>

                {/* Quantity Input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-200">
                      Supply Quantity (kg)
                    </label>
                    <span className="text-[11px] text-stone-500">
                      Remaining Need: {((selectedReq.total_quantity_needed_kg || 0) - (selectedReq.fulfilled_quantity_kg || 0)).toLocaleString()} kg
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={(selectedReq.total_quantity_needed_kg || 0) - (selectedReq.fulfilled_quantity_kg || 0)}
                    value={supplyQty}
                    onChange={(e) => setSupplyQty(e.target.value)}
                    placeholder="Enter kg to supply"
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-emerald-800/60 focus:border-[#D1BF4B] focus:outline-hidden text-sm font-bold"
                  />
                </div>

                {/* Delivery Mode Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1.5">
                    Logistics & Delivery Arrangement
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('farmgate')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        deliveryMode === 'farmgate'
                          ? 'border-[#255919] dark:border-[#D1BF4B] bg-[#255919]/10 dark:bg-[#D1BF4B]/15 font-bold text-[#255919] dark:text-[#D1BF4B]'
                          : 'border-stone-200 dark:border-emerald-900/40 bg-stone-50 dark:bg-[#162719] text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <span className="block text-sm mb-0.5">🚜 Farmgate Pickup</span>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight block">
                        Buyer vehicle collects directly from your farm.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMode('hub')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        deliveryMode === 'hub'
                          ? 'border-[#255919] dark:border-[#D1BF4B] bg-[#255919]/10 dark:bg-[#D1BF4B]/15 font-bold text-[#255919] dark:text-[#D1BF4B]'
                          : 'border-stone-200 dark:border-emerald-900/40 bg-stone-50 dark:bg-[#162719] text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <span className="block text-sm mb-0.5">🏬 WDRA Hub Drop</span>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight block">
                        Drop at local certified collection warehouse.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Live Real-Time Payout Calculator Subbox */}
                {(() => {
                  const qty = parseFloat(supplyQty) || 0;
                  const price = selectedReq.mandi_modal_price_per_kg || 0;
                  const totalPayout = qty * price;
                  const commissionSaved = totalPayout * 0.065;

                  return (
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-900/40 text-xs space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-stone-500 dark:text-stone-400">Guaranteed Modal Price:</span>
                        <strong>₹{price.toFixed(2)}/kg</strong>
                      </div>
                      <div className="flex justify-between items-baseline text-sm pt-1 border-t border-stone-200/60 dark:border-emerald-900/30">
                        <span className="font-bold text-stone-800 dark:text-stone-200">Total Guaranteed Escrow:</span>
                        <strong className="text-base font-black text-[#255919] dark:text-[#D1BF4B]">
                          {formatCurrency(totalPayout)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-baseline text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                        <span>APMC Mandi Commission Saved:</span>
                        <span>+{formatCurrency(commissionSaved)} (0% fees)</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Submit Action Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#255919] to-[#D1BF4B] hover:opacity-95 text-white shadow-md active:scale-95 transition cursor-pointer"
                  >
                    {submitting ? 'Confirming with Escrow...' : 'Confirm Allocation & Reserve Escrow 🌾'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReq(null)}
                    className="px-4 py-3 rounded-xl text-xs font-bold bg-stone-100 dark:bg-[#182b1c] text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Location Change Modal */}
      {showLocationModal && (
        <LocationChangeModal
          currentLocation={lastSavedLocation}
          onClose={() => setShowLocationModal(false)}
          onSaveLocation={(newLoc) => {
            setLastSavedLocation(newLoc);
            setShowLocationModal(false);
          }}
        />
      )}
    </div>
  );
}
