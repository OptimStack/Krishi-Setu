import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getBids, cancelBid } from '../../api/bids';
import { getBuyerTrades, createPaymentOrder, verifyPayment } from '../../api/payments';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('bids'); // 'bids' | 'trades'
  const [actionLoading, setActionLoading] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null); // { trade, orderData }
  const [payingLoading, setPayingLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const fetchData = useCallback(async () => {
    try {
      const [bidsRes, tradesRes] = await Promise.allSettled([
        getBids(),
        getBuyerTrades(),
      ]);

      if (bidsRes.status === 'fulfilled' && bidsRes.value?.data) {
        setBids(bidsRes.value.data);
      }
      if (tradesRes.status === 'fulfilled' && tradesRes.value?.data) {
        setTrades(tradesRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load buyer data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 15 seconds for live auction clearing
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-green-900 to-emerald-800 text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {user?.name || 'Buyer'}! 🏢
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-700/80 text-emerald-100 border border-emerald-500/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-emerald-200 text-sm mt-1">
            Wholesale procurement & double-auction bidding dashboard
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/buyer/browse">
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-lg shadow transition text-sm flex items-center gap-2">
              <span>🔍</span> Browse Batches
            </button>
          </Link>
          <Link to="/buyer/submit-bid">
            <button className="bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold px-4 py-2.5 rounded-lg shadow transition text-sm flex items-center gap-2">
              <span>➕</span> Place New Bid
            </button>
          </Link>
          <button
            onClick={fetchData}
            className="bg-green-800/80 hover:bg-green-800 text-white px-3 py-2.5 rounded-lg text-sm transition"
            title="Refresh Data"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Action Feedback */}
      {feedback.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback({ text: '', type: '' })}
            className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-stone-200 shadow-sm">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Total Bids</div>
          <div className="text-3xl font-extrabold text-stone-900 mt-1">{totalBids}</div>
          <div className="text-xs text-stone-500 mt-1">Orders submitted</div>
        </Card>

        <Card className="p-4 bg-white border border-stone-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Bids</div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-1">{openBids.length}</div>
          <div className="text-xs text-stone-500 mt-1">Awaiting auction clearing</div>
        </Card>

        <Card className="p-4 bg-white border border-stone-200 shadow-sm">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Won Trades</div>
          <div className="text-3xl font-extrabold text-blue-700 mt-1">
            {trades.length}
          </div>
          <div className="text-xs text-stone-500 mt-1">{pendingTrades.length} pending checkout</div>
        </Card>

        <Card className="p-4 bg-white border border-stone-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Volume</div>
          <div className="text-3xl font-extrabold text-stone-900 mt-1">{totalProcurementQuintals} <span className="text-sm font-semibold text-stone-500">Qtl</span></div>
          <div className="text-xs text-stone-500 mt-1">{formatQuantity(totalProcurementKg)}</div>
        </Card>
      </div>

      {/* Primary View Switcher: Bids vs Trades */}
      <div className="flex border-b border-stone-200 gap-4">
        <button
          onClick={() => setActiveTab('bids')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'bids'
              ? 'border-green-700 text-green-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <span>Procurement Bids</span>
          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
            {bids.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trades')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'trades'
              ? 'border-green-700 text-green-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <span>Auction Trades & Settlements</span>
          {pendingTrades.length > 0 && (
            <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
              {pendingTrades.length} Due
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BIDS TABLE */}
      {activeTab === 'bids' && (
        <Card className="p-0 overflow-hidden border border-stone-200 shadow-sm">
          {/* Filter Navigation Tabs */}
          <div className="flex border-b border-stone-200 bg-stone-50 px-4 pt-3 gap-2 overflow-x-auto">
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
                    ? 'border-green-700 text-green-800 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterStatus === tab.key ? 'bg-green-100 text-green-900' : 'bg-stone-200 text-stone-600'
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
            <div className="py-16 text-center text-stone-500 space-y-3">
              <span className="text-4xl block">📝</span>
              <p className="text-base font-medium text-stone-700">No {filterStatus !== 'all' ? filterStatus : ''} bids placed yet.</p>
              <div className="pt-2">
                <Link to="/buyer/submit-bid">
                  <Button className="text-xs">Place First Bid</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-100/70 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider font-semibold">
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
                <tbody className="divide-y divide-stone-100">
                  {filteredBids.map((bid) => {
                    const bidId = bid._id || bid.id;
                    const qty = parseFloat(bid.quantity_needed_kg || bid.quantity) || 0;
                    const price = parseFloat(bid.max_price_per_kg || bid.price) || 0;
                    const totalVal = qty * price;
                    const isOpen = bid.status === 'open';

                    return (
                      <tr key={bidId} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-stone-900">
                          {bid.crop || bid.commodity}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={`grade_${(bid.min_quality_grade || bid.grade || 'C').toLowerCase()}`} />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-stone-800">
                          {formatQuantity(qty)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-green-800">
                          {formatCurrency(price)}/kg
                        </td>
                        <td className="py-3.5 px-4 text-stone-800 font-medium">
                          ₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={bid.status} />
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 text-xs">
                          {formatDate(bid.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isOpen ? (
                            <button
                              type="button"
                              onClick={() => handleCancel(bidId)}
                              disabled={actionLoading === bidId}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
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
        <Card className="p-0 overflow-hidden border border-stone-200 shadow-sm">
          {trades.length === 0 ? (
            <div className="py-16 text-center text-stone-500 space-y-3">
              <span className="text-4xl block">🤝</span>
              <p className="text-base font-semibold text-stone-800">No auction trades yet</p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                When the double auction engine matches your bid against pooled farmer batches, the clearing trade will appear here for payment checkout.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-100/70 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider font-semibold">
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
                <tbody className="divide-y divide-stone-100">
                  {trades.map((trade) => {
                    const tradeId = trade._id || trade.id;
                    const isPending = trade.status === 'pending_payment' || trade.status === 'payment_processing';
                    const isSettled = trade.status === 'settled';

                    return (
                      <tr key={tradeId} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-stone-700">
                          #{String(tradeId).slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-stone-900">{trade.crop}</td>
                        <td className="py-3.5 px-4 font-medium text-stone-800">
                          {formatQuantity(trade.quantity_kg)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-green-800">
                          {formatCurrency(trade.clearing_price_per_kg)}/kg
                        </td>
                        <td className="py-3.5 px-4 font-bold text-base text-stone-900">
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
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
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
    </div>
  );
}
