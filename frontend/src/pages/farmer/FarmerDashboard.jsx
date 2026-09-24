import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PriceForecastWidget from '../../components/widgets/PriceForecastWidget';
import WarehouseFinderWidget from '../../components/widgets/WarehouseFinderWidget';
import { getListings, cancelListing } from '../../api/listings';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const fetchListings = useCallback(async () => {
    try {
      const res = await getListings();
      if (res && res.data) {
        setListings(res.data);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    // Poll for updates every 15 seconds so auction progress updates live
    const interval = setInterval(fetchListings, 15000);
    return () => clearInterval(interval);
  }, [fetchListings]);

  const handleCancel = async (listingId) => {
    if (!window.confirm('Are you sure you want to cancel this listing?')) return;
    setActionLoading(listingId);
    try {
      const res = await cancelListing(listingId);
      if (res.error) {
        setFeedback({ text: res.error.message || 'Failed to cancel listing', type: 'error' });
      } else {
        setFeedback({ text: 'Listing cancelled successfully.', type: 'success' });
        fetchListings();
      }
    } catch (err) {
      setFeedback({ text: 'Error cancelling listing', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics computation
  const totalListings = listings.length;
  const openListings = listings.filter((l) => l.status === 'open');
  const pooledListings = listings.filter((l) => l.status === 'pooled');
  const matchedOrSettled = listings.filter((l) => l.status === 'matched' || l.status === 'settled');

  const totalOpenVolumeKg = openListings.reduce((sum, l) => sum + (parseFloat(l.quantity_remaining_kg || l.quantity_kg) || 0), 0);
  const totalPooledVolumeKg = pooledListings.reduce((sum, l) => sum + (parseFloat(l.quantity_kg) || 0), 0);
  const totalSoldVolumeKg = matchedOrSettled.reduce((sum, l) => sum + (parseFloat(l.quantity_kg) || 0), 0);

  // Filtered listings
  const filteredListings = filterStatus === 'all'
    ? listings
    : listings.filter((l) => (l.status || '').toLowerCase() === filterStatus.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-emerald-800 to-green-900 text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {user?.name || 'Farmer'}! 🌾
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-700/80 text-emerald-100 border border-emerald-500/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-emerald-200 text-sm mt-1">
            Krishi-Setu double-auction market linkage dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/farmer/submit-ask">
            <button className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold px-4 py-2.5 rounded-lg shadow transition flex items-center gap-2 text-sm">
              <span>➕</span> List New Produce
            </button>
          </Link>
          <button
            onClick={fetchListings}
            className="bg-green-700/60 hover:bg-green-700 text-white px-3 py-2.5 rounded-lg text-sm transition"
            title="Refresh listings"
          >
            ↻
          </button>
        </div>
      </div>

      {feedback.text && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Total Listings</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{totalListings}</p>
          <p className="text-xs text-stone-400 mt-1">{openListings.length} currently open</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Open Volume</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {(totalOpenVolumeKg / 100).toFixed(1)} <span className="text-sm font-normal text-stone-600">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 mt-1">{totalOpenVolumeKg.toLocaleString('en-IN')} kg</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Pooled in Batches</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {(totalPooledVolumeKg / 100).toFixed(1)} <span className="text-sm font-normal text-stone-600">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 mt-1">{pooledListings.length} lot(s) in auction queue</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Matched / Sold</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {(totalSoldVolumeKg / 100).toFixed(1)} <span className="text-sm font-normal text-stone-600">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 mt-1">
            <Link to="/farmer/payouts" className="text-green-700 hover:underline">
              View payouts →
            </Link>
          </p>
        </div>
      </div>

      {/* Main Grid: Listings (Left) + Widgets (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listings Section (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-stone-800">Your Harvest Listings / पिकांची यादी</h2>
              
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1 bg-stone-100 p-1 rounded-lg text-xs font-medium">
                {['all', 'open', 'pooled', 'matched', 'settled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-md capitalize transition ${
                      filterStatus === st
                        ? 'bg-white text-green-900 shadow-sm font-semibold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12 px-4">
                <span className="text-4xl mb-3 block">🌾</span>
                <h3 className="text-base font-semibold text-stone-700">No listings found</h3>
                <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
                  {filterStatus === 'all'
                    ? "You haven't listed any produce yet. Submit your first harvest lot to discover fair market prices!"
                    : `No produce listings currently in '${filterStatus}' state.`}
                </p>
                <div className="mt-4">
                  <Link to="/farmer/submit-ask">
                    <Button>Submit Produce Listing</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Produce</th>
                      <th className="pb-3 font-semibold">Quantity</th>
                      <th className="pb-3 font-semibold">Ask / Min</th>
                      <th className="pb-3 font-semibold">Grade</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Listed On</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredListings.map((listing) => {
                      const id = listing._id || listing.id;
                      const qty = parseFloat(listing.quantity_kg) || 0;
                      const askPrice = parseFloat(listing.ask_price_per_kg) || 0;
                      const minPrice = parseFloat(listing.min_acceptable_price_per_kg) || askPrice;

                      return (
                        <tr key={id} className="hover:bg-stone-50/70 transition">
                          <td className="py-3.5 pr-2">
                            <div className="flex items-center gap-3">
                              {listing.image_url ? (
                                <img
                                  src={listing.image_url}
                                  alt={listing.crop}
                                  className="w-10 h-10 object-cover rounded-md border border-stone-200 flex-shrink-0"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-green-50 border border-green-200 rounded-md flex items-center justify-center text-lg flex-shrink-0">
                                  🌾
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-stone-900 block">{listing.crop}</span>
                                {listing.variety && (
                                  <span className="text-xs text-stone-500">{listing.variety}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <span className="font-medium text-stone-800">{formatQuantity(qty)}</span>
                            <span className="text-xs text-stone-400 block">
                              {(qty / 100).toFixed(1)} Qtl
                            </span>
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <span className="font-semibold text-green-700">{formatCurrency(askPrice)}/kg</span>
                            {minPrice !== askPrice && (
                              <span className="text-xs text-stone-400 block">
                                Min: {formatCurrency(minPrice)}/kg
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <StatusBadge status={listing.quality_grade || 'ungraded'} />
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <StatusBadge status={listing.status} />
                          </td>
                          <td className="py-3.5 whitespace-nowrap text-xs text-stone-500">
                            {formatDate(listing.created_at)}
                          </td>
                          <td className="py-3.5 whitespace-nowrap text-right">
                            {listing.status === 'open' ? (
                              <button
                                onClick={() => handleCancel(id)}
                                disabled={actionLoading === id}
                                className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                              >
                                {actionLoading === id ? '...' : 'Cancel'}
                              </button>
                            ) : listing.status === 'settled' ? (
                              <span className="text-xs text-green-700 font-medium">Paid ✓</span>
                            ) : (
                              <span className="text-xs text-stone-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
          <PriceForecastWidget crop="Onion" mandiName="Nashik" showSelector={true} />
          <WarehouseFinderWidget initialCrop="Onion" />

          {/* Educational / Guidance Card */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <h3 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <span>💡</span> Smart Selling Advice
            </h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              When market prices are trending downward, the auction engine prioritizes lots with competitive minimum prices.
              If the forecast suggests rising prices next week, consider holding in nearby certified warehouses!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
