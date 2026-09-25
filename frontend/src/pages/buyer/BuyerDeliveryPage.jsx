import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getBids, cancelBid } from '../../api/bids';
import { getStoredReservedPools, updateDeliveryStatus, DEFAULT_ACTIVE_DELIVERIES } from '../../api/buyerData';
import { formatCurrency, formatDate } from '../../utils/format';

export default function BuyerDeliveryPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [activeDeliveries, setActiveDeliveries] = useState(() => {
    const list = getStoredReservedPools();
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_ACTIVE_DELIVERIES;
  });
  const [bids, setBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [selectedDisputePool, setSelectedDisputePool] = useState(null);
  const [disputeReason, setDisputeReason] = useState(
    'Underweight by 15kg and 8% fruit bruising detected upon unloading'
  );
  const [notification, setNotification] = useState(null);
  const [cancellingBidId, setCancellingBidId] = useState(null);

  // Load backend bids placed to FPOs/farmers
  const fetchBids = useCallback(async () => {
    try {
      setLoadingBids(true);
      const res = await getBids();
      if (res?.data && Array.isArray(res.data)) {
        setBids(res.data);
      }
    } catch (err) {
      console.warn('Failed fetching bids for delivery page:', err);
    } finally {
      setLoadingBids(false);
    }
  }, []);

  useEffect(() => {
    fetchBids();
    const handleSync = () => {
      const list = getStoredReservedPools();
      setActiveDeliveries(Array.isArray(list) && list.length > 0 ? list : DEFAULT_ACTIVE_DELIVERIES);
    };
    window.addEventListener('krishisetu_buyer_pool_reserved', handleSync);
    window.addEventListener('krishisetu_buyer_delivery_updated', handleSync);
    return () => {
      window.removeEventListener('krishisetu_buyer_pool_reserved', handleSync);
      window.removeEventListener('krishisetu_buyer_delivery_updated', handleSync);
    };
  }, [fetchBids]);

  // Handle Delivery Acceptance & Payout Release
  const handleAcceptDelivery = (poolId) => {
    updateDeliveryStatus(poolId, 'Accepted', {
      acceptedAt: new Date().toISOString(),
    });
    const list = getStoredReservedPools();
    setActiveDeliveries(Array.isArray(list) && list.length > 0 ? list : DEFAULT_ACTIVE_DELIVERIES);
    setNotification({
      type: 'success',
      message:
        lang === 'mr'
          ? 'डिलिव्हरी यशस्वीरित्या स्वीकारली! संरक्षित एस्क्रो निधी शेतकऱ्यांच्या बँक खात्यात वर्ग करण्यात आला.'
          : lang === 'hi'
          ? 'डिलीवरी सफलतापूर्वक स्वीकृत! सुरक्षित एस्क्रो फंड किसान के बैंक खाते में स्थानांतरित कर दिया गया।'
          : 'Delivery Formally Accepted! Protected nodal escrow funds released to farmer bank accounts.',
    });
  };

  // Handle Dispute Submission
  const handleConfirmDispute = () => {
    if (!selectedDisputePool) return;
    updateDeliveryStatus(selectedDisputePool, 'Disputed', {
      disputeReason,
      disputedAt: new Date().toISOString(),
    });
    const list = getStoredReservedPools();
    setActiveDeliveries(Array.isArray(list) && list.length > 0 ? list : DEFAULT_ACTIVE_DELIVERIES);
    setSelectedDisputePool(null);
    setNotification({
      type: 'error',
      message:
        lang === 'mr'
          ? 'तक्रार/विवाद नोंदवला गेला! २४ तासांसाठी एस्क्रो पेमेंट तात्पुरते थांबवण्यात आले आहे.'
          : lang === 'hi'
          ? 'विवाद दर्ज किया गया! 24 घंटे के लिए एस्क्रो भुगतान रोक दिया गया है।'
          : 'Dispute Formally Raised! Escrow payout held on nodal freeze (24hr SLA).',
    });
  };

  // Cancel pending bid
  const handleCancelBid = async (bidId) => {
    setCancellingBidId(bidId);
    try {
      await cancelBid(bidId);
      setBids((prev) => prev.filter((b) => b.id !== bidId));
      setNotification({
        type: 'success',
        message: 'Bid successfully withdrawn.',
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: 'Could not cancel bid.',
      });
    } finally {
      setCancellingBidId(null);
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

      {/* Header matching Screenshot 4 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
          {t('delivery_acceptance_title', 'Delivery Acceptance & Payout Release')}
        </h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
          {t('delivery_acceptance_subtitle', 'Inspect arrived consignments against digital weigh-slips. Release funds or log quality adjustments within 24 hours.')}
        </p>
      </div>

      {/* Empty State matching Screenshot 4 */}
      {activeDeliveries.length === 0 && (
        <div className="p-10 sm:p-14 text-center text-stone-500 dark:text-stone-400 border border-dashed border-stone-300 dark:border-emerald-900/50 rounded-2xl bg-white dark:bg-[#132215] shadow-xs space-y-4">
          <div className="text-4xl">🚚</div>
          <p className="text-sm sm:text-base font-semibold text-stone-600 dark:text-stone-300 max-w-md mx-auto">
            {t('no_active_deliveries', 'You have no active deliveries. Reserve a pool in the B2B Marketplace first.')}
          </p>
          <div>
            <Link
              to="/buyer/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-bold text-xs shadow-md transition"
            >
              <span>🏪</span>
              <span>{t('buyer_nav_marketplace', 'Go to Marketplace')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Active Consignments Cards */}
      <div className="space-y-6">
        {activeDeliveries.map((pool, poolIdx) => {
          const poolTotal = Math.round((Number(pool.current_kg || 0) / 100) * Number(pool.price_per_qtl || 0));
          const isPending = pool.status === 'Reserved' || pool.status === 'Dispatched';
          const isAccepted = pool.status === 'Accepted';
          const isDisputed = pool.status === 'Disputed';
          const poolKey = pool.id || pool.reservationId || `del-${poolIdx}`;

          return (
            <div
              key={poolKey}
              className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Consignment Header */}
              <div className="bg-stone-50/80 dark:bg-[#182b1c]/80 p-5 sm:p-6 border-b border-stone-100 dark:border-emerald-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                      {t('consignment', 'Consignment')} #{pool.id || pool.reservationId}
                    </h3>

                    {pool.status === 'Reserved' && (
                      <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-amber-300/60">
                        {lang === 'mr' ? 'एफपीओ रवानगी प्रतीक्षेत' : lang === 'hi' ? 'एफपीओ प्रेषण की प्रतीक्षा' : 'Awaiting FPO Dispatch'}
                      </span>
                    )}
                    {pool.status === 'Dispatched' && (
                      <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-300/60">
                        {lang === 'mr' ? 'वाहतुकीत (In Transit)' : lang === 'hi' ? 'मार्ग में (In Transit)' : 'In Transit'}
                      </span>
                    )}
                    {isAccepted && (
                      <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-emerald-300/60">
                        {lang === 'mr' ? 'स्वीकृत व पैसे अदा ✓' : lang === 'hi' ? 'स्वीकृत व भुगतान पूर्ण ✓' : 'Accepted & Paid'}
                      </span>
                    )}
                    {isDisputed && (
                      <span className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-red-300/60">
                        {lang === 'mr' ? 'विवाद नोंदवला (रक्कम रोखली)' : lang === 'hi' ? 'विवाद दर्ज (राशि रोकी गई)' : 'Disputed (Funds Held)'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {lang === 'mr' ? 'उगम:' : lang === 'hi' ? 'स्रोत:' : 'Origin:'} <strong>{pool.collection_hub}</strong> → {lang === 'mr' ? 'गंतव्य:' : lang === 'hi' ? 'गंतव्य:' : 'Destination:'}{' '}
                    <strong>{pool.destination_mandi || 'Hadapsar Warehouse, Pune'}</strong>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-stone-500 dark:text-stone-400 block font-medium">
                    {t('consignment_value', 'Consignment Value:')}
                  </span>
                  <div className="font-black text-[#255919] dark:text-[#D1BF4B] text-xl">
                    ₹{poolTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Consignment Metadata Grid */}
              <div className="p-5 sm:p-6 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <div className="text-stone-400 block mb-0.5">{t('assigned_fpo', 'Assigned FPO')}</div>
                    <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                      {pool.fpoName || 'Saksham Baramati Krushi PC'}
                    </div>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <div className="text-stone-400 block mb-0.5">{t('verified_bulk_weight', 'Verified Bulk Weight')}</div>
                    <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                      {pool.current_kg} kg
                    </div>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <div className="text-stone-400 block mb-0.5">{t('assigned_transporter', 'Assigned Transporter')}</div>
                    <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                      {pool.transporter?.vehicleNumber || 'MH-12-RN-5821'}
                    </div>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <div className="text-stone-400 block mb-0.5">{t('contract_price', 'Contract Price')}</div>
                    <div className="font-extrabold text-[#255919] dark:text-[#D1BF4B] text-sm">
                      ₹{pool.price_per_qtl} / qtl
                    </div>
                  </div>
                </div>

                {/* Protocol Banners */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-start gap-3">
                    <span className="text-xl">🚚</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-900 dark:text-blue-200">
                          {t('ondc_ready_logistics', 'ONDC Protocol Ready Logistics')}
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 text-[10px] font-bold rounded">
                          Beckn v1.2.0
                        </span>
                      </div>
                      <p className="text-blue-700 dark:text-blue-300 text-[11px] mt-1 leading-relaxed">
                        {lang === 'mr'
                          ? 'वाहतूकदार: Delhivery Rural Agri-Freight / सह्याद्री पूल. जीपीएस ट्रॅकिंग व वेळेचे बंधन.'
                          : lang === 'hi'
                          ? 'कैरियर: Delhivery Rural Agri-Freight / सह्याद्री पूल. जीपीएस ट्रैकिंग और समय-सीमा पालन।'
                          : 'Carrier: Delhivery Rural Agri-Freight / Sahyadri Pool. GPS-tracked perishable transit with time-window SLA.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl flex items-start gap-3">
                    <span className="text-xl">🔒</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-900 dark:text-purple-200">
                          {t('zero_advance_protection', 'Zero-Advance Nodal Escrow')}
                        </span>
                        <span className="px-1.5 py-0.5 bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 text-[10px] font-bold rounded">
                          RBI Compliant
                        </span>
                      </div>
                      <p className="text-purple-700 dark:text-purple-300 text-[11px] mt-1 leading-relaxed">
                        {lang === 'mr'
                          ? 'टप्पा १ (₹० आगाऊ) → टप्पा २ (एफपीओ डिजिटल वजन पावती: ८०%) → टप्पा ३ (अंतिम स्वीकृती: २०%).'
                          : lang === 'hi'
                          ? 'चरण 1 (₹0 अग्रिम) → चरण 2 (एफपीओ डिजिटल वजन पर्ची: 80%) → चरण 3 (अंतिम स्वीकृति: 20%)।'
                          : 'Stage 1 (Deposit: ₹0 advance) → Stage 2 (FPO Weigh-slip: 80%) → Stage 3 (Final Acceptance: 20%).'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Arrival & Release Action Box */}
                {isPending && (
                  <div className="border border-stone-200 dark:border-emerald-900/40 rounded-2xl p-6 text-center space-y-4 bg-stone-50/60 dark:bg-[#182b1c]/50">
                    <div className="mx-auto w-14 h-14 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-2xl shadow-xs">
                      🚚
                    </div>
                    <div>
                      <h4 className="font-extrabold text-stone-900 dark:text-stone-100 text-base">
                        {t('vehicle_arrival_inspection', 'Vehicle Arrival & Quality Inspection')}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
                        {t('vehicle_arrival_desc', 'Scan the vehicle gate QR pass and match crates against the FPO digital weigh-slip before releasing the nodal escrow payment.')}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDisputePool(pool.id || pool.reservationId)}
                        className="py-2.5 px-4 rounded-xl border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>⚠️</span>
                        <span>{t('raise_dispute', 'Raise Quality/Weight Dispute')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAcceptDelivery(pool.id || pool.reservationId)}
                        className="py-2.5 px-5 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>✅</span>
                        <span>{t('confirm_delivery', 'Confirm Delivery & Release Funds')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Accepted State Notification */}
                {isAccepted && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-start gap-3 text-emerald-900 dark:text-emerald-200 text-xs">
                    <span className="text-xl">✅</span>
                    <div className="leading-relaxed">
                      <p className="font-bold mb-0.5">{t('delivery_accepted_payout', 'Delivery Accepted & Payment Released')}</p>
                      <p className="text-emerald-800 dark:text-emerald-300">
                        {lang === 'mr'
                          ? `नोडल अधिकृत रक्कम ₹${poolTotal.toLocaleString()} डिजिटल वजन पावतीनुसार थेट शेतकरी बँक खात्यात वर्ग करण्यात आली आहे.`
                          : lang === 'hi'
                          ? `नोडल अधिकृत राशि ₹${poolTotal.toLocaleString()} डिजिटल वजन पर्ची के अनुसार सीधे किसान बैंक खातों में स्थानांतरित कर दी गई है।`
                          : `The nodal authorized payment of ₹${poolTotal.toLocaleString()} has been split into farmer bank/UPI accounts based on verified weights. Individual transparent receipts have been generated.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Disputed State Notification */}
                {isDisputed && (
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3 text-red-900 dark:text-red-200 text-xs">
                    <span className="text-xl">⚠️</span>
                    <div className="leading-relaxed">
                      <p className="font-bold mb-0.5">{t('dispute_raised_funds_held', 'Dispute Raised — Funds on Nodal Hold')}</p>
                      <p className="text-red-800 dark:text-red-300">
                        {lang === 'mr'
                          ? 'तक्रार निवारण टायमर सुरू (२४ तास SLA). एफपीओ व्यवस्थापक व कृषी-सेतू प्रशासकांना वजन पावती व पुराव्यांची तपासणी करण्यासाठी सूचित केले आहे.'
                          : lang === 'hi'
                          ? 'समाधान टाइमर शुरू (24 घंटे SLA)। एफपीओ प्रबंधक और कृषि-सेतु व्यवस्थापक को वजन पर्ची और साक्ष्यों की जांच हेतु सूचित कर दिया गया है।'
                          : 'Resolution timer initiated (SLA 24 hours). FPO Manager and KrishiSetu Admin have been notified to inspect digital weigh-slips and photographic evidence.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct Procurement Bids to FPOs & Farmers */}
      <div className="mt-10 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-900/40 pb-3">
          <div>
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">
              {t('my_procurement_bids', 'My Procurement Bids & Orders (FPO Linkage)')}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {lang === 'mr'
                ? 'शेतकरी काढणी लॉटवर लावलेल्या थेट लिलाव बोली.'
                : lang === 'hi'
                ? 'किसान फसल लॉट पर लगाई गई सीधी नीलामी बोलियां।'
                : 'Direct auction bids placed on farmer harvest batches.'}
            </p>
          </div>
          <Link
            to="/buyer/marketplace"
            className="text-xs font-bold text-[#255919] dark:text-[#D1BF4B] hover:underline"
          >
            + {lang === 'mr' ? 'नवीन बोली लावा' : lang === 'hi' ? 'नई बोली लगाएं' : 'Place New Bid on Batches'} →
          </Link>
        </div>

        {(() => {
          const sampleBids = [
            {
              id: "BID-TOM-8421",
              crop: "Tomato",
              status: "pending",
              bid_price_per_kg: 22.5,
              quantity_needed_kg: 1000,
            },
            {
              id: "BID-ONI-9104",
              crop: "Onion",
              status: "accepted",
              bid_price_per_kg: 25.0,
              quantity_needed_kg: 2500,
            }
          ];
          const displayBids = bids.length > 0 ? bids : sampleBids;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayBids.map((bid, bIdx) => {
                const rawBidId = String(bid?._id || bid?.id || `b-${bIdx}`);
                const shortBidId = rawBidId.length >= 8 ? rawBidId.slice(-8).toUpperCase() : rawBidId.toUpperCase();

                return (
                  <div
                    key={rawBidId}
                    className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-xl p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-stone-400">Bid #{shortBidId}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          bid.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bid.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {bid.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px]">{t('asking_rate', 'Offered Rate')}</span>
                        <strong className="text-base text-[#255919] dark:text-[#D1BF4B] font-black">
                          ₹{bid.bid_price_per_kg || bid.max_price_per_kg || 22}/kg
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-stone-400 block text-[10px]">{t('available_volume', 'Volume Needed')}</span>
                        <strong className="text-stone-800 dark:text-stone-200 font-bold">
                          {bid.quantity_needed_kg || bid.quantity_kg || 500} kg
                        </strong>
                      </div>
                    </div>

                    {bid.status === 'pending' && (
                      <div className="pt-2 border-t border-stone-100 dark:border-emerald-900/30 flex justify-end">
                        <button
                          type="button"
                          disabled={cancellingBidId === rawBidId}
                          onClick={() => handleCancelBid(rawBidId)}
                          className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer"
                        >
                          {cancellingBidId === rawBidId ? 'Withdrawing...' : t('withdraw_bid', 'Withdraw Bid')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Dispute Modal */}
      {selectedDisputePool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 border-b border-stone-100 dark:border-emerald-900/30 pb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-black text-lg">
                  {lang === 'mr' ? 'तक्रार / वाद नोंदवा' : lang === 'hi' ? 'कंसाइनमेंट विवाद दर्ज करें' : 'Raise Consignment Dispute'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {lang === 'mr'
                    ? `लॉट #${selectedDisputePool} साठी तफावत नोंदवा. निवारण होईपर्यंत रक्कम रोखली जाईल.`
                    : lang === 'hi'
                    ? `लॉट #${selectedDisputePool} के लिए विसंगति दर्ज करें। समाधान तक राशि रोकी जाएगी।`
                    : `Log discrepancies for #${selectedDisputePool}. Funds remain frozen until resolved.`}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'mr' ? 'तक्रारीचे कारण व शेरा' : lang === 'hi' ? 'विवाद का कारण व निष्कर्ष' : 'Dispute Reason & Findings'}
                </label>
                <textarea
                  rows="3"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-emerald-600"
                />
              </div>

              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40 text-stone-500 dark:text-stone-400 text-[11px]">
                {lang === 'mr'
                  ? 'खराब झालेल्या मालाचे फोटो किंवा वजन पावती जोडा. एफपीओ व्यवस्थापकाला कपातीचा आढावा घेण्यासाठी त्वरित संदेश जाईल.'
                  : lang === 'hi'
                  ? 'क्षतिग्रस्त क्रेट या वजन पर्ची के नमूना फोटो संलग्न करें। एफपीओ प्रबंधक को कटौती की समीक्षा हेतु तुरंत संदेश भेजा जाएगा।'
                  : 'Attach sample photos of damaged crates or weigh-bridge slip. The FPO manager will receive an immediate notification to review deductions.'}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDisputePool(null)}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-emerald-950/30 transition cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDispute}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                {lang === 'mr' ? 'तक्रार दाखल करा' : lang === 'hi' ? 'विवाद प्रस्तुत करें' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
