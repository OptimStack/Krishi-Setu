export default function StatusBadge({ status }) {
  const norm = (status || '').toLowerCase().replace(/-/g, '_');

  let colorClass = 'bg-stone-100 text-stone-700 border border-stone-200';
  let label = status ? status.replace(/_/g, ' ') : 'Unknown';

  switch (norm) {
    case 'open':
    case 'active':
      colorClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      break;
    case 'pooled':
      colorClass = 'bg-amber-100 text-amber-800 border border-amber-200';
      break;
    case 'locked_for_auction':
      colorClass = 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      break;
    case 'matched':
      colorClass = 'bg-blue-100 text-blue-800 border border-blue-200';
      break;
    case 'partially_matched':
      colorClass = 'bg-cyan-100 text-cyan-800 border border-cyan-200';
      break;
    case 'settled':
    case 'completed':
    case 'captured':
    case 'success':
      colorClass = 'bg-green-100 text-green-800 border border-green-200';
      break;
    case 'pending':
    case 'pending_payment':
      colorClass = 'bg-orange-100 text-orange-800 border border-orange-200';
      break;
    case 'payment_processing':
      colorClass = 'bg-purple-100 text-purple-800 border border-purple-200';
      break;
    case 'cancelled':
    case 'failed':
    case 'rejected':
    case 'disputed':
      colorClass = 'bg-red-100 text-red-800 border border-red-200';
      break;
    case 'expired':
      colorClass = 'bg-stone-200 text-stone-600 border border-stone-300';
      break;
    case 'scheduled':
    case 'running':
      colorClass = 'bg-sky-100 text-sky-800 border border-sky-200';
      break;
    case 'grade_a':
    case 'a':
      colorClass = 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold';
      label = 'Grade A';
      break;
    case 'grade_b':
    case 'b':
      colorClass = 'bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold';
      label = 'Grade B';
      break;
    case 'grade_c':
    case 'c':
      colorClass = 'bg-orange-100 text-orange-900 border border-orange-300 font-bold';
      label = 'Grade C';
      break;
    case 'ungraded':
      colorClass = 'bg-stone-100 text-stone-600 border border-stone-200 italic';
      label = 'Ungraded';
      break;
    default:
      break;
  }

  return (
    <span className={`px-2.5 py-0.5 inline-flex items-center text-xs font-semibold rounded-full capitalize ${colorClass}`}>
      {label}
    </span>
  );
}
