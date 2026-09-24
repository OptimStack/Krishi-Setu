import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { getGradingQueue, overrideGrading } from '../../api/ml';

export default function GradingReviewQueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [filterGrade, setFilterGrade] = useState('ALL');

  const fetchQueue = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await getGradingQueue();
      const items = res?.data?.queue || res?.data || [];
      setQueue(items);
    } catch (err) {
      console.error('Failed to fetch grading review queue:', err);
      if (!isPolling) {
        setMessage({ type: 'error', text: 'Failed to load queue. Please try again.' });
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue(false);
    const interval = setInterval(() => fetchQueue(true), 15000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleOverride = async (recordId, newGrade) => {
    setSubmittingId(recordId);
    try {
      await overrideGrading(recordId, newGrade);
      setMessage({
        type: 'success',
        text: `Successfully resolved record #${recordId.slice(-6)} as Grade ${newGrade}. Produce listing updated.`,
      });
      // Remove reviewed item from queue
      setQueue((prev) => prev.filter((item) => (item._id || item.id) !== recordId));
    } catch (err) {
      console.error('Grade override failed:', err);
      setMessage({
        type: 'error',
        text: err?.error?.message || 'Failed to update grade. Please try again.',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (filterGrade === 'ALL') return true;
    const g = item.predicted_grade || item.mlGrade;
    return g === filterGrade;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900">AI Quality Grading Review Queue</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Verify or override crop quality classifications flagged below the 70% confidence threshold.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchQueue(false)} disabled={loading}>
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex justify-between items-center ${
            message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-stone-400 hover:text-stone-600 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <span className="text-xs font-semibold uppercase text-stone-400 mr-2">Filter by AI Grade:</span>
        {['ALL', 'A', 'B', 'C'].map((g) => (
          <button
            key={g}
            onClick={() => setFilterGrade(g)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filterGrade === g
                ? 'bg-green-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {g === 'ALL' ? `All (${queue.length})` : `Grade ${g}`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16">
          <LoadingSpinner />
        </div>
      ) : filteredQueue.length === 0 ? (
        <Card className="text-center py-16 border-dashed border-2 border-stone-200">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold mb-3">
            &#10003;
          </div>
          <h3 className="font-semibold text-stone-800 text-lg mb-1">Queue is Clear</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            All produce listing uploads have either been confidently auto-graded or resolved by administrators.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredQueue.map((item) => {
            const recId = item._id || item.id;
            const predGrade = (item.predicted_grade || item.mlGrade || '?').toUpperCase();
            const rawConf = item.confidence || 0;
            const confPct = rawConf <= 1.0 ? Math.round(rawConf * 100) : Math.round(rawConf);
            const listing = item.listing || {};
            const farmer = item.farmer || {};
            const cropName = listing.crop || item.commodity || 'Produce';
            const imageUrl = item.image_url || listing.image_url;
            const isSubmitting = submittingId === recId;

            return (
              <Card key={recId} className="flex flex-col border border-stone-200 hover:shadow-md transition-shadow">
                {/* Top header */}
                <div className="flex items-start justify-between mb-4 pb-3 border-b border-stone-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-stone-900">{cropName}</h3>
                      {listing.variety && (
                        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                          {listing.variety}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Listing #{recId.slice(-6).toUpperCase()} • Farmer: {farmer.name || farmer.id || 'N/A'}{' '}
                      {farmer.phone && `(${farmer.phone})`}
                    </p>
                  </div>
                  <StatusBadge status="pending" label="Review Pending" />
                </div>

                {/* Body split */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Produce Photo Preview */}
                  <div className="relative rounded-lg overflow-hidden bg-stone-100 border border-stone-200 aspect-video sm:aspect-square flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl.startsWith('http') || imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}
                        alt={cropName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-stone-400 text-xs text-center p-4">
                        <span className="text-2xl block mb-1">IMAGE</span>
                        Photo preview not available
                      </div>
                    )}
                  </div>

                  {/* ML Assessment details */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                        AI Model Output
                      </span>
                      <div className="flex items-center gap-3 mt-1 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-sm">
                          {predGrade}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-stone-800">Grade {predGrade}</div>
                          <div className="text-xs text-amber-700 font-medium">{confPct}% Confidence</div>
                        </div>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed bg-stone-50 p-2 rounded border border-stone-200">
                        Reason for review: Prediction confidence ({confPct}%) fell below the mandatory 70% threshold.
                      </p>
                    </div>

                    <div className="text-xs text-stone-600 space-y-1 border-t border-stone-100 pt-2">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="font-semibold">{listing.quantity_kg ? `${listing.quantity_kg} kg` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ask Price:</span>
                        <span className="font-semibold">
                          {listing.ask_price_per_kg ? `₹${listing.ask_price_per_kg}/kg` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-auto pt-3 border-t border-stone-100">
                  <p className="text-xs font-semibold text-stone-700 mb-2">
                    Select Verified Grade to Finalize Listing:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {['A', 'B', 'C'].map((g) => {
                      const isSuggested = predGrade === g;
                      return (
                        <Button
                          key={g}
                          variant={isSuggested ? 'primary' : 'outline'}
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleOverride(recId, g)}
                          className="flex items-center justify-center gap-1"
                        >
                          {isSubmitting ? '...' : `Grade ${g} ${isSuggested ? '✓' : ''}`}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
