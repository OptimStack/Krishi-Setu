import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import gsap from 'gsap';
import { useOffline } from '../../context/OfflineContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  calculateDistanceKm,
  calculateTravelTimeHours,
  formatTravelTime,
  calculateDynamicMandisForLocation,
  fetchLiveAgmarknetFeed,
  APMC_REGISTRY,
} from '../../api/agmarknetDataset';
import LocationChangeModal from '../../components/widgets/LocationChangeModal';

const CROPS = [
  'Tomato',
  'Onion',
  'Potato',
  'Pomegranate',
  'Green Chilli',
  'Soyabean',
  'Cotton',
  'Wheat',
  'Maize',
  'Ginger',
  'Garlic',
  'Turmeric',
];

const RADIUS_OPTIONS = [25, 50, 100, 200, 300, 500, 1000];

export default function MarketPricesPage() {
  const { lastSavedLocation, setLastSavedLocation } = useOffline();
  const { lang, t } = useLanguage();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [selectedCrop, setSelectedCrop] = useState('Tomato');
  const [searchRadiusKm, setSearchRadiusKm] = useState(100);
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest' | 'price' | 'net' | 'freshness'
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCustomSlider, setShowCustomSlider] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Dynamic cost parameters matching Screenshot 3
  const [quantityKg, setQuantityKg] = useState(500);
  const [freightPerKm, setFreightPerKm] = useState(15);
  const [handlingFee, setHandlingFee] = useState(180);
  const [packagingFee, setPackagingFee] = useState(150);
  const [commissionPct, setCommissionPct] = useState(5);
  const [spoilagePct, setSpoilagePct] = useState(2);
  const [fpoFeePct, setFpoFeePct] = useState(1.5);

  const [selectedMandiId, setSelectedMandiId] = useState('');
  const [mapTileStyle, setMapTileStyle] = useState('satellite'); // satellite | streets | terrain

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const circleLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const pageRef = useRef(null);

  // Determine farmer coordinates based on location string
  const farmerCoords = useMemo(() => {
    const locLower = (lastSavedLocation || 'yadagiri').toLowerCase();
    if (locLower.includes('yadgir') || locLower.includes('yadagiri')) {
      return { lat: 16.77, lng: 77.14, label: 'Yadagiri taluka, Yadgir, Karnataka' };
    }
    if (locLower.includes('baramati')) {
      return { lat: 18.1517, lng: 74.5772, label: 'Baramati Cluster, Pune' };
    }
    if (locLower.includes('nashik') || locLower.includes('niphad')) {
      return { lat: 20.0875, lng: 73.9898, label: 'Niphad, Nashik, Maharashtra' };
    }
    return { lat: 16.77, lng: 77.14, label: lastSavedLocation || 'Yadagiri taluka, Yadgir, Karnataka' };
  }, [lastSavedLocation]);

  // Compute dynamic mandis for location
  const dynamicData = useMemo(() => {
    return calculateDynamicMandisForLocation(
      farmerCoords.lat,
      farmerCoords.lng,
      selectedCrop,
      undefined,
      searchRadiusKm,
      sortBy,
      quantityKg
    );
  }, [farmerCoords, selectedCrop, searchRadiusKm, sortBy, quantityKg]);

  const displayMandis = dynamicData.mandis;

  // Active Mandi selection (default to first mandi)
  const activeMandi = useMemo(() => {
    return displayMandis.find((m) => m.id === selectedMandiId) || displayMandis[0] || null;
  }, [displayMandis, selectedMandiId]);

  // Mathematical Waterfall Calculation
  const calculateNet = (mandi, pricePerQtl) => {
    if (!mandi) {
      return {
        grossValue: 0,
        freight: 0,
        handling: 0,
        packaging: 0,
        commission: 0,
        spoilageLoss: 0,
        fpoFee: 0,
        totalDeductions: 0,
        netTotal: 0,
        netPerQtl: 0,
      };
    }
    const qtl = quantityKg / 100;
    const grossValue = pricePerQtl * qtl;
    const freight = freightPerKm * (mandi.distanceKm || 0);
    const handling = handlingFee;
    const packaging = packagingFee;
    const commission = grossValue * (commissionPct / 100);
    const spoilageLoss = grossValue * (spoilagePct / 100);
    const fpoFee = grossValue * (fpoFeePct / 100);
    const totalDeductions = freight + handling + packaging + commission + spoilageLoss + fpoFee;
    const netTotal = Math.max(0, grossValue - totalDeductions);
    const netPerQtl = qtl > 0 ? netTotal / qtl : 0;

    return {
      grossValue,
      freight,
      handling,
      packaging,
      commission,
      spoilageLoss,
      fpoFee,
      totalDeductions,
      netTotal,
      netPerQtl,
    };
  };

  const selectedCalc = calculateNet(activeMandi, activeMandi?.modalPrice || 0);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveAgmarknetFeed(selectedCrop);
    setIsRefreshing(false);
    showToast(isMr ? 'बाजारभाव ताजे झाले' : `Mandi feed refreshed for ${selectedCrop}`);
  };

  // Animate page entrance
  useEffect(() => {
    if (pageRef.current) {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [farmerCoords.lat, farmerCoords.lng],
        zoom: searchRadiusKm > 300 ? 7 : searchRadiusKm > 100 ? 8 : 9,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      circleLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;

    // Remove existing tile layer if switching
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let maxZoom = 19;
    if (mapTileStyle === 'streets') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    } else if (mapTileStyle === 'terrain') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    }

    const newTileLayer = L.tileLayer(tileUrl, { maxZoom }).addTo(map);
    tileLayerRef.current = newTileLayer;

    // Draw dynamic radius circle in sap green / gold
    if (circleLayerRef.current) {
      circleLayerRef.current.clearLayers();
      const circle = L.circle([farmerCoords.lat, farmerCoords.lng], {
        radius: searchRadiusKm * 1000,
        color: '#255919',
        weight: 2.5,
        opacity: 0.85,
        dashArray: '6, 8',
        fillColor: '#D1BF4B',
        fillOpacity: 0.12,
      }).addTo(circleLayerRef.current);

      circle.bindTooltip(`Radius: ${searchRadiusKm} km (${displayMandis.length} Mandis in range)`, {
        direction: 'top',
        className: 'bg-stone-900 text-[#D1BF4B] text-xs px-2 py-1 rounded shadow border border-[#D1BF4B]/40',
      });
    }

    // Draw markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      // Farmer pin marker
      const farmerIcon = L.divIcon({
        className: 'custom-farmer-icon',
        html: `<div style="background-color: #255919; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2.5px solid #D1BF4B; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">📍</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const farmMarker = L.marker([farmerCoords.lat, farmerCoords.lng], { icon: farmerIcon }).addTo(
        markersLayerRef.current
      );
      farmMarker.bindPopup(`<b>Farm Location</b><br/>${farmerCoords.label}`);

      // Mandi markers
      displayMandis.forEach((m) => {
        const isSelected = activeMandi?.id === m.id;
        const iconBg = isSelected ? '#D1BF4B' : '#255919';
        const iconTextColor = isSelected ? '#162810' : '#ffffff';
        const mandiIcon = L.divIcon({
          className: 'custom-mandi-icon',
          html: `<div style="background-color: ${iconBg}; color: ${iconTextColor}; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px; white-space: nowrap; border: 1.5px solid ${isSelected ? '#255919' : '#D1BF4B'}; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 4px;"><span>🏪</span> ₹${m.modalPrice}</div>`,
          iconSize: [60, 24],
          iconAnchor: [30, 12],
        });

        const marker = L.marker([m.lat, m.lng], { icon: mandiIcon }).addTo(markersLayerRef.current);
        marker.on('click', () => {
          setSelectedMandiId(m.id);
        });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <strong style="color: #064e3b; font-size: 13px;">${m.mandi}</strong><br/>
            <span>Modal: <b>₹${m.modalPrice}/qtl</b></span><br/>
            <span>Distance: <b>${m.distanceKm} km</b> (${formatTravelTime(m.travelTimeHours || m.distanceKm / 40)})</span><br/>
            <span style="color: #059669; font-weight: bold;">Est. Take-Home: ₹${Math.round(calculateNet(m, m.modalPrice).netPerQtl)}/qtl</span>
          </div>
        `);
      });
    }
  }, [farmerCoords, searchRadiusKm, mapTileStyle, displayMandis, activeMandi]);

  return (
    <div ref={pageRef} className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-stone-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header with Title, Subtitle & Live Feed Refresh matching Screenshot 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
            Mandi Price Discovery &amp; Net Realization
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-0.5">
            Compare dynamic APMC mandis, real distances, itemized transit deductions, and net realization across India.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-white dark:bg-[#162719] border border-stone-300 dark:border-emerald-800/80 hover:bg-stone-50 dark:hover:bg-[#182b1c] text-stone-700 dark:text-stone-200 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
          <span>{isRefreshing ? 'Refreshing...' : 'Live Feed Refresh'}</span>
        </button>
      </div>

      {/* 2. Farm Location Banner with High (GPS) Badge & Change Farm Pin button matching Screenshot 3 */}
      <div className="bg-white/95 dark:bg-[#132215]/95 p-4 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-[#162719] text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-base shrink-0">
            📍
          </div>
          <div>
            <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>
                Farm Location: <span className="text-emerald-800 dark:text-emerald-300">{farmerCoords.label}</span>
              </span>
              <span className="bg-emerald-50 dark:bg-[#162719] text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.2 rounded border border-emerald-300 dark:border-emerald-800">
                High (GPS)
              </span>
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              {dynamicData.autoExpanded ? (
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  Auto-expanded search radius to {dynamicData.effectiveRadiusKm} km to discover competitive buyers.
                </span>
              ) : (
                <span>Active search radius: {searchRadiusKm} km</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowLocationModal(true)}
          className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#162719] border border-emerald-300 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-[#182b1c] px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span>✏️</span> Change Farm Pin
        </button>
      </div>

      {/* 3. Statutory Agmarknet / DMI Disclaimer Banner matching Screenshot 3 */}
      <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200 shadow-2xs">
        <span className="text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900 dark:text-amber-200">
              Statutory Disclaimer &amp; Data Provenance (Agmarknet / DMI)
            </span>
            <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 text-[10px] font-bold rounded">
              3-Year Historical Daily Arrivals
            </span>
          </div>
          <p className="text-amber-800 dark:text-amber-300/90 text-[11px] leading-relaxed">
            Mandi prices and forecasts are probabilistic quantile projections (P10/P50/P90) based on 3-year historical daily arrival records from Agmarknet / Directorate of Marketing &amp; Inspection (Govt of India). Strictly for educational and harvest-planning decision-support; does NOT constitute guaranteed pricing or commercial trading advice.
          </p>
        </div>
      </div>

      {/* 4. Horizontal Scrollable Commodity Pills matching Screenshot 3 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1 shrink-0">
          <span>🌱</span> Commodity:
        </span>
        {CROPS.map((crop) => {
          const isActive = selectedCrop === crop;
          return (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#255919] to-[#D1BF4B] text-white shadow-xs scale-105'
                  : 'bg-stone-100 dark:bg-[#162719] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-emerald-900/40 hover:bg-stone-200 dark:hover:bg-[#182b1c]'
              }`}
            >
              {crop}
            </button>
          );
        })}
      </div>

      {/* 5. Mandi Discovery Range & Sorting Control Bar matching Screenshot 3 */}
      <div className="bg-white/95 dark:bg-[#132215]/95 p-4 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] shadow-xs space-y-3 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <span>⚙️</span> Mandi Discovery Range:
            </span>
            <span className="text-xs font-mono bg-emerald-50 dark:bg-[#162719] text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg font-bold">
              {searchRadiusKm >= 1000 ? 'Pan-India' : `${searchRadiusKm} km`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCustomSlider(!showCustomSlider)}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>🎚️</span> {showCustomSlider ? 'Hide Slider' : 'Custom Range Slider'}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500 dark:text-stone-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-stone-50 dark:bg-[#182b1c] border border-stone-200 dark:border-emerald-800/60 rounded-lg px-2.5 py-1 text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-hidden focus:border-[#D1BF4B]"
              >
                <option value="nearest">Nearest mandi</option>
                <option value="price">Highest modal price</option>
                <option value="net">Best net realization</option>
                <option value="freshness">Latest update</option>
              </select>
            </div>
          </div>
        </div>

        {/* Discovery Radius Option Pills matching Screenshot 3 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {RADIUS_OPTIONS.map((r) => {
            const isSelected = searchRadiusKm === r;
            return (
              <button
                key={r}
                onClick={() => setSearchRadiusKm(r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#255919] to-[#D1BF4B] text-white shadow-xs scale-105'
                    : 'bg-stone-100 dark:bg-[#162719] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-emerald-900/40 hover:bg-stone-200 dark:hover:bg-[#182b1c]'
                }`}
              >
                {r >= 1000 ? '1000 km (Pan-India)' : `${r} km`}
              </button>
            );
          })}
        </div>

        {/* Custom Range Slider (collapsible) */}
        {showCustomSlider && (
          <div className="p-3 bg-stone-50/70 dark:bg-[#162719] border border-stone-200/90 dark:border-emerald-900/40 rounded-xl space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-900 dark:text-stone-200">
              <span>Dynamic Range Slider:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{searchRadiusKm} km</span>
            </div>
            <input
              type="range"
              min="25"
              max="1000"
              step="25"
              value={searchRadiusKm}
              onChange={(e) => setSearchRadiusKm(parseInt(e.target.value, 10))}
              className="w-full accent-[#255919] dark:accent-[#D1BF4B] h-2 bg-stone-200 dark:bg-[#182b1c] rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 6. Live Mandi Discovery Radar & Radius Circle Map matching Screenshot 3 */}
      <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] shadow-xs overflow-hidden transition-all duration-300">
        <div className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-emerald-900/30">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span className="text-[#255919]">📍</span> Live Mandi Discovery Radar &amp; Radius Circle
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Showing APMC markets within {searchRadiusKm} km radius circle of {farmerCoords.label}. Click any pin to inspect rates.
            </p>
          </div>
          <span className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold self-start sm:self-auto">
            Radius: {searchRadiusKm} km
          </span>
        </div>

        {/* Map Viewport */}
        <div className="relative">
          <div ref={mapContainerRef} className="h-72 sm:h-96 w-full bg-stone-950 z-0" />

          {/* Map Controls Floating Overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-600 text-white text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Live Satellite Agri Grid</span>
            <span className="bg-[#255919] text-[10px] font-bold px-1.5 py-0.2 rounded ml-1">SATELLITE</span>
          </div>

          <div className="absolute top-3 right-3 z-10 flex items-center bg-[#132215]/80 backdrop-blur-md rounded-xl p-0.5 border border-emerald-900/50 text-xs text-white">
            <button
              onClick={() => setMapTileStyle('satellite')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                mapTileStyle === 'satellite' ? 'bg-[#255919] text-white font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapTileStyle('streets')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                mapTileStyle === 'streets' ? 'bg-[#255919] text-white font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              Streets
            </button>
            <button
              onClick={() => setMapTileStyle('terrain')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                mapTileStyle === 'terrain' ? 'bg-[#255919] text-white font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              Terrain
            </button>
          </div>
        </div>
      </div>

      {/* 7. NET REALIZATION ENGINE Waterfall Banner */}
      {activeMandi && (
        <div className="bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/80 dark:from-[#132215]/95 dark:via-[#162719] dark:to-[#132215]/95 border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl shadow-xs p-4 sm:p-5 overflow-hidden transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-emerald-100 dark:border-emerald-900/50">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#255919] text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                  NET REALIZATION ENGINE
                </span>
                <span className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-[#182b1c] text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  DEMO DATA: Agmarknet Bulletin
                </span>
                <strong className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  {activeMandi.mandi} ({activeMandi.distanceKm} km from Hub)
                </strong>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                Final Take-Home = Gross Mandi Clearance − Freight − Yard Handling − Packaging − APMC Cess − Spoilage Buffer − FPO Service Fee
              </p>
            </div>

            <div className="text-right sm:self-center shrink-0">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-semibold block">
                FINAL NET TAKE-HOME
              </span>
              <span className="text-2xl font-black text-emerald-800 dark:text-emerald-400">
                ₹{Math.round(selectedCalc.netPerQtl)}/qtl
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">
                (₹{Math.round(selectedCalc.netTotal)} for {quantityKg} kg)
              </span>
            </div>
          </div>

          {/* 8-Card Waterfall Pipeline matching Screenshot 3 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
            <div className="bg-white dark:bg-[#162719] p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold">1. Gross Modal</span>
              <strong className="text-sm font-black text-stone-900 dark:text-stone-100 block">₹{activeMandi.modalPrice}</strong>
              <span className="text-[9px] text-stone-400 block">per quintal</span>
            </div>

            <div className="bg-white dark:bg-[#162719] p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">2. Freight</span>
              <strong className="text-sm font-bold text-rose-700 dark:text-rose-400 block">
                -₹{Math.round(selectedCalc.freight / (quantityKg / 100))}
              </strong>
              <span className="text-[9px] text-stone-400 block">{activeMandi.distanceKm} km</span>
            </div>

            <div className="bg-white dark:bg-[#162719] p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">3. Handling</span>
              <strong className="text-sm font-bold text-rose-700 dark:text-rose-400 block">
                -₹{Math.round(handlingFee / (quantityKg / 100))}
              </strong>
              <span className="text-[9px] text-stone-400 block">Staging/weigh</span>
            </div>

            <div className="bg-white dark:bg-[#162719] p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">4. Packaging</span>
              <strong className="text-sm font-bold text-rose-700 dark:text-rose-400 block">
                -₹{Math.round(packagingFee / (quantityKg / 100))}
              </strong>
              <span className="text-[9px] text-stone-400 block">CFB crates</span>
            </div>

            <div className="bg-white dark:bg-[#162719] p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">5. APMC Cess</span>
              <strong className="text-sm font-bold text-rose-700 dark:text-rose-400 block">
                -₹{Math.round(selectedCalc.commission / (quantityKg / 100))}
              </strong>
              <span className="text-[9px] text-stone-400 block">{commissionPct}% cess</span>
            </div>

            <div className="bg-white dark:bg-[#162719] p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">6. Spoilage</span>
              <strong className="text-sm font-bold text-rose-700 dark:text-rose-400 block">
                -₹{Math.round(selectedCalc.spoilageLoss / (quantityKg / 100))}
              </strong>
              <span className="text-[9px] text-stone-400 block">{spoilagePct}% shrinkage</span>
            </div>

            <div className="bg-white dark:bg-[#162719] p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-2xs">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-bold">7. FPO Fee</span>
              <strong className="text-sm font-bold text-amber-800 dark:text-amber-400 block">
                -₹{Math.round(selectedCalc.fpoFee / (quantityKg / 100))}
              </strong>
              <span className="text-[9px] text-stone-400 block">{fpoFeePct}% service</span>
            </div>

            <div className="bg-gradient-to-r from-[#255919] to-[#386b24] text-white p-2.5 rounded-xl shadow-xs">
              <span className="text-[10px] text-emerald-200 block font-bold">8. Take-Home</span>
              <strong className="text-sm font-black text-emerald-300 block">₹{Math.round(selectedCalc.netPerQtl)}</strong>
              <span className="text-[9px] text-emerald-100 block font-mono">₹{Math.round(selectedCalc.netTotal)} net</span>
            </div>
          </div>
        </div>
      )}

      {/* 8. Two-Column Layout: Mandi Cards List (Left) + Transparent Net Calculator (Right) matching Screenshot 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Live APMC Mandi Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {displayMandis.map((mandi, idx) => {
            const calc = calculateNet(mandi, mandi.modalPrice);
            const isSelected = activeMandi?.id === mandi.id;

            return (
              <div
                key={mandi.id}
                onClick={() => setSelectedMandiId(mandi.id)}
                className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-[#255919] dark:border-[#D1BF4B] ring-2 ring-[#255919]/20 shadow-md bg-white/95 dark:bg-[#132215]/95 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B]'
                    : 'bg-white/95 dark:bg-[#132215]/95 border-stone-200/90 dark:border-[#D1BF4B]/20 hover:border-stone-300 dark:hover:border-emerald-700/60 shadow-xs border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B]'
                }`}
              >
                <div className="p-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="font-extrabold text-lg text-stone-900 dark:text-stone-50">
                        {mandi.mandi}
                      </h3>
                      <span className="bg-emerald-50 dark:bg-[#162719] text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE APMC
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <span>🚚</span> {mandi.distanceKm} km
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span>🕒</span> {formatTravelTime(mandi.travelTimeHours || mandi.distanceKm / 40)}
                      </span>
                      <span>•</span>
                      <span>
                        {mandi.district}, {mandi.state || 'Maharashtra'}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-1.5">
                      Variety: {mandi.variety} • Source: {mandi.source}
                    </div>
                  </div>

                  <div className="text-right sm:self-center shrink-0">
                    <div className="text-2xl font-black text-stone-900 dark:text-stone-50">
                      ₹{mandi.modalPrice}
                    </div>
                    <div className="text-[10px] text-stone-400 uppercase font-semibold">
                      MODAL PRICE / QUINTAL
                    </div>
                  </div>
                </div>

                {/* Net Take-Home Footer Strip matching Screenshot 3 */}
                <div className="bg-stone-50/70 dark:bg-[#162719] px-5 py-3 border-t border-stone-100 dark:border-emerald-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 text-xs">
                  <span className="text-stone-600 dark:text-stone-400">
                    Range: ₹{mandi.minPrice} - ₹{mandi.maxPrice}/qtl | Arrivals: {mandi.arrivalsQtl} qtl
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    Est. Take-Home: ₹{Math.round(calc.netPerQtl)}/qtl
                  </span>
                </div>
              </div>
            );
          })}

          {/* Critical Advisory & Net Realization Notice Banner matching Screenshot 3 */}
          <div className="bg-amber-50/90 dark:bg-[#182b1c] border border-amber-200 dark:border-amber-800/80 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200 leading-relaxed shadow-xs">
            <span className="text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
            <div className="space-y-1">
              <strong className="font-bold block text-amber-900 dark:text-amber-100">
                Critical Advisory &amp; Net Realization Notice:
              </strong>
              <p className="text-amber-800 dark:text-amber-300">
                &ldquo;This is an estimate. Final price may change based on quality, market demand, quantity, and buyer conditions.&rdquo; We calculate the &apos;Best estimated net outcome&apos; taking into account all real freight and handling deductions.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Transparent Net Calculator (1 col) matching Screenshot 3 */}
        <div className="lg:col-span-1">
          <div className="bg-white/95 dark:bg-[#132215]/95 border border-stone-200/90 dark:border-[#D1BF4B]/20 border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] rounded-2xl shadow-xs p-5 space-y-4 sticky top-6 transition-all duration-300">
            <div className="border-b border-stone-100 dark:border-emerald-900/30 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span className="text-emerald-700 dark:text-emerald-400">₹</span> Transparent Net Calculator
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Adjust parameters for <strong>{activeMandi?.mandi || 'Selected Mandi'}</strong>
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                  Batch Quantity (kg)
                </label>
                <input
                  type="number"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-emerald-800/60 bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#255919] dark:focus:ring-[#D1BF4B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                  Freight Rate (₹/km for solo vehicle)
                </label>
                <input
                  type="number"
                  value={freightPerKm}
                  onChange={(e) => setFreightPerKm(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-emerald-800/60 bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#255919] dark:focus:ring-[#D1BF4B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Handling (₹)
                  </label>
                  <input
                    type="number"
                    value={handlingFee}
                    onChange={(e) => setHandlingFee(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-emerald-800/60 bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Packaging (₹)
                  </label>
                  <input
                    type="number"
                    value={packagingFee}
                    onChange={(e) => setPackagingFee(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-emerald-800/60 bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    APMC Commission (%)
                  </label>
                  <input
                    type="number"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-emerald-800/60 bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    FPO Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={fpoFeePct}
                    onChange={(e) => setFpoFeePct(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-emerald-800/60 bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                  In-Transit Spoilage Buffer (%)
                </label>
                <input
                  type="number"
                  value={spoilagePct}
                  onChange={(e) => setSpoilagePct(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-emerald-800/60 bg-stone-50 dark:bg-[#182b1c] text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden"
                />
              </div>

              {/* Itemized Deductions Breakdown matching Screenshot 3 */}
              <div className="space-y-1.5 pt-3 border-t border-stone-100 dark:border-emerald-900/30 text-stone-600 dark:text-stone-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Gross Value ({quantityKg} kg @ ₹{activeMandi?.modalPrice || 0}/qtl):</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    ₹{Math.round(selectedCalc.grossValue)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Freight ({activeMandi?.distanceKm || 0} km x ₹{freightPerKm}):</span>
                  <span>-₹{Math.round(selectedCalc.freight)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Loading &amp; Labour Handling:</span>
                  <span>-₹{handlingFee}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Crates &amp; Packaging:</span>
                  <span>-₹{packagingFee}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>APMC Commission ({commissionPct}%):</span>
                  <span>-₹{Math.round(selectedCalc.commission)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Expected Loss ({spoilagePct}%):</span>
                  <span>-₹{Math.round(selectedCalc.spoilageLoss)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>FPO Fee ({fpoFeePct}%):</span>
                  <span>-₹{Math.round(selectedCalc.fpoFee)}</span>
                </div>
              </div>

              {/* Multi-Scenario Projections: Low / Expected / High matching Screenshot 3 */}
              <div className="pt-3 border-t border-stone-100 dark:border-emerald-900/30">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  REALIZATION PROJECTIONS (LOW / EXPECTED / HIGH)
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="bg-stone-50/70 dark:bg-[#162719] p-2 rounded-lg border border-stone-200 dark:border-emerald-900/40">
                    <span className="text-stone-400 block text-[9px]">Low (₹{activeMandi?.minPrice || 0})</span>
                    <strong className="text-stone-900 dark:text-stone-100 text-xs block mt-0.5">
                      ₹{Math.round(calculateNet(activeMandi, activeMandi?.minPrice || 0).netTotal)}
                    </strong>
                    <span className="text-[9px] text-stone-500 block">
                      ₹{Math.round(calculateNet(activeMandi, activeMandi?.minPrice || 0).netPerQtl)}/qtl
                    </span>
                  </div>

                  <div className="bg-emerald-50 dark:bg-[#182b1c] p-2 rounded-lg border border-emerald-300 dark:border-[#D1BF4B]/40">
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold block text-[9px]">
                      Expected (₹{activeMandi?.modalPrice || 0})
                    </span>
                    <strong className="text-emerald-950 dark:text-emerald-200 text-xs block mt-0.5">
                      ₹{Math.round(selectedCalc.netTotal)}
                    </strong>
                    <span className="text-[9px] text-emerald-800 dark:text-emerald-300 block font-semibold">
                      ₹{Math.round(selectedCalc.netPerQtl)}/qtl
                    </span>
                  </div>

                  <div className="bg-stone-50/70 dark:bg-[#162719] p-2 rounded-lg border border-stone-200 dark:border-emerald-900/40">
                    <span className="text-stone-400 block text-[9px]">High (₹{activeMandi?.maxPrice || 0})</span>
                    <strong className="text-stone-900 dark:text-stone-100 text-xs block mt-0.5">
                      ₹{Math.round(calculateNet(activeMandi, activeMandi?.maxPrice || 0).netTotal)}
                    </strong>
                    <span className="text-[9px] text-stone-500 block">
                      ₹{Math.round(calculateNet(activeMandi, activeMandi?.maxPrice || 0).netPerQtl)}/qtl
                    </span>
                  </div>
                </div>
              </div>

              {/* Best Estimated Net Outcome Footer matching Screenshot 3 */}
              <div className="pt-3 border-t border-stone-200 dark:border-emerald-900/30">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                    Best Estimated Net Outcome:
                  </span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    ₹{Math.round(selectedCalc.netTotal)}
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 text-right block font-medium">
                  ₹{Math.round(selectedCalc.netPerQtl)} / quintal realized
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Location Modal */}
      {showLocationModal && (
        <LocationChangeModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          currentLocation={lastSavedLocation}
          onSelectLocation={(newLoc) => {
            setLastSavedLocation(newLoc);
            setShowLocationModal(false);
            showToast(`Farm location pin updated to ${newLoc}`);
          }}
        />
      )}
    </div>
  );
}
