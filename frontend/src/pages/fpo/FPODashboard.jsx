import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import mockService from '../../api/mockService';
import { getStoredPools, INITIAL_VERIFIED_BUYERS, INITIAL_LOGISTICS_ROUTE, dispatchFPOPool } from '../../api/fpoData';
import FarmMandiMap from '../../components/widgets/FarmMandiMap';

export default function FPODashboard() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { lastSavedLocation } = useOffline();
  const navigate = useNavigate();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [activeTab, setActiveTab] = useState('overview');
  const [lots, setLots] = useState([]);
  const [pools, setPools] = useState([]);

  const containerRef = useRef(null);
  const kpiRef = useRef(null);

  const fetchFPOData = () => {
    try {
      const state = mockService.loadState();
      setLots(state.listings || []);
      setPools(getStoredPools());
    } catch (e) {
      console.warn('Failed to load FPO data:', e);
    }
  };

  useEffect(() => {
    fetchFPOData();
    const handleUpdate = () => fetchFPOData();
    window.addEventListener('krishisetu_mock_state_updated', handleUpdate);
    window.addEventListener('krishisetu_lot_verified', handleUpdate);
    window.addEventListener('krishisetu_fpo_pools_updated', handleUpdate);
    return () => {
      window.removeEventListener('krishisetu_mock_state_updated', handleUpdate);
      window.removeEventListener('krishisetu_lot_verified', handleUpdate);
      window.removeEventListener('krishisetu_fpo_pools_updated', handleUpdate);
    };
  }, []);

  // GSAP Entrance
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
    if (kpiRef.current) {
      const items = kpiRef.current.children;
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, scale: 0.95, y: 10 },
          { opacity: 1, scale: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' }
        );
      }
    }
  }, []);

  // Computed metrics
  const pendingLots = useMemo(() => {
    return lots.filter(
      (l) => l.productStatus === 'AWAITING_FPO_VERIFICATION' || l.status === 'submitted' || l.status === 'Submitted'
    );
  }, [lots]);

  const verifiedLots = useMemo(() => {
    return lots.filter(
      (l) => l.productStatus === 'VERIFIED' || l.productStatus === 'PUBLISHED' || l.productStatus === 'IN_POOL' || l.status === 'open' || l.status === 'Verified'
    );
  }, [lots]);

  const openPools = useMemo(() => {
    return pools.filter((p) => p.status === 'Open' || p.status === 'Reserved');
  }, [pools]);

  const nearbyMandis = [
    { name: 'Baramati APMC', distance: '0 km • 15 min', price: 1850 },
    { name: 'Pune Gultekdi Market Yard', distance: '84.5 km • 2 hr 36 min', price: 2150 },
    { name: 'Pandharpur APMC', distance: '95.2 km • 2 hr 54 min', price: 1950 },
    { name: 'Manchar APMC', distance: '116.2 km • 3 hr 24 min', price: 2080 },
  ];

  const totalPoolKg = pools.reduce((sum, p) => sum + (p.targetKg || 0), 0);
  const currentPoolKg = pools.reduce((sum, p) => sum + (p.currentKg || 0), 0);
  const poolFillPct = totalPoolKg > 0 ? Math.round((currentPoolKg / totalPoolKg) * 100) : 80;

  const TABS = [
    { id: 'overview', label: isMr ? 'आढावा' : isHi ? 'अवलोकन' : 'Overview' },
    { id: 'lots', label: isMr ? 'लॉट्स' : isHi ? 'लॉट्स' : 'Lots' },
    { id: 'pools', label: isMr ? 'पूल्स' : isHi ? 'पूल्स' : 'Pools' },
    { id: 'logistics', label: isMr ? 'लॉजिस्टिक्स' : isHi ? 'लॉजिस्टिक्स' : 'Logistics' },
  ];

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Header matching Screenshot 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              Baramati Krushi Producer Company Ltd.
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              <span>🛡️</span>
              <span>{isMr ? 'नोंदणीकृत एफपीओ' : isHi ? 'पंजीकृत एफपीओ' : 'Registered FPO'}</span>
            </span>
          </div>
          <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1">
            Baramati, Pune • Vikas Kadam
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/fpo/verify"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
          >
            <span>⚠️</span>
            <span>{pendingLots.length > 0 ? `${pendingLots.length} ${t('fpo_lots_pending_btn', 'Lots Pending')}` : `13 ${t('fpo_lots_pending_btn', 'Lots Pending')}`}</span>
          </Link>
          <Link
            to="/fpo/verify"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-600/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer"
          >
            <span>☑️</span>
            <span>{t('fpo_verify_lots_btn', 'Verify Lots')}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row matching Screenshot 4 */}
      <div ref={kpiRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              {t('fpo_kpi_pending', 'PENDING')}
            </span>
            <span className="text-amber-600">⚠️</span>
          </div>
          <div className="text-3xl font-black text-amber-900 dark:text-amber-200">
            {pendingLots.length || 13}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
            {t('fpo_kpi_pending_sub', 'Lots awaiting verification')}
          </p>
        </div>

        {/* Verified Card */}
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              {t('fpo_kpi_verified', 'VERIFIED')}
            </span>
            <span className="text-emerald-600">🛡️</span>
          </div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-200">
            {verifiedLots.length || 4}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            {t('fpo_kpi_verified_sub', 'Ready or Pooled')}
          </p>
        </div>

        {/* Active Pools Card */}
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              {t('fpo_kpi_active_pools', 'ACTIVE POOLS')}
            </span>
            <span className="text-blue-600">📦</span>
          </div>
          <div className="text-3xl font-black text-blue-900 dark:text-blue-200">
            {openPools.length || 10}
          </div>
          <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
            {poolFillPct}% {t('fpo_kpi_active_pools_sub', 'filled on avg')}
          </p>
        </div>

        {/* Settled Card */}
        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/20 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
              {t('fpo_kpi_settled', 'SETTLED')}
            </span>
            <span className="text-purple-600">₹</span>
          </div>
          <div className="text-3xl font-black text-purple-900 dark:text-purple-200">
            ₹9K
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
            {t('fpo_kpi_settled_sub', 'Total escrow released')}
          </p>
        </div>
      </div>

      {/* Tabs Pill Selector */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#132215] rounded-xl border border-stone-200 dark:border-emerald-900/40 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#1c331f] text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200 dark:border-emerald-800/60'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW matching Screenshot 4 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Satellite Map (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30 mb-3">
                <div>
                  <h2 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span>🧭</span>
                    <span>{t('fpo_hub_map_title', 'FPO Hub & Nearby Mandi Map')}</span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {t('fpo_hub_map_sub', 'Baramati, Pune — Live APMC satellite grid')}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  4 APMCs
                </span>
              </div>

              {/* Live Interactive Agriculture Map */}
              <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-emerald-900/40">
                <FarmMandiMap />
              </div>
            </div>
          </div>

          {/* Right side panels: Lots Awaiting Verification + Active Freight Pools + Nearest Mandis (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Lots Awaiting Verification Card */}
            <div className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-emerald-900/30">
                <h3 className="text-xs font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  {t('fpo_lots_awaiting_title', 'Lots Awaiting Verification')}
                </h3>
                <Link
                  to="/fpo/verify"
                  className="text-[11px] font-extrabold text-[#255919] dark:text-[#D1BF4B] hover:underline flex items-center gap-1"
                >
                  <span>{t('fpo_view_all', 'View All')}</span>
                  <span>→</span>
                </Link>
              </div>

              <div className="space-y-2">
                {(pendingLots.length > 0 ? pendingLots.slice(0, 4) : lots.slice(0, 4)).map((lot, idx) => (
                  <div
                    key={lot.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200/80 dark:border-emerald-900/40 bg-stone-50/70 dark:bg-[#182b1c] text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-stone-900 dark:text-stone-100">
                        {lot.farmerName || lot.farmer_name || 'Ramesh Patil'}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {lot.crop} • {lot.quantityKg || lot.quantity_kg || 500} kg • {lot.grade || lot.quality_grade || 'Grade A'}
                      </div>
                    </div>

                    <Link
                      to="/fpo/verify"
                      className="px-3 py-1 rounded-lg border border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 font-bold text-[11px] hover:bg-amber-100 transition cursor-pointer"
                    >
                      {t('fpo_review_btn', 'Review')}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Freight Pools Card */}
            <div className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 p-4 shadow-xs space-y-3">
              <div className="pb-2 border-b border-stone-100 dark:border-emerald-900/30">
                <h3 className="text-xs font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  {t('fpo_active_pools_title', 'Active Freight Pools')}
                </h3>
              </div>

              <div className="space-y-3">
                {pools.slice(0, 3).map((pool, idx) => {
                  const fillPct = Math.min(100, Math.round((pool.currentKg / pool.targetKg) * 100));
                  return (
                    <div key={pool.id || idx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {pool.crop} — {pool.variety}
                        </span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          fillPct >= 90
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                        }`}>
                          {fillPct}% {t('fpo_filled_pct', 'Filled')}
                        </span>
                      </div>

                      <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-emerald-600 dark:bg-[#D1BF4B] transition-all"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400">
                        <span>{pool.collectionHub}</span>
                        <span>→ {pool.destinationMandi}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nearest APMC Mandis Card */}
            <div className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 p-4 shadow-xs space-y-3">
              <div className="pb-2 border-b border-stone-100 dark:border-emerald-900/30">
                <h3 className="text-xs font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  {t('fpo_nearest_mandis_title', 'Nearest APMC Mandis')}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {nearbyMandis.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-emerald-900/20 last:border-0">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">{m.name}</div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400">{m.distance}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-[#255919] dark:text-[#D1BF4B]">₹{m.price}</div>
                      <div className="text-[9px] text-stone-400">/qtl</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALL LOTS */}
      {activeTab === 'lots' && (
        <div className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
                {t('fpo_all_produce_lots', 'All Farmer Produce Lots')}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {t('fpo_all_produce_lots_sub', 'Review, verify physical weigh-slips, or allocate lots into active freight pools.')}
              </p>
            </div>
            <Link
              to="/fpo/verify"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
            >
              {t('fpo_weigh_slip_queue_btn', 'Physical Weigh-Slip Queue →')}
            </Link>
          </div>

          <div className="space-y-2">
            {lots.map((lot, idx) => {
              const isVerified = lot.productStatus === 'VERIFIED' || lot.productStatus === 'PUBLISHED';
              const isAwaiting = lot.productStatus === 'AWAITING_FPO_VERIFICATION' || lot.status === 'submitted';
              return (
                <div
                  key={lot.id || idx}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 dark:border-emerald-900/40 bg-stone-50/70 dark:bg-[#182b1c] text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isVerified ? '✓' : '⏳'}
                    </div>
                    <div>
                      <div className="font-black text-stone-900 dark:text-stone-100">
                        {lot.farmerName || lot.farmer_name || 'Ramesh Patil'} — {lot.crop}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {lot.variety} • {lot.quantityKg || lot.quantity_kg} kg • {lot.grade || lot.quality_grade || 'Grade A'} • #{lot.id || lot._id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isVerified
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {isVerified ? (isMr ? 'सत्यापित' : isHi ? 'सत्यापित' : 'Verified') : t('fpo_awaiting_inspection', 'Awaiting Inspection')}
                    </span>
                    {isAwaiting && (
                      <Link
                        to="/fpo/verify"
                        className="px-2.5 py-1 rounded-lg border border-amber-400 text-amber-800 bg-amber-50 font-bold text-[11px]"
                      >
                        {t('fpo_inspect_btn', 'Inspect')}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: POOLS */}
      {activeTab === 'pools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
              {t('fpo_active_regional_pools', 'Active Regional Freight Pools')}
            </h2>
            <Link
              to="/fpo/pools"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
            >
              {t('fpo_create_manage_pools', '+ Create / Manage Pools')}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pools.map((pool) => {
              const fillPct = Math.min(100, Math.round((pool.currentKg / pool.targetKg) * 100));
              return (
                <div
                  key={pool.id}
                  className="bg-white dark:bg-[#132215] p-5 rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">
                        {pool.id}
                      </span>
                      <h3 className="text-base font-black text-stone-900 dark:text-stone-100 mt-0.5">
                        {pool.crop} — {pool.variety}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {pool.collectionHub} → {pool.destinationMandi}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      {pool.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-300">
                      <span>{pool.currentKg} / {pool.targetKg} kg</span>
                      <span className="text-emerald-700 dark:text-[#D1BF4B] font-bold">
                        ₹{pool.pricePerQtl}/qtl
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-emerald-600"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-between text-xs text-stone-500">
                    <span>{pool.sharedFreightSavingsPct}% {t('fpo_shared_freight_saved', 'Shared Freight Saved')}</span>
                    <Link to="/fpo/pools" className="text-emerald-700 dark:text-[#D1BF4B] font-bold hover:underline">
                      {t('fpo_manage_btn', 'Manage →')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: LOGISTICS */}
      {activeTab === 'logistics' && (
        <div className="space-y-6">
          {/* CVRPTW Solver Overview Card */}
          <div className="bg-white dark:bg-[#132215] p-5 rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30 gap-3">
              <div>
                <h2 className="text-base font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>🧭</span>
                  <span>{t('fpo_logistics_schedule_title', 'Logistics & Transport Schedule')} ({INITIAL_LOGISTICS_ROUTE.routeId})</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {t('fpo_logistics_schedule_sub', 'Multi-stop pickup routes and consignment weighbridge dispatches.')}
                </p>
              </div>
              <Link
                to="/fpo/logistics"
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs w-fit"
              >
                {t('fpo_route_optimizer_btn', 'Open Dedicated Route Optimizer →')}
              </Link>
            </div>

            {/* 4 Telemetry Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
                <span className="text-stone-400 text-[10px] uppercase font-bold block">{t('fpo_assigned_fleet', 'Assigned Transport Fleet')}</span>
                <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block truncate">
                  MahaKisan Logistics
                </strong>
                <span className="text-[11px] text-stone-500 font-mono">MH-12-RN-5821</span>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
                <span className="text-stone-400 text-[10px] uppercase font-bold block">{t('fpo_current_loop', 'Current Multi-Stop Loop')}</span>
                <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block">
                  {INITIAL_LOGISTICS_ROUTE.totalDistanceKm} km Loop
                </strong>
                <span className="text-[11px] text-emerald-700 dark:text-[#D1BF4B] font-bold">
                  {INITIAL_LOGISTICS_ROUTE.loadUtilizationPct}% {t('fpo_full_utilization', 'Full Utilization')}
                </span>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
                <span className="text-stone-400 text-[10px] uppercase font-bold block">{t('fpo_est_route_cost', 'Estimated Route Cost')}</span>
                <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block">
                  ₹{INITIAL_LOGISTICS_ROUTE.estCostInr}
                </strong>
                <span className="text-[11px] text-stone-500 truncate block">{INITIAL_LOGISTICS_ROUTE.driver}</span>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
                <span className="text-stone-400 text-[10px] uppercase font-bold block">{t('fpo_collective_fuel_savings', 'Collective Fuel Savings')}</span>
                <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block">
                  ₹520 {isMr ? 'बचत' : isHi ? 'बचत' : 'Saved'}
                </strong>
                <span className="text-[11px] text-emerald-700 dark:text-[#D1BF4B] font-bold">28.5% {t('fpo_cost_reduction', 'Cost Reduction')}</span>
              </div>
            </div>

            {/* Scheduled Pickup Timeline & Geolocation Stops */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                {t('fpo_scheduled_stops_title', 'SCHEDULED PICKUP TIMELINE & GEOLOCATION STOPS')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {INITIAL_LOGISTICS_ROUTE.stops.map((stop, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-xl p-3 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300 text-xs">
                        {t('fpo_stop_label', 'Stop')} #{stop.stopNumber}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono font-bold">{stop.window}</span>
                    </div>
                    <div className="font-bold text-stone-900 dark:text-stone-100 text-xs truncate">
                      {stop.locationName}
                    </div>
                    <div className="pt-1.5 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-between text-[11px] text-stone-500">
                      <span className="font-mono text-[10px]">({stop.lat}, {stop.lng})</span>
                      <strong className="text-stone-900 dark:text-stone-100 font-black">
                        {stop.pickupKg > 0 ? `+${stop.pickupKg} kg` : (isMr ? 'हब अनलोड' : isHi ? 'हब अनलोड' : 'Hub Unload')}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Freight Consignments & Dispatch Pipeline */}
          <div className="bg-white dark:bg-[#132215] p-5 rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  {isMr ? 'वाहतूक डिस्पॅच पाइपलाइन' : isHi ? 'परिवहन प्रेषण पाइपलाइन' : 'Transport Dispatch Pipeline & Consignments'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {isMr ? 'थेट वजन पावती निर्मिती व खरेदीदार गंतव्य ट्रॅकिंग.' : isHi ? 'डिजिटल वजन पर्ची निर्माण एवं खरीदार गंतव्य ट्रैकिंग।' : 'Generate digital weigh-slips & track consignments to buyer destinations.'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {pools.length} {isMr ? 'कन्साइनमेंट' : isHi ? 'कंसाइनमेंट' : 'Consignments'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pools.slice(0, 4).map((pool) => {
                const isDispatched = pool.status === 'Dispatched';
                return (
                  <div
                    key={pool.id}
                    className="p-4 rounded-xl border border-stone-200 dark:border-emerald-900/40 bg-stone-50/50 dark:bg-[#182b1c]/40 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">{pool.id}</span>
                          <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                            {pool.crop} — {pool.variety}
                          </h4>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {pool.collectionHub} → {pool.destinationMandi}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                          isDispatched
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}>
                          {isDispatched && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                          <span>{isDispatched ? t('fpo_dispatched_badge', 'In Transit') : pool.status}</span>
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-stone-200/70 dark:border-emerald-900/30 flex items-center justify-between text-xs">
                        <span className="text-stone-600 dark:text-stone-300">
                          {isMr ? 'वजन' : isHi ? 'वजन' : 'Weight'}: <strong>{pool.currentKg} kg</strong>
                        </span>
                        <span className="text-emerald-700 dark:text-[#D1BF4B] font-bold">
                          ₹{pool.pricePerQtl}/qtl
                        </span>
                      </div>

                      <div className="mt-1 text-[11px] text-stone-500 flex items-center gap-1.5">
                        <span>🚚</span>
                        <span>{pool.transporter?.name || 'MahaKisan Logistics'} ({pool.transporter?.vehicleNumber || 'MH-12-RN-5821'})</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          dispatchFPOPool(pool.id, {
                            name: 'MahaKisan Logistics',
                            vehicleNumber: 'MH-12-RN-5821',
                            contact: '+91 98220 12345',
                          });
                          fetchFPOData();
                        }}
                        disabled={isDispatched}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isDispatched
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-not-allowed'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                        }`}
                      >
                        <span>{isDispatched ? '🚚' : '🚀'}</span>
                        <span>
                          {isDispatched
                            ? (isMr ? 'वाहतूक सुरू (मार्गक्रमण)' : isHi ? 'परिवहन जारी (मार्गस्थ)' : 'Consignment In Transit')
                            : (isMr ? 'कन्साइनमेंट पाठवा (Dispatch)' : isHi ? 'कंसाइनमेंट भेजें (Dispatch)' : 'Dispatch Consignment')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FPO VALUE CHAIN PROGRESS BAR matching Screenshot 4 */}
      <div className="bg-emerald-50/80 dark:bg-[#142617] rounded-2xl p-4 sm:p-5 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
        <h3 className="font-black text-emerald-950 dark:text-emerald-300 text-xs uppercase tracking-wider mb-3">
          {t('fpo_value_chain_title', 'FPO VALUE CHAIN: FARMER → MARKET → PAYMENT')}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <span className="px-3 py-1 rounded-full bg-emerald-700 text-white shadow-xs">
            {t('fpo_step_lot_collection', 'Lot Collection')}
          </span>
          <span className="text-emerald-500">→</span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1c331f] text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
            {t('fpo_step_ai_verification', 'AI Quality Verification')}
          </span>
          <span className="text-emerald-500">→</span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1c331f] text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
            {t('fpo_step_pool_aggregation', 'Pool Aggregation')}
          </span>
          <span className="text-emerald-500">→</span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1c331f] text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
            {t('fpo_step_apmc_buyer', 'APMC / Buyer')}
          </span>
          <span className="text-emerald-500">→</span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1c331f] text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
            {t('fpo_step_escrow_settlement', 'Escrow Settlement')}
          </span>
        </div>
      </div>
    </div>
  );
}
