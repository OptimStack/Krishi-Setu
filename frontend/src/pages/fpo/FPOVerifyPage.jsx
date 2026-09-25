import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import mockService from '../../api/mockService';
import { verifyFPOLot, rejectFPOLot } from '../../api/fpoData';

export default function FPOVerifyPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [verifyGrade, setVerifyGrade] = useState('Grade A');
  const [verifyWeight, setVerifyWeight] = useState('');
  const [fpoNotes, setFpoNotes] = useState('Physical inspection matches Breaker-to-pink visual grade criteria.');
  const [notification, setNotification] = useState(null);

  const containerRef = useRef(null);
  const modalRef = useRef(null);

  const fetchLots = () => {
    try {
      const state = mockService.loadState();
      const all = state.listings || [];
      // Filter lots waiting for physical inspection
      const pending = all.filter(
        (l) => l.productStatus === 'AWAITING_FPO_VERIFICATION' || l.status === 'submitted' || l.status === 'Submitted'
      );
      setLots(pending);
    } catch (e) {
      console.warn('Failed to fetch pending lots:', e);
    }
  };

  useEffect(() => {
    fetchLots();
    const handleUpdate = () => fetchLots();
    window.addEventListener('krishisetu_mock_state_updated', handleUpdate);
    window.addEventListener('krishisetu_lot_verified', handleUpdate);
    return () => {
      window.removeEventListener('krishisetu_mock_state_updated', handleUpdate);
      window.removeEventListener('krishisetu_lot_verified', handleUpdate);
    };
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
    if (isDialogOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isDialogOpen]);

  const handleOpenDialog = (lot) => {
    setSelectedLot(lot);
    setVerifyGrade(lot.grade || lot.quality_grade || 'Grade A');
    setVerifyWeight((lot.quantityKg || lot.quantity_kg || 500).toString());
    setFpoNotes('Physical inspection matches Breaker-to-pink visual grade criteria.');
    setIsDialogOpen(true);
  };

  const handleVerify = () => {
    if (!selectedLot) return;
    const weightNum = parseFloat(verifyWeight) || selectedLot.quantityKg || selectedLot.quantity_kg || 500;
    verifyFPOLot(selectedLot.id || selectedLot._id, verifyGrade, weightNum, fpoNotes);
    setIsDialogOpen(false);
    setNotification({
      type: 'success',
      text: `Lot #${selectedLot.id || selectedLot._id} verified at ${weightNum} kg as ${verifyGrade}. Digital weigh-slip generated & shared with regional pools!`,
    });
    fetchLots();
  };

  const handleReject = () => {
    if (!selectedLot) return;
    rejectFPOLot(selectedLot.id || selectedLot._id, 'Returned to farmer for re-sorting.');
    setIsDialogOpen(false);
    setNotification({
      type: 'info',
      text: `Lot #${selectedLot.id || selectedLot._id} returned to farmer draft for re-sorting.`,
    });
    fetchLots();
  };

  return (
    <div ref={containerRef} className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in border ${
          notification.type === 'info'
            ? 'bg-blue-600 text-white border-blue-700'
            : 'bg-emerald-700 text-white border-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <span>{notification.type === 'info' ? 'ℹ️' : '✅'}</span>
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

      {/* Header matching Screenshot 2 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
          {t('fpo_verify_page_title', 'Physical Lot Verification & Weigh-Slip')}
        </h1>
        <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1">
          {t('fpo_verify_page_sub', 'Review farmer-submitted AI estimates, enter certified weigh-bridge readings, and authorize pooling eligibility.')}
        </p>
      </div>

      {/* Table Card matching Screenshot 2 */}
      <div className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-emerald-900/30">
          <h2 className="text-sm font-black text-stone-900 dark:text-stone-100">
            {t('fpo_awaiting_table_title', 'Lots Awaiting Physical Verification')}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {t('fpo_hub_queue_sub', 'Baramati FPO Hub #1 incoming queue')}
          </p>
        </div>

        <div className="overflow-x-auto">
          {lots.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-emerald-900/40 text-[11px] font-extrabold text-stone-400 uppercase tracking-wider bg-stone-50/50 dark:bg-emerald-950/20">
                  <th className="py-3 px-4">{t('fpo_col_farmer', 'Farmer')}</th>
                  <th className="py-3 px-4">{t('fpo_col_crop', 'Crop & Variety')}</th>
                  <th className="py-3 px-4">{isMr ? 'नोंदवलेले वजन' : isHi ? 'घोषित वजन' : 'Declared Weight'}</th>
                  <th className="py-3 px-4">{isMr ? 'एआय गुणवत्ता प्रत' : isHi ? 'एआई गुणवत्ता ग्रेड' : 'AI Visual Grade'}</th>
                  <th className="py-3 px-4">{isMr ? 'सादर दिनांक' : isHi ? 'प्रस्तुत तिथि' : 'Submission Date'}</th>
                  <th className="py-3 px-4 text-right">{t('fpo_col_action', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-emerald-900/30">
                {lots.map((lot) => {
                  const id = lot.id || lot._id;
                  const declaredKg = lot.quantityKg || lot.quantity_kg || 500;
                  const grade = lot.grade || lot.quality_grade || 'Grade A';
                  const conf = lot.confidenceScore || (lot.confidence_score ? Math.round(lot.confidence_score * 100) : 91);
                  const subDate = lot.createdAt ? new Date(lot.createdAt).toLocaleDateString() : '9/25/2026';

                  return (
                    <tr key={id} className="hover:bg-stone-50/60 dark:hover:bg-[#182b1c] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-stone-900 dark:text-stone-100">
                          {lot.farmerName || lot.farmer_name || 'Ramesh Patil'}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          {id}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-700 dark:text-stone-300 font-medium">
                        {lot.crop} ({lot.variety})
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                        {declaredKg} kg
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {grade} ({conf}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-500 dark:text-stone-400">
                        {subDate}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenDialog(lot)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] shadow-xs transition cursor-pointer"
                        >
                          <span>👁️</span>
                          <span>{t('fpo_inspect_weigh_btn', 'Inspect & Weigh')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center p-8 text-stone-500 text-xs sm:text-sm">
              {isMr ? 'बारामती केंद्रावर कोणतीही लॉट्स प्रलंबित नाहीत.' : isHi ? 'बारामती केंद्र पर कोई लॉट लंबित नहीं है।' : 'No lots pending physical verification at Baramati Hub.'}
            </div>
          )}
        </div>
      </div>

      {/* Dual-Grade Accountability Rule Callout matching Screenshot 2 */}
      <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 sm:p-5 rounded-2xl flex gap-3 text-xs text-amber-900 dark:text-amber-200">
        <span className="text-xl shrink-0">⚠️</span>
        <div className="space-y-1">
          <h4 className="font-black text-amber-950 dark:text-amber-100">
            {isMr ? 'दुहेरी-प्रतवारी जबाबदारी नियम:' : isHi ? 'दोहरी-ग्रेड जवाबदेही नियम:' : 'Dual-Grade Accountability Rule:'}
          </h4>
          <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
            {t('fpo_dual_grade_rule', 'The FPO manager has full authority to override the AI visual grade if physical crate inspection reveals moisture or undersized fruit. Both the original AI estimate and the verified FPO grade are permanently preserved in the hash-chained audit log.')}
          </p>
        </div>
      </div>

      {/* Verification Modal matching Screenshot 2 */}
      {isDialogOpen && selectedLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="w-full max-w-lg bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/50 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>⚖️</span>
                  <span>{t('fpo_modal_inspect_title', 'Physical Weigh-Slip & Grade Verification')}</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {isMr
                    ? `लॉट #${selectedLot.id || selectedLot._id} (${selectedLot.farmerName || selectedLot.farmer_name || 'Ramesh Patil'}) चे आगमन प्रमाणित करत आहे.`
                    : isHi
                    ? `लॉट #${selectedLot.id || selectedLot._id} (${selectedLot.farmerName || selectedLot.farmer_name || 'Ramesh Patil'}) का आगमन प्रमाणित किया जा रहा है।`
                    : `Confirming arrival for Lot ${selectedLot.id || selectedLot._id} from ${selectedLot.farmerName || selectedLot.farmer_name || 'Ramesh Patil'}.`}
                </p>
              </div>
              <button
                onClick={() => setIsDialogOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-[#182b1c] p-3 rounded-xl border border-stone-200 dark:border-emerald-900/40">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                    {t('fpo_col_crop', 'Crop & Variety')}
                  </span>
                  <strong className="text-stone-900 dark:text-stone-100 text-xs">
                    {selectedLot.crop} ({selectedLot.variety})
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                    {isMr ? 'एआय व्हिज्युअल अंदाज' : isHi ? 'एआई विजुअल अनुमान' : 'AI Visual Estimate'}
                  </span>
                  <strong className="text-emerald-700 dark:text-[#D1BF4B] text-xs">
                    {selectedLot.grade || selectedLot.quality_grade || 'Grade A'} (91% {isMr ? 'अचूकता' : isHi ? 'सटीकता' : 'confidence'})
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t('fpo_modal_certified_weight', 'Certified Physical Weigh-Bridge Reading (kg)')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={verifyWeight}
                    onChange={(e) => setVerifyWeight(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-black focus:outline-[#255919]"
                    required
                  />
                  <span className="text-stone-500 font-bold text-xs shrink-0">kg net</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t('fpo_modal_physical_grade', 'Final Verified Grade')}
                </label>
                <select
                  value={verifyGrade}
                  onChange={(e) => setVerifyGrade(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-bold focus:outline-[#255919]"
                >
                  <option value="Grade A">{t('fpo_modal_grade_a', 'Grade A (Premium Retail Table)')}</option>
                  <option value="Grade B">{t('fpo_modal_grade_b', 'Grade B (Standard Commercial)')}</option>
                  <option value="Grade C">{t('fpo_modal_grade_c', 'Grade C (Processing / Puree)')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t('fpo_modal_inspector_notes', 'Verification & Quality Notes (Audit Log)')}
                </label>
                <input
                  type="text"
                  value={fpoNotes}
                  onChange={(e) => setFpoNotes(e.target.value)}
                  placeholder={isMr ? 'क्रेटांची गुणवत्ता किंवा निव्वळ घट नोंदवा...' : isHi ? 'क्रेट की गुणवत्ता या शुद्ध वजन कटौती दर्ज करें...' : 'Enter notes on crate uniformity or tare deductions...'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-[#255919]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReject}
                className="py-2.5 px-4 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs transition cursor-pointer"
              >
                {isMr ? '✕ फेर-वर्गवारीसाठी परत पाठवा' : isHi ? '✕ पुनः-वर्गीकरण के लिए लौटाएं' : '✕ Return for Re-sorting'}
              </button>
              <button
                type="button"
                onClick={handleVerify}
                className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>✓</span>
                <span>{isMr ? 'वजन पावती मंजूर करा व सत्यापित करा' : isHi ? 'वजन पर्ची स्वीकृत करें व सत्यापित करें' : 'Approve Weigh-Slip & Verify'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
