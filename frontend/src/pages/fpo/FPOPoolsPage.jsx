import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getStoredPools, saveStoredPools } from '../../api/fpoData';

export default function FPOPoolsPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [pools, setPools] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const containerRef = useRef(null);
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    crop: 'Tomato',
    variety: 'Abhinav (Hybrid)',
    targetKg: '1200',
    pricePerQtl: '2150',
    destinationMandi: 'Pune Market Yard',
    collectionHub: 'Baramati APMC Hub',
    cutoffHours: '8',
  });

  const loadPools = () => {
    setPools(getStoredPools());
  };

  useEffect(() => {
    loadPools();
    const handleUpdate = () => loadPools();
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

  useEffect(() => {
    if (isCreateOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isCreateOpen]);

  const handleCreatePool = (e) => {
    e.preventDefault();
    const targetKg = parseInt(formData.targetKg, 10) || 1000;
    const pricePerQtl = parseInt(formData.pricePerQtl, 10) || 2100;
    const hours = parseInt(formData.cutoffHours, 10) || 8;

    const newPool = {
      id: `POOL-${formData.crop.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      crop: formData.crop,
      variety: formData.variety,
      targetKg,
      currentKg: 0,
      pricePerQtl,
      status: 'Open',
      collectionHub: formData.collectionHub,
      destinationMandi: formData.destinationMandi,
      sharedFreightSavingsPct: 32.5,
      allowedGrades: ['Grade A', 'Grade B'],
      closesAt: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      transporter: {
        name: 'MahaKisan Logistics',
        vehicleNumber: 'MH-12-RN-5821',
        contact: '+91 98220 12345',
      },
      contributions: [],
    };

    const currentList = getStoredPools();
    currentList.unshift(newPool);
    saveStoredPools(currentList);
    setIsCreateOpen(false);
    setNotification({
      type: 'success',
      text: `New FPO Batch Pool #${newPool.id} launched for ${newPool.targetKg} kg ${newPool.crop} to ${newPool.destinationMandi}!`,
    });
    loadPools();
  };

  const handleLockPool = (poolId) => {
    const currentList = getStoredPools();
    const pool = currentList.find((p) => p.id === poolId);
    if (pool) {
      pool.status = 'Reserved';
      saveStoredPools(currentList);
      setNotification({
        type: 'success',
        text: `Pool #${poolId} locked and marked ready for transport dispatch!`,
      });
      loadPools();
    }
  };

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg bg-emerald-700 text-white border border-emerald-800 transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
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

      {/* Header matching Screenshot 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            FPO Pool Management
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1">
            Consolidate verified farmer lots into bulk commercial dispatches to reduce freight and access wholesale buyer pricing.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <span>+</span>
          <span>Create New Batch Pool</span>
        </button>
      </div>

      {/* Pool Cards Grid matching Screenshot 3 */}
      <div className="space-y-5">
        {pools.map((pool) => {
          const fillPct = Math.min(100, Math.round((pool.currentKg / pool.targetKg) * 100));
          const cutoffTime = new Date(pool.closesAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={pool.id}
              className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs overflow-hidden"
            >
              {/* Top Accent Progress Bar */}
              <div className="h-2 w-full bg-stone-100 dark:bg-stone-800">
                <div
                  className={`h-full transition-all ${
                    fillPct >= 90 ? 'bg-emerald-600' : fillPct >= 50 ? 'bg-green-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Pool Meta & Route */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-extrabold text-stone-500 bg-stone-100 dark:bg-[#1c331f] dark:text-stone-300 px-2 py-0.5 rounded">
                        {pool.id}
                      </span>
                      <span className="px-2 py-0.5 rounded border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-200 text-xs font-bold">
                        {pool.crop} — {pool.variety}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {pool.status}
                      </span>
                      {pool.buyerName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                          Reserved by: {pool.buyerName}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <span className="text-emerald-700 dark:text-[#D1BF4B]">📍</span>
                        <span>{pool.collectionHub} → {pool.destinationMandi}</span>
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Transporter: <strong>{pool.transporter?.name || 'MahaKisan Logistics'}</strong> ({pool.transporter?.vehicleNumber || 'MH-12-RN-5821'})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 dark:text-stone-400 pt-1">
                      <span className="px-2 py-0.5 rounded-md font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        📉 {pool.sharedFreightSavingsPct}% Shared Freight Savings
                      </span>
                      <span>👥 {(pool.contributions || []).length || 1} Farmer Lots Included</span>
                      <span>⏰ Cutoff: {cutoffTime}</span>
                    </div>
                  </div>

                  {/* Right Column: Capacity, Target Price & Actions */}
                  <div className="lg:text-right flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-stone-100 dark:border-emerald-900/30 pt-3 lg:pt-0 lg:pl-6 shrink-0 min-w-[220px]">
                    <div>
                      <span className="text-[11px] text-stone-400 font-semibold block">Capacity Utilization</span>
                      <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
                        {pool.currentKg} <span className="text-sm font-normal text-stone-400">/ {pool.targetKg} kg</span>
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        Target Price: <strong className="text-emerald-700 dark:text-[#D1BF4B] text-sm font-black">₹{pool.pricePerQtl}/qtl</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Link
                        to="/fpo/logistics"
                        className="w-full py-1.5 px-3 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-200 font-bold text-xs hover:bg-stone-50 dark:hover:bg-emerald-950/30 text-center transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>🚚</span>
                        <span>Optimize Route</span>
                      </Link>
                      {pool.status === 'Open' && (
                        <button
                          onClick={() => handleLockPool(pool.id)}
                          className="py-1.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-xs transition cursor-pointer shrink-0"
                        >
                          Lock Pool
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Farmer Contributions in this Pool matching Screenshot 3 */}
                {pool.contributions && pool.contributions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-emerald-900/30">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-2">
                      FARMER CONTRIBUTIONS IN THIS POOL
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                      {pool.contributions.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl border border-stone-200/80 dark:border-emerald-900/40 bg-stone-50/70 dark:bg-[#182b1c] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-extrabold text-stone-900 dark:text-stone-100">{c.farmerName}</span>
                            <div className="text-[10px] text-stone-400 mt-0.5">{c.lotId} • {c.grade}</div>
                          </div>
                          <strong className="text-emerald-700 dark:text-[#D1BF4B] font-black text-xs">
                            {c.quantityKg} kg
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for + Create New Batch Pool */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="w-full max-w-lg bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/50 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  Launch New FPO Batch Pool
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Set capacity target, destination mandi, asking price, and collection cutoff.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePool} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">Crop</label>
                  <select
                    value={formData.crop}
                    onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                  >
                    <option value="Tomato">Tomato</option>
                    <option value="Onion">Onion</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Soyabean">Soyabean</option>
                    <option value="Grapes">Grapes</option>
                    <option value="Pomegranate">Pomegranate</option>
                    <option value="Turmeric">Turmeric</option>
                    <option value="Banana">Banana</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">Target Variety</label>
                  <input
                    type="text"
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                    placeholder="e.g. Abhinav (Hybrid)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">Target Capacity (kg)</label>
                  <input
                    type="number"
                    value={formData.targetKg}
                    onChange={(e) => setFormData({ ...formData, targetKg: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">Asking Price (₹/quintal)</label>
                  <input
                    type="number"
                    value={formData.pricePerQtl}
                    onChange={(e) => setFormData({ ...formData, pricePerQtl: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">Destination Market</label>
                  <input
                    type="text"
                    value={formData.destinationMandi}
                    onChange={(e) => setFormData({ ...formData, destinationMandi: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">Closing Cutoff (Hours)</label>
                  <input
                    type="number"
                    value={formData.cutoffHours}
                    onChange={(e) => setFormData({ ...formData, cutoffHours: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-[#255919]"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md transition cursor-pointer"
                >
                  Launch Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
