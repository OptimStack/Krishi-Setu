import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AskForm from '../../components/forms/AskForm';
import GradingResultCard from '../../components/widgets/GradingResultCard';
import { createListing } from '../../api/listings';

export default function SubmitAskPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [gradingResult, setGradingResult] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setGradingResult(null);

    try {
      const res = await createListing(formData);
      if (res.error) {
        setError(res.error.message || 'Failed to submit listing. Please check the inputs.');
        setLoading(false);
        return;
      }

      const grading = res?.data?.grading;
      if (grading) {
        setGradingResult(grading);
        setSuccessMsg('Produce listing registered! AI Quality Grading analysis completed below:');
      } else {
        setSuccessMsg('Produce listing submitted successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/farmer/dashboard');
        }, 1200);
      }
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Failed to submit listing. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">List Your Produce / पीक नोंदणी</h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm mt-0.5">
            Submit your harvest to be pooled and matched with bulk buyers through transparent double auction.
          </p>
        </div>
        <Link
          to="/farmer/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold shadow-xs transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 p-4 rounded-xl border border-green-200 dark:border-emerald-800/50 shadow-sm flex items-start gap-3">
        <span className="text-2xl">🌱</span>
        <div className="text-sm">
          <h3 className="font-semibold text-green-900 dark:text-[#D3D67A]">How the Krishi-Setu Marketplace Works</h3>
          <p className="text-green-800 dark:text-stone-300 mt-1 leading-relaxed text-xs">
            1. <strong>List Produce:</strong> Tell us your crop, quantity, and minimum acceptable reserve price.<br />
            2. <strong>AI Quality Grading:</strong> Your uploaded photo is assessed for immediate computer vision quality grading.<br />
            3. <strong>Smart Pooling:</strong> Lots from nearby farmers are aggregated into high-volume certified buyer batches.<br />
            4. <strong>Double Auction:</strong> Fair clearing prices discovered automatically with direct escrow payout!
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 text-sm font-medium flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800 text-sm font-medium flex items-center gap-2">
          <span>✓</span> {successMsg}
        </div>
      )}

      {gradingResult && (
        <div className="space-y-4">
          <GradingResultCard result={gradingResult} />
          <div className="flex justify-end gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/farmer/dashboard')}
            >
              Go to Farmer Dashboard →
            </Button>
          </div>
        </div>
      )}

      {!gradingResult && (
        <AskForm onSubmit={handleSubmit} loading={loading} />
      )}
    </div>
  );
}
