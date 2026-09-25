import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getStoredPools, dispatchFPOPool, INITIAL_LOGISTICS_ROUTE } from '../../api/fpoData';

export default function FPOLogisticsPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const [pools, setPools] = useState([]);
  const [notification, setNotification] = useState(null);
  const containerRef = useRef(null);

  const routePlan = INITIAL_LOGISTICS_ROUTE;

  const loadData = () => {
    setPools(getStoredPools());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('krishisetu_fpo_pools_updated', handleUpdate);
    return () => window.removeEventListener('krishisetu_fpo_pools_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, []);

  const handleDispatch = (poolId) => {
    const updated = dispatchFPOPool(poolId, {
      name: 'MahaKisan Logistics',
      vehicleNumber: 'MH-12-RN-5821',
      contact: '+91 98220 12345',
    });
    if (updated) {
      setNotification({
        type: 'success',
        text: `Consignment for Pool #${poolId} dispatched! In transit to buyer destination with certified weighbridge slip generated.`,
      });
      loadData();
    }
  };

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg bg-emerald-700 text-white border border-emerald-800 transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>🚚</span>
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-white hover:opacity-75 font-black text-sm ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {t('fpo_logistics_page_title', 'Logistics & Route Optimization')}
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1">
            {t('fpo_logistics_page_sub', 'Google OR-Tools CVRPTW solver generates optimal farmer pickup sequences and bulk transport dispatches.')}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 w-fit shrink-0">
          <span>📉</span>
          <span>{t('fpo_cost_reduction_badge', '28.5% Freight Cost Reduction vs Solo Vehicles')}</span>
        </span>
      </div>

      {/* CVRPTW Route Solver Card */}
      <div className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 dark:border-emerald-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50 dark:bg-[#182b1c]/40">
          <div>
            <h2 className="text-base font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>🧭</span>
              <span>{t('fpo_optimized_sequence', 'Optimized Multi-Stop Pickup Sequence')} ({routePlan.routeId})</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {t('fpo_cvrptw_algo_sub', 'Algorithm: Capacitated Vehicle Routing Problem with Time Windows (CVRPTW)')}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg font-bold text-stone-700 dark:text-stone-200">
              {t('fpo_vehicle_label', 'Vehicle')}: <strong>{routePlan.vehicle.split(' ')[0]}</strong>
            </span>
            <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold px-2.5 py-1 rounded-lg">
              {routePlan.loadUtilizationPct}% {t('fpo_full_utilization', 'Full')}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* 4 Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-stone-50 dark:bg-[#182b1c] p-3 rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">
                {t('fpo_total_loop_dist', 'Total Loop Distance')}
              </span>
              <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block">{routePlan.totalDistanceKm} km</strong>
            </div>
            <div className="bg-stone-50 dark:bg-[#182b1c] p-3 rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">
                {t('fpo_driver_assigned', 'Driver Assigned')}
              </span>
              <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block truncate">{routePlan.driver}</strong>
            </div>
            <div className="bg-stone-50 dark:bg-[#182b1c] p-3 rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">
                {t('fpo_est_route_cost', 'Estimated Route Cost')}
              </span>
              <strong className="text-emerald-700 dark:text-[#D1BF4B] text-sm mt-0.5 block">₹{routePlan.estCostInr}</strong>
            </div>
            <div className="bg-stone-50 dark:bg-[#182b1c] p-3 rounded-xl border border-stone-200 dark:border-emerald-900/40">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">
                {t('fpo_farmer_savings', 'Collective Farmer Savings')}
              </span>
              <strong className="text-emerald-700 dark:text-[#D1BF4B] text-sm mt-0.5 block">
                ₹520 {isMr ? 'इंधनावर बचत' : isHi ? 'ईंधन पर बचत' : 'saved on fuel'}
              </strong>
            </div>
          </div>

          {/* Timeline Geolocation Stops */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
              {t('fpo_scheduled_stops_title', 'SCHEDULED PICKUP TIMELINE & GEOLOCATION STOPS')}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {routePlan.stops.map((stop, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-xl p-3.5 text-xs space-y-1.5 shadow-2xs"
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

                  <div className="pt-2 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-between text-[11px] text-stone-500">
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
      </div>

      {/* Consignments Awaiting Dispatch Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">
          {isMr ? 'प्रेषणासाठी प्रतीक्षेत कन्साइनमेंट' : isHi ? 'प्रेषण प्रतीक्षारत कंसाइनमेंट' : 'Consignments Awaiting Dispatch'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pools.slice(0, 4).map((pool) => {
            const isDispatched = pool.status === 'Dispatched';

            return (
              <div
                key={pool.id}
                className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                        {pool.crop} Pool ({pool.id})
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {pool.variety} • {isMr ? 'एकूण वजन' : isHi ? 'कुल वजन' : 'Total Weight'}: <strong>{pool.currentKg} kg</strong>
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isDispatched
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {isDispatched ? t('fpo_dispatched_badge', 'In Transit') : pool.status}
                    </span>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3 rounded-xl border border-stone-200 dark:border-emerald-900/40 flex items-center gap-3 text-xs">
                    <span className="text-xl">🚚</span>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100">
                        {isMr ? 'वाहतूकदार' : isHi ? 'ट्रांसपोर्टर' : 'Transporter'}: {pool.transporter?.name || 'MahaKisan Logistics'}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {pool.transporter?.vehicleNumber || 'MH-12-RN-5821'} • {isMr ? 'संपर्क' : isHi ? 'संपर्क' : 'Contact'}: {pool.transporter?.contact || '+91 98220 12345'}
                      </p>
                    </div>
                  </div>

                  <div className="border-l-2 border-emerald-600 pl-3 ml-1 text-xs space-y-2">
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">
                        {isMr ? 'संकलन केंद्र (FPO Hub)' : isHi ? 'संग्रह केंद्र (FPO Hub)' : 'Consolidation Hub'}
                      </span>
                      <strong className="text-stone-800 dark:text-stone-200">{pool.collectionHub}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">
                        {isMr ? 'गंतव्य वितरण ठिकाण' : isHi ? 'गंतव्य वितरण स्थल' : 'Destination Delivery Point'}
                      </span>
                      <strong className="text-stone-800 dark:text-stone-200">{pool.destinationMandi}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-stone-50/70 dark:bg-[#182b1c]/70 border-t border-stone-100 dark:border-emerald-900/30">
                  <button
                    onClick={() => handleDispatch(pool.id)}
                    disabled={isDispatched}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                      isDispatched
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 cursor-not-allowed'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md'
                    }`}
                  >
                    <span>{isDispatched ? '✓' : '🚀'}</span>
                    <span>
                      {isDispatched
                        ? (isMr ? 'खरेदीदाराकडे मार्गस्थ' : isHi ? 'खरीदार गंतव्य की ओर अग्रसर' : 'In Transit to Buyer Destination')
                        : (isMr ? 'प्रेषण पडताळणी नोंदवा व वजन पावती तयार करा' : isHi ? 'प्रेषण सत्यापन दर्ज करें व वजन पर्ची बनाएं' : 'Mark Dispatch Verified & Generate Weigh-Slip')}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
