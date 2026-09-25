import React, { useState } from 'react';
import { useOffline } from '../../context/OfflineContext';
import { CLUSTER_COORDINATES } from '../../api/agmarknetService';

export default function LocationChangeModal({ isOpen, onClose, onChooseOnMap }) {
  const { lastSavedLocation, setLastSavedLocation } = useOffline();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const quickHubs = [
    { name: 'Parbhani', label: 'Parbhani' },
    { name: 'Nashik', label: 'Nashik' },
    { name: 'Pune', label: 'Pune' },
    { name: 'Solapur', label: 'Solapur' },
    { name: 'Nagpur', label: 'Nagpur' },
    { name: 'Latur', label: 'Latur' },
    { name: 'Kolhapur', label: 'Kolhapur' },
    { name: 'Sangli', label: 'Sangli' },
    { name: 'Ahmednagar', label: 'Ahmednagar' },
  ];

  // Comprehensive agricultural search database for Maharashtra
  const maharashtraLocations = [
    { name: 'Baramati Cluster, Pune', taluka: 'Baramati', district: 'Pune', pincode: '413102' },
    { name: 'Parbhani Cluster, Maharashtra', taluka: 'Parbhani', district: 'Parbhani', pincode: '431401' },
    { name: 'Gangakhed, Parbhani', taluka: 'Gangakhed', district: 'Parbhani', pincode: '431514' },
    { name: 'Lasalgaon, Nashik', taluka: 'Niphad', district: 'Nashik', pincode: '422306' },
    { name: 'Niphad, Nashik', taluka: 'Niphad', district: 'Nashik', pincode: '422303' },
    { name: 'Pune Cluster, Maharashtra', taluka: 'Haveli', district: 'Pune', pincode: '411001' },
    { name: 'Solapur Cluster, Maharashtra', taluka: 'North Solapur', district: 'Solapur', pincode: '413001' },
    { name: 'Latur Cluster, Maharashtra', taluka: 'Latur', district: 'Latur', pincode: '413512' },
    { name: 'Nashik Cluster, Maharashtra', taluka: 'Nashik', district: 'Nashik', pincode: '422001' },
    { name: 'Kolhapur Cluster, Maharashtra', taluka: 'Karveer', district: 'Kolhapur', pincode: '416001' },
    { name: 'Sangli Cluster, Maharashtra', taluka: 'Miraj', district: 'Sangli', pincode: '416416' },
    { name: 'Ahmednagar Cluster, Maharashtra', taluka: 'Nagar', district: 'Ahmednagar', pincode: '414001' },
    { name: 'Nagpur Cluster, Maharashtra', taluka: 'Nagpur Urban', district: 'Nagpur', pincode: '440001' },
    { name: 'Jalgaon Banana Grid, Maharashtra', taluka: 'Jalgaon', district: 'Jalgaon', pincode: '425001' },
    { name: 'Chhatrapati Sambhaji Nagar, Maharashtra', taluka: 'Aurangabad', district: 'Aurangabad', pincode: '431001' },
    { name: 'Junnar Tomato Cluster, Pune', taluka: 'Junnar', district: 'Pune', pincode: '410502' },
    { name: 'Pandharpur, Solapur', taluka: 'Pandharpur', district: 'Solapur', pincode: '413304' },
    { name: 'Manchar, Pune', taluka: 'Ambegaon', district: 'Pune', pincode: '410503' },
  ];

  const handleSelectLocation = (locName) => {
    setLastSavedLocation(locName);
    onClose();
  };

  // 1. GPS Auto-detection
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setFeedback('GPS is not supported in this browser. Please select a hub or search.');
      return;
    }

    setGpsLoading(true);
    setFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const formatted = `Farm GPS (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E), Maharashtra`;
        setLastSavedLocation(formatted);
        setGpsLoading(false);
        onClose();
      },
      (error) => {
        console.warn('Geolocation error:', error);
        // Graceful fallback to Baramati Cluster with user notice
        setFeedback('GPS permission denied or timeout. Defaulted to Baramati Cluster, Pune.');
        setLastSavedLocation('Baramati Cluster, Pune');
        setGpsLoading(false);
        setTimeout(() => onClose(), 1200);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Filter search results
  const searchResults = searchQuery.trim()
    ? maharashtraLocations.filter((l) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.taluka.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.pincode.includes(searchQuery)
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111e13] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200/90 dark:border-emerald-800 transition-all">
        {/* Header matching screenshot */}
        <div className="bg-[#F0FAF4] dark:bg-[#142618] p-5 sm:p-6 border-b border-emerald-100 dark:border-emerald-900/40 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-lg font-bold p-1 cursor-pointer transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-800 dark:text-[#D3D67A] text-lg font-bold shrink-0">
              📍
            </div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Where is your farm or collection location?
            </h2>
          </div>

          <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 pl-12 leading-relaxed">
            Required to accurately find nearby mandis, real distances, net realizations, and FPO pools.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {feedback && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs rounded-xl font-medium">
              {feedback}
            </div>
          )}

          {/* Option 1: Use My Current Location (GPS) matching screenshot */}
          <div
            onClick={handleUseGps}
            className="p-4 rounded-2xl border-2 border-emerald-500/70 dark:border-emerald-500/60 bg-[#F7FDF9] dark:bg-[#132617] hover:bg-emerald-50/80 dark:hover:bg-[#18301d] transition-all cursor-pointer flex items-center gap-4 group shadow-2xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-full bg-[#059669] text-white flex items-center justify-center text-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              {gpsLoading ? '⏳' : '↗'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  Use My Current Location
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#059669] text-white px-2 py-0.5 rounded-md">
                  GPS
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Auto-detect village, taluka, and district via browser GPS
              </p>
            </div>
          </div>

          {/* Option 2: Search Village / Taluka / District / Pincode matching screenshot */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-[#162719] p-4 transition-all">
            <div
              onClick={() => setIsSearching((s) => !s)}
              className="flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🔍
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  Search Village / Taluka / District / Pincode
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  e.g. Parbhani, Gangakhed, Nashik, Baramati, Pune, Latur, 431401
                </p>
              </div>
            </div>

            {/* Expanded search input */}
            {isSearching && (
              <div className="mt-3.5 pt-3.5 border-t border-stone-100 dark:border-emerald-900/40 space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type village, taluka, district or 6-digit pincode..."
                    autoFocus
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#101b12] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1">
                    {searchResults.map((loc) => (
                      <div
                        key={loc.name}
                        onClick={() => handleSelectLocation(loc.name)}
                        className="p-2.5 rounded-lg bg-stone-50 hover:bg-emerald-50 dark:bg-[#182c1b] dark:hover:bg-emerald-950/80 border border-stone-200 dark:border-stone-700/60 cursor-pointer flex items-center justify-between transition text-xs"
                      >
                        <div>
                          <span className="font-bold text-stone-900 dark:text-stone-100 block">
                            {loc.name}
                          </span>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400">
                            Taluka: {loc.taluka} • Dist: {loc.district} • Pin: {loc.pincode}
                          </span>
                        </div>
                        <span className="text-emerald-700 dark:text-[#D3D67A] font-bold">Select →</span>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <p className="text-xs text-stone-500 py-1 text-center">
                    No matching location. You can still select from quick hubs below.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* Option 3: Choose on Map matching screenshot */}
          <div
            onClick={() => {
              onClose();
              if (onChooseOnMap) onChooseOnMap();
              setTimeout(() => {
                document.getElementById('farm-map-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-[#162719] hover:border-emerald-400 transition-all cursor-pointer flex items-center gap-4 group shadow-2xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
              🗺️
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                Choose on Map
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Click anywhere on the interactive map to place a pin
              </p>
            </div>
          </div>

          {/* Quick Agricultural Hubs (Matching Screenshot) */}
          <div className="pt-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block mb-2.5">
              QUICK AGRICULTURAL HUBS:
            </span>

            <div className="flex flex-wrap gap-2">
              {quickHubs.map((hub) => {
                const isSelected = lastSavedLocation.toLowerCase().includes(hub.name.toLowerCase());

                return (
                  <button
                    key={hub.name}
                    type="button"
                    onClick={() => {
                      const match = CLUSTER_COORDINATES[hub.name.toLowerCase()];
                      handleSelectLocation(match ? match.name : `${hub.name} Cluster, Maharashtra`);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 dark:bg-[#182c1b] dark:hover:bg-[#203a24] text-stone-800 dark:text-stone-200 border border-stone-200/90 dark:border-emerald-900/40'
                    }`}
                  >
                    {hub.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
