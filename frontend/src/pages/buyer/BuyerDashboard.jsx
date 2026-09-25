import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getBids, cancelBid, buyBatchDirect, createBid, getActivePool, buyPoolStock } from '../../api/bids';
import { getBuyerTrades, createPaymentOrder, verifyPayment } from '../../api/payments';
import { getRequirements, createRequirement } from '../../api/requirements';
import { getAvailableProduce } from '../../api/listings';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [trades, setTrades] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [availableProduce, setAvailableProduce] = useState([]);
  const [activePool, setActivePool] = useState({
    id: 'batch_fpo_pune',
    name: 'Pune FPO Hub — Pune Gultekdi Market',
    crop: 'Tomato',
    variety: 'Abhinav Hybrid',
    quality_grade: 'Grade A',
    current_quantity_kg: 750,
    target_quantity_kg: 1200,
    price_per_kg: 16.55,
    status: 'open',
  });
  const [buyingPoolLoading, setBuyingPoolLoading] = useState(false);
  const [poolBuyCustomQty, setPoolBuyCustomQty] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('available_crops'); // 'available_crops' | 'bids' | 'trades' | 'requirements'
  const [actionLoading, setActionLoading] = useState(null);
  const [buyingListingId, setBuyingListingId] = useState(null);
  const [quickBidModal, setQuickBidModal] = useState(null);
  const [quickBidForm, setQuickBidForm] = useState({ max_price_per_kg: '', quantity_needed_kg: '' });
  const [paymentModal, setPaymentModal] = useState(null); // { trade, orderData }
  const [payingLoading, setPayingLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Requirements modal & form state
  const [showReqModal, setShowReqModal] = useState(false);
  const [creatingReq, setCreatingReq] = useState(false);
  const [expandedReqId, setExpandedReqId] = useState(null);
  const [newReq, setNewReq] = useState({
    crop: 'onion',
    variety: 'Nashik Red',
    target_mandi: 'Lasalgaon APMC (Nashik)',
    mandi_modal_price_per_kg: 24.50,
    total_quantity_needed_kg: 5000,
    min_supply_per_farmer_kg: 100,
    district: 'Nashik',
    state: 'Maharashtra',
    delivery_deadline: '2026-10-15',
  });

  const fetchData = useCallback(async () => {
    try {
      const [bidsRes, tradesRes, reqsRes, produceRes, poolRes] = await Promise.allSettled([
        getBids(),
        getBuyerTrades(),
        getRequirements(),
        getAvailableProduce(),
        getActivePool(),
      ]);

      if (bidsRes.status === 'fulfilled' && bidsRes.value?.data) {
        setBids(bidsRes.value.data);
      }
      if (tradesRes.status === 'fulfilled' && tradesRes.value?.data) {
        setTrades(tradesRes.value.data);
      }
      if (reqsRes.status === 'fulfilled' && reqsRes.value?.data) {
        setRequirements(reqsRes.value.data);
      }
      if (produceRes.status === 'fulfilled' && produceRes.value?.data) {
        setAvailableProduce(produceRes.value.data);
      }
      if (poolRes.status === 'fulfilled' && poolRes.value?.data) {
        setActivePool(poolRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load buyer data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 8 seconds for live auction clearing & sync
    const interval = setInterval(fetchData, 8000);

    const handleSync = (e) => {
      if (e?.detail?.pool) {
        setActivePool(e.detail.pool);
      }
      fetchData();
    };

    window.addEventListener('krishisetu_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('krishisetu_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchData]);

  const handleCancel = async (bidId) => {
    if (!window.confirm('Are you sure you want to cancel this bid?')) return;
    setActionLoading(bidId);
    setFeedback({ text: '', type: '' });
    try {
      const res = await cancelBid(bidId);
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to cancel bid', type: 'error' });
      } else {
        setFeedback({ text: 'Bid cancelled successfully.', type: 'success' });
        fetchData();
      }
    } catch (err) {
      setFeedback({ text: 'Error cancelling bid.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleInstantBuy = async (item) => {
    const itemId = item._id || item.id;
    const askPrice = parseFloat(item.ask_price_per_kg || item.weighted_ask_price_per_kg || 25);
    const qty = parseFloat(item.quantity_remaining_kg || item.quantity_kg || item.quantity || 100);
    const total = qty * askPrice;

    if (!window.confirm(`Confirm instant purchase of ${item.crop} (${qty} kg) at ₹${askPrice}/kg (Total: ₹${total.toLocaleString('en-IN')})?`)) return;

    setBuyingListingId(itemId);
    setFeedback({ text: '', type: '' });
    try {
      const res = await buyBatchDirect(itemId);
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to complete instant buy', type: 'error' });
      } else {
        setFeedback({
          text: `🎉 Instant purchase confirmed! ₹${total.toLocaleString('en-IN')} trade settled. Farmer payout credited immediately.`,
          type: 'success',
        });
        fetchData();
        setActiveTab('trades');
      }
    } catch (err) {
      setFeedback({ text: 'Error executing instant buy.', type: 'error' });
    } finally {
      setBuyingListingId(null);
    }
  };

  const handleBuyPoolStock = async (quantityToBuy) => {
    const qty = parseFloat(quantityToBuy || poolBuyCustomQty || activePool.current_quantity_kg);
    if (!qty || qty <= 0) {
      setFeedback({ text: 'Please specify a valid quantity in kg.', type: 'error' });
      return;
    }
    if (qty > activePool.current_quantity_kg) {
      setFeedback({
        text: `Only ${activePool.current_quantity_kg} kg currently available in this pool.`,
        type: 'error',
      });
      return;
    }

    const price = activePool.price_per_kg || 16.55;
    const total = qty * price;

    if (!window.confirm(`Confirm purchase of ${qty} kg of ${activePool.crop} at ₹${price}/kg (Total: ₹${total.toLocaleString('en-IN')}) from ${activePool.name}?`)) return;

    setBuyingPoolLoading(true);
    setFeedback({ text: '', type: '' });
    try {
      const res = await buyPoolStock({ quantity_kg: qty, price_per_kg: price });
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to buy pool stock', type: 'error' });
      } else {
        setFeedback({
          text: `🎉 Purchased ${qty} kg from active pool! Payout generated for participating farmers. Remaining pool: ${res.data?.pool?.current_quantity_kg !== undefined ? Math.round(res.data.pool.current_quantity_kg) : Math.round(activePool.current_quantity_kg - qty)} kg.`,
          type: 'success',
        });
        if (res.data?.pool) {
          setActivePool(res.data.pool);
        }
        setPoolBuyCustomQty('');
        fetchData();
        setActiveTab('trades');
      }
    } catch (err) {
      setFeedback({ text: 'Error purchasing stock from active pool', type: 'error' });
    } finally {
      setBuyingPoolLoading(false);
    }
  };

  const handleOpenQuickBid = (item) => {
    const qty = parseFloat(item.quantity_remaining_kg || item.quantity_kg || item.quantity || 500);
    const ask = parseFloat(item.ask_price_per_kg || item.weighted_ask_price_per_kg || 25);
    setQuickBidModal(item);
    setQuickBidForm({
      quantity_needed_kg: qty,
      max_price_per_kg: ask,
    });
  };

  const handleQuickBidSubmit = async (e) => {
    e.preventDefault();
    if (!quickBidModal) return;
    setActionLoading('quick_bid');
    setFeedback({ text: '', type: '' });
    try {
      const res = await createBid({
        crop: (quickBidModal.crop || 'onion').toLowerCase(),
        quantity_needed_kg: parseFloat(quickBidForm.quantity_needed_kg),
        max_price_per_kg: parseFloat(quickBidForm.max_price_per_kg),
        min_quality_grade: quickBidModal.quality_grade || 'A',
        batch_id: quickBidModal._id || quickBidModal.id,
      });
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to place bid', type: 'error' });
      } else {
        setFeedback({
          text: `🎉 Bid of ₹${quickBidForm.max_price_per_kg}/kg for ${quickBidForm.quantity_needed_kg} kg placed successfully! Farmer will receive your offer live.`,
          type: 'success',
        });
        setQuickBidModal(null);
        fetchData();
        setActiveTab('bids');
      }
    } catch (err) {
      setFeedback({ text: 'Error placing bid', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartPayment = async (trade) => {
    const tradeId = trade._id || trade.id;
    setActionLoading(tradeId);
    setFeedback({ text: '', type: '' });

    try {
      const res = await createPaymentOrder(tradeId);
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to initiate checkout', type: 'error' });
        return;
      }

      const orderData = res.data;
      // Open Razorpay Checkout modal or simulated payment modal
      setPaymentModal({ trade, orderData });
    } catch (err) {
      setFeedback({ text: err?.error?.message || 'Error creating payment order', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompletePayment = async () => {
    if (!paymentModal) return;
    setPayingLoading(true);
    const { trade, orderData } = paymentModal;
    const tradeId = trade._id || trade.id;

    try {
      // Simulate/trigger Razorpay payment verification
      const verifyRes = await verifyPayment({
        trade_id: tradeId,
        razorpay_order_id: orderData.order_id,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: `test_sig_${Date.now()}`,
      });

      if (verifyRes.error) {
        setFeedback({ text: verifyRes.error.message || 'Payment verification failed', type: 'error' });
      } else {
        setFeedback({
          text: `Payment of ₹${orderData.amount.toLocaleString('en-IN')} captured successfully! Trade is now settled and funds allocated to farmers.`,
          type: 'success',
        });
        setPaymentModal(null);
        fetchData();
      }
    } catch (err) {
      setFeedback({ text: err?.error?.message || 'Payment processing error', type: 'error' });
    } finally {
      setPayingLoading(false);
    }
  };

  const handleCreateRequirement = async (e) => {
    e.preventDefault();
    setCreatingReq(true);
    setFeedback({ text: '', type: '' });
    try {
      const res = await createRequirement({
        ...newReq,
        mandi_modal_price_per_kg: parseFloat(newReq.mandi_modal_price_per_kg),
        total_quantity_needed_kg: parseFloat(newReq.total_quantity_needed_kg),
        min_supply_per_farmer_kg: parseFloat(newReq.min_supply_per_farmer_kg),
      });
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to post demand', type: 'error' });
      } else {
        setFeedback({ text: 'Direct procurement demand posted! Local farmers can now supply at Mandi rate.', type: 'success' });
        setShowReqModal(false);
        fetchData();
      }
    } catch (err) {
      setFeedback({ text: 'Error posting procurement demand', type: 'error' });
    } finally {
      setCreatingReq(false);
    }
  };

  // Metrics computation
  const totalBids = bids.length;
  const openBids = bids.filter((b) => b.status === 'open');
  const matchedBids = bids.filter((b) => b.status === 'matched' || b.status === 'partially_matched');
  const pendingTrades = trades.filter((t) => t.status === 'pending_payment' || t.status === 'payment_processing');
  const settledTrades = trades.filter((t) => t.status === 'settled');

  const totalProcurementKg = bids.reduce(
    (sum, b) => sum + (parseFloat(b.quantity_needed_kg || b.quantity) || 0),
    0
  );
  const totalProcurementQuintals = (totalProcurementKg / 100).toFixed(1);

  const activeCommitmentValue = openBids.reduce(
    (sum, b) => sum + (parseFloat(b.quantity_needed_kg || b.quantity) || 0) * (parseFloat(b.max_price_per_kg || b.price) || 0),
    0
  );

  // Filtered bids
  const filteredBids = filterStatus === 'all'
    ? bids
    : bids.filter((b) => (b.status || '').toLowerCase() === filterStatus.toLowerCase());

  return (
    <div className="space-y-8 md:space-y-10 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#2A5124] to-[#1c3917] dark:from-[#0d1d11] dark:to-[#172b1a] text-white p-6 md:p-8 rounded-2xl shadow-2xl border border-[#D3D67A]/30">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Welcome, {user?.name || 'Buyer'}! 🏢
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D3D67A]/20 text-[#D3D67A] border border-[#D3D67A]/40 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#D3D67A] animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-stone-200 dark:text-stone-300 text-sm md:text-base mt-1.5 font-medium">
            Wholesale procurement & double-auction bidding dashboard
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/buyer/browse">
            <button className="bg-[#D3D67A] hover:bg-[#c2c56a] text-[#2A5124] font-extrabold px-5 py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 text-sm cursor-pointer">
              <span>🔍</span> Browse Batches
            </button>
          </Link>
          <Link to="/buyer/submit-bid">
            <button className="bg-white/20 hover:bg-white/30 text-white font-bold px-5 py-3 rounded-xl shadow transition text-sm flex items-center gap-2 border border-white/30 cursor-pointer">
              <span>➕</span> Place New Bid
            </button>
          </Link>
          <button
            onClick={fetchData}
            className="bg-black/30 hover:bg-black/50 text-white px-3.5 py-3 rounded-xl text-sm transition border border-white/20 cursor-pointer shadow-md"
            title="Refresh Data"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Action Feedback */}
      {feedback.text && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-md ${
            feedback.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback({ text: '', type: '' })}
            className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-5 bg-white/95 dark:bg-[#132215]/95 backdrop-blur-sm rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Total Bids</div>
          <div className="text-3xl font-black text-stone-900 dark:text-stone-100 mt-1">{totalBids}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">Orders submitted</div>
        </div>

        <div className="p-5 bg-white/95 dark:bg-[#132215]/95 backdrop-blur-sm rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Bids</div>
          <div className="text-3xl font-black text-emerald-700 dark:text-[#D3D67A] mt-1">{openBids.length}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">Awaiting auction clearing</div>
        </div>

        <div className="p-5 bg-white/95 dark:bg-[#132215]/95 backdrop-blur-sm rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Won Trades</div>
          <div className="text-3xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {trades.length}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">{pendingTrades.length} pending checkout</div>
        </div>

        <div className="p-5 bg-white/95 dark:bg-[#132215]/95 backdrop-blur-sm rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Total Volume</div>
          <div className="text-3xl font-black text-stone-900 dark:text-stone-100 mt-1">{totalProcurementQuintals} <span className="text-sm font-semibold text-stone-500 dark:text-stone-400">Qtl</span></div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">{formatQuantity(totalProcurementKg)}</div>
        </div>
      </div>

      {/* ACTIVE FPO POOL AGGREGATION & PROCUREMENT CARD */}
      <div className="bg-gradient-to-br from-emerald-950 via-[#102213] to-[#0a180e] border-2 border-[#D3D67A]/60 rounded-3xl p-6 md:p-7 text-white shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#D3D67A] text-[#1c3618] shadow-xs">
                🥞 Live FPO Aggregation Pool
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-emerald-300 border border-white/10">
                Baramati & Pune Cluster
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Wholesale Stock</span>
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 pt-1">
              <span>🍅 {activePool.crop} ({activePool.variety || 'Abhinav Hybrid'})</span>
              <span className="text-sm font-bold text-[#D3D67A] px-2 py-0.5 rounded-md bg-black/40 border border-[#D3D67A]/40">
                {activePool.quality_grade || 'Grade A'}
              </span>
            </h2>

            <p className="text-xs md:text-sm text-stone-300 font-medium">
              {activePool.name} • Certified aggregation center. Farmers contribute lots together for bulk buyers.
            </p>

            {/* Progress Bar & Available metrics */}
            <div className="pt-2 max-w-xl space-y-1.5">
              <div className="flex justify-between items-baseline text-xs font-bold">
                <span className="text-stone-300">
                  Pool Progress: <strong className="text-white text-sm">{Math.round(activePool.current_quantity_kg || 0)} kg</strong> available
                </span>
                <span className="text-[#D3D67A]">
                  Target: {activePool.target_quantity_kg || 1200} kg ({Math.min(100, Math.round(((activePool.current_quantity_kg || 0) / (activePool.target_quantity_kg || 1200)) * 100))}%)
                </span>
              </div>
              <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden border border-white/15 p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-400 via-emerald-400 to-[#D3D67A] h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, Math.round(((activePool.current_quantity_kg || 0) / (activePool.target_quantity_kg || 1200)) * 100))
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-stone-400 pt-0.5">
                <span>Wholesale modal rate: <strong className="text-white">₹{activePool.price_per_kg}/kg</strong></span>
                <span>{activePool.farmers_count || 4} contributing farmers linked</span>
              </div>
            </div>
          </div>

          {/* Quick Buy Actions */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/15 flex flex-col gap-3 shrink-0 lg:w-72">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-stone-300">Pool Buy Rate</span>
              <span className="text-2xl font-black text-[#D3D67A]">₹{activePool.price_per_kg}<span className="text-xs font-normal text-stone-300">/kg</span></span>
            </div>

            {activePool.current_quantity_kg > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    disabled={buyingPoolLoading || activePool.current_quantity_kg < 150}
                    onClick={() => handleBuyPoolStock(150)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition border border-white/10 cursor-pointer disabled:opacity-40"
                  >
                    Buy 150 kg
                  </button>
                  <button
                    type="button"
                    disabled={buyingPoolLoading || activePool.current_quantity_kg < 300}
                    onClick={() => handleBuyPoolStock(300)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition border border-white/10 cursor-pointer disabled:opacity-40"
                  >
                    Buy 300 kg
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="10"
                    max={activePool.current_quantity_kg}
                    step="10"
                    placeholder="Custom kg"
                    value={poolBuyCustomQty}
                    onChange={(e) => setPoolBuyCustomQty(e.target.value)}
                    className="w-1/2 px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white font-bold placeholder-stone-400 focus:outline-none focus:border-[#D3D67A]"
                  />
                  <button
                    type="button"
                    disabled={buyingPoolLoading || !poolBuyCustomQty || parseFloat(poolBuyCustomQty) <= 0}
                    onClick={() => handleBuyPoolStock(parseFloat(poolBuyCustomQty))}
                    className="w-1/2 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 cursor-pointer disabled:opacity-40 transition"
                  >
                    Buy Custom
                  </button>
                </div>

                <button
                  type="button"
                  disabled={buyingPoolLoading}
                  onClick={() => handleBuyPoolStock(activePool.current_quantity_kg)}
                  className="w-full py-2.5 rounded-xl bg-[#D3D67A] hover:bg-[#c2c56a] text-[#1c3618] font-extrabold text-xs md:text-sm shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>{buyingPoolLoading ? 'Processing...' : `Buy All (${Math.round(activePool.current_quantity_kg)} kg)`}</span>
                </button>
              </>
            ) : (
              <div className="text-center py-2 text-xs font-bold text-amber-300 bg-amber-950/60 rounded-xl p-2 border border-amber-800">
                ✓ Full Pool Stock Purchased & Settled
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary View Switcher: Available Farmer Harvests vs Bids vs Trades vs Requirements */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('available_crops')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'available_crops'
              ? 'border-[#2A5124] dark:border-[#D3D67A] text-[#2A5124] dark:text-[#D3D67A] font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <span>Available Farmer Harvests 🌾</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
            {availableProduce.length} Lots
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bids')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'bids'
              ? 'border-[#2A5124] dark:border-[#D3D67A] text-[#2A5124] dark:text-[#D3D67A] font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <span>My Procurement Bids</span>
          <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full font-semibold">
            {bids.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trades')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'trades'
              ? 'border-[#2A5124] dark:border-[#D3D67A] text-[#2A5124] dark:text-[#D3D67A] font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <span>Auction Trades & Settlements</span>
          {pendingTrades.length > 0 && (
            <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
              {pendingTrades.length} Due
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('requirements')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'requirements'
              ? 'border-[#2A5124] dark:border-[#D3D67A] text-[#2A5124] dark:text-[#D3D67A] font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <span>Direct Mandi Demands 🏛️</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
            {requirements.length} Active
          </span>
        </button>
      </div>

      {/* TAB 0: AVAILABLE FARMER HARVESTS */}
      {activeTab === 'available_crops' && (
        <Card highlight={true} className="p-0 overflow-hidden border-[#D3D67A]/30 dark:border-emerald-800/50 shadow-xl border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A]">
          <div className="p-4 bg-stone-50/80 dark:bg-[#111c12] border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>🌾 Fresh Harvest Lots Listed by Farmers</span>
                <span className="text-xs font-normal text-stone-500 dark:text-stone-400">शेतकऱ्यांचे उपलब्ध पिके</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Direct farm produce available for immediate instant purchase at ask price or custom bidding.
              </p>
            </div>
            <span className="text-xs font-bold text-[#2A5124] dark:text-[#D3D67A] bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 px-3 py-1 rounded-full border border-[#2A5124]/20 dark:border-[#D3D67A]/30 shrink-0">
              {availableProduce.length} Lots Available
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : availableProduce.length === 0 ? (
            <div className="text-center py-16 px-4">
              <span className="text-4xl mb-3 block">🌾</span>
              <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">No open farmer listings found</h3>
              <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 max-w-sm mx-auto">
                Farmers will list produce here. When they submit a new crop listing, it syncs live across both dashboards!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider bg-stone-50/50 dark:bg-[#132215]/50">
                    <th className="py-3 px-4 font-semibold">Crop & Variety</th>
                    <th className="py-3 px-4 font-semibold">Farmer / Location</th>
                    <th className="py-3 px-4 font-semibold">Available Qty</th>
                    <th className="py-3 px-4 font-semibold">Ask Price</th>
                    <th className="py-3 px-4 font-semibold">Grade</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {availableProduce.map((lot) => {
                    const lotId = lot._id || lot.id;
                    const qty = parseFloat(lot.quantity_remaining_kg || lot.quantity_kg || 0);
                    const askPrice = parseFloat(lot.ask_price_per_kg || 25);
                    const isBuying = buyingListingId === lotId;

                    return (
                      <tr key={lotId} className="hover:bg-stone-50/70 dark:hover:bg-emerald-950/20 transition">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl p-2 bg-stone-100 dark:bg-[#1a2d1d] rounded-xl border border-stone-200/60 dark:border-emerald-800/40 shrink-0">
                              {lot.crop?.toLowerCase().includes('onion') ? '🧅' : lot.crop?.toLowerCase().includes('tomato') ? '🍅' : lot.crop?.toLowerCase().includes('wheat') ? '🌾' : lot.crop?.toLowerCase().includes('soy') ? '🌱' : '📦'}
                            </span>
                            <div>
                              <span className="font-bold text-stone-900 dark:text-stone-100 block capitalize text-base">
                                {lot.crop}
                              </span>
                              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                                {lot.variety || 'Hybrid'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                            {lot.farmer_name || 'Ramesh Patil'}
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {lot.location?.address || 'Niphad, Nashik'}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                            {formatQuantity(qty)}
                          </span>
                          <span className="text-xs text-stone-400 block font-normal">
                            {(qty / 100).toFixed(1)} Qtl
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-extrabold text-green-700 dark:text-[#D3D67A] text-base">
                            {formatCurrency(askPrice)}/kg
                          </span>
                          <span className="text-[11px] text-stone-400 block">
                            Total: {formatCurrency(qty * askPrice)}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <StatusBadge status={lot.quality_grade || 'A'} />
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleInstantBuy(lot)}
                              disabled={isBuying}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                              title="Instantly purchase and settle lot at ask price"
                            >
                              {isBuying ? '⏳ Buying...' : `⚡ Buy at ₹${askPrice}/kg`}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenQuickBid(lot)}
                              className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 transition cursor-pointer"
                            >
                              Offer Bid
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 1: BIDS TABLE */}
      {activeTab === 'bids' && (
        <Card highlight={true} className="p-0 overflow-hidden border-[#D3D67A]/30 dark:border-emerald-800/50 shadow-xl border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A]">
          {/* Filter Navigation Tabs */}
          <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#111c12] px-4 pt-3 gap-2 overflow-x-auto">
            {[
              { key: 'all', label: 'All Bids', count: totalBids },
              { key: 'open', label: 'Open', count: openBids.length },
              { key: 'matched', label: 'Matched', count: matchedBids.length },
              { key: 'cancelled', label: 'Cancelled', count: bids.filter((b) => b.status === 'cancelled').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  filterStatus === tab.key
                    ? 'border-green-700 dark:border-[#D3D67A] text-green-900 dark:text-[#D3D67A] font-bold'
                    : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filterStatus === tab.key ? 'bg-green-100 dark:bg-emerald-950 text-green-900 dark:text-emerald-300' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Content Body */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : filteredBids.length === 0 ? (
            <div className="py-16 text-center text-stone-500 dark:text-stone-400 space-y-3">
              <span className="text-4xl block">📝</span>
              <p className="text-base font-medium text-stone-700 dark:text-stone-300">No {filterStatus !== 'all' ? filterStatus : ''} bids placed yet.</p>
              <div className="pt-2">
                <Link to="/buyer/submit-bid">
                  <Button className="text-xs">Place First Bid</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-100/70 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Commodity / Crop</th>
                    <th className="py-3.5 px-4">Min Grade</th>
                    <th className="py-3.5 px-4">Quantity</th>
                    <th className="py-3.5 px-4">Max Bid Rate</th>
                    <th className="py-3.5 px-4">Total Value</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Placed On</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {filteredBids.map((bid) => {
                    const bidId = bid._id || bid.id;
                    const qty = parseFloat(bid.quantity_needed_kg || bid.quantity) || 0;
                    const price = parseFloat(bid.max_price_per_kg || bid.price) || 0;
                    const totalVal = qty * price;
                    const isOpen = bid.status === 'open';

                    return (
                      <tr key={bidId} className="hover:bg-stone-50/80 dark:hover:bg-emerald-950/20 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100 capitalize">
                          {bid.crop || bid.commodity}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={`grade_${(bid.min_quality_grade || bid.grade || 'C').toLowerCase()}`} />
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-900 dark:text-stone-100">
                          {formatQuantity(qty)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-green-700 dark:text-[#D3D67A]">
                          {formatCurrency(price)}/kg
                        </td>
                        <td className="py-3.5 px-4 text-stone-900 dark:text-stone-100 font-semibold">
                          ₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={bid.status} />
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 dark:text-stone-400 text-xs">
                          {formatDate(bid.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isOpen ? (
                            <button
                              type="button"
                              onClick={() => handleCancel(bidId)}
                              disabled={actionLoading === bidId}
                              className="text-xs border border-red-500/40 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-md font-semibold transition"
                            >
                              {actionLoading === bidId ? 'Cancelling...' : 'Cancel'}
                            </button>
                          ) : (
                            <span className="text-xs text-stone-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: EXECUTED TRADES & PAYMENTS */}
      {activeTab === 'trades' && (
        <Card highlight={true} className="p-0 overflow-hidden border-[#D3D67A]/30 dark:border-emerald-800/50 shadow-xl border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A]">
          {trades.length === 0 ? (
            <div className="py-16 text-center text-stone-500 dark:text-stone-400 space-y-3">
              <span className="text-4xl block">🤝</span>
              <p className="text-base font-semibold text-stone-800 dark:text-stone-200">No auction trades yet</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                When the double auction engine matches your bid against pooled farmer batches, the clearing trade will appear here for payment checkout.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-100/70 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Trade Reference</th>
                    <th className="py-3.5 px-4">Crop</th>
                    <th className="py-3.5 px-4">Quantity</th>
                    <th className="py-3.5 px-4">Clearing Rate</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Payment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {trades.map((trade) => {
                    const tradeId = trade._id || trade.id;
                    const isPending = trade.status === 'pending_payment' || trade.status === 'payment_processing';
                    const isSettled = trade.status === 'settled';

                    return (
                      <tr key={tradeId} className="hover:bg-stone-50/80 dark:hover:bg-emerald-950/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
                          #{String(tradeId).slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100 capitalize">{trade.crop}</td>
                        <td className="py-3.5 px-4 font-semibold text-stone-900 dark:text-stone-100">
                          {formatQuantity(trade.quantity_kg)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-green-700 dark:text-[#D3D67A]">
                          {formatCurrency(trade.clearing_price_per_kg)}/kg
                        </td>
                        <td className="py-3.5 px-4 font-bold text-base text-stone-900 dark:text-stone-100">
                          ₹{Number(trade.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={trade.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isPending && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={actionLoading === tradeId}
                              onClick={() => handleStartPayment(trade)}
                              className="shadow-sm font-semibold"
                            >
                              {actionLoading === tradeId ? 'Opening...' : '💳 Pay Now (Razorpay)'}
                            </Button>
                          )}
                          {isSettled && (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                              Paid & Settled ✓
                            </span>
                          )}
                          {!isPending && !isSettled && (
                            <span className="text-xs text-stone-400 capitalize">{trade.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: DIRECT MANDI PROCUREMENT DEMANDS */}
      {activeTab === 'requirements' && (
        <div className="space-y-4">
          {/* Action Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/95 dark:bg-[#132215]/95 p-6 rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 shadow-xl border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A]">
            <div>
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>🏛️</span> Direct Mandi Procurement Requirements
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium">
                Post exact crop quantities required at the official Mandi modal rate. Participating farmers in your district supply produce directly, automatically updating this dashboard.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowReqModal(true)}
              className="font-bold flex items-center gap-1.5 shadow-md whitespace-nowrap"
            >
              <span>➕</span> Post New Mandi Demand
            </Button>
          </div>

          {requirements.length === 0 ? (
            <Card className="py-16 text-center text-stone-500 dark:text-stone-400 space-y-3">
              <span className="text-4xl block">📦</span>
              <p className="text-base font-semibold text-stone-800 dark:text-stone-200">No active procurement requirements</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Post a requirement at the official Mandi price to allow local farmers to supply crops directly to your warehouse.
              </p>
              <div className="pt-2">
                <Button size="sm" onClick={() => setShowReqModal(true)}>Post Requirement</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {requirements.map((req) => {
                const reqId = req._id || req.id;
                const totalKg = req.total_quantity_needed_kg || 1;
                const fulfilledKg = req.fulfilled_quantity_kg || 0;
                const progressPct = Math.min(100, Math.round((fulfilledKg / totalKg) * 100));
                const remainingKg = Math.max(0, totalKg - fulfilledKg);
                const fulfillments = req.fulfillments || [];
                const isExpanded = expandedReqId === reqId;

                return (
                  <Card key={reqId} highlight={true} className="p-6 border-[#D3D67A]/30 dark:border-emerald-800/50 shadow-xl border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A] transition">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {req.crop?.toLowerCase().includes('onion') ? '🧅' : req.crop?.toLowerCase().includes('wheat') ? '🌾' : req.crop?.toLowerCase().includes('tomato') ? '🍅' : req.crop?.toLowerCase().includes('potato') ? '🥔' : '🌱'}
                          </span>
                          <div>
                            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 capitalize">
                              {req.crop} {req.variety ? `(${req.variety})` : ''}
                            </h3>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              📍 {req.district}, {req.state} • Benchmark Mandi: <strong className="text-stone-700 dark:text-stone-300">{req.target_mandi}</strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-stone-400 uppercase font-bold">Guaranteed Mandi Rate</div>
                          <div className="text-lg font-black text-emerald-700 dark:text-[#D3D67A]">
                            ₹{req.mandi_modal_price_per_kg?.toFixed(2)}/kg
                          </div>
                        </div>
                        <StatusBadge status={req.status || 'open'} />
                      </div>
                    </div>

                    {/* Progress Bar & Quantity Breakdown */}
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                        <span>Fulfillment: {fulfilledKg.toLocaleString()} / {totalKg.toLocaleString()} kg ({progressPct}%)</span>
                        <span className={remainingKg === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                          {remainingKg === 0 ? 'Fully Fulfilled ✓' : `${remainingKg.toLocaleString()} kg remaining`}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-stone-200 dark:border-stone-700">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-[#2A5124] transition-all duration-700 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-1">
                        <span>Min supply lot: {req.min_supply_per_farmer_kg || 100} kg/farmer</span>
                        <span>Delivery deadline: {req.delivery_deadline || 'Open'}</span>
                      </div>
                    </div>

                    {/* Contributing Farmers Accordion */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      <button
                        onClick={() => setExpandedReqId(isExpanded ? null : reqId)}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                      >
                        <span>{isExpanded ? '▲ Hide' : '▼ View'} Contributing Farmers</span>
                        <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.2 rounded-full font-mono text-[10px]">
                          {fulfillments.length}
                        </span>
                      </button>

                      <span className="text-xs text-stone-400 font-medium">
                        Total Payout: ₹{(fulfilledKg * (req.mandi_modal_price_per_kg || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Contributing Farmers Table Dropdown */}
                    {isExpanded && (
                      <div className="mt-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl p-3 border border-stone-200 dark:border-stone-700 animate-fadeIn">
                        {fulfillments.length === 0 ? (
                          <div className="text-center py-4 text-xs text-stone-500 dark:text-stone-400">
                            No farmer contributions recorded yet for this requirement.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 uppercase font-semibold">
                                  <th className="py-2 px-3">Farmer Name</th>
                                  <th className="py-2 px-3">Contact</th>
                                  <th className="py-2 px-3">Village / Taluk</th>
                                  <th className="py-2 px-3">Quantity Supplied</th>
                                  <th className="py-2 px-3">Mandi Rate</th>
                                  <th className="py-2 px-3">Total Payout</th>
                                  <th className="py-2 px-3">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                                {fulfillments.map((f, idx) => (
                                  <tr key={idx} className="hover:bg-white dark:hover:bg-stone-700/50 transition">
                                    <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-stone-100">
                                      {f.farmer_name}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-stone-600 dark:text-stone-300">
                                      {f.farmer_phone}
                                    </td>
                                    <td className="py-2.5 px-3 text-stone-600 dark:text-stone-300">
                                      {f.village}
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-stone-800 dark:text-stone-100">
                                      {f.quantity_kg} kg
                                    </td>
                                    <td className="py-2.5 px-3 text-emerald-700 dark:text-[#D3D67A] font-semibold">
                                      ₹{f.mandi_price?.toFixed(2)}/kg
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-stone-900 dark:text-stone-100">
                                      ₹{Number(f.total_payout).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-stone-400 text-[11px]">
                                      {f.fulfilled_at ? new Date(f.fulfilled_at).toLocaleDateString() : 'Recent'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RAZORPAY TEST-MODE CHECKOUT MODAL */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="font-bold text-stone-900 text-lg">Razorpay Checkout</h3>
              </div>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">
                TEST MODE
              </span>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Order ID:</span>
                <span className="font-mono text-xs font-bold text-stone-800">{paymentModal.orderData.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Commodity:</span>
                <span className="font-bold text-stone-900">{paymentModal.orderData.crop} ({paymentModal.orderData.quantity_kg} kg)</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-stone-200">
                <span className="text-stone-900">Total Payable:</span>
                <span className="text-emerald-700">₹{paymentModal.orderData.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Test mode simulates instant Razorpay payment capture and automatic pro-rata settlement distribution to all participating farmers.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={payingLoading}
                onClick={() => setPaymentModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 font-bold shadow-md"
                disabled={payingLoading}
                onClick={handleCompletePayment}
              >
                {payingLoading ? 'Processing...' : 'Confirm Payment ₹'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* POST NEW PROCUREMENT REQUIREMENT MODAL */}
      {showReqModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏛️</span>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-lg">
                  Post Direct Mandi Demand
                </h3>
              </div>
              <button
                onClick={() => setShowReqModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequirement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Commodity / Crop *
                  </label>
                  <select
                    value={newReq.crop}
                    onChange={(e) => setNewReq({ ...newReq, crop: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                    required
                  >
                    <option value="onion">Onion (कांदा)</option>
                    <option value="wheat">Wheat (गहू)</option>
                    <option value="tomato">Tomato (टोमॅटो)</option>
                    <option value="potato">Potato (बटाटा)</option>
                    <option value="soybean">Soybean (सोयाबीन)</option>
                    <option value="maize">Maize (मका)</option>
                    <option value="cotton">Cotton (कापूस)</option>
                    <option value="mustard">Mustard (मोहरी)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Variety (Optional)
                  </label>
                  <input
                    type="text"
                    value={newReq.variety}
                    onChange={(e) => setNewReq({ ...newReq, variety: e.target.value })}
                    placeholder="e.g. Nashik Red / Sharbati"
                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Target Mandi Benchmark *
                  </label>
                  <input
                    type="text"
                    value={newReq.target_mandi}
                    onChange={(e) => setNewReq({ ...newReq, target_mandi: e.target.value })}
                    placeholder="e.g. Lasalgaon APMC"
                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Mandi Modal Price (₹/kg) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="1"
                    value={newReq.mandi_modal_price_per_kg}
                    onChange={(e) => setNewReq({ ...newReq, mandi_modal_price_per_kg: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold text-emerald-700 dark:text-[#D3D67A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Total Quantity Needed (kg) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={newReq.total_quantity_needed_kg}
                    onChange={(e) => setNewReq({ ...newReq, total_quantity_needed_kg: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Min Supply per Farmer (kg)
                  </label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={newReq.min_supply_per_farmer_kg}
                    onChange={(e) => setNewReq({ ...newReq, min_supply_per_farmer_kg: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    value={newReq.district}
                    onChange={(e) => setNewReq({ ...newReq, district: e.target.value })}
                    placeholder="e.g. Nashik"
                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Delivery Deadline *
                  </label>
                  <input
                    type="date"
                    value={newReq.delivery_deadline}
                    onChange={(e) => setNewReq({ ...newReq, delivery_deadline: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed border border-emerald-200 dark:border-emerald-800">
                💡 <strong>Fair Mandi Settlement:</strong> By posting at the benchmark Mandi price, local farmers receive 100% of the modal value without middleman cuts, ensuring high fulfillment speed and premium quality.
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowReqModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 font-bold shadow-md"
                  disabled={creatingReq}
                >
                  {creatingReq ? 'Posting...' : 'Post Procurement Demand'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK BID ON FARMER HARVEST MODAL */}
      {quickBidModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121f14] rounded-2xl border border-[#D3D67A]/40 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 dark:border-emerald-900/40 pb-3">
              <h3 className="font-black text-stone-900 dark:text-stone-100 text-base">
                Place Offer on {quickBidModal.crop}
              </h3>
              <button
                onClick={() => setQuickBidModal(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
              Submit your direct offer to <strong>{quickBidModal.farmer_name || 'the farmer'}</strong>. The farmer will receive this offer live on their dashboard!
            </p>
            <form onSubmit={handleQuickBidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Offered Price (₹ / kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="1"
                  value={quickBidForm.max_price_per_kg}
                  onChange={(e) => setQuickBidForm({ ...quickBidForm, max_price_per_kg: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Quantity Needed (kg)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  min="1"
                  value={quickBidForm.quantity_needed_kg}
                  onChange={(e) => setQuickBidForm({ ...quickBidForm, quantity_needed_kg: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold"
                />
              </div>
              <div className="p-3 bg-stone-50 dark:bg-emerald-950/40 rounded-xl text-xs flex justify-between font-semibold">
                <span className="text-stone-500 dark:text-stone-400">Total Commitment:</span>
                <span className="text-emerald-700 dark:text-[#D3D67A] font-extrabold text-sm">
                  {formatCurrency((parseFloat(quickBidForm.max_price_per_kg) || 0) * (parseFloat(quickBidForm.quantity_needed_kg) || 0))}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickBidModal(null)}
                  className="w-1/2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading === 'quick_bid'}
                  className="w-1/2 font-bold"
                >
                  {actionLoading === 'quick_bid' ? 'Submitting...' : 'Submit Bid 🚀'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
