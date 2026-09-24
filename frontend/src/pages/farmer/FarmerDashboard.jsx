import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PriceForecastWidget from '../../components/widgets/PriceForecastWidget';
import WarehouseFinderWidget from '../../components/widgets/WarehouseFinderWidget';
import BuyerRequirementsWidget from '../../components/widgets/BuyerRequirementsWidget';
import { getListings, cancelListing } from '../../api/listings';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { staggerIn, fadeIn } from '../../utils/animations';


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

  const statsRef = useRef(null);

  useEffect(() => {
    if (statsRef.current) {
      const cards = statsRef.current.querySelectorAll('.kpi-card');
      staggerIn(cards, { stagger: 0.08, y: 15 });
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#2A5124] to-[#1c3917] dark:from-[#111f13] dark:to-[#172819] text-white p-6 rounded-2xl shadow-xl border border-[#D3D67A]/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {user?.name || 'Farmer'}! 🌾
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D3D67A]/20 text-[#D3D67A] border border-[#D3D67A]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D3D67A] animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-stone-200 dark:text-stone-300 text-sm mt-1">
            Krishi-Setu double-auction market linkage & direct Mandi procurement
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/farmer/submit-ask">
            <button className="bg-[#D3D67A] hover:bg-[#c2c56a] text-[#2A5124] font-bold px-4 py-2.5 rounded-lg shadow-md transition flex items-center gap-2 text-sm">
              <span>➕</span> List New Produce
            </button>
          </Link>
          <button
            onClick={fetchListings}
            className="bg-black/30 hover:bg-black/50 text-white px-3 py-2.5 rounded-lg text-sm transition border border-white/20"
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
              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card bg-white/95 dark:bg-[#162518]/95 backdrop-blur-sm p-4 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Total Listings</p>
          <p className="text-2xl font-bold text-stone-800 dark:text-stone-100 mt-1">{totalListings}</p>
          <p className="text-xs text-stone-400 dark:text-stone-400 mt-1">{openListings.length} currently open</p>
        </div>

        <div className="kpi-card bg-white/95 dark:bg-[#162518]/95 backdrop-blur-sm p-4 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Open Volume</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-[#D3D67A] mt-1">
            {(totalOpenVolumeKg / 100).toFixed(1)} <span className="text-sm font-normal text-stone-600 dark:text-stone-300">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-400 mt-1">{formatQuantity(totalOpenVolumeKg)}</p>
        </div>

        <div className="kpi-card bg-white/95 dark:bg-[#162518]/95 backdrop-blur-sm p-4 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Pooled In Batches</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {(totalPooledVolumeKg / 100).toFixed(1)} <span className="text-sm font-normal text-stone-600 dark:text-stone-300">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-400 mt-1">{pooledListings.length} lots active in pools</p>
        </div>

        <div className="kpi-card bg-white/95 dark:bg-[#162518]/95 backdrop-blur-sm p-4 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Sold & Cleared</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {(totalSoldVolumeKg / 100).toFixed(1)} <span className="text-sm font-normal text-stone-600 dark:text-stone-300">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-400 mt-1">{matchedOrSettled.length} trades settled</p>
        </div>
      </div>

      {/* Main Grid: Listings (Left) + Widgets (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listings Section (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Your Harvest Listings / पिकांची यादी</h2>
              
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-700/60">
                {['all', 'open', 'pooled', 'matched', 'settled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-md capitalize transition ${
                      filterStatus === st
                        ? 'bg-white dark:bg-emerald-800 text-green-900 dark:text-emerald-100 shadow-sm font-semibold'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
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
                <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">No listings found</h3>
                <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 max-w-sm mx-auto">
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
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Produce</th>
                      <th className="pb-3 font-semibold">Quantity</th>
                      <th className="pb-3 font-semibold">Ask / Min</th>
                      <th className="pb-3 font-semibold">Grade</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Listed On</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                    {filteredListings.map((listing) => {
                      const id = listing._id || listing.id;
                      const qty = parseFloat(listing.quantity_kg) || 0;
                      const askPrice = parseFloat(listing.ask_price_per_kg) || 0;
                      const minPrice = parseFloat(listing.min_acceptable_price_per_kg) || askPrice;

                      return (
                        <tr key={id} className="hover:bg-stone-50/70 dark:hover:bg-emerald-950/20 transition">
                          <td className="py-3.5 pr-2">
                            <div className="flex items-center gap-3">
                              {listing.image_url ? (
                                <img
                                  src={listing.image_url}
                                  alt={listing.crop}
                                  className="w-10 h-10 object-cover rounded-md border border-stone-200 dark:border-stone-700 flex-shrink-0"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800/60 rounded-md flex items-center justify-center text-lg flex-shrink-0">
                                  🌾
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-stone-900 dark:text-stone-100 block">{listing.crop}</span>
                                {listing.variety && (
                                  <span className="text-xs text-stone-500 dark:text-stone-400">{listing.variety}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <span className="font-semibold text-stone-900 dark:text-stone-100">{formatQuantity(qty)}</span>
                            <span className="text-xs text-stone-400 dark:text-stone-400 block">
                              {(qty / 100).toFixed(1)} Qtl
                            </span>
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <span className="font-bold text-green-700 dark:text-[#D3D67A]">{formatCurrency(askPrice)}/kg</span>
                            {minPrice !== askPrice && (
                              <span className="text-xs text-stone-400 dark:text-stone-400 block">
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
                          <td className="py-3.5 whitespace-nowrap text-xs text-stone-500 dark:text-stone-400">
                            {formatDate(listing.created_at)}
                          </td>
                          <td className="py-3.5 whitespace-nowrap text-right">
                            {listing.status === 'open' ? (
                              <button
                                onClick={() => handleCancel(id)}
                                disabled={actionLoading === id}
                                className="text-xs border border-red-500/40 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-md font-semibold transition"
                              >
                                {actionLoading === id ? '...' : 'Cancel'}
                              </button>
                            ) : listing.status === 'settled' ? (
                              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">Paid ✓</span>
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
          <div className="bg-stone-50 dark:bg-[#162518]/90 p-4 rounded-xl border border-stone-200 dark:border-emerald-800/40 shadow-xs">
            <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm flex items-center gap-2">
              <span>💡</span> Smart Selling Advice
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 leading-relaxed">
              When market prices are trending downward, the auction engine prioritizes lots with competitive minimum prices.
              If the forecast suggests rising prices next week, consider holding in nearby certified warehouses!
            </p>
          </div>
        </div>
      </div>

      {/* Buyer Direct Requirements Widget (Guaranteed Mandi Price) */}
      <BuyerRequirementsWidget />
    </div>
  );
}
