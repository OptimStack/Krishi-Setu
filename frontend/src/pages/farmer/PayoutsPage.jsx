import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getPayouts } from '../../api/payments';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await getPayouts();
      if (res && res.data) {
        setPayouts(res.data);
      }
    } catch (err) {
      console.error('Failed to load payouts:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts(false);
    const interval = setInterval(() => fetchPayouts(true), 15000);
    return () => clearInterval(interval);
  }, [fetchPayouts]);

  const totalEarnings = payouts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const settledEarnings = payouts
    .filter((p) => p.status === 'settled')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalVolumeKg = payouts.reduce((sum, p) => sum + (parseFloat(p.quantity_kg) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-green-900">Farmer Payout History / खात्यावरील जमा रक्कम</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-stone-600 text-sm mt-0.5">
            Transparent per-farmer settlement breakdown for all completed double-auction trades.
          </p>
        </div>
        <Link
          to="/farmer/dashboard"
          className="text-sm font-medium text-stone-600 hover:text-green-800 transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Settled Payouts</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(settledEarnings)}</p>
          <p className="text-xs text-stone-400 mt-1">Transferred directly to farmer bank account</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Total Traded Volume</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">
            {(totalVolumeKg / 100).toFixed(1)} <span className="text-sm font-normal text-stone-600">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 mt-1">{totalVolumeKg.toLocaleString('en-IN')} kg across {payouts.length} auction trade(s)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Pending Settlement</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {formatCurrency(totalEarnings - settledEarnings)}
          </p>
          <p className="text-xs text-stone-400 mt-1">Awaiting buyer payment capture</p>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-stone-800 mb-4">Trade Payout Records</h2>
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <span className="text-4xl mb-3 block">💰</span>
            <h3 className="text-base font-semibold text-stone-700">No payout records yet</h3>
            <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
              Once your pooled produce is matched with buyer bids in an auction round, your share of the settlement will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Payout ID</th>
                  <th className="pb-3 font-semibold">Crop</th>
                  <th className="pb-3 font-semibold">Quantity</th>
                  <th className="pb-3 font-semibold">Clearing Price</th>
                  <th className="pb-3 font-semibold">Your Payout</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3.5 font-mono text-xs font-medium text-stone-700">
                      {payout.id}
                    </td>
                    <td className="py-3.5 font-semibold text-stone-900">{payout.crop}</td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span>{formatQuantity(payout.quantity_kg)}</span>
                      <span className="text-xs text-stone-400 block">
                        {(parseFloat(payout.quantity_kg) / 100).toFixed(1)} Qtl
                      </span>
                    </td>
                    <td className="py-3.5 whitespace-nowrap text-stone-700">
                      {formatCurrency(payout.clearing_price_per_kg)}/kg
                    </td>
                    <td className="py-3.5 whitespace-nowrap font-bold text-green-700 text-base">
                      {formatCurrency(payout.amount)}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <StatusBadge status={payout.status} />
                    </td>
                    <td className="py-3.5 whitespace-nowrap text-xs text-stone-500">
                      {formatDate(payout.date || payout.settled_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
