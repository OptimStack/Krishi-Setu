import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';

export default function FarmMandiMap({ onSelectMandi }) {
  const { t } = useLanguage();
  const { lastSavedLocation } = useOffline();

  const [mapMode, setMapMode] = useState('satellite'); // satellite | streets | terrain
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedPin, setSelectedPin] = useState('baramati');

  const mandis = [
    {
      id: 'baramati',
      name: 'Baramati APMC',
      status: 'Live',
      distanceKm: 0,
      travelTime: '15 min',
      priceQtl: 1655,
      transportCost: 0,
      netPrice: 1655,
      crop: 'Tomato',
      x: 52, // % coordinate on SVG map
      y: 54,
      isHome: true,
    },
    {
      id: 'pune',
      name: 'Pune Gultekdi Market Yard',
      status: 'Live',
      distanceKm: 84.5,
      travelTime: '2 hr 36 min',
      priceQtl: 1820,
      transportCost: 210,
      netPrice: 1610,
      crop: 'Tomato',
      x: 38,
      y: 45,
    },
    {
      id: 'pandharpur',
      name: 'Pandharpur APMC',
      status: 'Live',
      distanceKm: 95.2,
      travelTime: '2 hr 54 min',
      priceQtl: 1740,
      transportCost: 145,
      netPrice: 1595,
      crop: 'Tomato',
      x: 64,
      y: 65,
    },
    {
      id: 'manchar',
      name: 'Manchar APMC',
      status: 'Live',
      distanceKm: 116.2,
      travelTime: '3 hr 24 min',
      priceQtl: 1690,
      transportCost: 180,
      netPrice: 1510,
      crop: 'Tomato',
      x: 36,
      y: 32,
    },
    {
      id: 'lasalgaon',
      name: 'Lasalgaon APMC',
      status: 'Live',
      distanceKm: 210,
      travelTime: '4 hr 45 min',
      priceQtl: 2450,
      transportCost: 320,
      netPrice: 2130,
      crop: 'Onion',
      x: 48,
      y: 18,
    },
    {
      id: 'solapur',
      name: 'Solapur APMC',
      status: 'Live',
      distanceKm: 140,
      travelTime: '3 hr 10 min',
      priceQtl: 4350,
      transportCost: 260,
      netPrice: 4090,
      crop: 'Soybean',
      x: 75,
      y: 58,
    }
  ];

  const activeMandi = mandis.find((m) => m.id === selectedPin) || mandis[0];

  return (
    <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-emerald-800/40 p-5 md:p-6 shadow-xl transition-all">
      {/* Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 dark:text-[#D3D67A] text-lg font-bold">📍</span>
            <h2 className="text-lg font-black tracking-tight text-stone-900 dark:text-stone-100">
              {t('mandi_map_title', 'Farm & Nearby Mandi Map')}
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {t('mandi_map_subtitle', 'Dynamic routes and travel times originating from Baramati Cluster, Pune')}
          </p>
        </div>

        <span className="self-start sm:self-auto text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 shrink-0">
          {t('mandis_found', '22 Mandis Found')}
        </span>
      </div>

      {/* Map visual viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-300/80 dark:border-emerald-800/60 shadow-inner bg-[#101b13] min-h-[360px] md:min-h-[440px] flex items-center justify-center select-none">
        {/* Top Floating Overlay Badge & Map Type Switchers */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Agriculture Grid: {lastSavedLocation}</span>
            <span className="bg-emerald-600/90 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {mapMode}
            </span>
          </div>

          <div className="pointer-events-auto bg-black/75 backdrop-blur-md rounded-xl p-1 flex items-center gap-1 border border-white/20 shadow-lg text-xs font-semibold">
            {['satellite', 'streets', 'terrain'].map((mode) => (
              <button
                key={mode}
                onClick={() => setMapMode(mode)}
                className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                  mapMode === mode
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {mode === 'satellite' ? '🛰️ Satellite' : mode === 'streets' ? '🗺️ Streets' : '⛰️ Terrain'}
              </button>
            ))}
            <span className="text-[11px] text-stone-400 px-1 border-l border-white/20">
              {zoomLevel}%
            </span>
          </div>
        </div>

        {/* Realistic SVG Agricultural & Topographic Map of Maharashtra Grid */}
        <svg
          className="w-full h-full absolute inset-0 transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel / 100})` }}
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Satellite Terrain Gradient */}
            <radialGradient id="satGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#2c3b28" />
              <stop offset="60%" stopColor="#1e2c1c" />
              <stop offset="100%" stopColor="#0d170f" />
            </radialGradient>
            <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="40%" y2="100%">
              <stop offset="0%" stopColor="#153342" />
              <stop offset="100%" stopColor="#0a1a24" />
            </linearGradient>
            <pattern id="topoGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(211,214,122,0.08)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Arabian Sea Coastline */}
          <rect width="1000" height="600" fill="url(#satGlow)" />
          <path
            d="M 0,0 L 220,0 C 230,120 190,220 180,310 C 170,410 140,510 120,600 L 0,600 Z"
            fill="url(#oceanGrad)"
          />
          <path
            d="M 220,0 C 230,120 190,220 180,310 C 170,410 140,510 120,600"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />

          {/* Grid overlay */}
          <rect width="1000" height="600" fill="url(#topoGrid)" />

          {/* Western Ghats & Mountain ridges representation */}
          <path
            d="M 240,40 Q 230,180 220,300 T 190,580"
            fill="none"
            stroke="rgba(80,105,70,0.5)"
            strokeWidth="45"
            strokeLinecap="round"
          />

          {/* River Krishna & Bhima tributaries */}
          <path
            d="M 280,180 Q 420,290 600,340 T 920,440"
            fill="none"
            stroke="rgba(56,189,248,0.3)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 330,280 Q 520,350 740,430"
            fill="none"
            stroke="rgba(56,189,248,0.25)"
            strokeWidth="2"
          />

          {/* City / Hub Labels on Map */}
          <text x="130" y="240" fill="#94a3b8" fontSize="13" fontWeight="bold" opacity="0.6">Mumbai</text>
          <text x="280" y="210" fill="#94a3b8" fontSize="13" fontWeight="bold" opacity="0.6">Thane</text>
          <text x="490" y="110" fill="#cbd5e1" fontSize="13" fontWeight="bold" opacity="0.7">Nashik</text>
          <text x="560" y="200" fill="#94a3b8" fontSize="12" fontWeight="bold" opacity="0.6">Ahmednagar</text>
          <text x="360" y="295" fill="#f8fafc" fontSize="15" fontWeight="bold" opacity="0.9">Pune</text>
          <text x="360" y="420" fill="#94a3b8" fontSize="13" fontWeight="bold" opacity="0.6">Satara</text>
          <text x="360" y="550" fill="#94a3b8" fontSize="13" fontWeight="bold" opacity="0.6">Kolhapur</text>
          <text x="730" y="370" fill="#f8fafc" fontSize="14" fontWeight="bold" opacity="0.8">Solapur</text>

          {/* Agricultural Transport Corridors (Routes from Baramati to Mandis) */}
          {mandis.map((m) => {
            if (m.id === 'baramati') return null;
            return (
              <g key={`route_${m.id}`}>
                <line
                  x1={520}
                  y1={324}
                  x2={m.x * 10}
                  y2={m.y * 6}
                  stroke={selectedPin === m.id ? '#D3D67A' : 'rgba(34,197,94,0.45)'}
                  strokeWidth={selectedPin === m.id ? '3.5' : '2'}
                  strokeDasharray={selectedPin === m.id ? '6 4' : '4 3'}
                  className={selectedPin === m.id ? 'animate-pulse' : ''}
                />
              </g>
            );
          })}

          {/* Farm Home Base (Baramati Cluster) */}
          <g transform="translate(520, 324)" className="cursor-pointer" onClick={() => setSelectedPin('baramati')}>
            <circle r="22" fill="rgba(34,197,94,0.25)" className="animate-ping" />
            <circle r="14" fill="#2A5124" stroke="#D3D67A" strokeWidth="2.5" />
            <text y="4" textAnchor="middle" fill="#D3D67A" fontSize="12">🏡</text>
            <rect x="-65" y="18" width="130" height="22" rx="11" fill="rgba(0,0,0,0.85)" stroke="#D3D67A" strokeWidth="1" />
            <text x="0" y="33" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="bold">
              📍 Baramati (Your Farm)
            </text>
          </g>

          {/* Interactive Mandi Pins */}
          {mandis.map((m) => {
            if (m.id === 'baramati') return null;
            const px = m.x * 10;
            const py = m.y * 6;
            const isSelected = selectedPin === m.id;

            return (
              <g
                key={m.id}
                transform={`translate(${px}, ${py})`}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedPin(m.id);
                  if (onSelectMandi) onSelectMandi(m);
                }}
              >
                <circle
                  r={isSelected ? '16' : '10'}
                  fill={isSelected ? '#D3D67A' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all"
                />
                <text y="4" textAnchor="middle" fill={isSelected ? '#1c3618' : '#ffffff'} fontSize="10" fontWeight="bold">
                  ₹
                </text>

                {/* Mandi label pill */}
                <rect
                  x="-55"
                  y="-26"
                  width="110"
                  height="20"
                  rx="10"
                  fill={isSelected ? '#2A5124' : 'rgba(15,23,42,0.85)'}
                  stroke={isSelected ? '#D3D67A' : 'rgba(255,255,255,0.2)'}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-12"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="bold"
                >
                  {m.name.split(' ')[0]} • ₹{m.priceQtl}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Mandi Live Information Overlay Card (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 right-16 sm:right-auto z-20 bg-black/85 backdrop-blur-md p-3.5 rounded-xl border border-white/20 text-white max-w-sm shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">●</span>
              <span className="font-extrabold text-xs tracking-tight">{activeMandi.name}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {activeMandi.distanceKm === 0 ? 'Home Market' : `${activeMandi.distanceKm} km • ${activeMandi.travelTime}`}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
              <span className="text-[10px] text-stone-400 block">Gross Rate</span>
              <span className="font-bold text-white">₹{activeMandi.priceQtl}/qtl</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
              <span className="text-[10px] text-stone-400 block">Freight/Toll</span>
              <span className="font-semibold text-amber-300">₹{activeMandi.transportCost}/qtl</span>
            </div>
            <div className="bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-500/40">
              <span className="text-[10px] text-emerald-300 block font-semibold">Net In-Hand</span>
              <span className="font-extrabold text-[#D3D67A]">₹{activeMandi.netPrice}/qtl</span>
            </div>
          </div>
        </div>

        {/* Map Control Actions (Bottom-Right, matching screenshot) */}
        <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-2xl">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 15, 160))}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center font-bold text-base transition cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 15, 80))}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center font-bold text-base transition cursor-pointer"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={() => setSelectedPin('baramati')}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-emerald-300 flex items-center justify-center text-sm transition cursor-pointer"
            title="Locate Farm (Center on Baramati)"
          >
            🧭
          </button>
          <button
            onClick={() => {
              setZoomLevel(100);
              setSelectedPin('baramati');
            }}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-sm transition cursor-pointer"
            title="Reset Map View"
          >
            ↻
          </button>
        </div>
      </div>
    </div>
  );
}
