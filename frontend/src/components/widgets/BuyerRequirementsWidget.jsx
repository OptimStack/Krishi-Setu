import { useState, useEffect, useRef } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { getRequirements, fulfillRequirement } from '../../api/requirements';
import { formatCurrency, formatQuantity } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { staggerIn, modalEnter } from '../../utils/animations';

export default function BuyerRequirementsWidget() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [supplyQty, setSupplyQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const cardsContainerRef = useRef(null);
  const modalRef = useRef(null);

  const fetchReqs = async () => {
    try {
      const res = await getRequirements();
      if (res && res.data) {
        setRequirements(res.data);
      }
    } catch (err) {
      console.error('Failed to load buyer requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReqs();
    const interval = setInterval(fetchReqs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && requirements.length > 0 && cardsContainerRef.current) {
      const cards = cardsContainerRef.current.querySelectorAll('.req-card');
      staggerIn(cards, { stagger: 0.1, y: 15 });
    }
  }, [loading, requirements.length]);

  useEffect(() => {
    if (selectedReq && modalRef.current) {
      modalEnter(modalRef.current);
    }
  }, [selectedReq]);

  const handleOpenSupply = (req) => {
    setSelectedReq(req);
    setSupplyQty(Math.min(300, req.total_quantity_needed_kg - (req.fulfilled_quantity_kg || 0)).toString());
    setFeedback(null);
  };

  const handleConfirmSupply = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    const qty = parseFloat(supplyQty);
    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: 'error', text: 'Please enter a valid quantity greater than 0 kg.' });
      return;
    }

    const remaining = selectedReq.total_quantity_needed_kg - (selectedReq.fulfilled_quantity_kg || 0);
    if (qty > remaining) {
      setFeedback({
        type: 'error',
        text: `Quantity exceeds remaining requirement (${remaining.toLocaleString()} kg).`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fulfillRequirement(selectedReq._id, {
        quantity_kg: qty,
        farmer_id: user?.id,
        farmer_name: user?.name,
        farmer_phone: user?.phone,
        village: user?.location?.address || 'Niphad, Nashik',
      });

      if (res.error) {
        setFeedback({ type: 'error', text: res.error.message || 'Supply submission failed.' });
      } else {
        setFeedback({
          type: 'success',
          text: `Successfully allocated ${qty.toLocaleString()} kg! Payout of ${formatCurrency(
            qty * selectedReq.mandi_modal_price_per_kg
          )} credited at guaranteed Mandi price.`,
        });
        fetchReqs();
        setTimeout(() => {
          setSelectedReq(null);
          setFeedback(null);
        }, 1800);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to communicate with direct supply engine.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card highlight={true} className="border-[#D3D67A]/40 dark:border-emerald-800/40 shadow-xl border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 pb-4 border-b border-stone-200 dark:border-emerald-900/40">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🤝</span>
            <h2 className="text-xl font-black text-[#2A5124] dark:text-[#D3D67A] tracking-tight">
              Buyer Procurement Demands (Mandi Price Guaranteed)
            </h2>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium">
            Verified corporate buyers procuring directly from nearby farmers at the official Mandi modal rate. Zero commission fees.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
          Live Procurement Orders: {requirements.length}
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-500 text-sm">Loading nearby buyer demands...</div>
      ) : requirements.length === 0 ? (
        <div className="py-8 text-center text-stone-500 text-sm">
          No open buyer demands right now. Check back shortly!
        </div>
      ) : (
        <div ref={cardsContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requirements.map((req) => {
            const fulfilled = req.fulfilled_quantity_kg || 0;
            const total = req.total_quantity_needed_kg;
            const remaining = Math.max(0, total - fulfilled);
            const percent = Math.min(100, Math.round((fulfilled / total) * 100));
            const isFull = fulfilled >= total;

            return (
              <div
                key={req._id}
                className="req-card rounded-2xl p-5 bg-stone-50/90 dark:bg-[#0c160e]/90 border border-stone-200/90 dark:border-emerald-900/50 border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A] shadow-md flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      {req.crop} • {req.variety || 'Bulk'}
                    </span>
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                      📍 {req.district || 'Maharashtra'}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                    {req.buyer_name}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                    Benchmark: <span className="font-semibold">{req.target_mandi}</span>
                  </p>

                  {/* Guaranteed Mandi Price Banner */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 mb-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                        Guaranteed Mandi Price:
                      </span>
                      <span className="text-base font-extrabold text-[#2A5124] dark:text-[#D3D67A]">
                        ₹{req.mandi_modal_price_per_kg.toFixed(2)}/kg
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      ₹{(req.mandi_modal_price_per_kg * 100).toFixed(0)}/Quintal • 0% Mandi Commission
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-300">
                      <span>Fulfilled: {formatQuantity(fulfilled)}</span>
                      <span>Needed: {formatQuantity(total)}</span>
                    </div>
                    <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#2A5124] to-[#D3D67A] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span>{percent}% completed</span>
                      <span>{formatQuantity(remaining)} remaining</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/80 dark:border-emerald-900/30">
                  <Button
                    onClick={() => handleOpenSupply(req)}
                    disabled={isFull}
                    className="w-full text-xs py-2 bg-[#2A5124] hover:bg-[#1d3a19] dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] dark:text-[#182d15] text-white font-bold"
                  >
                    {isFull ? 'Requirement Fulfilled' : 'Supply Produce at Mandi Price →'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supply Allocation Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="w-full max-w-md bg-white dark:bg-[#152317] rounded-2xl shadow-2xl border border-stone-200 dark:border-emerald-800/50 p-6 text-stone-900 dark:text-stone-100"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-[#D3D67A] uppercase tracking-wider">
                  Direct Mandi Procurement
                </span>
                <h3 className="text-xl font-bold mt-0.5">
                  Supply to {selectedReq.buyer_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg mb-4 text-xs font-semibold ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleConfirmSupply} className="space-y-4">
              <div className="p-3 bg-stone-50 dark:bg-black/30 rounded-lg text-xs space-y-1 border border-stone-200 dark:border-stone-800">
                <div className="flex justify-between">
                  <span className="text-stone-500">Crop / Variety:</span>
                  <span className="font-semibold capitalize">
                    {selectedReq.crop} ({selectedReq.variety || 'Bulk'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Official Mandi:</span>
                  <span className="font-semibold">{selectedReq.target_mandi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Protected Price:</span>
                  <span className="font-bold text-emerald-700 dark:text-[#D3D67A]">
                    ₹{selectedReq.mandi_modal_price_per_kg.toFixed(2)}/kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Remaining Demand:</span>
                  <span className="font-semibold">
                    {formatQuantity(
                      selectedReq.total_quantity_needed_kg -
                        (selectedReq.fulfilled_quantity_kg || 0)
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Quantity You Want to Supply (kg)
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={supplyQty}
                  onChange={(e) => setSupplyQty(e.target.value)}
                  placeholder="e.g. 300"
                  required
                />
              </div>

              {/* Dynamic Calculation Box */}
              {parseFloat(supplyQty) > 0 && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-xs">
                  <div className="flex justify-between items-center text-stone-600 dark:text-stone-300">
                    <span>
                      {parseFloat(supplyQty).toLocaleString()} kg × ₹
                      {selectedReq.mandi_modal_price_per_kg.toFixed(2)}/kg:
                    </span>
                    <span className="text-base font-extrabold text-[#2A5124] dark:text-[#D3D67A]">
                      {formatCurrency(
                        parseFloat(supplyQty) * selectedReq.mandi_modal_price_per_kg
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1">
                    ✓ 100% direct settlement into your bank account/UPI upon delivery.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setSelectedReq(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#2A5124] hover:bg-[#1d3a19] dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] dark:text-[#182d15] text-white font-bold"
                >
                  {submitting ? 'Confirming...' : 'Confirm Allocation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
