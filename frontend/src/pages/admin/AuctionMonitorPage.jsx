import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getAuctions, triggerAuction, triggerPooling } from '../../api/auctions';
import { formatCurrency, formatDate } from '../../utils/format';

const CROP_ICONS = {
  onion: '🧅',
  tomato: '🍅',
  soybean: '🌱',
  wheat: '🌾',
  cotton: '☁️',
  gram: '🫘',
  chana: '🫘',
  maize: '🌽',
};

function getCropEmoji(cropName) {
  const norm = (cropName || '').toLowerCase();
  for (const [key, emoji] of Object.entries(CROP_ICONS)) {
    if (norm.includes(key)) return emoji;
  }
  return '📦';
}

export default function AuctionMonitorPage() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // 'auction' | 'pooling' | null
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await getAuctions();
      if (res && res.data) {
        setAuctions(res.data);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load auction rounds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
    // Live polling every 10 seconds for real-time auction clearing updates
    const interval = setInterval(fetchAuctions, 10000);
    return () => clearInterval(interval);
  }, [fetchAuctions]);

  const handleTriggerAuction = async (cropFilter = null) => {
    setActionLoading('auction');
    setFeedback({ text: '', type: '' });
    try {
      const res = await triggerAuction(cropFilter ? { crop: cropFilter } : {});
      if (res.error) {
        setFeedback({ text: res.error.message || 'Auction run failed', type: 'error' });
      } else {
        const roundCount = res.data?.round_count || 0;
        const totalTrades = res.data?.results?.reduce((sum, r) => sum + (r.trade_count || 0), 0) || 0;
        setFeedback({
          text: `Double auction executed successfully! Processed ${roundCount} crop round(s) with ${totalTrades} trade match(es).`,
          type: 'success',
        });
        fetchAuctions();
      }
    } catch (err) {
      setFeedback({ text: 'Error triggering double auction run', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerPooling = async () => {
    setActionLoading('pooling');
    setFeedback({ text: '', type: '' });
    try {
      const res = await triggerPooling();
      if (res.error) {
        setFeedback({ text: res.error.message || 'Pooling engine run failed', type: 'error' });
      } else {
        const createdCount = res.data?.created_count || 0;
        setFeedback({
          text: `Pooling engine executed successfully! Created ${createdCount} pooled batch(es) from eligible farm lots.`,
          type: 'success',
        });
        fetchAuctions();
      }
    } catch (err) {
      setFeedback({ text: 'Error triggering pooling engine', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // KPIs
  const totalRounds = auctions.length;
  const completedRounds = auctions.filter((a) => a.status === 'completed');
  const runningRounds = auctions.filter((a) => a.status === 'running' || a.status === 'scheduled');
  const noMatchRounds = auctions.filter((a) => a.status === 'no_match');
  const totalTradesMatched = auctions.reduce((sum, a) => sum + (a.matched_trade_ids?.length || 0), 0);

  // Filtered rounds
  const filteredAuctions = auctions.filter((a) => {
    if (selectedCrop !== 'all' && (a.crop || '').toLowerCase() !== selectedCrop.toLowerCase()) {
      return false;
    }
    if (selectedStatus !== 'all' && (a.status || '').toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }
    return true;
  });

  const availableCrops = ['all', ...new Set(auctions.map((a) => a.crop).filter(Boolean))];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Command Center Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-stone-900 to-green-950 text-white p-6 rounded-2xl shadow-lg border border-green-900/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">⚖️</span>
            <h1 className="text-2xl font-bold tracking-tight">Auction Command & Monitor</h1>
          </div>
          <p className="text-green-300 text-sm mt-1">
            Real-time double auction matching engine supervisor & settlement monitor
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-stone-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Polling Active (10s sync)</span>
            <span>•</span>
            <span>Last checked: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleTriggerAuction()}
            disabled={actionLoading !== null}
            className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-4 py-2.5 shadow-md flex items-center gap-2 text-sm"
          >
            {actionLoading === 'auction' ? (
              <>
                <span className="animate-spin inline-block">⏳</span> Running Auction...
              </>
            ) : (
              <>
                <span>⚡</span> Run Double Auction
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleTriggerPooling}
            disabled={actionLoading !== null}
            className="bg-emerald-800/80 hover:bg-emerald-800 text-white border-emerald-600 px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
          >
            {actionLoading === 'pooling' ? (
              <>
                <span className="animate-spin inline-block">⏳</span> Pooling...
              </>
            ) : (
              <>
                <span>📦</span> Trigger Pooling
              </>
            )}
          </Button>

          <button
            onClick={fetchAuctions}
            disabled={loading}
            className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-2.5 rounded-lg text-sm transition"
            title="Refresh monitor now"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback({ text: '', type: '' })}
            className="text-stone-400 hover:text-stone-700 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Total Rounds</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{totalRounds}</p>
          <p className="text-xs text-stone-400 mt-1">All scheduled auction windows</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Cleared Rounds</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{completedRounds.length}</p>
          <p className="text-xs text-emerald-600 mt-1">Successfully cleared with trades</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Matched Trades</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{totalTradesMatched}</p>
          <p className="text-xs text-stone-400 mt-1">Farmer-buyer trade contracts</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">No-Match Carryovers</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{noMatchRounds.length}</p>
          <p className="text-xs text-stone-400 mt-1">Spread too wide / bids roll forward</p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Double Auction Batch History</h2>
            <p className="text-xs text-stone-500">
              Each round clears bids and asks simultaneously at the competitive equilibrium price.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium border border-stone-300 rounded-lg px-2.5 py-1.5 bg-stone-50 text-stone-700 focus:outline-none focus:ring-1 focus:ring-green-700"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="no_match">No Match</option>
              <option value="running">Running</option>
              <option value="scheduled">Scheduled</option>
            </select>

            {/* Crop Filter */}
            {availableCrops.length > 2 && (
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="text-xs font-medium border border-stone-300 rounded-lg px-2.5 py-1.5 bg-stone-50 text-stone-700 focus:outline-none focus:ring-1 focus:ring-green-700"
              >
                {availableCrops.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Commodities' : c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <span className="text-4xl mb-3 block">⚖️</span>
            <h3 className="text-base font-semibold text-stone-800">No auction rounds found</h3>
            <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
              {auctions.length === 0
                ? 'No auction batches have been executed yet. Click "Run Double Auction" to clear all eligible asks and bids.'
                : 'No auction rounds match the selected filters.'}
            </p>
            {auctions.length === 0 && (
              <div className="mt-4">
                <Button
                  onClick={() => handleTriggerAuction()}
                  disabled={actionLoading !== null}
                  className="bg-green-700 hover:bg-green-800 text-white text-xs px-4 py-2"
                >
                  ⚡ Trigger First Batch Auction
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Round ID</th>
                  <th className="pb-3 font-semibold">Crop</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Clearing Price</th>
                  <th className="pb-3 font-semibold">Matched Trades</th>
                  <th className="pb-3 font-semibold">Execution Window</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAuctions.map((round) => {
                  const id = round._id || round.id;
                  const tradeCount = round.matched_trade_ids?.length || 0;
                  const clearingPrice = round.clearing_price_per_kg;

                  return (
                    <tr key={id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 font-mono text-xs font-semibold text-stone-700">
                        #{id.slice(-6)}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getCropEmoji(round.crop)}</span>
                          <span className="font-semibold text-stone-900">{round.crop}</span>
                        </div>
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <StatusBadge status={round.status} />
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        {clearingPrice !== null && clearingPrice !== undefined ? (
                          <span className="font-bold text-green-700 text-sm">
                            {formatCurrency(clearingPrice)}/kg
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs italic">No clearing price</span>
                        )}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span
                          className={`font-semibold text-xs px-2.5 py-1 rounded-full ${
                            tradeCount > 0
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {tradeCount} trade(s)
                        </span>
                      </td>
                      <td className="py-3.5 whitespace-nowrap text-xs text-stone-500">
                        {formatDate(round.window_end || round.created_at)}
                      </td>
                      <td className="py-3.5 whitespace-nowrap text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTriggerAuction(round.crop)}
                          disabled={actionLoading !== null}
                          className="text-xs px-2.5 py-1"
                          title="Re-run matching for this specific crop"
                        >
                          Re-run {round.crop}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
