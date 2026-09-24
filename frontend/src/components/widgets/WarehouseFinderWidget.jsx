import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getNearbyWarehouses } from '../../api/warehouse';

const CROPS = ['All', 'Onion', 'Tomato', 'Soybean', 'Wheat', 'Cotton', 'Pomegranate'];
const TYPES = [
  { value: 'all', label: 'All Types', icon: '🏬' },
  { value: 'warehouse', label: 'Warehouse', icon: '🏬' },
  { value: 'cold_storage', label: 'Cold Storage', icon: '❄️' },
  { value: 'silo', label: 'Grain Silo', icon: '🌾' },
];

export default function WarehouseFinderWidget({ initialCrop = 'All', lat = 19.9975, lng = 73.7898 }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cropFilter, setCropFilter] = useState(initialCrop);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    const fetchWarehouses = async () => {
      setLoading(true);
      try {
        const res = await getNearbyWarehouses({
          lat,
          lng,
          crop: cropFilter !== 'All' ? cropFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          max_distance_km: 150.0,
        });

        if (isMounted && res && res.data) {
          setWarehouses(res.data.warehouses || []);
        }
      } catch (err) {
        console.error('Failed to load nearby warehouses:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWarehouses();
    return () => {
      isMounted = false;
    };
  }, [cropFilter, typeFilter, lat, lng]);

  const getTypeTheme = (type) => {
    switch (type) {
      case 'cold_storage':
        return {
          badge: 'bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800',
          label: '❄️ Cold Storage',
        };
      case 'silo':
        return {
          badge: 'bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          label: '🌾 Grain Silo',
        };
      default:
        return {
          badge: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          label: '🏬 Warehouse',
        };
    }
  };

  return (
    <Card highlight={true} className="border-[#D3D67A]/30 dark:border-emerald-800/50 shadow-xl overflow-hidden relative border-t-2 border-t-[#2A5124] dark:border-t-[#D3D67A]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-emerald-900/40 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 flex items-center justify-center text-xl shrink-0 shadow-inner">
            🏬
          </div>
          <div>
            <h3 className="font-black text-stone-900 dark:text-stone-100 text-base tracking-tight flex items-center gap-2">
              <span>Warehouse & Silo Finder</span>
              <span className="text-xs font-normal text-stone-500 dark:text-stone-400">गोदाम शोधक</span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              Nearby WDRA-certified storage facilities sorted by road proximity
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#2A5124] dark:text-[#D3D67A] bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 px-3 py-1 rounded-full border border-[#2A5124]/20 dark:border-[#D3D67A]/30 shrink-0 flex items-center gap-1.5 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          150 km Radius
        </span>
      </div>

      {/* Filters Container */}
      <div className="space-y-2.5 mb-4 p-3 bg-stone-50/70 dark:bg-[#0c160e]/60 rounded-xl border border-stone-200/80 dark:border-emerald-900/40">
        {/* Crop Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-stone-500 dark:text-stone-400 font-bold uppercase text-[10px] shrink-0 mr-1">
            Crop:
          </span>
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCropFilter(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                cropFilter === c
                  ? 'bg-[#2A5124] dark:bg-[#D3D67A] text-white dark:text-[#0b170d] shadow-xs scale-105'
                  : 'bg-white dark:bg-[#132215] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-emerald-900/40'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Type Select */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
          <span className="text-stone-500 dark:text-stone-400 font-bold uppercase text-[10px] shrink-0 mr-1">
            Type:
          </span>
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                typeFilter === t.value
                  ? 'bg-[#2A5124] dark:bg-[#D3D67A] text-white dark:text-[#0b170d] shadow-xs'
                  : 'bg-white dark:bg-[#132215] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-emerald-900/40'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Facilities List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-10 text-stone-500 dark:text-stone-400 text-xs">
          <span className="text-3xl block mb-2">🔍</span>
          No storage facilities matching current filters within 150 km.
        </div>
      ) : (
        <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
          {warehouses.map((w) => {
            const id = w._id || w.id;
            const theme = getTypeTheme(w.type);

            return (
              <div
                key={id}
                className="p-4 bg-stone-50/90 dark:bg-[#0c160e]/90 hover:bg-stone-100/90 dark:hover:bg-[#112014] rounded-2xl border border-stone-200/90 dark:border-emerald-900/50 hover:border-emerald-500/50 dark:hover:border-emerald-500/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 leading-snug">
                      {w.name}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1 font-medium">
                      <span>📍</span>
                      <span>{w.location?.address || w.district || 'Maharashtra'}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 rounded-full border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                      🚗 {w.distance_text}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-200/70 dark:border-emerald-900/30 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${theme.badge}`}>
                      {theme.label}
                    </span>
                    <span className="text-stone-600 dark:text-stone-300 font-bold">
                      Cap: {w.capacity_tonnes?.toLocaleString('en-IN')} Tonnes
                    </span>
                    {w.rate_per_quintal_month && (
                      <span className="text-stone-500 dark:text-stone-400 text-[11px] hidden sm:inline">
                        (₹{w.rate_per_quintal_month}/qtl/mo)
                      </span>
                    )}
                  </div>

                  {w.contact_phone && (
                    <a
                      href={`tel:${w.contact_phone}`}
                      className="text-xs text-[#2A5124] dark:text-[#D3D67A] hover:underline font-bold flex items-center gap-1.5 bg-white dark:bg-[#132215] px-3 py-1.5 rounded-xl border border-stone-200 dark:border-emerald-900/60 shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                    >
                      <span>📞</span>
                      <span>Call Manager</span>
                    </a>
                  )}
                </div>

                {w.crop_types_supported && w.crop_types_supported.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-stone-400 uppercase font-bold mr-1">Stored:</span>
                    {w.crop_types_supported.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] bg-white dark:bg-[#162518] text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md border border-stone-200 dark:border-emerald-900/40 capitalize font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
