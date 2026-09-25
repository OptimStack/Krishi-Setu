import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getRequirements, createRequirement } from '../../api/requirements';
import { getStoredRFQs, saveRFQ } from '../../api/buyerData';

export default function BuyerOffersPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [rfqs, setRfqs] = useState(() => getStoredRFQs());
  const [backendReqs, setBackendReqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedRfqId, setExpandedRfqId] = useState(null);

  const containerRef = useRef(null);
  const kpiGridRef = useRef(null);
  const cardsGridRef = useRef(null);
  const modalRef = useRef(null);

  // Form data for broadcasting new RFQ
  const [formData, setFormData] = useState({
    crop: 'Tomato',
    variety: 'Abhinav (Hybrid)',
    gradeRequired: 'Grade A',
    quantityQuintal: '12',
    maxPricePerQtl: '2100',
    deliveryHub: 'FreshMart Hadapsar Central Warehouse, Pune',
  });

  // Fetch backend requirements
  const fetchBackendRequirements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRequirements();
      if (res?.data && Array.isArray(res.data)) {
        setBackendReqs(res.data);
      }
    } catch (err) {
      console.warn('Backend requirements fallback to local RFQs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncAllRFQs = useCallback(() => {
    setRfqs(getStoredRFQs());
    fetchBackendRequirements();
  }, [fetchBackendRequirements]);

  useEffect(() => {
    syncAllRFQs();

    const handleRfqCreated = () => {
      setRfqs(getStoredRFQs());
    };
    const handleRequirementFulfilled = (e) => {
      setRfqs(getStoredRFQs());
      fetchBackendRequirements();
      if (e?.detail?.fulfillment) {
        setNotification({
          type: 'success',
          message: `🌾 New farmer supply recorded! ${e.detail.fulfillment.farmer_name} allocated ${e.detail.fulfillment.quantity_kg} kg.`,
        });
      }
    };
    const handleMockStateUpdated = () => {
      setRfqs(getStoredRFQs());
      fetchBackendRequirements();
    };

    window.addEventListener('krishisetu_buyer_rfq_created', handleRfqCreated);
    window.addEventListener('krishisetu_requirement_fulfilled', handleRequirementFulfilled);
    window.addEventListener('krishisetu_mock_state_updated', handleMockStateUpdated);
    window.addEventListener('storage', handleRfqCreated);

    // Periodic live sync to pick up farmer procurement allocations
    const syncInterval = setInterval(syncAllRFQs, 4000);

    return () => {
      window.removeEventListener('krishisetu_buyer_rfq_created', handleRfqCreated);
      window.removeEventListener('krishisetu_requirement_fulfilled', handleRequirementFulfilled);
      window.removeEventListener('krishisetu_mock_state_updated', handleMockStateUpdated);
      window.removeEventListener('storage', handleRfqCreated);
      clearInterval(syncInterval);
    };
  }, [syncAllRFQs, fetchBackendRequirements]);

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
          { opacity: 1, scale: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
        );
      }
    }
  }, []);

  // Modal GSAP Animation
  useEffect(() => {
    if (isCreateOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.94, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.4)' }
      );
    }
  }, [isCreateOpen]);

  // Combine and deduplicate RFQs and Demands
  const combinedRFQs = useMemo(() => {
    const list = [...rfqs];
    const seenCropsAndIds = new Set();

    list.forEach((r) => {
      if (r.id) seenCropsAndIds.add(String(r.id).toLowerCase());
      if (r._id) seenCropsAndIds.add(String(r._id).toLowerCase());
    });

    backendReqs.forEach((req) => {
      const reqId = req.id || req._id;
      if (reqId && seenCropsAndIds.has(String(reqId).toLowerCase())) {
        return;
      }

      // Check if we already have an active RFQ for this exact crop with same volume
      const totalKg = req.total_quantity_needed_kg || 5000;
      const qtl = Math.round(totalKg / 100);
      const matchingLocal = list.find(
        (local) =>
          local.crop?.toLowerCase() === req.crop?.toLowerCase() &&
          local.quantityQuintal === qtl
      );

      if (matchingLocal) {
        // Merge fulfillment state if backend has higher quantity
        if ((req.fulfilled_quantity_kg || 0) > (matchingLocal.fulfilled_quantity_kg || 0)) {
          matchingLocal.fulfilled_quantity_kg = req.fulfilled_quantity_kg;
          matchingLocal.fulfillments = req.fulfillments || matchingLocal.fulfillments || [];
        }
        return;
      }

      list.push({
        id: req.id ? (String(req.id).startsWith('REQ-') ? req.id : `REQ-${String(req.id).slice(0, 6)}`) : `RFQ-2026-${Math.floor(100 + Math.random() * 900)}`,
        crop: req.crop ? req.crop.charAt(0).toUpperCase() + req.crop.slice(1) : 'Onion',
        variety: req.variety || 'Nashik Red Garva',
        gradeRequired: req.grade_required || 'Grade A',
        quantityQuintal: qtl,
        total_quantity_needed_kg: totalKg,
        fulfilled_quantity_kg: req.fulfilled_quantity_kg || 0,
        min_supply_per_farmer_kg: req.min_supply_per_farmer_kg || 100,
        maxPricePerQtl: Math.round((req.mandi_modal_price_per_kg || 24.5) * 100),
        deliveryHub: req.target_mandi || 'Lasalgaon APMC (Nashik)',
        status: req.fulfilled_quantity_kg >= totalKg
          ? 'Fulfilled'
          : req.fulfilled_quantity_kg > 0
          ? 'Partially Fulfilled'
          : req.matched_pool_id
          ? 'Matched with Pool'
          : 'Active RFQ',
        createdAt: req.created_at ? req.created_at.split('T')[0] : '2026-09-08',
        validTill: req.delivery_deadline || '2026-09-18',
        fulfillments: Array.isArray(req.fulfillments) ? req.fulfillments : [],
      });
    });

    return list;
  }, [rfqs, backendReqs]);

  // GSAP Cards Grid Animation on data update
  useEffect(() => {
    if (cardsGridRef.current) {
      const cards = cardsGridRef.current.querySelectorAll('.rfq-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
        );
      }
    }
  }, [combinedRFQs.length]);

  // Metrics for Top KPI
  const kpiStats = useMemo(() => {
    const totalOrders = combinedRFQs.length;
    let totalNeededKg = 0;
    let totalFulfilledKg = 0;
    let completedCount = 0;

    combinedRFQs.forEach((r) => {
      const needed = r.total_quantity_needed_kg || (r.quantityQuintal ? r.quantityQuintal * 100 : 1000);
      const fulfilled = r.fulfilled_quantity_kg !== undefined
        ? r.fulfilled_quantity_kg
        : (r.status === 'Matched with Pool' ? Math.round(needed * 0.72) : (r.id === 'RFQ-2026-074' ? needed : Math.round(needed * 0.3)));
      totalNeededKg += needed;
      totalFulfilledKg += Math.min(needed, fulfilled);
      if (fulfilled >= needed) completedCount += 1;
    });

    const overallPct = totalNeededKg > 0 ? Math.round((totalFulfilledKg / totalNeededKg) * 100) : 0;
    return { totalOrders, totalNeededKg, totalFulfilledKg, completedCount, overallPct };
  }, [combinedRFQs]);

  const handleCreateRFQ = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const qtl = parseInt(formData.quantityQuintal, 10) || 10;
      const rate = parseInt(formData.maxPricePerQtl, 10) || 2000;

      // 1. Save locally
      const created = saveRFQ({
        crop: formData.crop,
        variety: formData.variety,
        gradeRequired: formData.gradeRequired,
        quantityQuintal: qtl,
        maxPricePerQtl: rate,
        deliveryHub: formData.deliveryHub,
      });

      // 2. Also broadcast to backend requirements if possible
      try {
        await createRequirement({
          crop: formData.crop.toLowerCase(),
          variety: formData.variety,
          target_mandi: formData.deliveryHub,
          mandi_modal_price_per_kg: rate / 100,
          total_quantity_needed_kg: qtl * 100,
          min_supply_per_farmer_kg: 100,
          district: 'Pune',
          state: 'Maharashtra',
          delivery_deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        });
      } catch (backendErr) {
        console.warn('Backend requirement sync optional fallback:', backendErr);
      }

      setRfqs(getStoredRFQs());
      fetchBackendRequirements();
      setIsCreateOpen(false);
      setNotification({
        type: 'success',
        message: `Purchase Request (${created?.id || 'RFQ'}) broadcasted to regional FPO clusters!`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: 'Failed to broadcast RFQ. Please check form values.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Toast Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 border ${
            notification.type === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : 'bg-emerald-700 text-white border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-white hover:opacity-75 font-black text-base ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Breadcrumb Navigation matching Farmer Side */}
      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <Link to="/buyer/marketplace" className="hover:text-[#255919] dark:hover:text-[#D1BF4B] transition-colors">
          {t('buyer_nav_marketplace', 'Marketplace')}
        </Link>
        <span>/</span>
        <span className="font-semibold text-stone-800 dark:text-stone-200">
          {t('buyer_nav_offers', 'My Orders & Procurement Demands')}
        </span>
      </div>

      {/* Hero Header with Farmer Side Styling */}
      <div className="bg-gradient-to-r from-[#255919]/10 via-[#D1BF4B]/10 to-transparent p-5 sm:p-6 rounded-2xl border border-[#255919]/20 dark:border-[#D1BF4B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#255919] text-white dark:bg-[#D1BF4B] dark:text-stone-900 mb-2">
            <span>⚡</span>
            <span>{lang === 'mr' ? 'थेट शेतकरी पुरवठा समन्वय' : lang === 'hi' ? 'सीधा किसान आपूर्ति समन्वय' : 'Live Direct Farmer Procurement Sync'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {t('procurement_orders_title', 'Procurement Orders & RFQs')}
          </h1>
          <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl">
            {t('procurement_orders_subtitle', 'Publish direct purchase requirements to FPOs or track existing contracts with real-time farmer supply allocation.')}
          </p>
        </div>

        {/* Broadcast Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-[#255919] to-[#2A5124] hover:from-[#1b4313] hover:to-[#255919] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer shrink-0 border border-emerald-700/50"
        >
          <span className="text-base font-black">＋</span>
          <span>{t('broadcast_new_rfq', 'Broadcast New RFQ')}</span>
        </button>
      </div>

      {/* Top 4 KPI Metrics */}
      <div ref={kpiGridRef} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            {lang === 'mr' ? 'एकूण मागण्या' : lang === 'hi' ? 'कुल मांगें' : 'Total Demands'}
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {kpiStats.totalOrders}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {combinedRFQs.filter((r) => r.status !== 'Fulfilled').length} {lang === 'mr' ? 'सक्रिय' : lang === 'hi' ? 'सक्रिय' : 'active requirements'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#255919] dark:text-[#D1BF4B] uppercase tracking-wider">
            {lang === 'mr' ? 'आवश्यक प्रमाण' : lang === 'hi' ? 'आवश्यक मात्रा' : 'Target Volume'}
          </div>
          <div className="text-2xl font-black text-[#255919] dark:text-[#D1BF4B] mt-1">
            {(kpiStats.totalNeededKg / 100).toFixed(1)} <span className="text-xs font-semibold">Qtl</span>
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {kpiStats.totalNeededKg.toLocaleString()} kg total
          </div>
        </div>

        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {lang === 'mr' ? 'पुरवठा पूर्ण' : lang === 'hi' ? 'आपूर्ति पूर्ण' : 'Fulfilled Volume'}
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {(kpiStats.totalFulfilledKg / 100).toFixed(1)} <span className="text-xs font-semibold">Qtl</span>
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {kpiStats.overallPct}% {lang === 'mr' ? 'एकूण पूर्णता' : lang === 'hi' ? 'कुल पूर्ण' : 'overall fulfillment'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {lang === 'mr' ? 'पूर्ण झालेले ऑर्डर्स' : lang === 'hi' ? 'पूर्ण ऑर्डर्स' : 'Completed Orders'}
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {kpiStats.completedCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {lang === 'mr' ? '१००% पुरवठा झालेले' : lang === 'hi' ? '100% आपूर्ति पूर्ण' : '100% fulfilled'}
          </div>
        </div>
      </div>

      {/* RFQ Cards matching Screenshot 3 & Farmer Styling */}
      <div ref={cardsGridRef} className="space-y-4">
        {combinedRFQs.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-stone-300 dark:border-emerald-900/50 rounded-2xl bg-white dark:bg-[#132215] border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B]">
            <div className="text-3xl mb-2">📋</div>
            <p className="font-bold text-stone-700 dark:text-stone-300">
              {lang === 'mr' ? 'कोणत्याही खरेदी मागण्या प्रकाशित नाहीत.' : lang === 'hi' ? 'कोई खरीद मांग प्रकाशित नहीं है।' : 'No active procurement demands published.'}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {lang === 'mr' ? 'शेतकऱ्यांना खरेदी आवश्यकता पाठवण्यासाठी वरील "+ नवीन आरएफक्यू पाठवा" वर क्लिक करा.' : lang === 'hi' ? 'किसानों को मांग भेजने के लिए ऊपर "+ नया आरएफक्यू भेजें" पर क्लिक करें।' : 'Click "+ Broadcast New RFQ" above to publish target buying volumes to farmers.'}
            </p>
          </div>
        ) : (
          combinedRFQs.map((rfq) => {
            const isMatched = rfq.status === 'Matched with Pool';
            const isFulfilled = rfq.status === 'Fulfilled';
            const totalCommitment = (rfq.quantityQuintal || 10) * (rfq.maxPricePerQtl || 2000);
            const totalKg = rfq.total_quantity_needed_kg || (rfq.quantityQuintal ? rfq.quantityQuintal * 100 : 1000);
            const fulfilledKg = rfq.fulfilled_quantity_kg !== undefined
              ? rfq.fulfilled_quantity_kg
              : (rfq.status === 'Matched with Pool' ? Math.round(totalKg * 0.72) : (rfq.id === 'RFQ-2026-074' ? totalKg : Math.round(totalKg * 0.3)));
            const progressPct = Math.min(100, Math.round((fulfilledKg / totalKg) * 100));
            const remainingKg = Math.max(0, totalKg - fulfilledKg);
            const fulfillments = Array.isArray(rfq.fulfillments) ? rfq.fulfillments : [];
            const isExpanded = expandedRfqId === rfq.id;

            return (
              <div
                key={rfq.id}
                className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl shadow-xs hover:shadow-md transition p-5 sm:p-6 space-y-4 rfq-card"
              >
                {/* Header row: Title + Status + Ceiling Price */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-emerald-900/30 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-extrabold text-lg text-stone-900 dark:text-stone-100">
                        {rfq.crop} - {rfq.quantityQuintal} Quintals ({rfq.variety})
                      </h3>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          isFulfilled
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                            : isMatched
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : rfq.status === 'Partially Fulfilled'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {rfq.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-3 flex-wrap">
                      <span>
                        RFQ ID: <strong className="font-mono text-stone-700 dark:text-stone-300">{rfq.id}</strong>
                      </span>
                      <span>•</span>
                      <span>{lang === 'mr' ? 'दिनांक:' : lang === 'hi' ? 'दिनांक:' : 'Created:'} {rfq.createdAt}</span>
                      <span>•</span>
                      <span>{lang === 'mr' ? 'अंतिम मुदत:' : lang === 'hi' ? 'वैधता:' : 'Valid Till:'} {rfq.validTill}</span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      {t('target_ceiling_price', 'Target Ceiling Price')}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#255919] dark:text-[#D1BF4B]">
                      ₹{rfq.maxPricePerQtl}
                      <span className="text-xs font-normal text-stone-500 dark:text-stone-400">/qtl</span>
                    </div>
                  </div>
                </div>

                {/* 3 Grid boxes matching Screenshot 3 & Farmer Styling */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200/80 dark:border-emerald-800/40">
                    <span className="text-stone-500 dark:text-stone-400 block mb-1 font-medium">
                      {t('quality_tolerance', 'Quality Tolerance')}
                    </span>
                    <strong className="text-stone-800 dark:text-stone-100 text-sm">
                      {rfq.gradeRequired}
                    </strong>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200/80 dark:border-emerald-800/40">
                    <span className="text-stone-500 dark:text-stone-400 block mb-1 font-medium">
                      {t('total_procurement_commitment', 'Total Procurement Commitment')}
                    </span>
                    <strong className="text-stone-800 dark:text-stone-100 text-sm">
                      ₹{totalCommitment.toLocaleString()}
                    </strong>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200/80 dark:border-emerald-800/40">
                    <span className="text-stone-500 dark:text-stone-400 block mb-1 font-medium">
                      {t('delivery_destination', 'Delivery Destination')}
                    </span>
                    <strong className="text-stone-800 dark:text-stone-100 text-sm truncate block" title={rfq.deliveryHub}>
                      {rfq.deliveryHub}
                    </strong>
                  </div>
                </div>

                {/* Fulfillment Progress Bar */}
                <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-emerald-900/30">
                  <div className="flex justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                    <span>
                      {t('fulfillment_progress', 'Fulfillment Progress')}: {fulfilledKg.toLocaleString()} / {totalKg.toLocaleString()} kg ({progressPct}%)
                    </span>
                    <span className={remainingKg === 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-600 dark:text-amber-400 font-extrabold'}>
                      {remainingKg === 0 ? t('fully_fulfilled', 'Fully Fulfilled ✓') : `${remainingKg.toLocaleString()} kg ${t('remaining', 'remaining')}`}
                    </span>
                  </div>

                  <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-stone-200 dark:border-emerald-900/40">
                    <div
                      className="h-full bg-gradient-to-r from-[#255919] via-[#2A5124] to-[#D1BF4B] transition-all duration-700 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
                    <span>{t('min_supply_lot', 'Min supply lot')}: {rfq.min_supply_per_farmer_kg || 100} kg/farmer</span>
                    <span>{t('delivery_deadline', 'Delivery deadline')}: {rfq.validTill || 'Open'}</span>
                  </div>
                </div>

                {/* Contributing Farmers Accordion */}
                <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedRfqId(isExpanded ? null : rfq.id)}
                    className="text-xs font-bold text-[#255919] dark:text-[#D1BF4B] hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isExpanded ? '▲ ' : '▼ '}</span>
                    <span>{isExpanded ? (lang === 'mr' ? 'शेतकरी लपवा' : lang === 'hi' ? 'किसान छुपाएं' : 'Hide') : (lang === 'mr' ? 'शेतकरी यादी पहा' : lang === 'hi' ? 'किसान सूची देखें' : 'View')} {t('contributing_farmers', 'Contributing Farmers')}</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border border-emerald-300/50">
                      {fulfillments.length}
                    </span>
                  </button>

                  <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    {lang === 'mr' ? 'एकूण अदा रक्कम:' : lang === 'hi' ? 'कुल भुगतान राशि:' : 'Total Payout:'} <strong className="text-stone-800 dark:text-stone-100 font-bold">₹{Math.round((fulfilledKg * (rfq.maxPricePerQtl / 100))).toLocaleString()}</strong>
                  </span>
                </div>

                {/* Contributing Farmers Dropdown Table */}
                {isExpanded && (
                  <div className="mt-3 bg-stone-50/80 dark:bg-[#182b1c]/70 rounded-xl p-3 border border-stone-200 dark:border-emerald-800/40 animate-in fade-in">
                    {fulfillments.length === 0 ? (
                      <div className="text-center py-4 text-xs text-stone-500 dark:text-stone-400">
                        {lang === 'mr'
                          ? 'या मागणीसाठी अजून कोणतीही शेतकरी नोंद झालेली नाही.'
                          : lang === 'hi'
                          ? 'इस मांग के लिए अभी कोई किसान योगदान दर्ज नहीं हुआ है।'
                          : 'No farmer contributions recorded yet for this requirement.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-stone-200 dark:border-emerald-900/40 text-stone-500 dark:text-stone-400 uppercase font-semibold text-[10px]">
                              <th className="py-2 px-3">{lang === 'mr' ? 'शेतकऱ्याचे नाव' : lang === 'hi' ? 'किसान का नाम' : 'Farmer Name'}</th>
                              <th className="py-2 px-3">{lang === 'mr' ? 'संपर्क' : lang === 'hi' ? 'संपर्क' : 'Contact'}</th>
                              <th className="py-2 px-3">{lang === 'mr' ? 'गाव / तालुका' : lang === 'hi' ? 'गांव / तालुका' : 'Village / Taluk'}</th>
                              <th className="py-2 px-3">{lang === 'mr' ? 'पुरवठा प्रमाण' : lang === 'hi' ? 'आपूर्ति मात्रा' : 'Quantity Supplied'}</th>
                              <th className="py-2 px-3">{lang === 'mr' ? 'मंडी दर' : lang === 'hi' ? 'मंडी दर' : 'Rate'}</th>
                              <th className="py-2 px-3">{lang === 'mr' ? 'एकूण रक्कम' : lang === 'hi' ? 'कुल भुगतान' : 'Total Payout'}</th>
                              <th className="py-2 px-3">{lang === 'mr' ? 'तारीख' : lang === 'hi' ? 'दिनांक' : 'Date'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200/80 dark:divide-emerald-900/30">
                            {fulfillments.map((f, idx) => (
                              <tr key={idx} className="hover:bg-white dark:hover:bg-[#1f3724] transition">
                                <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-stone-100">
                                  {f.farmer_name}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-stone-600 dark:text-stone-300 text-[11px]">
                                  {f.farmer_phone}
                                </td>
                                <td className="py-2.5 px-3 text-stone-600 dark:text-stone-300">
                                  {f.village}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-stone-800 dark:text-stone-100">
                                  {f.quantity_kg} kg
                                </td>
                                <td className="py-2.5 px-3 text-emerald-700 dark:text-[#D1BF4B] font-bold">
                                  ₹{Number(f.mandi_price).toFixed(2)}/kg
                                </td>
                                <td className="py-2.5 px-3 font-bold text-stone-900 dark:text-stone-100">
                                  ₹{Number(f.total_payout).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-stone-400 text-[11px]">
                                  {f.fulfilled_at || 'Recent'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast New RFQ Dialog matching Screenshot & Farmer Styling */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 border-t-4 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-emerald-900/30 pb-3">
              <div>
                <h3 className="font-black text-lg text-stone-900 dark:text-stone-100">
                  {lang === 'mr' ? 'नवीन खरेदी मागणी (RFQ) पाठवा' : lang === 'hi' ? 'नई खरीद मांग (RFQ) भेजें' : 'Broadcast Purchase Request (RFQ)'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {lang === 'mr'
                    ? 'आवश्यक शेतमाल प्रमाण, गुणवत्ता ग्रेड आणि कमाल खरेदी दर निश्चित करा.'
                    : lang === 'hi'
                    ? 'आवश्यक फसल मात्रा, गुणवत्ता सहनशीलता और अधिकतम खरीद दर निर्दिष्ट करें।'
                    : 'Specify required crop volume, quality tolerance, and target procurement ceiling.'}
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRFQ} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    {lang === 'mr' ? 'पीक' : lang === 'hi' ? 'फसल' : 'Crop'}
                  </label>
                  <select
                    value={formData.crop}
                    onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-[#255919]"
                  >
                    <option value="Tomato">{lang === 'mr' ? 'टोमॅटो' : lang === 'hi' ? 'टमाटर' : 'Tomato'}</option>
                    <option value="Onion">{lang === 'mr' ? 'कांदा' : lang === 'hi' ? 'प्याज' : 'Onion'}</option>
                    <option value="Soyabean">{lang === 'mr' ? 'सोयाबीन' : lang === 'hi' ? 'सोयाबीन' : 'Soyabean'}</option>
                    <option value="Cotton">{lang === 'mr' ? 'कापूस' : lang === 'hi' ? 'कपास' : 'Cotton'}</option>
                    <option value="Pomegranate">{lang === 'mr' ? 'डाळिंब' : lang === 'hi' ? 'अनार' : 'Pomegranate'}</option>
                    <option value="Banana">{lang === 'mr' ? 'केळी' : lang === 'hi' ? 'केला' : 'Banana'}</option>
                    <option value="Turmeric">{lang === 'mr' ? 'हळद' : lang === 'hi' ? 'हल्दी' : 'Turmeric'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    {lang === 'mr' ? 'वाण / प्रकार' : lang === 'hi' ? 'किस्म' : 'Variety'}
                  </label>
                  <input
                    type="text"
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-[#255919]"
                    placeholder="e.g. Abhinav (Hybrid)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    {t('quality_tolerance', 'Required Grade')}
                  </label>
                  <select
                    value={formData.gradeRequired}
                    onChange={(e) => setFormData({ ...formData, gradeRequired: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-[#255919]"
                  >
                    <option value="Grade A">Grade A Only</option>
                    <option value="Grade A or B">Grade A or B</option>
                    <option value="Grade B">Grade B (Processing)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    {lang === 'mr' ? 'प्रमाण (क्विंटल)' : lang === 'hi' ? 'मात्रा (क्विंटल)' : 'Volume (Quintals)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantityQuintal}
                    onChange={(e) => setFormData({ ...formData, quantityQuintal: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-[#255919]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t('target_ceiling_price', 'Ceiling Offer Price (₹/Quintal)')}
                </label>
                <input
                  type="number"
                  min="100"
                  value={formData.maxPricePerQtl}
                  onChange={(e) => setFormData({ ...formData, maxPricePerQtl: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-[#255919]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t('delivery_destination', 'Delivery Destination Hub')}
                </label>
                <input
                  type="text"
                  value={formData.deliveryHub}
                  onChange={(e) => setFormData({ ...formData, deliveryHub: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-[#255919]"
                  placeholder="e.g. FreshMart Hadapsar Central Warehouse, Pune"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-1/2 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-emerald-950/30 transition cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#255919] to-[#2A5124] hover:from-[#1b4313] hover:to-[#255919] text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? (lang === 'mr' ? 'पाठवत आहे...' : lang === 'hi' ? 'भेजा जा रहा है...' : 'Broadcasting...') : (lang === 'mr' ? 'एफपीओंना पाठवा' : lang === 'hi' ? 'एफपीओ को भेजें' : 'Broadcast to FPOs')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
