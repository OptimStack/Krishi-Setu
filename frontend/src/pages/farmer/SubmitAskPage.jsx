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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-green-900">List Your Produce / पीक नोंदणी</h1>
          <p className="text-stone-600 text-sm mt-0.5">
            Submit your harvest to be pooled and matched with bulk buyers through double auction.
          </p>
        </div>
        <Link
          to="/farmer/dashboard"
          className="text-sm font-medium text-stone-600 hover:text-green-800 transition"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-green-200 shadow-sm flex items-start gap-3">
        <span className="text-2xl">&#127793;</span>
        <div className="text-sm">
          <h3 className="font-semibold text-green-900">How the Krishi-Setu Marketplace Works</h3>
          <p className="text-green-800 mt-1 leading-relaxed">
            1. <strong>List Produce:</strong> Tell us your crop, quantity, and minimum acceptable price.<br />
            2. <strong>AI Quality Grading:</strong> Your uploaded photo is assessed for immediate quality grading.<br />
            3. <strong>Smart Pooling:</strong> Lots from nearby farmers are aggregated into high-volume buyer batches.<br />
            4. <strong>Double Auction:</strong> Fair clearing prices discovered automatically with direct payout!
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-medium flex items-center gap-2">
          <span>&#9888;</span> {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 text-sm font-medium flex items-center gap-2">
          <span>&#10003;</span> {successMsg}
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
              Go to Farmer Dashboard &rarr;
            </Button>
          </div>
        </div>
      )}

      {!gradingResult && (
        <Card>
          <AskForm onSubmit={handleSubmit} loading={loading} />
        </Card>
      )}
    </div>
  );
}
