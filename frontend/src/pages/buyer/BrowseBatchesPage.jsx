import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { getBatches, buyBatchDirect } from '../../api/bids';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';

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

export default function BrowseBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [buyingBatchId, setBuyingBatchId] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const fetchBatches = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const params = {};
      if (selectedCrop !== 'all') params.crop = selectedCrop;
      if (selectedGrade !== 'all') params.quality_grade = selectedGrade;
      const res = await getBatches(params);
      setBatches(res.data || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
      if (!isPolling) setBatches([]);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [selectedCrop, selectedGrade]);

  useEffect(() => {
    fetchBatches(false);
    // Poll every 8 seconds for live updates
    const interval = setInterval(() => fetchBatches(true), 8000);

    const handleSync = () => {
      fetchBatches(true);
    };

    window.addEventListener('krishisetu_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('krishisetu_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchBatches]);

  const handleInstantBuy = async (batch) => {
    const bId = batch._id || batch.id;
    const askPrice = parseFloat(batch.weighted_ask_price_per_kg || batch.ask_price_per_kg || 25);
    const qty = parseFloat(batch.total_quantity_kg || batch.quantity || 100);
    const total = qty * askPrice;

    if (!window.confirm(`Confirm direct instant purchase of batch #${String(bId).slice(-6)} (${batch.crop}, ${qty} kg) at ₹${askPrice}/kg (Total: ₹${total.toLocaleString('en-IN')})?`)) return;

    setBuyingBatchId(bId);
    setFeedback({ text: '', type: '' });
    try {
      const res = await buyBatchDirect(bId);
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to complete instant buy', type: 'error' });
      } else {
        setFeedback({
          text: `🎉 Instant purchase completed! ₹${total.toLocaleString('en-IN')} trade settled and farmer payouts credited immediately.`,
          type: 'success',
        });
        fetchBatches(false);
      }
    } catch (err) {
      setFeedback({ text: 'Error completing purchase.', type: 'error' });
    } finally {
      setBuyingBatchId(null);
    }
  };

  const crops = ['all', 'Onion', 'Soybean', 'Wheat', 'Tomato', 'Cotton', 'Gram'];
  const grades = ['all', 'A', 'B', 'C'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Browse Pooled Batches</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            Pooled farmer produce ready for competitive double-auction bidding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/buyer/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold shadow-xs transition"
          >
            ← Dashboard
          </Link>
          <Button variant="outline" onClick={() => fetchBatches(false)} className="text-xs">
            ↻ Refresh
          </Button>
          <Link to="/buyer/submit-bid">
            <Button className="text-xs">
              + Place Direct Bid
            </Button>
          </Link>
        </div>
      </div>

      {feedback.text && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold shadow-md ${
            feedback.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/95 dark:bg-[#162518]/95 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-xs">
        {/* Crop Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mr-1">Crop:</span>
          {crops.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCrop(c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedCrop === c
                  ? 'bg-green-700 text-white border-green-700 dark:bg-emerald-800 dark:border-emerald-700 shadow-sm'
                  : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              {c === 'all' ? 'All Crops' : c}
            </button>
          ))}
        </div>

        {/* Grade Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mr-1">Grade:</span>
          {grades.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGrade(g)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                selectedGrade === g
                  ? 'bg-stone-800 dark:bg-[#D3D67A] text-white dark:text-[#182d15] border-stone-800 dark:border-[#D3D67A]'
                  : 'bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              {g === 'all' ? 'All' : `Grade ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : batches.length === 0 ? (
        <Card className="text-center py-16 px-4 bg-stone-50 dark:bg-[#121c13] border-dashed border-stone-300 dark:border-stone-700">
          <span className="text-5xl mb-4 block">🌾</span>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-2">No Active Pooled Batches Found</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
            Farmers are currently listing produce. When listings reach threshold volume, our cross-farmer pooling engine groups them here. You can also place an open bid right now!
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/buyer/submit-bid">
              <Button>Place a Direct Bid</Button>
            </Link>
            <Button variant="outline" onClick={() => { setSelectedCrop('all'); setSelectedGrade('all'); }}>
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => {
            const batchId = batch._id || batch.id;
            const cropName = batch.crop || batch.commodity;
            const grade = batch.quality_grade || batch.grade;
            const totalKg = batch.total_quantity_kg || batch.quantity || 0;
            const totalQuintals = (totalKg / 100).toFixed(1);
            const highestBid = parseFloat(batch.current_highest_bid || batch.currentBid) || 0;

            return (
              <Card
                key={batchId}
                className="flex flex-col h-full hover:border-[#D3D67A]/60 hover:shadow-lg transition-all group"
              >
                {/* Batch Top Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-stone-100 dark:bg-emerald-950/60 rounded-xl group-hover:scale-105 transition-transform border border-stone-200/60 dark:border-emerald-800/40">
                      {getCropEmoji(cropName)}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-green-800 dark:group-hover:text-[#D3D67A] transition-colors capitalize">
                        {cropName}
                      </h3>
                      <p className="text-xs text-stone-400 font-mono">
                        #{String(batchId).slice(-6).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={`grade_${(grade || '').toLowerCase()}`} />
                </div>

                {/* Details List */}
                <div className="flex-grow space-y-2.5 text-sm mb-6 bg-stone-50/80 dark:bg-[#111c12]/80 p-3.5 rounded-xl border border-stone-100 dark:border-emerald-900/40">
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Total Pooled</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {formatQuantity(totalKg)} <span className="text-xs text-stone-400 font-normal">({totalQuintals} Qtl)</span>
                    </span>
                  </div>

                  {batch.region && (
                    <div className="flex justify-between">
                      <span className="text-stone-500 dark:text-stone-400">Region</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[160px] text-right">
                        {batch.region}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Farmers Pooled</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {batch.listing_count || (batch.listing_ids ? batch.listing_ids.length : 1)} listings
                    </span>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-stone-200/60 dark:border-emerald-900/30">
                    <span className="text-stone-600 dark:text-stone-400 font-medium">Highest Open Bid</span>
                    <span className={highestBid > 0 ? "font-bold text-green-700 dark:text-[#D3D67A]" : "font-normal text-stone-400 dark:text-stone-500 italic"}>
                      {highestBid > 0 ? `${formatCurrency(highestBid)}/kg` : 'No bids yet'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Instant Buy + Bid */}
                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => handleInstantBuy(batch)}
                    disabled={buyingBatchId === batchId}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {buyingBatchId === batchId ? (
                      '⏳ Processing Instant Buy...'
                    ) : (
                      `⚡ Instant Buy (${formatCurrency(parseFloat(batch.weighted_ask_price_per_kg || batch.ask_price_per_kg || 25))}/kg)`
                    )}
                  </button>
                  <Link to={`/buyer/bid/${batchId}`} className="w-full">
                    <Button variant="outline" className="w-full font-bold text-xs py-2">
                      Place Custom Bid →
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
