import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { getBatches } from '../../api/bids';
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
    const interval = setInterval(() => fetchBatches(true), 15000);
    return () => clearInterval(interval);
  }, [fetchBatches]);

  const crops = ['all', 'Onion', 'Soybean', 'Wheat', 'Tomato', 'Cotton', 'Gram'];
  const grades = ['all', 'A', 'B', 'C'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-green-900">Browse Pooled Batches</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-0.5">
            Pooled farmer produce ready for competitive double-auction bidding.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-stone-200 shadow-sm">
        {/* Crop Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-semibold text-stone-500 mr-1">Crop:</span>
          {crops.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCrop(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedCrop === c
                  ? 'bg-green-700 text-white border-green-700 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {c === 'all' ? 'All Crops' : c}
            </button>
          ))}
        </div>

        {/* Grade Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-stone-500 mr-1">Grade:</span>
          {grades.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGrade(g)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                selectedGrade === g
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
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
        <Card className="text-center py-16 px-4 bg-stone-50 border-dashed border-stone-300">
          <span className="text-5xl mb-4 block">🌾</span>
          <h3 className="text-lg font-bold text-stone-800 mb-2">No Active Pooled Batches Found</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
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
            const highestBid = batch.current_highest_bid || batch.currentBid;

            return (
              <Card
                key={batchId}
                className="flex flex-col h-full hover:border-green-400 hover:shadow-md transition-all group"
              >
                {/* Batch Top Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-stone-100 rounded-xl group-hover:scale-105 transition-transform">
                      {getCropEmoji(cropName)}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 group-hover:text-green-800 transition-colors">
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
                <div className="flex-grow space-y-2.5 text-sm mb-6 bg-stone-50/60 p-3.5 rounded-lg border border-stone-100">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total Pooled</span>
                    <span className="font-semibold text-stone-800">
                      {formatQuantity(totalKg)} <span className="text-xs text-stone-500 font-normal">({totalQuintals} Qtl)</span>
                    </span>
                  </div>

                  {batch.region && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Region</span>
                      <span className="font-medium text-stone-700 truncate max-w-[160px] text-right">
                        {batch.region}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-stone-500">Farmers Pooled</span>
                    <span className="font-medium text-stone-700">
                      {batch.listing_count || (batch.listing_ids ? batch.listing_ids.length : 1)} listings
                    </span>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-stone-200/60">
                    <span className="text-stone-600 font-medium">Highest Open Bid</span>
                    <span className="font-bold text-green-700">
                      {highestBid > 0 ? `${formatCurrency(highestBid)}/kg` : 'No bids yet'}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <Link to={`/buyer/bid/${batchId}`} className="mt-auto">
                  <Button className="w-full font-semibold">
                    Place Bid on this Batch →
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
