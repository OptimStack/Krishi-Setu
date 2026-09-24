import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';

export default function GradingResultCard({ result, onDismiss = null }) {
  if (!result) return null;

  const grade = (result.predicted_grade || result.grade || '?').toUpperCase();
  const rawConfidence = result.confidence !== undefined ? result.confidence : 0;
  const confidencePercent = rawConfidence <= 1.0 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence);
  const needsReview = result.needs_human_review || confidencePercent < 70;

  const getGradeTheme = (g) => {
    switch (g) {
      case 'A':
        return {
          bg: 'bg-emerald-500 text-white',
          border: 'border-emerald-200',
          badge: 'success',
          label: 'Grade A (Premium Supermarket / Export)',
        };
      case 'B':
        return {
          bg: 'bg-blue-600 text-white',
          border: 'border-blue-200',
          badge: 'info',
          label: 'Grade B (Standard Market Quality)',
        };
      case 'C':
        return {
          bg: 'bg-amber-500 text-white',
          border: 'border-amber-200',
          badge: 'warning',
          label: 'Grade C (Fair / Food Processing)',
        };
      default:
        return {
          bg: 'bg-stone-500 text-white',
          border: 'border-stone-200',
          badge: 'neutral',
          label: 'Ungraded / Awaiting Assessment',
        };
    }
  };

  const theme = getGradeTheme(grade);

  return (
    <Card className="border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">AI</span>
          <h3 className="font-semibold text-stone-900">Computer Vision Quality Assessment</h3>
        </div>
        <StatusBadge
          status={needsReview ? 'pending' : 'active'}
          label={needsReview ? 'Manual Review Pending' : 'Auto-Graded'}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-stone-50 rounded-xl mb-4">
        <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black shadow-inner shrink-0 ${theme.bg}`}>
          <span className="text-xs uppercase tracking-wider opacity-80">Grade</span>
          <span className="text-3xl leading-none">{grade}</span>
        </div>

        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-stone-800 text-sm sm:text-base">{theme.label}</span>
            <span className="font-bold text-stone-900 text-sm sm:text-base">{confidencePercent}% Conf.</span>
          </div>

          {/* Confidence bar */}
          <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                needsReview ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, confidencePercent))}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-stone-500">
            <span>Threshold: 70%</span>
            <span>{confidencePercent >= 70 ? 'High Confidence' : 'Low Confidence'}</span>
          </div>
        </div>
      </div>

      {result.class_probabilities && (
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Class Distribution
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {['A', 'B', 'C'].map((g) => {
              const p = result.class_probabilities[g] ?? 0;
              const pct = p <= 1.0 ? Math.round(p * 100) : Math.round(p);
              return (
                <div key={g} className="bg-white border border-stone-200 rounded-lg p-2">
                  <span className="text-stone-500">Grade {g}: </span>
                  <span className="font-bold text-stone-800">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {needsReview ? (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs sm:text-sm">
          <span className="text-lg leading-none shrink-0 text-amber-600">i</span>
          <div>
            <p className="font-semibold mb-0.5">Route to Verification Queue</p>
            <p className="text-amber-800/90 text-xs">
              AI confidence ({confidencePercent}%) is below the 70% required threshold. An APMC / FPO assessor will
              verify this crop photo before double-auction pooling.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs sm:text-sm">
          <span className="text-lg leading-none shrink-0 text-emerald-600">&#10003;</span>
          <div>
            <p className="font-semibold mb-0.5">Automated Grade Verified</p>
            <p className="text-emerald-800/90 text-xs">
              Quality grade successfully verified with {confidencePercent}% confidence. Eligible for immediate pooling.
            </p>
          </div>
        </div>
      )}

      {onDismiss && (
        <div className="mt-4 text-right">
          <button
            onClick={onDismiss}
            className="text-xs text-stone-500 hover:text-stone-800 font-medium underline"
          >
            Dismiss Details
          </button>
        </div>
      )}
    </Card>
  );
}
