import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getBids, cancelBid } from '../../api/bids';
import { getStoredReservedPools, updateDeliveryStatus } from '../../api/buyerData';
import { formatCurrency, formatDate } from '../../utils/format';

export default function BuyerDeliveryPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [activeDeliveries, setActiveDeliveries] = useState(() => getStoredReservedPools());
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
      setActiveDeliveries(getStoredReservedPools());
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
    setActiveDeliveries(getStoredReservedPools());
    setNotification({
      type: 'success',
      message: 'Delivery Formally Accepted! Protected nodal escrow funds released to farmer bank accounts.',
    });
  };

  // Handle Dispute Submission
  const handleConfirmDispute = () => {
    if (!selectedDisputePool) return;
    updateDeliveryStatus(selectedDisputePool, 'Disputed', {
      disputeReason,
      disputedAt: new Date().toISOString(),
    });
    setActiveDeliveries(getStoredReservedPools());
    setSelectedDisputePool(null);
    setNotification({
      type: 'error',
      message: 'Dispute Formally Raised! Escrow payout held on nodal freeze (24hr SLA).',
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
          Delivery Acceptance &amp; Payout Release
        </h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
          Inspect arrived consignments against digital weigh-slips. Release funds or log quality adjustments within 24 hours.
        </p>
      </div>

      {/* Empty State matching Screenshot 4 */}
      {activeDeliveries.length === 0 && (
        <div className="p-10 sm:p-14 text-center text-stone-500 dark:text-stone-400 border border-dashed border-stone-300 dark:border-emerald-900/50 rounded-2xl bg-white dark:bg-[#132215] shadow-xs space-y-4">
          <div className="text-4xl">🚚</div>
          <p className="text-sm sm:text-base font-semibold text-stone-600 dark:text-stone-300 max-w-md mx-auto">
            You have no active deliveries. Reserve a pool in the B2B Marketplace first.
          </p>
          <div>
            <Link
              to="/buyer/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-bold text-xs shadow-md transition"
            >
              <span>🏪</span>
              <span>Go to Marketplace</span>
            </Link>
          </div>
        </div>
      )}

      {/* Active Consignments Cards */}
      <div className="space-y-6">
        {activeDeliveries.map((pool) => {
          const poolTotal = Math.round((pool.current_kg / 100) * pool.price_per_qtl);
          const isPending = pool.status === 'Reserved' || pool.status === 'Dispatched';
          const isAccepted = pool.status === 'Accepted';
          const isDisputed = pool.status === 'Disputed';

          return (
            <div
              key={pool.id || pool.reservationId}
              className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Consignment Header */}
              <div className="bg-stone-50/80 dark:bg-[#182b1c]/80 p-5 sm:p-6 border-b border-stone-100 dark:border-emerald-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                      Consignment #{pool.id}
                    </h3>

                    {pool.status === 'Reserved' && (
                      <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-amber-300/60">
                        Awaiting FPO Dispatch
                      </span>
                    )}
                    {pool.status === 'Dispatched' && (
                      <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-300/60">
                        In Transit
                      </span>
                    )}
                    {isAccepted && (
                      <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-emerald-300/60">
                        Accepted &amp; Paid
                      </span>
                    )}
                    {isDisputed && (
                      <span className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-red-300/60">
                        Disputed (Funds Held)
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Origin: <strong>{pool.collection_hub}</strong> → Destination:{' '}
                    <strong>{pool.destination_mandi || 'Hadapsar Warehouse, Pune'}</strong>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-stone-500 dark:text-stone-400 block font-medium">
                    Consignment Value:
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
                    <div className="text-stone-400 block mb-0.5">Assigned FPO</div>
                    <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                      {pool.fpoName || 'Saksham Baramati Krushi PC'}
                    </div>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <div className="text-stone-400 block mb-0.5">Verified Bulk Weight</div>
                    <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                      {pool.current_kg} kg
                    </div>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <div className="text-stone-400 block mb-0.5">Assigned Transporter</div>
                    <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                      {pool.transporter?.vehicleNumber || 'MH-12-RN-5821'}
                    </div>
                  </div>

                  <div className="bg-stone-50 dark:bg-[#182b1c] p-3.5 rounded-xl border border-stone-200 dark:border-emerald-800/40">
                    <div className="text-stone-400 block mb-0.5">Contract Price</div>
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
                          ONDC Protocol Ready Logistics
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 text-[10px] font-bold rounded">
                          Beckn v1.2.0
                        </span>
                      </div>
                      <p className="text-blue-700 dark:text-blue-300 text-[11px] mt-1 leading-relaxed">
                        Carrier: <strong>Delhivery Rural Agri-Freight / Sahyadri Pool</strong>. GPS-tracked perishable transit with time-window SLA.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl flex items-start gap-3">
                    <span className="text-xl">🔒</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-900 dark:text-purple-200">
                          Zero-Advance Nodal Escrow
                        </span>
                        <span className="px-1.5 py-0.5 bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 text-[10px] font-bold rounded">
                          RBI Compliant
                        </span>
                      </div>
                      <p className="text-purple-700 dark:text-purple-300 text-[11px] mt-1 leading-relaxed">
                        Stage 1 (Deposit: ₹0 advance) → Stage 2 (FPO Weigh-slip: 80%) → Stage 3 (Final Acceptance: 20%).
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
                        Vehicle Arrival &amp; Quality Inspection
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
                        Scan the vehicle gate QR pass and match crates against the FPO digital weigh-slip before releasing the nodal escrow payment.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDisputePool(pool.id || pool.reservationId)}
                        className="py-2.5 px-4 rounded-xl border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>⚠️</span>
                        <span>Raise Quality/Weight Dispute</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAcceptDelivery(pool.id || pool.reservationId)}
                        className="py-2.5 px-5 rounded-xl bg-[#255919] hover:bg-[#1b4313] text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>✅</span>
                        <span>Confirm Delivery &amp; Release Funds</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Accepted State Notification */}
                {isAccepted && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-start gap-3 text-emerald-900 dark:text-emerald-200 text-xs">
                    <span className="text-xl">✅</span>
                    <div className="leading-relaxed">
                      <p className="font-bold mb-0.5">Delivery Accepted &amp; Payment Released</p>
                      <p className="text-emerald-800 dark:text-emerald-300">
                        The nodal authorized payment of ₹{poolTotal.toLocaleString()} has been split into farmer bank/UPI accounts based on verified weights. Individual transparent receipts have been generated.
                      </p>
                    </div>
                  </div>
                )}

                {/* Disputed State Notification */}
                {isDisputed && (
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3 text-red-900 dark:text-red-200 text-xs">
                    <span className="text-xl">⚠️</span>
                    <div className="leading-relaxed">
                      <p className="font-bold mb-0.5">Dispute Raised — Funds on Nodal Hold</p>
                      <p className="text-red-800 dark:text-red-300">
                        Resolution timer initiated (SLA 24 hours). FPO Manager and KrishiSetu Admin have been notified to inspect digital weigh-slips and photographic evidence.
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
              My Procurement Bids &amp; Orders (FPO Linkage)
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Direct auction bids placed on farmer harvest batches.
            </p>
          </div>
          <Link
            to="/buyer/marketplace"
            className="text-xs font-bold text-[#255919] dark:text-[#D1BF4B] hover:underline"
          >
            + Place New Bid on Batches →
          </Link>
        </div>

        {bids.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-emerald-900/40 rounded-xl bg-white dark:bg-[#132215]">
            No direct farm bids placed yet. You can submit bids directly on harvest lots in Marketplace or Browse.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-stone-400">Bid #{bid.id.slice(0, 8)}</span>
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
                    <span className="text-stone-400 block text-[10px]">Offered Rate</span>
                    <strong className="text-base text-[#255919] dark:text-[#D1BF4B] font-black">
                      ₹{bid.bid_price_per_kg || bid.max_price_per_kg || 22}/kg
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-400 block text-[10px]">Volume Needed</span>
                    <strong className="text-stone-800 dark:text-stone-200 font-bold">
                      {bid.quantity_needed_kg || bid.quantity_kg || 500} kg
                    </strong>
                  </div>
                </div>

                {bid.status === 'pending' && (
                  <div className="pt-2 border-t border-stone-100 dark:border-emerald-900/30 flex justify-end">
                    <button
                      type="button"
                      disabled={cancellingBidId === bid.id}
                      onClick={() => handleCancelBid(bid.id)}
                      className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer"
                    >
                      {cancellingBidId === bid.id ? 'Withdrawing...' : 'Withdraw Bid'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      {selectedDisputePool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#132215] border border-stone-200 dark:border-emerald-900/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 border-b border-stone-100 dark:border-emerald-900/30 pb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-black text-lg">Raise Consignment Dispute</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Log discrepancies for #{selectedDisputePool}. Funds remain frozen until resolved.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700 dark:text-stone-300">
                  Dispute Reason &amp; Findings
                </label>
                <textarea
                  rows="3"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-[#182b1c] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 focus:outline-emerald-600"
                />
              </div>

              <div className="p-3 bg-stone-50 dark:bg-[#182b1c] rounded-xl border border-stone-200 dark:border-emerald-800/40 text-stone-500 dark:text-stone-400 text-[11px]">
                Attach sample photos of damaged crates or weigh-bridge slip. The FPO manager will receive an immediate notification to review deductions.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDisputePool(null)}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-emerald-950/30 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispute}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
