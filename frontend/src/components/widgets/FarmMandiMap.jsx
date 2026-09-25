import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { getNearbyMandisForLocation, CLUSTER_COORDINATES } from '../../api/agmarknetService';

export default function FarmMandiMap({ onSelectMandi, isPinDropMode, onPinDropped }) {
  const { t } = useLanguage();
  const { lastSavedLocation, setLastSavedLocation } = useOffline();

  const [mapMode, setMapMode] = useState('satellite'); // satellite | streets | terrain
  const [selectedMandiId, setSelectedMandiId] = useState('mandi_baramati');
  const [pinDropActive, setPinDropActive] = useState(isPinDropMode || false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routesLayerRef = useRef(null);

  // Determine current farm coordinates based on location string
  const getFarmCoords = () => {
    const locLower = (lastSavedLocation || 'baramati').toLowerCase();
    for (const [key, val] of Object.entries(CLUSTER_COORDINATES)) {
      if (locLower.includes(key)) {
        return { lat: val.lat, lng: val.lng, name: val.name };
      }
    }
    // Check if coordinates string was stored e.g. "18.1517, 74.5772"
    const match = lastSavedLocation.match(/([0-9]+\.[0-9]+)[^0-9]+([0-9]+\.[0-9]+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), name: lastSavedLocation };
    }
    return { lat: 18.1517, lng: 74.5772, name: 'Baramati Cluster, Pune' };
  };

  const farmCoords = getFarmCoords();
  const nearbyMandis = getNearbyMandisForLocation(farmCoords.lat, farmCoords.lng, 'tomato');
  const activeMandi = nearbyMandis.find((m) => m.id === selectedMandiId) || nearbyMandis[0];

  // Tile layer URLs
  const getTileUrl = (mode) => {
    switch (mode) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      case 'streets':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileAttribution = (mode) => {
    switch (mode) {
      case 'satellite':
        return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community';
      case 'terrain':
        return 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap';
      default:
        return '&copy; OpenStreetMap contributors';
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [farmCoords.lat, farmCoords.lng],
        zoom: 9,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Real Satellite Tile Layer
      const tileLayer = L.tileLayer(getTileUrl('satellite'), {
        maxZoom: 18,
        attribution: getTileAttribution('satellite'),
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Layers for markers and lines
      markersLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);

      // Map Click Handler for Choose on Map
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const newLocName = `Farm Pin (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`;
        setLastSavedLocation(newLocName);
        if (onPinDropped) onPinDropped({ lat, lng, name: newLocName });
        setPinDropActive(false);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map tile mode
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newTile = L.tileLayer(getTileUrl(mapMode), {
      maxZoom: 18,
      attribution: getTileAttribution(mapMode),
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTile;
  }, [mapMode]);

  // Update markers and route lines when farmCoords or mandis change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !routesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    // 1. Add Farm Location Marker (Home Base)
    const farmIconHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; background: rgba(34, 197, 94, 0.35); border-radius: 50%; animation: pulse 2s infinite;"></div>
        <div style="width: 28px; height: 28px; background: #0b4d26; border: 2.5px solid #D3D67A; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          🏡
        </div>
        <div style="position: absolute; bottom: -24px; white-space: nowrap; background: rgba(0,0,0,0.85); color: #fff; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 12px; border: 1px solid #D3D67A;">
          📍 Farm (You)
        </div>
      </div>
    `;

    const farmMarker = L.marker([farmCoords.lat, farmCoords.lng], {
      icon: L.divIcon({
        className: 'custom-farm-marker',
        html: farmIconHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
      zIndexOffset: 1000,
    }).addTo(markersLayerRef.current);

    farmMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
        <strong style="color: #0b4d26; display: block; font-size: 13px;">📍 ${farmCoords.name}</strong>
        <span>Current registered collection point</span>
      </div>
    `);

    // 2. Add Mandi Markers and Routes
    nearbyMandis.slice(0, 8).forEach((mandi) => {
      const isSelected = selectedMandiId === mandi.id;

      // Draw route line from farm to this mandi
      const routeLine = L.polyline(
        [
          [farmCoords.lat, farmCoords.lng],
          [mandi.lat, mandi.lng]
        ],
        {
          color: isSelected ? '#D3D67A' : '#10b981',
          weight: isSelected ? 3.5 : 2,
          dashArray: isSelected ? '6, 6' : '4, 4',
          opacity: isSelected ? 0.95 : 0.6,
        }
      ).addTo(routesLayerRef.current);

      const mandiIconHtml = `
        <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
          <div style="background: ${isSelected ? '#0b4d26' : 'rgba(15, 23, 42, 0.9)'}; color: #ffffff; border: 1.5px solid ${isSelected ? '#D3D67A' : 'rgba(255,255,255,0.4)'}; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 4px 8px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px;">
            <span>${mandi.name.split(' ')[0]}</span>
            <span style="color: #D3D67A; font-weight: 800;">₹${mandi.modalPrice}</span>
          </div>
          <div style="width: 16px; height: 16px; background: ${isSelected ? '#D3D67A' : '#22c55e'}; border: 2px solid #ffffff; border-radius: 50%; margin-top: -3px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
        </div>
      `;

      const mandiMarker = L.marker([mandi.lat, mandi.lng], {
        icon: L.divIcon({
          className: 'custom-mandi-marker',
          html: mandiIconHtml,
          iconSize: [110, 40],
          iconAnchor: [55, 36],
        }),
      }).addTo(markersLayerRef.current);

      mandiMarker.on('click', () => {
        setSelectedMandiId(mandi.id);
        if (onSelectMandi) onSelectMandi(mandi);
      });
    });

    map.panTo([farmCoords.lat, farmCoords.lng]);
  }, [farmCoords.lat, farmCoords.lng, selectedMandiId, nearbyMandis]);

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
            {t('mandi_map_subtitle', `Dynamic routes and travel times originating from ${lastSavedLocation}`)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pinDropActive && (
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-3 py-1 rounded-full border border-amber-300 animate-pulse">
              📍 Click map to set farm location
            </span>
          )}
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 shrink-0">
            {nearbyMandis.length} Mandis Found
          </span>
        </div>
      </div>

      {/* Actual Satellite Map Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-300/80 dark:border-emerald-800/60 shadow-inner bg-[#101b13] min-h-[380px] md:min-h-[460px] flex items-center justify-center select-none">
        {/* Leaflet DOM container */}
        <div ref={mapContainerRef} className="w-full h-[460px] z-10" />

        {/* Top Floating Overlay Badge & Map Type Switchers */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Real Satellite Imagery: {lastSavedLocation}</span>
            <span className="bg-emerald-600/90 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
              {mapMode}
            </span>
          </div>

          <div className="pointer-events-auto bg-black/80 backdrop-blur-md rounded-xl p-1 flex items-center gap-1 border border-white/20 shadow-lg text-xs font-semibold">
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
          </div>
        </div>

        {/* Selected Mandi Live Information Overlay Card (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 right-16 sm:right-auto z-20 bg-black/90 backdrop-blur-md p-3.5 rounded-xl border border-white/20 text-white max-w-sm shadow-2xl pointer-events-auto">
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
              <span className="text-[10px] text-stone-400 block">Agmarknet Modal</span>
              <span className="font-bold text-white">₹{activeMandi.modalPrice}/qtl</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
              <span className="text-[10px] text-stone-400 block">Freight / Toll</span>
              <span className="font-semibold text-amber-300">₹{activeMandi.transportCost}/qtl</span>
            </div>
            <div className="bg-emerald-950/70 p-1.5 rounded-lg border border-emerald-500/40">
              <span className="text-[10px] text-emerald-300 block font-semibold">Net In-Hand</span>
              <span className="font-extrabold text-[#D3D67A]">₹{activeMandi.netPrice}/qtl</span>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-stone-400 flex items-center justify-between">
            <span>Source: {activeMandi.source}</span>
            <span>Updated: {activeMandi.reportedDate}</span>
          </div>
        </div>

        {/* Map Control Actions (Bottom-Right, matching screenshot) */}
        <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5 bg-black/85 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-2xl pointer-events-auto">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center font-bold text-base transition cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center font-bold text-base transition cursor-pointer"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([farmCoords.lat, farmCoords.lng], 11);
              }
            }}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-emerald-300 flex items-center justify-center text-sm transition cursor-pointer"
            title="Locate Farm (Center)"
          >
            🧭
          </button>
          <button
            onClick={() => setPinDropActive((p) => !p)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition cursor-pointer ${
              pinDropActive ? 'bg-amber-500 text-white animate-pulse' : 'bg-white/10 hover:bg-white/25 text-white'
            }`}
            title="Choose on Map (Click map to drop pin)"
          >
            📌
          </button>
        </div>
      </div>
    </div>
  );
}
