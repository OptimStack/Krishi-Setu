export default function StatusBadge({ status }) {
  const norm = (status || '').toLowerCase().replace(/-/g, '_');

  let colorClass = 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700';
  let label = status ? status.replace(/_/g, ' ') : 'Unknown';

  switch (norm) {
    case 'open':
    case 'active':
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      label = 'Open';
      break;
    case 'pooled':
      colorClass = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      label = 'Pooled';
      break;
    case 'locked_for_auction':
      colorClass = 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800';
      label = 'In Auction';
      break;
    case 'matched':
      colorClass = 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
      label = 'Matched';
      break;
    case 'partially_matched':
      colorClass = 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800';
      label = 'Partial Match';
      break;
    case 'settled':
    case 'completed':
    case 'captured':
    case 'success':
      colorClass = 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800/80 dark:text-stone-300 dark:border-stone-700';
      label = 'Sold';
      break;
    case 'pending':
    case 'pending_payment':
      colorClass = 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800';
      label = 'Pending';
      break;
    case 'payment_processing':
      colorClass = 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
      label = 'Processing';
      break;
    case 'cancelled':
    case 'failed':
    case 'rejected':
    case 'disputed':
      colorClass = 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800';
      label = 'Cancelled';
      break;
    case 'expired':
      colorClass = 'bg-stone-200 text-stone-600 border-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700';
      label = 'Expired';
      break;
    case 'scheduled':
    case 'running':
      colorClass = 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800';
      label = 'Running';
      break;
    case 'grade_a':
    case 'a':
      colorClass = 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/90 dark:text-[#D3D67A] dark:border-emerald-800 font-bold';
      label = 'Grade A';
      break;
    case 'grade_b':
    case 'b':
      colorClass = 'bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-800 font-bold';
      label = 'Grade B';
      break;
    case 'grade_c':
    case 'c':
      colorClass = 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/90 dark:text-orange-300 dark:border-orange-800 font-bold';
      label = 'Grade C';
      break;
    case 'ungraded':
      colorClass = 'bg-stone-100 text-stone-600 border-stone-300 dark:bg-stone-800/80 dark:text-stone-400 dark:border-stone-700 italic';
      label = 'Ungraded';
      break;
    default:
      break;
  }

  return (
    <span className={`px-2.5 py-0.5 inline-flex items-center text-xs font-semibold rounded-full border ${colorClass}`}>
      {label}
    </span>
  );
}
