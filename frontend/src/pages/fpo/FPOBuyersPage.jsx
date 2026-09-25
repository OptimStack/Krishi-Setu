import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { INITIAL_VERIFIED_BUYERS } from '../../api/fpoData';

export default function FPOBuyersPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [buyers, setBuyers] = useState(INITIAL_VERIFIED_BUYERS);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [notification, setNotification] = useState(null);

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, []);

  const handleContact = (buyer) => {
    setSelectedBuyer(buyer);
    setNotification({
      type: 'info',
      text: `Direct Procurement Desk for ${buyer.name}: ${buyer.phone} (Dedicated Institutional Officer Assigned).`,
    });
  };

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg bg-emerald-700 text-white border border-emerald-800 transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>📞</span>
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

      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {t('fpo_buyers_page_title', 'Verified B2B Buyers Directory')}
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1">
            {t('fpo_buyers_page_sub', 'Partnered institutional procurers, food retailers, and processing units with pre-verified payment records.')}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 w-fit shrink-0">
          <span>🛡️</span>
          <span>{t('fpo_buyers_kyc_badge', 'All Buyers KYC & GSTIN Verified')}</span>
        </span>
      </div>

      {/* 3 Columns Buyer Cards Grid matching Screenshot 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {buyers.map((buyer) => (
          <div
            key={buyer.id}
            className="bg-white dark:bg-[#132215] rounded-2xl border border-stone-200 dark:border-emerald-900/40 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-all overflow-hidden"
          >
            <div className="p-5 sm:p-6 space-y-4">
              {/* Category & Score Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100 dark:border-emerald-900/30">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-stone-100 dark:bg-[#1c331f] text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-1">
                    {buyer.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-snug">
                    {buyer.name}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                    <span>📍</span>
                    <span>{buyer.location}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-lg text-xs font-black shrink-0">
                  <span className="text-amber-500">⭐</span>
                  <span>{buyer.reliabilityScore}%</span>
                </div>
              </div>

              {/* Specs & Requirements */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-stone-400 font-bold block text-[10px] uppercase">
                    {t('fpo_gstin_label', 'GSTIN')}
                  </span>
                  <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                    {buyer.gstin}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 font-bold block text-[10px] uppercase">
                    {t('fpo_quality_req_label', 'Quality Requirement')}
                  </span>
                  <p className="text-stone-700 dark:text-stone-300 mt-0.5 leading-relaxed font-medium">
                    {buyer.qualityRequirement}
                  </p>
                </div>

                <div>
                  <span className="text-stone-400 font-bold block text-[10px] uppercase">
                    {t('fpo_payment_term_label', 'Payment Settlement Term')}
                  </span>
                  <p className="text-emerald-700 dark:text-[#D1BF4B] font-bold mt-0.5">
                    {buyer.paymentTerm}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-emerald-900/30">
                  <span className="text-stone-400 font-bold block text-[10px] uppercase mb-1.5">
                    {t('fpo_target_commodities', 'Target Commodities')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {buyer.cropPreferences.map((crop, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md border border-stone-200 dark:border-emerald-900 bg-stone-50 dark:bg-[#182b1c] text-stone-700 dark:text-stone-300 text-[11px] font-semibold"
                      >
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-stone-50 dark:bg-[#182b1c] p-2.5 rounded-xl border border-stone-200/80 dark:border-emerald-900/40 flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-300">
                  <span>{t('fpo_historical_vol', 'Verified Historical Volume')}:</span>
                  <strong className="text-stone-900 dark:text-stone-100 font-black">
                    {buyer.tradeVolumeQuintal.toLocaleString()} {isMr ? 'क्विंटल' : isHi ? 'क्विंटल' : 'Quintals'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bottom Card Actions */}
            <div className="p-4 bg-stone-50/70 dark:bg-[#182b1c]/70 border-t border-stone-100 dark:border-emerald-900/30">
              <button
                onClick={() => handleContact(buyer)}
                className="w-full py-2.5 px-4 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#203a25] font-black text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📞</span>
                <span>{t('fpo_contact_procurement_btn', 'Contact Procurement Desk')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
