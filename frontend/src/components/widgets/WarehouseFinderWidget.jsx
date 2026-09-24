import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getNearbyWarehouses } from '../../api/warehouse';

const CROPS = ['All', 'Onion', 'Tomato', 'Soybean', 'Wheat', 'Cotton', 'Pomegranate'];
const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'cold_storage', label: 'Cold Storage' },
  { value: 'silo', label: 'Silo' },
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
        return { badge: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Cold Storage' };
      case 'silo':
        return { badge: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Grain Silo' };
      default:
        return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Warehouse' };
    }
  };

  return (
    <Card className="border border-stone-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏬</span>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Warehouse & Silo Finder</h3>
            <p className="text-xs text-stone-500">
              Nearby certified storage facilities sorted by road proximity
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
          Radius: 150 km
        </span>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-4">
        {/* Crop Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-400 font-semibold uppercase text-[10px] shrink-0 mr-1">Crop:</span>
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCropFilter(c)}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition ${
                cropFilter === c
                  ? 'bg-green-700 text-white font-medium shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Type Select */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-stone-400 font-semibold uppercase text-[10px] shrink-0 mr-1">Type:</span>
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`px-2 py-0.5 rounded transition ${
                typeFilter === t.value
                  ? 'bg-stone-800 text-white font-medium'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-8 text-stone-500 text-xs">
          <span className="text-2xl block mb-1">🔍</span>
          No storage facilities matching current filters within 150 km.
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {warehouses.map((w) => {
            const id = w._id || w.id;
            const theme = getTypeTheme(w.type);

            return (
              <div
                key={id}
                className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 transition-colors flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 leading-snug">{w.name}</h4>
                    <p className="text-xs text-stone-500 mt-0.5">{w.location?.address || w.district || 'Maharashtra'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 text-xs font-bold text-green-800 bg-green-100 rounded-full">
                      {w.distance_text}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${theme.badge}`}>
                      {theme.label}
                    </span>
                    <span className="text-stone-600 font-medium">
                      Cap: {w.capacity_tonnes?.toLocaleString('en-IN')} Tonnes
                    </span>
                  </div>

                  {w.contact_phone && (
                    <a
                      href={`tel:${w.contact_phone}`}
                      className="text-xs text-green-700 hover:text-green-900 font-bold flex items-center gap-1 bg-white px-2 py-1 rounded border border-green-200 shadow-2xs hover:bg-green-50 transition"
                    >
                      <span>📞</span> {w.contact_phone}
                    </a>
                  )}
                </div>

                {w.crop_types_supported && w.crop_types_supported.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.crop_types_supported.map((c) => (
                      <span key={c} className="text-[10px] bg-white text-stone-500 px-1.5 py-0.2 rounded border border-stone-200">
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
