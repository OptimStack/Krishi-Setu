import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import mockService from '../../api/mockService';
import { getStoredPools, INITIAL_VERIFIED_BUYERS } from '../../api/fpoData';
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
            <span>{pendingLots.length > 0 ? `${pendingLots.length} Lots Pending` : '13 Lots Pending'}</span>
          </Link>
          <Link
            to="/fpo/verify"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-600/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer"
          >
            <span>☑️</span>
            <span>{isMr ? 'पडताळणी केंद्र' : isHi ? 'सत्यापन केंद्र' : 'Verify Lots'}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row matching Screenshot 4 */}
      <div ref={kpiRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              {isMr ? 'प्रलंबित' : isHi ? 'लंबित' : 'PENDING'}
            </span>
            <span className="text-amber-600">⚠️</span>
          </div>
          <div className="text-3xl font-black text-amber-900 dark:text-amber-200">
            {pendingLots.length || 13}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
            {isMr ? 'लॉट पडताळणी बाकी' : isHi ? 'सत्यापन बाकी' : 'Lots awaiting verification'}
          </p>
        </div>

        {/* Verified Card */}
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              {isMr ? 'सत्यापित' : isHi ? 'सत्यापित' : 'VERIFIED'}
            </span>
            <span className="text-emerald-600">🛡️</span>
          </div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-200">
            {verifiedLots.length || 4}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            {isMr ? 'तयार / पूलमध्ये' : isHi ? 'तैयार / पूल में' : 'Ready or Pooled'}
          </p>
        </div>

        {/* Active Pools Card */}
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              {isMr ? 'सक्रिय पूल' : isHi ? 'सक्रिय पूल' : 'ACTIVE POOLS'}
            </span>
            <span className="text-blue-600">📦</span>
          </div>
          <div className="text-3xl font-black text-blue-900 dark:text-blue-200">
            {openPools.length || 10}
          </div>
          <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
            {poolFillPct}% {isMr ? 'सरासरी भरलेले' : isHi ? 'औसत भरा हुआ' : '80% filled on avg'}
          </p>
        </div>

        {/* Settled Card */}
        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/20 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
              {isMr ? 'सेटलमेंट' : isHi ? 'सेटलमेंट' : 'SETTLED'}
            </span>
            <span className="text-purple-600">₹</span>
          </div>
          <div className="text-3xl font-black text-purple-900 dark:text-purple-200">
            ₹9K
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
            {isMr ? 'एकूण एस्क्रो मुक्त' : isHi ? 'कुल एस्क्रो विमोचित' : 'Total escrow released'}
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
                    <span>FPO Hub &amp; Nearby Mandi Map</span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Baramati, Pune — Live APMC satellite grid
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
                  Lots Awaiting Verification
                </h3>
                <Link
                  to="/fpo/verify"
                  className="text-[11px] font-extrabold text-[#255919] dark:text-[#D1BF4B] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
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
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Freight Pools Card */}
            <div className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 p-4 shadow-xs space-y-3">
              <div className="pb-2 border-b border-stone-100 dark:border-emerald-900/30">
                <h3 className="text-xs font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Active Freight Pools
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
                          {fillPct}% Filled
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
                  Nearest APMC Mandis
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
                All Farmer Produce Lots
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Review, verify physical weigh-slips, or allocate lots into active freight pools.
              </p>
            </div>
            <Link
              to="/fpo/verify"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
            >
              Physical Weigh-Slip Queue →
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
                      {isVerified ? 'Verified' : 'Awaiting Inspection'}
                    </span>
                    {isAwaiting && (
                      <Link
                        to="/fpo/verify"
                        className="px-2.5 py-1 rounded-lg border border-amber-400 text-amber-800 bg-amber-50 font-bold text-[11px]"
                      >
                        Inspect
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
              Active Regional Freight Pools
            </h2>
            <Link
              to="/fpo/pools"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
            >
              + Create / Manage Pools
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
                    <span>{pool.sharedFreightSavingsPct}% Shared Freight Saved</span>
                    <Link to="/fpo/pools" className="text-emerald-700 dark:text-[#D1BF4B] font-bold hover:underline">
                      Manage →
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
        <div className="bg-white dark:bg-[#132215] p-5 rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
                Logistics &amp; Transport Schedule
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Multi-stop pickup routes and consignment weighbridge dispatches.
              </p>
            </div>
            <Link
              to="/fpo/logistics"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
            >
              Open Route Optimizer →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] block">Assigned Transport Fleet</span>
              <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block">
                MahaKisan Logistics
              </strong>
              <span className="text-[11px] text-stone-500">MH-12-RN-5821</span>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] block">Current Multi-Stop Loop</span>
              <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block">
                142.6 km Loop
              </strong>
              <span className="text-[11px] text-emerald-700 dark:text-[#D1BF4B] font-bold">
                88% Full Utilization
              </span>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] block">Collective Fuel Savings</span>
              <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block">
                ₹520 Saved
              </strong>
              <span className="text-[11px] text-stone-500">28.5% Cost Reduction</span>
            </div>
          </div>
        </div>
      )}

      {/* FPO VALUE CHAIN PROGRESS BAR matching Screenshot 4 */}
      <div className="bg-emerald-50/80 dark:bg-[#142617] rounded-2xl p-4 sm:p-5 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
        <h3 className="font-black text-emerald-950 dark:text-emerald-300 text-xs uppercase tracking-wider mb-3">
          {isMr ? 'एफपीओ मूल्य साखळी: शेतकरी → बाजार → पेमेंट' : isHi ? 'एफपीओ मूल्य श्रृंखला: किसान → बाजार → भुगतान' : 'FPO VALUE CHAIN: FARMER → MARKET → PAYMENT'}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <span className="px-3 py-1 rounded-full bg-emerald-700 text-white shadow-xs">
            {isMr ? 'लॉट संकलन' : isHi ? 'लॉट संकलन' : 'Lot Collection'}
          </span>
          <span className="text-emerald-500">→</span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1c331f] text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
            {isMr ? 'AI गुणवत्ता पडताळणी' : isHi ? 'AI गुणवत्ता सत्यापन' : 'AI Quality Verification'}
          </span>
          <span className="text-emerald-500">→</span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1c331f] text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
            {isMr ? 'पूल एकत्रीकरण' : isHi ? 'पूल एकत्रीकरण' : 'Pool Aggregation'}
          </span>
          <span className="text-emerald-500">→</span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1c331f] text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
            {isMr ? 'APMC / खरेदीदार' : isHi ? 'APMC / खरीदार' : 'APMC / Buyer'}
          </span>
          <span className="text-emerald-500">→</span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-[#1c331f] text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
            {isMr ? 'एस्क्रो सेटलमेंट' : isHi ? 'एस्क्रो सेटलमेंट' : 'Escrow Settlement'}
          </span>
        </div>
      </div>
    </div>
  );
}
