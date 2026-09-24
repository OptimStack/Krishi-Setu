export const formatCurrency = (amount) => {
  const val = parseFloat(amount);
  if (isNaN(val)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateString);
  }
};

export const formatQuantity = (quantity, unit = 'kg') => {
  const val = parseFloat(quantity);
  if (isNaN(val)) return `0 ${unit}`;
  return `${val.toLocaleString('en-IN')} ${unit}`;
};
