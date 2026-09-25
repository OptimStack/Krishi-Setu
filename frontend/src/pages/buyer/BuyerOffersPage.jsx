import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getRequirements, createRequirement } from '../../api/requirements';
import { getStoredRFQs, saveRFQ } from '../../api/buyerData';
import { mockService } from '../../api/mockService';

export default function BuyerOffersPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [rfqs, setRfqs] = useState(() => getStoredRFQs());
  const [backendReqs, setBackendReqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedRfqId, setExpandedRfqId] = useState(null);

  // Quick Order panel collapse toggle (open by default so user can confirm order at top without scrolling)
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(true);

  const containerRef = useRef(null);
  const orderFormRef = useRef(null);
  const kpiGridRef = useRef(null);
  const cardsGridRef = useRef(null);

  // Form data for broadcasting new Direct Farmer Procurement Order
  const [formData, setFormData] = useState({
    crop: 'Tomato',
    variety: 'Abhinav (Hybrid)',
    gradeRequired: 'Grade A',
    quantityQuintal: '15',
    maxPricePerQtl: '2150',
    deliveryHub: 'FreshMart Hadapsar Central Warehouse, Pune',
  });

  // Fetch backend requirements (connected to farmer buyer procurement)
  const fetchBackendRequirements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRequirements();
      if (res?.data && Array.isArray(res.data)) {
        setBackendReqs(res.data);
      }
    } catch (err) {
      console.warn('Backend requirements fallback to mockService:', err);
      const mockReqs = mockService.loadState().buyer_requirements || [];
      setBackendReqs(mockReqs);
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
      syncAllRFQs();
    };
    const handleRequirementFulfilled = (e) => {
      syncAllRFQs();
      if (e?.detail?.fulfillment) {
        setNotification({
          type: 'success',
          message: `🌾 New farmer supply recorded! ${e.detail.fulfillment.farmer_name} allocated ${e.detail.fulfillment.quantity_kg} kg directly to your procurement demand.`,
        });
      }
    };
    const handleMockStateUpdated = () => {
      syncAllRFQs();
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
  }, [syncAllRFQs]);

  // GSAP Entrance Animations
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
    if (orderFormRef.current) {
      gsap.fromTo(
        orderFormRef.current,
        { opacity: 0, scale: 0.98, y: -10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, delay: 0.1, ease: 'power2.out' }
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

  // Combine and deduplicate RFQs and Demands directly linked with Farmer Buyer Procurement
  const combinedRFQs = useMemo(() => {
    const list = [...rfqs];
    const seenCropsAndIds = new Set();

    list.forEach((r) => {
      if (r.id) seenCropsAndIds.add(String(r.id).toLowerCase());
      if (r._id) seenCropsAndIds.add(String(r._id).toLowerCase());
    });

    backendReqs.forEach((req) => {
      const reqId = req._id || req.id;
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

      const isDone = (req.fulfilled_quantity_kg || 0) >= totalKg;
      const hasSome = (req.fulfilled_quantity_kg || 0) > 0;

      list.push({
        id: req.id ? (String(req.id).startsWith('REQ-') ? req.id : `REQ-${String(req.id).slice(0, 6)}`) : `RFQ-2026-${Math.floor(100 + Math.random() * 900)}`,
        crop: req.crop ? req.crop.charAt(0).toUpperCase() + req.crop.slice(1) : 'Onion',
        variety: req.variety || 'Nashik Red Garva',
        gradeRequired: req.grade_required || req.quality_grade || 'Grade A',
        quantityQuintal: qtl,
        total_quantity_needed_kg: totalKg,
        fulfilled_quantity_kg: req.fulfilled_quantity_kg || 0,
        min_supply_per_farmer_kg: req.min_supply_per_farmer_kg || 100,
        maxPricePerQtl: Math.round((req.mandi_modal_price_per_kg || 24.5) * 100),
        deliveryHub: req.target_mandi || 'Lasalgaon APMC (Nashik)',
        status: isDone
          ? 'Fulfilled by Farmers'
          : hasSome
          ? 'Farmer Supply in Progress'
          : 'Active Farmer Demand',
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
        : (r.id === 'RFQ-2026-074' ? needed : Math.round(needed * 0.3));
      totalNeededKg += needed;
      totalFulfilledKg += Math.min(needed, fulfilled);
      if (fulfilled >= needed) completedCount += 1;
    });

    const overallPct = totalNeededKg > 0 ? Math.round((totalFulfilledKg / totalNeededKg) * 100) : 0;
    return { totalOrders, totalNeededKg, totalFulfilledKg, completedCount, overallPct };
  }, [combinedRFQs]);

  // Directly confirm and post order to Farmer Buyer Procurement
  const handleConfirmMyOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitting(true);
    try {
      const qtl = parseInt(formData.quantityQuintal, 10) || 10;
      const rate = parseInt(formData.maxPricePerQtl, 10) || 2000;
      const totalKg = qtl * 100;
      const ratePerKg = rate / 100;

      // 1. Save locally in Buyer store
      const created = saveRFQ({
        crop: formData.crop,
        variety: formData.variety,
        gradeRequired: formData.gradeRequired,
        quantityQuintal: qtl,
        total_quantity_needed_kg: totalKg,
        fulfilled_quantity_kg: 0,
        maxPricePerQtl: rate,
        deliveryHub: formData.deliveryHub,
        status: 'Active Farmer Demand',
        fulfillments: [],
      });

      // 2. Broadcast directly into Farmer's Buyer Procurement Demands
      try {
        await createRequirement({
          crop: formData.crop.toLowerCase(),
          variety: formData.variety,
          target_mandi: formData.deliveryHub,
          mandi_modal_price_per_kg: ratePerKg,
          total_quantity_needed_kg: totalKg,
          min_supply_per_farmer_kg: 100,
          district: 'Pune',
          state: 'Maharashtra',
          delivery_deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          buyer_name: user?.name || 'FreshFarm Retail Pvt Ltd',
          buyer_type: 'Direct Institutional Procurement',
        });
      } catch (backendErr) {
        console.warn('Backend requirement sync fallback:', backendErr);
      }

      // Also ensure mockService has this demand immediately so farmer sees it on /farmer/procurement
      try {
        const state = mockService.loadState();
        state.buyer_requirements = state.buyer_requirements || [];
        const exists = state.buyer_requirements.some((r) => r.crop?.toLowerCase() === formData.crop.toLowerCase() && r.total_quantity_needed_kg === totalKg);
        if (!exists) {
          state.buyer_requirements.unshift({
            _id: `req_${Date.now()}`,
            buyer_id: user?.id || 'usr_buyer_1',
            buyer_name: user?.name || 'FreshFarm Retail Pvt Ltd',
            buyer_phone: user?.phone || '9876543220',
            crop: formData.crop.toLowerCase(),
            variety: formData.variety,
            target_mandi: formData.deliveryHub,
            mandi_modal_price_per_kg: ratePerKg,
            total_quantity_needed_kg: totalKg,
            fulfilled_quantity_kg: 0.0,
            min_supply_per_farmer_kg: 100.0,
            district: 'Pune',
            state: 'Maharashtra',
            delivery_deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            status: 'open',
            fulfillments: [],
          });
          mockService.saveState(state);
        }
      } catch {}

      syncAllRFQs();
      setNotification({
        type: 'success',
        message: `Order #${created?.id || 'RFQ'} confirmed! Posted directly to regional farmers for immediate supply allocation.`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: 'Failed to confirm order. Please verify input values.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentCommitment = (parseInt(formData.quantityQuintal, 10) || 0) * (parseInt(formData.maxPricePerQtl, 10) || 0);

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
          {t('buyer_nav_offers', 'My Orders & Direct Farmer Procurement')}
        </span>
      </div>

      {/* Hero Header with Direct Farmer Procurement Label */}
      <div className="bg-gradient-to-r from-[#255919]/10 via-[#D1BF4B]/10 to-transparent p-5 sm:p-6 rounded-2xl border border-[#255919]/20 dark:border-[#D1BF4B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#255919] text-white dark:bg-[#D1BF4B] dark:text-stone-900 mb-2">
            <span>🌾</span>
            <span>{lang === 'mr' ? 'थेट शेतकरी खरेदी मागणी' : lang === 'hi' ? 'सीधा किसान खरीद मांग' : 'Direct Farmer Mandi Procurement'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {lang === 'mr' ? 'माझ्या खरेदी मागण्या (ऑर्डर्स)' : lang === 'hi' ? 'मेरी खरीद मांगें (ऑर्डर्स)' : 'My Procurement Orders & Farmer Demands'}
          </h1>
          <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl">
            {lang === 'mr'
              ? 'स्थानिक शेतकऱ्यांसाठी थेट खरेदी आवश्यकता प्रकाशित करा. शेतकरी थेट त्यांच्या उत्पादनातून पुरवठा करू शकतात.'
              : lang === 'hi'
              ? 'स्थानीय किसानों के लिए सीधे खरीद मांग प्रकाशित करें। किसान सीधे अपनी उपज से आपूर्ति कर सकते हैं।'
              : 'Publish buying requirements directly to local farmers. Registered farmers allocate harvest supply directly with 0% APMC commission.'}
          </p>
        </div>

        {/* Quick Top Button to toggle or scroll to order form */}
        <button
          type="button"
          onClick={() => setIsOrderPanelOpen((prev) => !prev)}
          className="bg-stone-100 dark:bg-[#182b1c] hover:bg-stone-200 dark:hover:bg-[#203a25] text-stone-800 dark:text-stone-200 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border border-stone-300 dark:border-emerald-800/50 shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <span>{isOrderPanelOpen ? '▲' : '▼'}</span>
          <span>{isOrderPanelOpen ? 'Collapse Order Panel' : '+ Post New Order'}</span>
        </button>
      </div>

      {/* TOP ORDER CREATION CARD — "CONFIRM MY ORDER" IS RIGHT AT THE TOP (NO SCROLLING DOWN REQUIRED!) */}
      {isOrderPanelOpen && (
        <div
          ref={orderFormRef}
          className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-4 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in"
        >
          {/* Header of the Top Order Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-emerald-900/30 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>📝</span>
                <span>{lang === 'mr' ? 'थेट शेतकरी खरेदी मागणी नोंदवा' : lang === 'hi' ? 'सीधा किसान खरीद मांग दर्ज करें' : 'Post Direct Farmer Procurement Order'}</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {lang === 'mr'
                  ? 'शेतमाल प्रमाण आणि कमाल दर निश्चित करून त्वरित ऑर्डर्स शेतकऱ्यांना पाठवा.'
                  : lang === 'hi'
                  ? 'फसल मात्रा और अधिकतम दर निर्धारित कर तुरंत किसानों को ऑर्डर भेजें।'
                  : 'Specify crop volume, quality grade, and ceiling rate. Immediately broadcasts to farmers on their procurement screen.'}
              </p>
            </div>

            {/* Top Primary "Confirm My Order" CTA — Instant Access Without Scrolling */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmMyOrder}
              className="bg-gradient-to-r from-[#255919] to-[#2A5124] hover:from-[#1b4313] hover:to-[#255919] text-white px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 shrink-0 border border-emerald-700/50"
            >
              <span>{submitting ? '⏳' : '✓'}</span>
              <span>{submitting ? (lang === 'mr' ? 'नोंदवत आहे...' : lang === 'hi' ? 'दर्ज हो रहा है...' : 'Confirming...') : (lang === 'mr' ? 'माझी ऑर्डर कन्फर्म करा' : lang === 'hi' ? 'मेरा ऑर्डर कन्फर्म करें' : 'Confirm My Order')}</span>
            </button>
          </div>

          {/* Form Grid */}
          <form onSubmit={handleConfirmMyOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Field 1: Crop */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'mr' ? 'पीक निवडा' : lang === 'hi' ? 'फसल चुनें' : 'Crop'}
                </label>
                <select
                  value={formData.crop}
                  onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                >
                  <option value="Tomato">{lang === 'mr' ? 'टोमॅटो (Tomato)' : lang === 'hi' ? 'टमाटर (Tomato)' : 'Tomato'}</option>
                  <option value="Onion">{lang === 'mr' ? 'कांदा (Onion)' : lang === 'hi' ? 'प्याज (Onion)' : 'Onion'}</option>
                  <option value="Potato">{lang === 'mr' ? 'बटाटा (Potato)' : lang === 'hi' ? 'आलू (Potato)' : 'Potato'}</option>
                  <option value="Soyabean">{lang === 'mr' ? 'सोयाबीन (Soyabean)' : lang === 'hi' ? 'सोयाबीन (Soyabean)' : 'Soyabean'}</option>
                  <option value="Wheat">{lang === 'mr' ? 'गहू (Wheat)' : lang === 'hi' ? 'गेहूं (Wheat)' : 'Wheat'}</option>
                  <option value="Cotton">{lang === 'mr' ? 'कापूस (Cotton)' : lang === 'hi' ? 'कपास (Cotton)' : 'Cotton'}</option>
                  <option value="Pomegranate">{lang === 'mr' ? 'डाळिंब (Pomegranate)' : lang === 'hi' ? 'अनार (Pomegranate)' : 'Pomegranate'}</option>
                  <option value="Banana">{lang === 'mr' ? 'केळी (Banana)' : lang === 'hi' ? 'केला (Banana)' : 'Banana'}</option>
                  <option value="Turmeric">{lang === 'mr' ? 'हळद (Turmeric)' : lang === 'hi' ? 'हल्दी (Turmeric)' : 'Turmeric'}</option>
                </select>
              </div>

              {/* Field 2: Variety */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'mr' ? 'वाण / प्रकार' : lang === 'hi' ? 'किस्म' : 'Variety'}
                </label>
                <input
                  type="text"
                  value={formData.variety}
                  onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                  placeholder="e.g. Abhinav (Hybrid), Red Garva"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                  required
                />
              </div>

              {/* Field 3: Required Grade */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'mr' ? 'अपेक्षित ग्रेड' : lang === 'hi' ? 'आवश्यक ग्रेड' : 'Required Quality Grade'}
                </label>
                <select
                  value={formData.gradeRequired}
                  onChange={(e) => setFormData({ ...formData, gradeRequired: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                >
                  <option value="Grade A">Grade A (Premium Retail)</option>
                  <option value="Grade A or B">Grade A or B (General Market)</option>
                  <option value="Grade B">Grade B (Processing / Bulk)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Field 4: Volume in Quintals */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    {lang === 'mr' ? 'आवश्यक प्रमाण (क्विंटल)' : lang === 'hi' ? 'मात्रा (क्विंटल)' : 'Volume Needed (Quintals)'}
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">
                    = {(parseInt(formData.quantityQuintal, 10) || 0) * 100} kg
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  value={formData.quantityQuintal}
                  onChange={(e) => setFormData({ ...formData, quantityQuintal: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                  required
                />
              </div>

              {/* Field 5: Ceiling Rate */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    {lang === 'mr' ? 'कमाल खरेदी दर (₹/क्विंटल)' : lang === 'hi' ? 'अधिकतम दर (₹/क्विंटल)' : 'Ceiling Offer (₹/Quintal)'}
                  </label>
                  <span className="text-[10px] text-emerald-700 dark:text-[#D1BF4B] font-mono font-bold">
                    = ₹{((parseInt(formData.maxPricePerQtl, 10) || 0) / 100).toFixed(2)}/kg
                  </span>
                </div>
                <input
                  type="number"
                  min="100"
                  value={formData.maxPricePerQtl}
                  onChange={(e) => setFormData({ ...formData, maxPricePerQtl: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                  required
                />
              </div>

              {/* Field 6: Delivery Destination */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'mr' ? 'डिलिव्हरी गंतव्य केंद्र' : lang === 'hi' ? 'वितरण गंतव्य हब' : 'Delivery Destination Hub'}
                </label>
                <input
                  type="text"
                  value={formData.deliveryHub}
                  onChange={(e) => setFormData({ ...formData, deliveryHub: e.target.value })}
                  placeholder="e.g. FreshMart Hadapsar Central Warehouse, Pune"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                  required
                />
              </div>
            </div>

            {/* Bottom summary and duplicate Confirm button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-3 text-xs text-stone-600 dark:text-stone-300">
                <span>{lang === 'mr' ? 'एकूण अंदाज रक्कम:' : lang === 'hi' ? 'कुल अनुमानित राशि:' : 'Total Commitment Value:'}</span>
                <strong className="text-base font-black text-[#255919] dark:text-[#D1BF4B]">
                  ₹{currentCommitment.toLocaleString('en-IN')}
                </strong>
                <span className="text-[11px] text-stone-400">
                  (0% Mandi Tax • Direct Farmer Escrow)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#255919] to-[#2A5124] hover:from-[#1b4313] hover:to-[#255919] text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>✓</span>
                  <span>{submitting ? 'Confirming...' : 'Confirm & Post Order to Farmers'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div ref={kpiGridRef} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            {lang === 'mr' ? 'एकूण ऑर्डर्स' : lang === 'hi' ? 'कुल ऑर्डर्स' : 'Total Orders Posted'}
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {kpiStats.totalOrders}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {combinedRFQs.filter((r) => !r.status.includes('Fulfilled')).length} {lang === 'mr' ? 'शेतकरी पुरवठा सुरू' : lang === 'hi' ? 'किसान आपूर्ति जारी' : 'open for supply'}
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
            {lang === 'mr' ? 'शेतकरी पुरवठा' : lang === 'hi' ? 'किसान आपूर्ति' : 'Farmer Supplied'}
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {(kpiStats.totalFulfilledKg / 100).toFixed(1)} <span className="text-xs font-semibold">Qtl</span>
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {kpiStats.overallPct}% {lang === 'mr' ? 'पुरवठा पूर्ण' : lang === 'hi' ? 'आपूर्ति पूर्ण' : 'fulfilled by farmers'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#132215] border border-stone-200/90 dark:border-emerald-900/40 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {lang === 'mr' ? '१००% पूर्ण ऑर्डर्स' : lang === 'hi' ? '100% पूर्ण ऑर्डर्स' : 'Completed Demands'}
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {kpiStats.completedCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {lang === 'mr' ? 'शेतकऱ्यांनी पूर्ण केले' : lang === 'hi' ? 'किसानों द्वारा संपन्न' : '100% batch allocated'}
          </div>
        </div>
      </div>

      {/* Direct Farmer Procurement Orders List */}
      <div ref={cardsGridRef} className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-900/40 pb-2">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>📋</span>
            <span>{lang === 'mr' ? 'सक्रिय थेट शेतकरी खरेदी ऑर्डर्स' : lang === 'hi' ? 'सक्रिय प्रत्यक्ष किसान खरीद ऑर्डर्स' : 'Active Direct Farmer Procurement Orders'}</span>
          </h2>
          <span className="text-xs text-stone-400 font-mono">
            {combinedRFQs.length} active demands
          </span>
        </div>

        {combinedRFQs.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-stone-300 dark:border-emerald-900/50 rounded-2xl bg-white dark:bg-[#132215] border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B]">
            <div className="text-3xl mb-2">📋</div>
            <p className="font-bold text-stone-700 dark:text-stone-300">
              {lang === 'mr' ? 'कोणत्याही खरेदी मागण्या सक्रिय नाहीत.' : lang === 'hi' ? 'कोई खरीद मांग सक्रिय नहीं है।' : 'No active procurement orders published.'}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {lang === 'mr' ? 'शेतकऱ्यांसाठी नवीन मागणी नोंदवण्यासाठी वरील फॉर्म वापरा.' : lang === 'hi' ? 'किसानों के लिए नई मांग दर्ज करने हेतु ऊपर दिया गया फॉर्म उपयोग करें।' : 'Use the quick order form above to broadcast buying requirements directly to farmers.'}
            </p>
          </div>
        ) : (
          combinedRFQs.map((rfq) => {
            const isFulfilled = rfq.status.includes('Fulfilled');
            const totalCommitment = (rfq.quantityQuintal || 10) * (rfq.maxPricePerQtl || 2000);
            const totalKg = rfq.total_quantity_needed_kg || (rfq.quantityQuintal ? rfq.quantityQuintal * 100 : 1000);
            const fulfilledKg = rfq.fulfilled_quantity_kg !== undefined
              ? rfq.fulfilled_quantity_kg
              : (rfq.id === 'RFQ-2026-074' ? totalKg : Math.round(totalKg * 0.3));
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
                            : fulfilledKg > 0
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {rfq.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-3 flex-wrap">
                      <span>
                        Order ID: <strong className="font-mono text-stone-700 dark:text-stone-300">{rfq.id}</strong>
                      </span>
                      <span>•</span>
                      <span>{lang === 'mr' ? 'दिनांक:' : lang === 'hi' ? 'दिनांक:' : 'Created:'} {rfq.createdAt}</span>
                      <span>•</span>
                      <span>{lang === 'mr' ? 'अंतिम मुदत:' : lang === 'hi' ? 'वैधता:' : 'Valid Till:'} {rfq.validTill}</span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      {t('target_ceiling_price', 'Ceiling Offer Price')}
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
                      {t('delivery_destination', 'Target Mandi / Delivery Destination')}
                    </span>
                    <strong className="text-stone-800 dark:text-stone-100 text-sm truncate block" title={rfq.deliveryHub}>
                      {rfq.deliveryHub}
                    </strong>
                  </div>
                </div>

                {/* Farmer Fulfillment Progress Bar */}
                <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-emerald-900/30">
                  <div className="flex justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                    <span>
                      {lang === 'mr' ? 'शेतकरी पुरवठा प्रगती' : lang === 'hi' ? 'किसान आपूर्ति प्रगति' : 'Farmer Supply Allocation'}: {fulfilledKg.toLocaleString()} / {totalKg.toLocaleString()} kg ({progressPct}%)
                    </span>
                    <span className={remainingKg === 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-600 dark:text-amber-400 font-extrabold'}>
                      {remainingKg === 0 ? (lang === 'mr' ? 'शेतकऱ्यांनी पूर्ण केले ✓' : lang === 'hi' ? 'किसानों द्वारा पूर्ण ✓' : 'Fully Supplied by Farmers ✓') : `${remainingKg.toLocaleString()} kg ${t('remaining', 'open for farmers')}`}
                    </span>
                  </div>

                  <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-stone-200 dark:border-emerald-900/40">
                    <div
                      className="h-full bg-gradient-to-r from-[#255919] via-[#2A5124] to-[#D1BF4B] transition-all duration-700 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
                    <span>{lang === 'mr' ? 'शेतकऱ्यासाठी किमान लॉट' : lang === 'hi' ? 'किसान हेतु न्यूनतम लॉट' : 'Min lot per farmer'}: {rfq.min_supply_per_farmer_kg || 100} kg</span>
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
                    <span>{isExpanded ? (lang === 'mr' ? 'शेतकरी लपवा' : lang === 'hi' ? 'किसान छुपाएं' : 'Hide') : (lang === 'mr' ? 'पुरवठादार शेतकरी यादी पहा' : lang === 'hi' ? 'आपूर्तिकर्ता किसान सूची देखें' : 'View')} {lang === 'mr' ? 'पुरवठादार शेतकरी' : lang === 'hi' ? 'आपूर्तिकर्ता किसान' : 'Contributing Farmers'}</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border border-emerald-300/50">
                      {fulfillments.length}
                    </span>
                  </button>

                  <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    {lang === 'mr' ? 'शेतकऱ्यांना अदा रक्कम:' : lang === 'hi' ? 'किसानों को भुगतान:' : 'Farmer Payout Committed:'} <strong className="text-stone-800 dark:text-stone-100 font-bold">₹{Math.round((fulfilledKg * (rfq.maxPricePerQtl / 100))).toLocaleString()}</strong>
                  </span>
                </div>

                {/* Contributing Farmers Dropdown Table (Direct Farmer Supply Records) */}
                {isExpanded && (
                  <div className="mt-3 bg-stone-50/80 dark:bg-[#182b1c]/70 rounded-xl p-3 border border-stone-200 dark:border-emerald-800/40 animate-in fade-in">
                    {fulfillments.length === 0 ? (
                      <div className="text-center py-4 text-xs text-stone-500 dark:text-stone-400">
                        {lang === 'mr'
                          ? 'स्थानिक शेतकऱ्यांकडून अजून कोणताही पुरवठा नोंद झालेला नाही. शेतकरी खरेदीदार खरेदी पोर्टलवरून थेट पुरवठा करू शकतात.'
                          : lang === 'hi'
                          ? 'स्थानीय किसानों से अभी कोई आपूर्ति दर्ज नहीं हुई है। किसान खरीददार खरीद पोर्टल से सीधे आपूर्ति कर सकते हैं।'
                          : 'No farmer supply allocations recorded yet. When farmers allocate supply on their Buyer Procurement screen, records appear here immediately.'}
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
                                <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                  <span>🌾</span>
                                  <span>{f.farmer_name}</span>
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
                                  {f.fulfilled_at ? f.fulfilled_at.split('T')[0] : 'Recent'}
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
    </div>
  );
}
