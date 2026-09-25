import React, { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    fetchBackendRequirements();
    const handleRfqCreated = () => {
      setRfqs(getStoredRFQs());
    };
    window.addEventListener('krishisetu_buyer_rfq_created', handleRfqCreated);
    return () => window.removeEventListener('krishisetu_buyer_rfq_created', handleRfqCreated);
  }, [fetchBackendRequirements]);

  // Combined list of RFQs and Demands
  const combinedRFQs = [
    ...rfqs,
    ...backendReqs.map((req) => ({
      id: req.id ? `REQ-${req.id.slice(0, 6)}` : `RFQ-2026-${Math.floor(100 + Math.random() * 900)}`,
      crop: req.crop ? req.crop.charAt(0).toUpperCase() + req.crop.slice(1) : 'Onion',
      variety: req.variety || 'Nashik Red Garva',
      gradeRequired: req.grade_required || 'Grade A',
      quantityQuintal: Math.round((req.total_quantity_needed_kg || 5000) / 100),
      maxPricePerQtl: Math.round((req.mandi_modal_price_per_kg || 24.5) * 100),
      deliveryHub: req.target_mandi || 'Lasalgaon APMC (Nashik)',
      status: req.matched_pool_id ? 'Matched with Pool' : 'Active RFQ',
      createdAt: req.created_at ? req.created_at.split('T')[0] : '2026-09-08',
      validTill: req.delivery_deadline || '2026-09-18',
    })),
  ];

  const handleCreateRFQ = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const qtl = parseInt(formData.quantityQuintal) || 10;
      const rate = parseInt(formData.maxPricePerQtl) || 2000;

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
      setIsCreateOpen(false);
      setNotification({
        type: 'success',
        message: `Purchase Request (${created.id}) broadcasted to regional FPO clusters!`,
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
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Toast Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-700 text-white'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-white hover:opacity-75 font-black text-base ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header matching Screenshot 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            Procurement Orders &amp; RFQs
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            Publish direct purchase requirements to FPOs or track existing contracts.
          </p>
        </div>

        {/* Broadcast Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#255919] hover:bg-[#1b4313] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
        >
          <span className="text-sm">＋</span>
          <span>Broadcast New RFQ</span>
        </button>
      </div>

      {/* RFQ Cards matching Screenshot 3 */}
      <div className="space-y-4">
        {combinedRFQs.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-stone-300 dark:border-emerald-900/50 rounded-2xl bg-white dark:bg-[#132215]">
            <div className="text-3xl mb-2">📋</div>
            <p className="font-bold text-stone-700 dark:text-stone-300">
              No active procurement demands published.
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Click "+ Broadcast New RFQ" above to publish target buying volumes to farmers.
            </p>
          </div>
        ) : (
          combinedRFQs.map((rfq) => {
            const isMatched = rfq.status === 'Matched with Pool';
            const totalCommitment = rfq.quantityQuintal * rfq.maxPricePerQtl;

            return (
              <div
                key={rfq.id}
                className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-2xl shadow-xs hover:shadow-md transition p-5 sm:p-6 space-y-4"
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
                          isMatched
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
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
                      <span>Created: {rfq.createdAt}</span>
                      <span>•</span>
                      <span>Valid Till: {rfq.validTill}</span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      Target Ceiling Price
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#255919] dark:text-[#D1BF4B]">
                      ₹{rfq.maxPricePerQtl}
                      <span className="text-xs font-normal text-stone-500 dark:text-stone-400">/qtl</span>
                    </div>
                  </div>
                </div>

                {/* 3 Grid boxes matching Screenshot 3 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <span className="text-stone-500 dark:text-stone-400 block mb-1 font-medium">
                      Quality Tolerance
                    </span>
                    <strong className="text-stone-800 dark:text-stone-100 text-sm">
                      {rfq.gradeRequired}
                    </strong>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <span className="text-stone-500 dark:text-stone-400 block mb-1 font-medium">
                      Total Procurement Commitment
                    </span>
                    <strong className="text-stone-800 dark:text-stone-100 text-sm">
                      ₹{totalCommitment.toLocaleString()}
                    </strong>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <span className="text-stone-500 dark:text-stone-400 block mb-1 font-medium">
                      Delivery Destination
                    </span>
                    <strong className="text-stone-800 dark:text-stone-100 text-sm truncate block">
                      {rfq.deliveryHub}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast New RFQ Dialog matching Screenshot */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-emerald-900/30 pb-3">
              <div>
                <h3 className="font-black text-lg text-stone-900 dark:text-stone-100">
                  Broadcast Purchase Request (RFQ)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Specify required crop volume, quality tolerance, and target procurement ceiling.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRFQ} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Crop
                  </label>
                  <select
                    value={formData.crop}
                    onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-emerald-600"
                  >
                    <option value="Tomato">Tomato</option>
                    <option value="Onion">Onion</option>
                    <option value="Soyabean">Soyabean</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Pomegranate">Pomegranate</option>
                    <option value="Banana">Banana</option>
                    <option value="Turmeric">Turmeric</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Variety
                  </label>
                  <input
                    type="text"
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-emerald-600"
                    placeholder="e.g. Abhinav (Hybrid)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Required Grade
                  </label>
                  <select
                    value={formData.gradeRequired}
                    onChange={(e) => setFormData({ ...formData, gradeRequired: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-emerald-600"
                  >
                    <option value="Grade A">Grade A Only</option>
                    <option value="Grade A or B">Grade A or B</option>
                    <option value="Grade B">Grade B (Processing)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Volume (Quintals)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantityQuintal}
                    onChange={(e) => setFormData({ ...formData, quantityQuintal: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Ceiling Offer Price (₹/Quintal)
                </label>
                <input
                  type="number"
                  min="100"
                  value={formData.maxPricePerQtl}
                  onChange={(e) => setFormData({ ...formData, maxPricePerQtl: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-emerald-600"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Delivery Destination Hub
                </label>
                <input
                  type="text"
                  value={formData.deliveryHub}
                  onChange={(e) => setFormData({ ...formData, deliveryHub: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-emerald-600"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 px-4 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Broadcasting...' : 'Broadcast to FPOs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
