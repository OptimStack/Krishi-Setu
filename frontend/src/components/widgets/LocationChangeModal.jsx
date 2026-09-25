import React from 'react';
import { useOffline } from '../../context/OfflineContext';

export default function LocationChangeModal({ isOpen, onClose }) {
  const { lastSavedLocation, setLastSavedLocation } = useOffline();

  if (!isOpen) return null;

  const clusters = [
    {
      name: 'Baramati Cluster, Pune',
      coords: '18.1517° N, 74.5772° E',
      apmcGrid: 'Pune APMC Cluster',
      crops: ['Tomato', 'Sugarcane', 'Pomegranate', 'Grapes'],
    },
    {
      name: 'Niphad Cluster, Nashik',
      coords: '20.0875° N, 73.9898° E',
      apmcGrid: 'Nashik Onion & Vegetable Grid',
      crops: ['Onion', 'Tomato', 'Grapes', 'Wheat'],
    },
    {
      name: 'Lasalgaon Cluster, Nashik',
      coords: '20.0650° N, 74.0150° E',
      apmcGrid: 'Asia Largest Onion Market Grid',
      crops: ['Onion (Garva/Pol)', 'Soybean', 'Maize'],
    },
    {
      name: 'Solapur Cluster, Maharashtra',
      coords: '17.6599° N, 75.9064° E',
      apmcGrid: 'Solapur Oilseed & Pulse Hub',
      crops: ['Soybean', 'Pomegranate', 'Chana', 'Cotton'],
    },
    {
      name: 'Junnar Cluster, Pune',
      coords: '19.2088° N, 73.8767° E',
      apmcGrid: 'Narayangaon Tomato Hub Grid',
      crops: ['Tomato', 'Vegetables', 'Flowers'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#132215] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-emerald-800">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-900/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
              Select Farm Location & APMC Cluster
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-300 mb-4 leading-relaxed">
          Selecting your farm cluster calibrates freight cost models, nearby mandis, and dynamic route calculations:
        </p>

        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {clusters.map((cluster) => {
            const isCurrent = lastSavedLocation === cluster.name;
            return (
              <div
                key={cluster.name}
                onClick={() => {
                  setLastSavedLocation(cluster.name);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-stone-50 dark:bg-[#182a1b] border-stone-200 dark:border-stone-700/60 hover:border-emerald-400'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {cluster.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-500 dark:text-stone-400 block mt-0.5">
                    {cluster.coords} • {cluster.apmcGrid}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {cluster.crops.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <span className="text-emerald-700 dark:text-[#D3D67A] font-bold text-sm">
                  {isCurrent ? '✓' : '→'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
