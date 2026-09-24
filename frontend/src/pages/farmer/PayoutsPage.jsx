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
    // Poll every 6 seconds for live settlement updates
    const interval = setInterval(() => fetchPayouts(true), 6000);

    const handleSync = () => {
      fetchPayouts(true);
    };

    window.addEventListener('krishisetu_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('krishisetu_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchPayouts]);

  const getPayoutAmount = (p) => parseFloat(p.amount ?? p.net_payout ?? p.gross_amount ?? 0);
  const getPayoutPrice = (p) => {
    if (p.clearing_price_per_kg) return parseFloat(p.clearing_price_per_kg);
    const qty = parseFloat(p.quantity_kg || 0);
    const amt = getPayoutAmount(p);
    return qty > 0 ? amt / qty : 25;
  };

  const totalEarnings = payouts.reduce((sum, p) => sum + getPayoutAmount(p), 0);
  const settledEarnings = payouts
    .filter((p) => p.status === 'settled' || p.status === 'credited')
    .reduce((sum, p) => sum + getPayoutAmount(p), 0);
  const totalVolumeKg = payouts.reduce((sum, p) => sum + (parseFloat(p.quantity_kg) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Farmer Payout History / खात्यावरील जमा रक्कम</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-stone-600 dark:text-stone-400 text-sm mt-0.5">
            Transparent per-farmer settlement breakdown for all completed double-auction trades.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPayouts(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            ↻ Refresh
          </button>
          <Link
            to="/farmer/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold shadow-xs transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/95 dark:bg-[#162518]/95 p-4 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Settled Payouts</p>
          <p className="text-2xl font-bold text-green-700 dark:text-[#D3D67A] mt-1">{formatCurrency(settledEarnings)}</p>
          <p className="text-xs text-stone-400 dark:text-stone-400 mt-1">Transferred directly to farmer bank account</p>
        </div>

        <div className="bg-white/95 dark:bg-[#162518]/95 p-4 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Total Traded Volume</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
            {(totalVolumeKg / 100).toFixed(1)} <span className="text-sm font-normal text-stone-600 dark:text-stone-300">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-400 mt-1">{totalVolumeKg.toLocaleString('en-IN')} kg across {payouts.length} auction trade(s)</p>
        </div>

        <div className="bg-white/95 dark:bg-[#162518]/95 p-4 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Pending Settlement</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalEarnings - settledEarnings)}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-400 mt-1">Awaiting buyer payment capture</p>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">Trade Payout Records</h2>
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <span className="text-4xl mb-3 block">💰</span>
            <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">No payout records yet</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 max-w-sm mx-auto">
              Once your pooled produce is matched with buyer bids in an auction round, your share of the settlement will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="pb-3">Payout ID</th>
                  <th className="pb-3">Crop</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Clearing Price</th>
                  <th className="pb-3">Your Payout</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-stone-50/70 dark:hover:bg-emerald-950/20 transition">
                    <td className="py-3.5 font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
                      {payout.id}
                    </td>
                    <td className="py-3.5 font-bold text-stone-900 dark:text-stone-100 capitalize">{payout.crop}</td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-stone-900 dark:text-stone-100">{formatQuantity(payout.quantity_kg)}</span>
                      <span className="text-xs text-stone-400 dark:text-stone-400 block">
                        {(parseFloat(payout.quantity_kg) / 100).toFixed(1)} Qtl
                      </span>
                    </td>
                    <td className="py-3.5 whitespace-nowrap text-stone-800 dark:text-stone-200 font-medium">
                      {formatCurrency(getPayoutPrice(payout))}/kg
                    </td>
                    <td className="py-3.5 whitespace-nowrap font-extrabold text-green-700 dark:text-[#D3D67A] text-base">
                      {formatCurrency(getPayoutAmount(payout))}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <StatusBadge status={payout.status} />
                    </td>
                    <td className="py-3.5 whitespace-nowrap text-xs text-stone-500 dark:text-stone-400">
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
