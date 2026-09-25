import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';

// 14-day price trajectory calibrated with Agmarknet and MSAMB arrivals
const RAW_FORECAST = [
  { day: '-7d', label: '-7d', date: '18 Sep', price: 1750, p10: 1720, p90: 1780 },
  { day: '-5d', label: '-5d', date: '20 Sep', price: 1780, p10: 1740, p90: 1810 },
  { day: '-3d', label: '-3d', date: '22 Sep', price: 1800, p10: 1770, p90: 1840 },
  { day: 'Today', label: 'Today', date: '25 Sep', price: 1850, p10: 1810, p90: 1890, isToday: true },
  { day: '+3d', label: '+3d', date: '28 Sep', price: 1960, p10: 1880, p90: 2040 },
  { day: '+7d', label: '+7d', date: '02 Oct', price: 2020, p10: 1910, p90: 2160 },
  { day: '+14d', label: '+14d', date: '09 Oct', price: 2160, p10: 1950, p90: 2380 },
];

export default function SaleAdvisorPage() {
  const { lang, t } = useLanguage();
  const { lastSavedLocation } = useOffline();
  const [riskPreference, setRiskPreference] = useState('balanced'); // conservative | balanced | growth
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  // Extract cluster name from lastSavedLocation or fallback to Yadgir Cluster
  const clusterName = useMemo(() => {
    if (!lastSavedLocation) return 'Yadgir Cluster';
    const loc = lastSavedLocation.toLowerCase();
    if (loc.includes('yadgir') || loc.includes('yadagiri')) return 'Yadgir Cluster';
    if (loc.includes('baramati')) return 'Baramati Cluster';
    if (loc.includes('nashik') || loc.includes('niphad')) return 'Nashik Cluster';
    if (loc.includes('pune')) return 'Pune Cluster';
    const parts = lastSavedLocation.split(',');
    return `${parts[0].trim()} Cluster`;
  }, [lastSavedLocation]);

  // Dynamic forecast data adjusted by risk appetite
  const forecastData = useMemo(() => {
    return RAW_FORECAST.map((d) => {
      if (d.isToday || d.day.startsWith('-')) return d;
      let pAdj = 0;
      let p10Adj = 0;
      let p90Adj = 0;
      if (riskPreference === 'conservative') {
        pAdj = -30;
        p10Adj = -20;
        p90Adj = -50;
      } else if (riskPreference === 'growth') {
        pAdj = +40;
        p10Adj = +10;
        p90Adj = +60;
      }
      return {
        ...d,
        price: d.price + pAdj,
        p10: d.p10 + p10Adj,
        p90: d.p90 + p90Adj,
      };
    });
  }, [riskPreference]);

  // SVG Chart Geometry matching reference screenshot
  const width = 860;
  const height = 300;
  const padding = { top: 30, right: 35, bottom: 45, left: 65 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Exact Y-axis limits matching reference: 1500 to 2500 (step of 250)
  const minPrice = 1500;
  const maxPrice = 2500;
  const yTicks = [2500, 2250, 2000, 1750, 1500];

  const getX = (idx) => padding.left + (idx / (forecastData.length - 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minPrice) / (maxPrice - minPrice)) * chartH;

  // Helper for smooth Bezier spline
  const createSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 5;
      const cp1y = p1.y + (p2.y - p0.y) / 5;
      const cp2x = p2.x - (p3.x - p1.x) / 5;
      const cp2y = p2.y - (p3.y - p1.y) / 5;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const p90Pts = forecastData.map((d, i) => ({ x: getX(i), y: getY(d.p90) }));
  const p10Pts = forecastData.map((d, i) => ({ x: getX(i), y: getY(d.p10) }));
  const p50Pts = forecastData.map((d, i) => ({ x: getX(i), y: getY(d.price) }));

  const p90Path = createSmoothPath(p90Pts);
  const p10ReversePts = [...p10Pts].reverse();
  const p10ReversePath = createSmoothPath(p10ReversePts).replace(/^M/, 'L');
  const confidenceAreaPath = `${p90Path} ${p10ReversePath} Z`;
  const expectedLinePath = createSmoothPath(p50Pts);

  // Recommendations data
  const recWaitPrice = riskPreference === 'growth' ? '₹1,990 - ₹2,100' : riskPreference === 'conservative' ? '₹1,930 - ₹2,010' : '₹1,960 - ₹2,040';
  const recWaitUpside = riskPreference === 'growth' ? '+₹140/qtl' : riskPreference === 'conservative' ? '+₹90/qtl' : '+₹110/qtl';
  const recWaitDownside = riskPreference === 'growth' ? '₹1,890/qtl' : riskPreference === 'conservative' ? '₹1,860/qtl' : '₹1,880/qtl';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {isMr ? 'एआय विक्री आणि वेळ सल्लागार' : isHi ? 'एआई बिक्री एवं समय सलाहकार' : 'AI Sale & Timing Advisor'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            <span className="font-bold text-stone-900 dark:text-stone-200">📍 {clusterName}:</span>{' '}
            {isMr
              ? 'तुमच्या जिल्ह्यासाठी १४ दिवसांचा दर अंदाज (P10, P50, P90 प्रमाण) आणि परिस्थिती विश्लेषण.'
              : isHi
              ? 'आपके जिले के लिए 14-दिवसीय मूल्य परिदृश्य (P10, P50, P90 मात्रांक) और निर्णय विश्लेषण।'
              : '14-day price outlook (P10, P50, P90 quantiles) and scenario analysis for your district.'}
          </p>
        </div>

        {/* Risk Appetite Switcher */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            {isMr ? 'जोखीम क्षमता:' : isHi ? 'जोखिम भूख:' : 'Risk Appetite:'}
          </span>
          <div className="inline-flex p-1 bg-stone-100 dark:bg-[#162719] rounded-xl border border-stone-200 dark:border-emerald-900/40">
            {[
              { id: 'conservative', labelEn: 'Conservative', labelMr: 'कमी जोखीम', labelHi: 'सुरक्षित' },
              { id: 'balanced', labelEn: 'Balanced', labelMr: 'संतुलित', labelHi: 'संतुलित' },
              { id: 'growth', labelEn: 'Growth', labelMr: 'जास्त नफा', labelHi: 'उच्च लाभ' },
            ].map((opt) => {
              const isActive = riskPreference === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setRiskPreference(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#182b1c] text-[#255919] dark:text-[#D1BF4B] shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {isMr ? opt.labelMr : isHi ? opt.labelHi : opt.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 14-Day Price Trajectory (Quantile Band) Card */}
      <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] p-6 space-y-4 transition-all duration-300">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              {isMr ? 'किंमत कल (१४ दिवसांचा क्वांटाइल पट्टा)' : isHi ? 'मूल्य रुझान (14-दिवसीय क्वांटाइल बैंड)' : 'Price Trajectory (14-Day Quantile Band)'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isMr
                ? 'जवळच्या बाजार समितीसाठी ऐतिहासिक दर आणि P10 (घसरण) - P50 (अपेक्षित) - P90 (कमाल) अंदाज'
                : isHi
                ? 'निकटतम मंडी के लिए ऐतिहासिक मूल्य एवं P10 (न्यूनतम) - P50 (अनुमानित) - P90 (अधिकतम) आउटलुक'
                : 'Historical prices and P10 (Downside) - P50 (Expected) - P90 (Upside) outlook for nearest Mandi'}
            </p>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] dark:bg-emerald-950/60 text-[#1B5E20] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {isMr ? 'मध्यम विश्वासार्हता (७८% बॅकटेस्ट व्याप्ती)' : isHi ? 'मध्यम सटीकता (78% बैकटेस्ट कवरेज)' : 'Medium Confidence (78% Backtest Coverage)'}
            </span>
          </div>
        </div>

        {/* SVG Quantile Band Chart */}
        <div className="relative overflow-x-auto pt-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[620px] select-none overflow-visible"
          >
            <defs>
              {/* Soft pale mint green uncertainty band */}
              <linearGradient id="mintUncertaintyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#86EFAC" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#A7F3D0" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#D1FAE5" stopOpacity="0.18" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y-axis labels */}
            {yTicks.map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="currentColor"
                    className="text-stone-100 dark:text-stone-800"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                  />
                  <text
                    x={padding.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[12px] fill-stone-400 dark:fill-stone-500 font-sans"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Uncertainty Band (P10 - P90) */}
            <path
              d={confidenceAreaPath}
              fill="url(#mintUncertaintyGrad)"
              className="transition-all duration-300"
            />

            {/* Expected Price Line (P50) */}
            <path
              d={expectedLinePath}
              fill="none"
              stroke="#15803D"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />

            {/* Data Point Circles along Expected Line */}
            {forecastData.map((d, i) => {
              const cx = getX(i);
              const cy = getY(d.price);
              const isHovered = hoveredPoint?.day === d.day;

              return (
                <g
                  key={d.day}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredPoint(d)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Invisible hit target */}
                  <circle cx={cx} cy={cy} r={14} fill="transparent" />

                  {/* Visual Circle */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4.5}
                    fill="#15803D"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />

                  {/* X-axis Tick Label */}
                  <text
                    x={cx}
                    y={height - padding.bottom + 22}
                    textAnchor="middle"
                    className={`text-[12px] font-medium transition-colors ${
                      d.isToday
                        ? 'fill-stone-900 dark:fill-stone-100 font-bold'
                        : 'fill-stone-500 dark:fill-stone-400'
                    }`}
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-4 right-6 bg-[#132215]/95 text-white backdrop-blur-md px-4 py-2.5 rounded-xl shadow-xl text-xs space-y-1 pointer-events-none border border-[#D1BF4B]/40 z-10">
              <div className="font-bold text-[#D1BF4B] flex items-center justify-between gap-3">
                <span>{hoveredPoint.label} ({hoveredPoint.date})</span>
                {hoveredPoint.isToday && <span className="bg-[#D1BF4B] text-[#132215] text-[10px] px-1.5 py-0.2 rounded font-black">TODAY</span>}
              </div>
              <div className="text-stone-200">
                {isMr ? 'अपेक्षित भाव:' : isHi ? 'अनुमानित भाव:' : 'Expected Rate:'}{' '}
                <strong className="text-white text-sm font-extrabold">₹{hoveredPoint.price}/qtl</strong>
              </div>
              <div className="text-stone-400 text-[11px]">
                {isMr ? 'संभाव्य दायरा:' : isHi ? 'क्वांटाइल दायरा:' : 'Quantile Band:'} ₹{hoveredPoint.p10} (P10) – ₹{hoveredPoint.p90} (P90) /qtl
              </div>
            </div>
          )}

          {/* Legend Centered Under Chart */}
          <div className="flex items-center justify-center gap-8 pt-3 text-xs text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] inline-block" />
              <span className="font-medium text-stone-700 dark:text-stone-300">
                {isMr ? 'अपेक्षित किंमत (P50)' : isHi ? 'अनुमानित मूल्य (P50)' : 'Expected Price (P50)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3 rounded-xs bg-[#A7F3D0] border border-[#86EFAC] inline-block" />
              <span className="font-medium text-stone-700 dark:text-stone-300">
                {isMr ? 'अनिश्चितता पट्टा (P10 - P90)' : isHi ? 'अनिश्चितता बैंड (P10 - P90)' : 'Uncertainty Band (P10 - P90)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Recommendation Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Wait 3 to 5 Days (Recommended) */}
        <div className="relative bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/30 p-6 shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all duration-300 flex flex-col justify-between">
          {/* Top-Right Badge: RECOMMENDED OUTLOOK */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-[#255919] to-[#3f702b] text-white text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs border border-[#D1BF4B]/40">
            <span>✨</span>
            <span>{isMr ? 'शिफारस केलेले आउटलुक' : isHi ? 'अनुशंसित दृष्टिकोण' : 'RECOMMENDED OUTLOOK'}</span>
          </div>

          <div className="space-y-4">
            {/* Title & Subtitle */}
            <div className="pr-32">
              <div className="flex items-center gap-2">
                <span className="text-xl text-[#255919] dark:text-[#D1BF4B]">📅</span>
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                  {isMr ? '३ ते ५ दिवस थांबा' : isHi ? '3 से 5 दिन प्रतीक्षा करें' : 'Wait 3 to 5 Days'}
                </h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {isMr
                  ? 'शेजारील कृषी क्लस्टर्समध्ये आवक घटल्याने अल्प मुदतीची किंमत वाढ निर्माण होत आहे.'
                  : isHi
                  ? 'पड़ोसी कृषि क्लस्टर में आपूर्ति घटने से अल्पकालिक मूल्य उछाल बन रहा है।'
                  : 'Supply dip in neighboring agricultural clusters creates short-term price surge.'}
              </p>
            </div>

            {/* Large Price Display */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                  {recWaitPrice}
                </span>
                <span className="text-sm font-normal text-stone-500 dark:text-stone-400">/qtl</span>
              </div>
              <p className="text-xs font-semibold text-[#255919] dark:text-[#D1BF4B] mt-1">
                {recWaitUpside} {isMr ? "आजच्या दरापेक्षा अंदाजित नफा" : isHi ? "आज के भाव से अनुमानित बढ़त" : "estimated upside against today's spot rate"}
              </p>
            </div>

            {/* Key Decision Metrics */}
            <div className="pt-2 border-t border-stone-100 dark:border-emerald-900/40 space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                <span>{isMr ? 'घसरण जोखीम (P10):' : isHi ? 'न्यूनतम जोखिम (P10):' : 'Downside Risk (P10):'}</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{recWaitDownside}</span>
              </div>
              <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                <span>{isMr ? 'विश्वास पातळी:' : isHi ? 'सटीकता स्तर:' : 'Confidence Level:'}</span>
                <span className="font-bold text-[#255919] dark:text-[#D1BF4B]">
                  74% {isMr ? 'मध्यम-उच्च' : isHi ? 'मध्यम-उच्च' : 'Medium-High'}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                <span>{isMr ? 'साठवणूक घट पेनल्टी:' : isHi ? 'भंडारण नुकसान पेनल्टी:' : 'Storage Spoilage Penalty:'}</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  -2.0% ({isMr ? 'ब्रेकर टप्पा' : isHi ? 'ब्रेकर स्टेज' : 'Breaker stage'})
                </span>
              </div>
            </div>
          </div>

          {/* Pre-Book in Aggregation Pool CTA */}
          <div className="pt-6">
            <Link
              to="/farmer/pooling"
              className="w-full text-center bg-gradient-to-r from-[#255919] to-[#D1BF4B] hover:opacity-95 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border border-[#D1BF4B]/40"
            >
              <span>{isMr ? 'प्रादेशिक एकत्रीकरण पूलमध्ये पूर्व-नोंदणी करा' : isHi ? 'क्षेत्रीय एकत्रीकरण पूल में प्री-बुक करें' : 'Pre-Book in Regional Aggregation Pool'}</span>
            </Link>
          </div>
        </div>

        {/* Right Card: Sell Now (Today) */}
        <div className="bg-white/95 dark:bg-[#132215]/95 rounded-2xl border border-stone-200/90 dark:border-[#D1BF4B]/20 shadow-xs hover:shadow-md border-t-2 border-t-[#D1BF4B] p-6 transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Title & Subtitle */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl text-[#255919] dark:text-[#D1BF4B]">📈</span>
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                  {isMr ? 'आत्ताच विक्री करा (आज)' : isHi ? 'अभी बेचें (आज)' : 'Sell Now (Today)'}
                </h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {isMr
                  ? 'जवळच्या बाजार समितीत तात्काळ थेट विक्री. काढणीनंतरचे नुकसान पूर्णपणे टाळले जाते.'
                  : isHi
                  ? 'निकटतम मंडी में तत्काल हाजिर बिक्री। कटाई के बाद होने वाले नुकसान से मुक्ति।'
                  : 'Immediate spot liquidation at nearest APMC. Eliminates post-harvest spoilage.'}
              </p>
            </div>

            {/* Large Price Display */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                  ₹1,850 - ₹1,900
                </span>
                <span className="text-sm font-normal text-stone-500 dark:text-stone-400">/qtl</span>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                {isMr ? 'चालू थेट बाजार बेंचमार्क दर' : isHi ? 'वर्तमान हाजिर बेंचमार्क मूल्य' : 'Current spot benchmark rate'}
              </p>
            </div>

            {/* Key Decision Metrics */}
            <div className="pt-2 border-t border-stone-100 dark:border-emerald-900/40 space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                <span>{isMr ? 'घसरण जोखीम (P10):' : isHi ? 'न्यूनतम जोखिम (P10):' : 'Downside Risk (P10):'}</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">₹1,800/qtl</span>
              </div>
              <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                <span>{isMr ? 'खराब होण्याचा धोका:' : isHi ? 'खराब होने का जोखिम:' : 'Perishability Exposure:'}</span>
                <span className="font-bold text-[#255919] dark:text-[#D1BF4B]">
                  0% ({isMr ? 'साठवणुकीचे नुकसान शून्य' : isHi ? 'शून्य होल्डिंग नुकसान' : 'Zero holding loss'})
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                <span>{isMr ? 'पैसे मिळण्याची मुदत:' : isHi ? 'भुगतान समय:' : 'Payout Timeline:'}</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {isMr ? 'त्याच दिवशी जमा' : isHi ? 'उसी दिन भुगतान' : 'Same-day settlement'}
                </span>
              </div>
            </div>
          </div>

          {/* Compare Spot Mandis CTA */}
          <div className="pt-6">
            <Link
              to="/farmer/market"
              className="w-full text-center border border-stone-300 dark:border-[#D1BF4B]/40 bg-stone-50 dark:bg-[#162719] hover:bg-stone-100 dark:hover:bg-[#1c3321] text-stone-800 dark:text-stone-200 font-semibold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isMr ? 'थेट बाजार समित्यांची तुलना करा' : isHi ? 'हाजिर मंडियों की तुलना करें' : 'Compare Spot Mandis'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Important Perishability Constraint Banner */}
      <div className="bg-amber-50/90 dark:bg-[#201809]/95 border-2 border-amber-400/80 dark:border-amber-600/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs shadow-xs border-t-2 border-t-amber-500">
        <span className="text-xl sm:text-2xl shrink-0 mt-0.5">⚠️</span>
        <div className="space-y-1">
          <p className="font-bold text-amber-900 dark:text-amber-300 text-xs sm:text-sm">
            {isMr
              ? 'टोमॅटोसाठी महत्त्वाची नाशवंत मर्यादा:'
              : isHi
              ? 'टमाटर के लिए महत्वपूर्ण नाशवान सीमा:'
              : 'Important Perishability Constraint for Tomato:'}
          </p>
          <p className="text-amber-800 dark:text-amber-400 leading-relaxed text-xs">
            {isMr
              ? 'टोमॅटो अत्यंत नाशवंत आहे. कोल्ड-चेन रीफर साठवणुकीशिवाय, वातावरणीय तापमानात ४-५ दिवसांपेक्षा जास्त ठेवल्यास फळांची कडकपणा वेगाने कमी होतो व सड निर्माण होते. सत्यापित शीतगृह सुविधा उपलब्ध असल्याशिवाय "साठवणूक" पर्याय निष्क्रिय केला आहे.'
              : isHi
              ? 'टमाटर अत्यधिक नाशवान है। बिना कोल्ड-चेन रेफर भंडारण के, 4-5 दिनों से अधिक सामान्य तापमान में रखने पर फलों की दृढ़ता तेजी से घटती है और सड़न पैदा होती है। सत्यापित कोल्ड स्टोरेज की उपलब्धता के बिना "स्टोर" विकल्प अक्षम है।'
              : 'Tomato is highly perishable. Without cold-chain reefer storage, ambient holding beyond 4-5 days causes exponential firmness loss and surface rot. The "Store" option is disabled unless verified cold storage access is available.'}
          </p>
        </div>
      </div>

      {/* Accordion: Why this recommendation? (Explainable AI Factors) */}
      <div className="bg-white/95 dark:bg-[#132215]/95 border border-stone-200/90 dark:border-[#D1BF4B]/20 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border-t-2 border-t-[#255919] dark:border-t-[#D1BF4B] transition-all duration-300">
        <button
          onClick={() => setIsAccordionOpen((prev) => !prev)}
          className="w-full text-left p-4.5 flex items-center justify-between text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#162719] transition cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="text-[#255919] dark:text-[#D1BF4B] text-base">ℹ️</span>
            <span>
              {isMr
                ? 'ही शिफारस का दिली आहे? (स्पष्टीकरणात्मक एआय घटक)'
                : isHi
                ? 'यह सिफारिश क्यों की गई? (व्याख्यात्मक एआई कारक)'
                : 'Why this recommendation? (Explainable AI Factors)'}
            </span>
          </span>
          <span className={`text-stone-400 transform transition-transform duration-200 ${isAccordionOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {isAccordionOpen && (
          <div className="p-5 border-t border-stone-100 dark:border-emerald-900/40 bg-stone-50/50 dark:bg-[#162719] text-xs text-stone-600 dark:text-stone-400 space-y-3 leading-relaxed">
            <p className="font-medium text-stone-700 dark:text-stone-300">
              {isMr
                ? 'एआय निर्णय प्रणाली दररोज ४ प्रमुख बाजार घटकांचे विश्लेषण करते:'
                : isHi
                ? 'एआई निर्णय प्रणाली प्रतिदिन 4 मुख्य बाजार घटकों का विश्लेषण करती है:'
                : 'The algorithmic forecasting engine synthesizes four primary market vectors daily:'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white dark:bg-[#182b1c] rounded-xl border border-stone-200/80 dark:border-emerald-900/40">
                <span className="font-bold text-stone-900 dark:text-stone-100 block mb-0.5">
                  1. {isMr ? 'आवक प्रमाण (Agmarknet व MSAMB)' : 'APMC Arrival Volumes (Agmarknet & MSAMB)'}
                </span>
                <span>
                  {isMr
                    ? 'पुणे, नाशिक व सोलापूरमधील आवक चालू आठवड्यात १२% घटली आहे, ज्यामुळे दरात तात्पुरती वाढ होत आहे.'
                    : 'Regional mandi arrivals dipped 12% across primary nodes, tightening short-term wholesale clearing.'}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#182b1c] rounded-xl border border-stone-200/80 dark:border-emerald-900/40">
                <span className="font-bold text-stone-900 dark:text-stone-100 block mb-0.5">
                  2. {isMr ? 'खरेदीदार थेट मागणी' : 'Institutional Buyer Demand Index'}
                </span>
                <span>
                  {isMr
                    ? 'किरकोळ साखळी व हॉरेका खरेदीदारांकडून ग्रेड-ए टोमॅटोसाठी थेट बोली प्रीमियम ₹११०/क्विंटलवर पोहोचला आहे.'
                    : 'Wholesale buyers and retail chains have submitted purchase orders at a +₹110/qtl premium over spot.'}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#182b1c] rounded-xl border border-stone-200/80 dark:border-emerald-900/40">
                <span className="font-bold text-stone-900 dark:text-stone-100 block mb-0.5">
                  3. {isMr ? 'हवामान व टिकवण क्षमता' : 'Perishability & Temperature Curve'}
                </span>
                <span>
                  {isMr
                    ? 'वर्तमान २८°C सरासरी तापमानात ब्रेकर टप्प्यातील टोमॅटो ३-५ दिवस सुरक्षित राहतात, मात्र पिकलेले फळे त्वरित विकावी लागतात.'
                    : 'At 28°C ambient, Breaker stage tomatoes sustain 3-5 days holding with under 2.0% quality penalty.'}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#182b1c] rounded-xl border border-stone-200/80 dark:border-emerald-900/40">
                <span className="font-bold text-stone-900 dark:text-stone-100 block mb-0.5">
                  4. {isMr ? 'वाहतूक खर्च बचत (FPO Pooling)' : 'Regional Freight Efficiency'}
                </span>
                <span>
                  {isMr
                    ? 'एकत्रीकरण पूलमधून माल पाठविल्यास प्रति क्विंटल ₹४५ ते ६० वाहतूक खर्च वाचतो.'
                    : 'Collective FPO aggregation dispatches save ₹45-60/quintal in shared freight deductions.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Center Disclaimer */}
      <p className="text-center text-xs text-stone-400 dark:text-stone-500 pt-2">
        {isMr
          ? 'केवळ निर्णय साहाय्यासाठी — आर्थिक किंमत हमी नाही. माल पाठवण्यापूर्वी प्रत्यक्ष आवक तपासा.'
          : isHi
          ? 'केवल निर्णय समर्थन हेतु — कोई वित्तीय मूल्य गारंटी नहीं। प्रेषण से पूर्व वास्तविक आवक सत्यापित करें।'
          : 'Decision support only — not a financial price guarantee. Verify current arrivals before dispatch.'}
      </p>
    </div>
  );
}
