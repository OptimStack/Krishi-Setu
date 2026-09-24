import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import BidForm from '../../components/forms/BidForm';
import { getBatch, createBid } from '../../api/bids';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';

export default function SubmitBidPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(Boolean(batchId && batchId !== 'new'));
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!batchId || batchId === 'new') {
      setLoading(false);
      return;
    }

    const fetchBatch = async () => {
      try {
        const res = await getBatch(batchId);
        if (res.data) {
          setBatch(res.data);
        } else if (res.error) {
          setApiError(res.error.message || 'Batch not found');
        }
      } catch (err) {
        setApiError('Unable to load batch details. You can still place a direct bid.');
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [batchId]);

  const handleSubmit = async (bidData) => {
    setSubmitting(true);
    setApiError('');

    try {
      const res = await createBid(bidData);
      if (res.error) {
        setApiError(res.error.message || 'Failed to submit bid.');
        return;
      }
      setSuccessMessage('Bid placed successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        navigate('/buyer/dashboard');
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to submit bid. Please check your inputs.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-900">
            {batch ? `Place Bid for Batch #${String(batch._id || batch.id).slice(-6).toUpperCase()}` : 'Submit Buying Bid'}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Krishi-Setu Double Auction: Set your ceiling price and required grade.
          </p>
        </div>
        <Link to="/buyer/browse">
          <Button variant="outline" className="text-xs">
            ← Browse Batches
          </Button>
        </Link>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-3">
          <span className="text-xl">✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span>{apiError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Batch Context Card or Auction Guidance */}
        <div className="lg:col-span-1 space-y-6">
          {batch ? (
            <Card className="bg-stone-50/80 border border-stone-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Target Batch</span>
                  <h3 className="text-xl font-bold text-stone-900">{batch.crop || batch.commodity}</h3>
                </div>
                <StatusBadge status={`grade_${(batch.quality_grade || batch.grade || '').toLowerCase()}`} />
              </div>

              <div className="space-y-3 text-sm divide-y divide-stone-100">
                <div className="flex justify-between pt-2">
                  <span className="text-stone-500">Available Pooled Qty</span>
                  <span className="font-semibold text-stone-800">
                    {formatQuantity(batch.total_quantity_kg || batch.quantity)}
                  </span>
                </div>
                {batch.region && (
                  <div className="flex justify-between pt-2">
                    <span className="text-stone-500">Pooling Region</span>
                    <span className="font-medium text-stone-800">{batch.region}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2">
                  <span className="text-stone-500">Participating Farmers</span>
                  <span className="font-medium text-stone-800">
                    {batch.listing_count || (batch.listing_ids ? batch.listing_ids.length : 1)} listings
                  </span>
                </div>
                {batch.current_highest_bid > 0 && (
                  <div className="flex justify-between pt-2">
                    <span className="text-stone-500">Current Highest Bid</span>
                    <span className="font-bold text-green-700">
                      {formatCurrency(batch.current_highest_bid)}/kg
                    </span>
                  </div>
                )}
                {batch.created_at && (
                  <div className="flex justify-between pt-2 text-xs">
                    <span className="text-stone-400">Pooled On</span>
                    <span className="text-stone-500">{formatDate(batch.created_at)}</span>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="bg-emerald-50/60 border border-emerald-200">
              <h3 className="font-bold text-emerald-900 text-base mb-2">How Bidding Works</h3>
              <ul className="text-xs text-emerald-800 space-y-2 list-disc list-inside">
                <li>Submit your crop requirement, maximum price, and minimum quality grade.</li>
                <li>Your bid remains <strong>open</strong> until an auction round clears supply.</li>
                <li>When supply meets demand, trades execute at the <em>clearing price</em> — never higher than your maximum price.</li>
                <li>Cancel anytime before an auction round matches your bid.</li>
              </ul>
            </Card>
          )}

          {/* Pricing Tips Card */}
          <Card className="border border-stone-200 text-xs text-stone-600 space-y-2">
            <h4 className="font-semibold text-stone-800 text-sm">💡 Fair Bidding Tip</h4>
            <p>
              Check the latest APMC / e-NAM benchmark prices before bidding. Setting your bid close to the modal price increases the probability of fast clearing in the next batch auction.
            </p>
          </Card>
        </div>

        {/* Right Column: Bid Submission Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <BidForm
              onSubmit={handleSubmit}
              loading={submitting}
              initialData={batch}
              batchLocked={Boolean(batch)}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
