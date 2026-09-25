import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { mockService } from '../../api/mockService';
import { getStoredPools, INITIAL_LOGISTICS_ROUTE } from '../../api/fpoData';

export default function PoolingPage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [pools, setPools] = useState([]);
  const [userLots, setUserLots] = useState([]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [joinedSuccess, setJoinedSuccess] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load active pools & farmer lots
  useEffect(() => {
    loadData();
    const handlePoolsUpdated = () => loadData();
    window.addEventListener('krishisetu_fpo_pools_updated', handlePoolsUpdated);
    return () => window.removeEventListener('krishisetu_fpo_pools_updated', handlePoolsUpdated);
  }, [user]);

  const loadData = () => {
    try {
      const activePool = mockService.getActivePool();
      const batches = mockService.getBatches();
      const listings = mockService.getListings();

      const storedFpoPools = getStoredPools();
      let poolList = [];
      if (storedFpoPools && storedFpoPools.length > 0) {
        poolList = storedFpoPools.map((p) => ({
          id: p.id,
          name: `${p.collectionHub} → ${p.destinationMandi}`,
          crop: p.crop,
          variety: p.variety,
          allowedGrades: p.allowedGrades || ['Grade A', 'Grade B'],
          currentKg: p.currentKg,
          targetKg: p.targetKg,
          pricePerQtl: p.pricePerQtl,
          collectionHub: p.collectionHub,
          destinationMandi: p.destinationMandi,
          farmersCount: (p.contributions || []).length || 3,
          freightSavingsPct: p.sharedFreightSavingsPct || 28.5,
          closingInHours: 8,
        }));
      } else {
        poolList = [
          {
            id: activePool.id || 'batch_fpo_pune',
            name: activePool.name || 'Pune FPO Hub — Pune Gultekdi Market',
            crop: activePool.crop || 'Tomato',
            variety: activePool.variety || 'Abhinav Hybrid',
            allowedGrades: ['Grade A', 'Grade B'],
            currentKg: activePool.current_quantity_kg || 750,
            targetKg: activePool.target_quantity_kg || 1200,
            pricePerQtl: Math.round((activePool.price_per_kg || 16.55) * 100),
            collectionHub: 'Baramati Cluster Hub',
            destinationMandi: 'Pune Gultekdi Market',
            farmersCount: activePool.farmers_count || 4,
            freightSavingsPct: 28.5,
            closingInHours: 4,
          },
        ];
      }
      setPools(poolList);

      // Filter farmer lots available for pooling
      const farmerId = user?.id || 'usr_farmer_1';
      const availableLots = listings.filter(
        (l) => (l.farmer_id === farmerId || l.farmer_id === 'usr_farmer_1') && l.status === 'open'
      );
      setUserLots(availableLots);
      if (availableLots.length > 0 && !selectedLotId) {
        setSelectedLotId(availableLots[0]._id);
      }
    } catch (e) {
      console.error('Failed to load pooling data', e);
    } finally {
      setLoading(false);
    }
  };

  const selectedLot = userLots.find((l) => l._id === selectedLotId) || userLots[0];

  const handleJoinPool = (pool) => {
    if (!selectedLot) {
      alert(
        isMr
          ? 'कृपया पूलमध्ये सामील होण्यासाठी एक लॉट निवडा.'
          : isHi
          ? 'कृपया पूल में शामिल होने के लिए एक लॉट चुनें।'
          : 'Please select a produce lot to contribute to the pool.'
      );
      return;
    }

    // Add quantity to pool
    const addedKg = Math.min(selectedLot.quantity_kg || 250, pool.targetKg - pool.currentKg);
    const updatedKg = Math.min(pool.targetKg, pool.currentKg + addedKg);

    // Update in mockService
    mockService.updateActivePool({
      current_quantity_kg: updatedKg,
      farmers_count: (pool.farmersCount || 4) + 1,
    });

    setPools((prev) =>
      prev.map((p) =>
        p.id === pool.id
          ? {
              ...p,
              currentKg: updatedKg,
              farmersCount: p.farmersCount + 1,
            }
          : p
      )
    );

    setJoinedSuccess({
      poolName: pool.name,
      lotId: selectedLot._id,
      kg: addedKg,
    });

    setTimeout(() => {
      setJoinedSuccess(null);
    }, 6000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xl">🤝</span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
            {isMr ? 'एफपीओ सहकार पूलिंग' : isHi ? 'एफपीओ सामूहिक पूलिंग' : 'FPO Collective Logistics'}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
          {isMr ? 'एफपीओ सामूहिक संकलन व वाहतूक पूल' : isHi ? 'एफपीओ समूह संकलन एवं परिवहन पूल' : 'FPO Collective Aggregation & Pooling'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
          {isMr
            ? 'इतर शेतकऱ्यांशी एकत्र येऊन थेट मोठ्या बाजारपेठेत माल पाठवा आणि वाहतूक खर्चात २५% ते ३५% बचत मिळवा.'
            : isHi
            ? 'अन्य किसानों के साथ मिलकर बड़ी मंडियों में माल भेजें और ढुलाई खर्च में 25% से 35% तक बचत पाएं।'
            : 'Aggregate smallholder volumes into full-truckload (FTL) dispatches to unlock institutional prices & shared freight savings.'}
        </p>
      </div>

      {/* Lot Selection Bar */}
      {userLots.length > 0 ? (
        <div className="bg-white/95 dark:bg-[#132215]/95 p-5 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300">
          <div className="flex-1">
            <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              {isMr ? '१. तुमचा उपलब्ध लॉट निवडा:' : isHi ? '१. अपना उपलब्ध लॉट चुनें:' : '1. Select Your Produce Lot to Pool:'}
            </label>
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              className="w-full sm:w-96 text-sm font-semibold p-2.5 rounded-xl border border-stone-300 dark:border-emerald-800/60 bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-[#255919] dark:focus:ring-[#D1BF4B]"
            >
              {userLots.map((lot) => (
                <option key={lot._id} value={lot._id}>
                  {lot._id} • {lot.crop.toUpperCase()} ({lot.variety || 'Desi'}) — {lot.quantity_kg} kg [Grade {lot.quality_grade || 'A'}]
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="bg-emerald-100 dark:bg-[#162719] text-emerald-800 dark:text-emerald-300 font-bold text-xs px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
              <span>🚚</span>
              <span>
                {isMr ? 'सरासरी २८% वाहतूक बचत' : isHi ? 'औसत 28% ढुलाई बचत' : 'Up to 32% Freight Savings'}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-stone-50/70 dark:bg-[#162719] p-6 rounded-2xl border border-dashed border-stone-300 dark:border-emerald-800/60 text-center">
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
            {isMr
              ? 'सध्या तुमच्याकडे पूलिंगसाठी कोणताही लॉट शिल्लक नाही. नवीन पीक नोंदवण्यासाठी "Start Selling" वर जा.'
              : isHi
              ? 'वर्तमान में आपके पास पूलिंग के लिए कोई लॉट उपलब्ध नहीं है।'
              : 'No open produce lots found for pooling. Create a new listing via "Start Selling" first.'}
          </p>
        </div>
      )}

      {/* Success Banner */}
      {joinedSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 p-4 rounded-2xl flex items-center gap-3 shadow-md animate-in slide-in-from-top-2">
          <span className="text-2xl">✅</span>
          <div className="text-xs sm:text-sm">
            <div className="font-bold">
              {isMr ? 'पूलमध्ये यशस्वीरित्या नोंदणी झाली!' : isHi ? 'सफलतापूर्वक पूल में शामिल हुए!' : 'Successfully Joined FPO Aggregation Pool!'}
            </div>
            <div>
              {joinedSuccess.kg} kg produce allocated to <strong>{joinedSuccess.poolName}</strong>. Collection hub dispatch confirmed.
            </div>
          </div>
        </div>
      )}

      {/* Active Pools List */}
      <div className="space-y-5">
        {pools.map((pool) => {
          const progressPct = Math.min(100, Math.round((pool.currentKg / pool.targetKg) * 100));
          const isFull = progressPct >= 100;

          return (
            <div
              key={pool.id}
              className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] shadow-xs overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Progress Bar Header */}
              <div className="h-2.5 w-full bg-stone-100 dark:bg-[#182b1c]">
                <div
                  className="h-full bg-gradient-to-r from-[#D1BF4B] to-[#255919] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  {/* Left Pool Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#162719] px-2.5 py-0.5 rounded-md border border-stone-200 dark:border-emerald-900/40">
                        {pool.id}
                      </span>
                      <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-md">
                        {pool.crop} • {pool.variety}
                      </span>
                      <span className="text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-md">
                        {pool.allowedGrades.join(' / ')}
                      </span>
                      {isFull ? (
                        <span className="text-[11px] font-bold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 px-2.5 py-0.5 rounded-full">
                          {isMr ? 'पूल पूर्ण' : isHi ? 'पूल पूर्ण' : 'Pool Full (100%)'}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 px-2.5 py-0.5 rounded-full animate-pulse">
                          {isMr ? 'नोंदणी सुरू आहे' : isHi ? 'बुकिंग जारी' : 'Accepting Lots'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span className="text-emerald-600">📍</span>
                      <span>{pool.collectionHub}</span>
                      <span className="text-stone-400 font-normal">➔</span>
                      <span className="text-emerald-800 dark:text-emerald-400">{pool.destinationMandi}</span>
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 dark:text-stone-400 pt-1">
                      <span className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                        <span>👥</span>
                        <span>
                          {pool.farmersCount}{' '}
                          {isMr ? 'शेतकरी आधीच सहभागी' : isHi ? 'किसान पहले से शामिल' : 'Farmers Contributing'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <span>🚛</span>
                        <span>-{pool.freightSavingsPct}% {isMr ? 'वाहतूक खर्च बचत' : isHi ? 'ढुलाई बचत' : 'Shared Freight Discount'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right Progress & Counter */}
                  <div className="lg:text-right flex flex-col lg:items-end justify-center border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800 pt-4 lg:pt-0 lg:pl-6 min-w-[220px]">
                    <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
                      {isMr ? 'संकलन प्रगती' : isHi ? 'संग्रहण प्रगति' : 'Aggregation Fill Rate'}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 font-mono">
                      {pool.currentKg}{' '}
                      <span className="text-xs sm:text-sm font-normal text-stone-500 font-sans">
                        / {pool.targetKg} kg ({progressPct}%)
                      </span>
                    </div>
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-1.5">
                      <span>⏱️</span>
                      <span>
                        {isMr
                          ? `${pool.closingInHours} तासांत ट्रक रवाना होईल`
                          : isHi
                          ? `${pool.closingInHours} घंटे में प्रस्थान`
                          : `Closes in ${pool.closingInHours} hours`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pool Footer with Action */}
              <div className="bg-stone-50/70 dark:bg-[#162719] px-6 py-4 border-t border-stone-200 dark:border-emerald-900/40 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {isMr ? 'खरेदीदाराचा हमी भाव:' : isHi ? 'संभावित खरीद मूल्य:' : 'Target Benchmark Rate:'}
                  </span>{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400 text-sm font-extrabold">
                    ₹{pool.pricePerQtl}/qtl
                  </strong>
                </div>

                <button
                  onClick={() => handleJoinPool(pool)}
                  disabled={!selectedLot || isFull}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#255919] to-[#D1BF4B] hover:opacity-95 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>➕</span>
                  <span>
                    {isMr ? 'या पूलमध्ये जोडा' : isHi ? 'इस पूल में शामिल हों' : 'Join Pool'}{' '}
                    {selectedLot ? `(${selectedLot.quantity_kg || 250} kg)` : ''}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual Settlement Calculation Preview for Selected Lot */}
      {selectedLot && (
        <div className="bg-white/95 dark:bg-[#132215]/95 border-2 border-stone-200/90 dark:border-[#D1BF4B]/30 rounded-2xl p-6 shadow-xs border-t-4 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💰</span>
            <h4 className="font-extrabold text-stone-900 dark:text-stone-100 text-base">
              {isMr
                ? `निवडलेल्या लॉटसाठी अंदाजित नफा व बचत: ${selectedLot._id}`
                : isHi
                ? `चयनित लॉट के लिए अनुमानित शुद्ध आय: ${selectedLot._id}`
                : `Net Take-Home Estimate for Selected Lot: ${selectedLot._id}`}
            </h4>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mb-5 leading-relaxed">
            {isMr
              ? 'एफपीओ पूलमधील सामाईक ट्रकमुळे वाहतूक खर्च प्रति किलो ₹१.२५ ऐवजी फक्त ₹०.८५ पडतो:'
              : isHi
              ? 'सामूहिक एफपीओ पूलिंग के कारण ढुलाई खर्च ₹1.25/किग्रा से घटकर मात्र ₹0.85/किग्रा रह जाता है:'
              : 'Full-truckload dispatch reduces your direct logistics overhead from standard ₹1.25/kg to ₹0.85/kg:'}
          </p>

          <div className="bg-stone-50/70 dark:bg-[#162719] rounded-xl p-5 border border-stone-200 dark:border-emerald-900/60 text-xs space-y-3">
            <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
              <span>
                {isMr ? 'एकूण उत्पन्न' : isHi ? 'सकल मूल्य' : 'Gross Commercial Value'} ({selectedLot.quantity_kg} kg @ ₹20.50/kg):
              </span>
              <span className="font-bold text-stone-900 dark:text-stone-100 font-mono text-sm">
                ₹{Math.round((selectedLot.quantity_kg || 400) * 20.5).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-red-600 dark:text-red-400">
              <span className="flex items-center gap-1">
                <span>-</span>
                <span>{isMr ? 'सामाईक वाहतूक खर्च (२८.५% सूट)' : isHi ? 'सामूहिक ढुलाई कटौती' : 'Shared FTL Freight Deduction (₹0.85/kg)'}:</span>
              </span>
              <span className="font-bold font-mono">
                -₹{Math.round((selectedLot.quantity_kg || 400) * 0.85).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-red-600 dark:text-red-400">
              <span className="flex items-center gap-1">
                <span>-</span>
                <span>{isMr ? 'एफपीओ हँडलिंग व तोलाई शुल्क (१.५%)' : isHi ? 'हैंडलिंग एवं तुलाई शुल्क' : 'FPO Grading & Handling (1.5%)'}:</span>
              </span>
              <span className="font-bold font-mono">
                -₹{Math.round((selectedLot.quantity_kg || 400) * 20.5 * 0.015).toLocaleString()}
              </span>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-emerald-900/40 flex justify-between items-center">
              <span className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                {isMr ? 'थेट बँक खात्यात मिळणारी रक्कम:' : isHi ? 'बैंक खाते में शुद्ध देय:' : 'Net In-Hand Escrow Payout:'}
              </span>
              <span className="font-black text-lg text-emerald-700 dark:text-emerald-400 font-mono">
                ₹{Math.round(
                  (selectedLot.quantity_kg || 400) * 20.5 -
                    (selectedLot.quantity_kg || 400) * 0.85 -
                    (selectedLot.quantity_kg || 400) * 20.5 * 0.015
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Live CVRPTW Logistics Pickup Tracking Card */}
      <div className="bg-white/95 dark:bg-[#132215]/95 border border-stone-200/90 dark:border-emerald-900/40 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚚</span>
              <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base">
                {isMr ? 'लाईव्ह शेतकरी माल संकलन व वाहतूक मार्ग (CVRPTW)' : isHi ? 'लाइव किसान संग्रह एवं परिवहन मार्ग (CVRPTW)' : 'Live Multi-Stop Pickup Sequence & Freight Logistics'}
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {isMr
                ? 'एफपीओ नियुक्त वाहन थेट शेतकऱ्यांच्या शेताजवळून माल संकलित करते व वजन पावती देते.'
                : isHi
                ? 'एफपीओ अधिकृत वाहन किसानों से सीधे माल संग्रह करता है और डिजिटल वजन पर्ची जारी करता है।'
                : 'FPO designated vehicle collects produce directly along the optimized cluster route.'}
            </p>
          </div>
          <Link
            to="/farmer/logistics"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs w-fit transition flex items-center gap-1.5"
          >
            <span>🗺️</span>
            <span>{isMr ? 'संपूर्ण वाहतूक मार्ग व डिस्पॅच पहा' : isHi ? 'पूर्ण परिवहन मार्ग व प्रेषण देखें' : 'View Full Logistics & Dispatches'} →</span>
          </Link>
        </div>

        {/* 4 Quick Info Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">{isMr ? 'नियुक्त वाहन' : isHi ? 'अधिकृत वाहन' : 'Assigned Fleet'}</span>
            <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block truncate">MahaKisan Logistics</strong>
            <span className="text-[11px] text-stone-500 font-mono">MH-12-RN-5821</span>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">{isMr ? 'चालक व संपर्क' : isHi ? 'चालक एवं संपर्क' : 'Driver & Contact'}</span>
            <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block truncate">Vithalrao Shinde</strong>
            <span className="text-[11px] text-emerald-700 dark:text-[#D1BF4B] font-bold">+91 98223 88120</span>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">{isMr ? 'संकलन वेळ खिडकी' : isHi ? 'संग्रह समय सीमा' : 'Pickup Time Window'}</span>
            <strong className="text-stone-900 dark:text-stone-100 text-sm mt-0.5 block">06:30 - 07:15 AM</strong>
            <span className="text-[11px] text-stone-500">Stop #1: Malegaon BK</span>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-900/40">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">{isMr ? 'वाहतूक खर्च बचत' : isHi ? 'ढुलाई बचत' : 'Collective Savings'}</span>
            <strong className="text-emerald-700 dark:text-[#D1BF4B] text-sm mt-0.5 block">28.5% {isMr ? 'कमी खर्च' : isHi ? 'कम खर्च' : 'Discount'}</strong>
            <span className="text-[11px] text-stone-500">₹520 {isMr ? 'इंधन बचत' : isHi ? 'ईंधन बचत' : 'Fuel Saved'}</span>
          </div>
        </div>

        {/* 3 Stop Sequence Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {INITIAL_LOGISTICS_ROUTE.stops.map((stop, idx) => (
            <div
              key={idx}
              className="p-3 bg-stone-50/70 dark:bg-[#182b1c]/60 rounded-xl border border-stone-200 dark:border-emerald-900/40 text-xs space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                  {isMr ? 'थांबा' : isHi ? 'स्टॉप' : 'Stop'} #{stop.stopNumber}
                </span>
                <span className="text-[10px] text-stone-400 font-mono font-bold">{stop.window}</span>
              </div>
              <p className="font-bold text-stone-800 dark:text-stone-200 text-xs truncate">{stop.locationName}</p>
              <div className="pt-1 border-t border-stone-200/60 dark:border-emerald-900/30 flex justify-between text-[11px] text-stone-500">
                <span className="font-mono text-[10px]">({stop.lat}, {stop.lng})</span>
                <strong className="text-stone-800 dark:text-stone-200">
                  {stop.pickupKg > 0 ? `+${stop.pickupKg} kg` : (isMr ? 'हब अनलोड' : isHi ? 'हब अनलोड' : 'Hub Unload')}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
