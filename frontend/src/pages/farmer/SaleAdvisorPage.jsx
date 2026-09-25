import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const FORECAST_DATA = [
  { day: '-7d', date: '18 Sep', price: 1750, min: 1700, max: 1800 },
  { day: '-5d', date: '20 Sep', price: 1780, min: 1720, max: 1820 },
  { day: '-3d', date: '22 Sep', price: 1800, min: 1750, max: 1850 },
  { day: 'Today', date: '25 Sep', price: 1850, min: 1800, max: 1900 },
  { day: '+3d', date: '28 Sep', price: 1960, min: 1880, max: 2040 },
  { day: '+7d', date: '02 Oct', price: 2020, min: 1910, max: 2130 },
  { day: '+14d', date: '09 Oct', price: 2160, min: 1950, max: 2370 },
];

export default function SaleAdvisorPage() {
  const { lang, t } = useLanguage();
  const [riskPreference, setRiskPreference] = useState('balanced');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  // SVG Chart Geometry
  const width = 800;
  const height = 280;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minPrice = 1500;
  const maxPrice = 2500;

  const getX = (idx) => padding.left + (idx / (FORECAST_DATA.length - 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minPrice) / (maxPrice - minPrice)) * chartH;

  // Build SVG path for confidence band
  const topPoints = FORECAST_DATA.map((d, i) => `${getX(i)},${getY(d.max)}`);
  const botPoints = [...FORECAST_DATA].reverse().map((d, i) => {
    const origIdx = FORECAST_DATA.length - 1 - i;
    return `${getX(origIdx)},${getY(d.min)}`;
  });
  const areaPath = `M ${topPoints.join(' L ')} L ${botPoints.join(' L ')} Z`;

  // Build SVG path for expected line
  const linePoints = FORECAST_DATA.map((d, i) => `${getX(i)},${getY(d.price)}`).join(' L ');
  const linePath = `M ${linePoints}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">📈</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
              {isMr ? 'एआय बाजार सल्लागार' : isHi ? 'एआई मार्केट एडवाइजर' : 'AI Market Advisor'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
            {isMr ? 'पीक विक्री निर्णय सल्लागार' : isHi ? 'फसल बिक्री सलाहकार' : 'Produce Sale & Hold Advisor'}
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">📍 Baramati / Pune Cluster: </span>
            {isMr
              ? 'पुढील १४ दिवसांचे किंमत अंदाज व थेट बाजार विश्लेषण.'
              : isHi
              ? 'अगले 14 दिनों के मूल्य पूर्वानुमान और स्मार्ट निर्णय।'
              : '14-day price forecasting model calibrated with Agmarknet APMC arrivals.'}
          </p>
        </div>

        {/* Risk Preference Toggle */}
        <div className="flex items-center gap-2 bg-white dark:bg-stone-900 p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 px-2">
            {isMr ? 'जोखीम पातळी:' : isHi ? 'जोखिम स्तर:' : 'Risk Profile:'}
          </span>
          <div className="flex gap-1 text-xs">
            {[
              { id: 'conservative', labelEn: 'Conservative', labelMr: 'कमी जोखीम', labelHi: 'सुरक्षित' },
              { id: 'balanced', labelEn: 'Balanced', labelMr: 'संतुलित', labelHi: 'संतुलित' },
              { id: 'growth', labelEn: 'Growth', labelMr: 'जास्त नफा', labelHi: 'उच्च लाभ' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRiskPreference(r.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  riskPreference === r.id
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {isMr ? r.labelMr : isHi ? r.labelHi : r.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 14-Day Price Forecast Interactive SVG Chart */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>📊</span>
              {isMr ? 'टोमॅटो १४ दिवसांचा भाव अंदाज (₹/क्विंटल)' : isHi ? 'टमाटर 14 दिवसीय मूल्य पूर्वानुमान (₹/क्विंटल)' : 'Tomato 14-Day Price Trajectory (₹/Quintal)'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isMr
                ? 'ऐतिहासिक कल, आवक प्रमाण आणि खरेदीदार मागणीच्या आधारे अंदाज'
                : isHi
                ? 'ऐतिहासिक रुझान, आवक और खरीदार मांग पर आधारित अनुमान'
                : 'P10-P90 probabilistic confidence band calibrated on MSAMB & Agmarknet'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-emerald-700 rounded-full inline-block shadow-xs"></span>
              <span className="text-stone-700 dark:text-stone-300">
                {isMr ? 'अपेक्षित दर' : isHi ? 'अनुमानित भाव' : 'Expected Rate'}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 dark:border-emerald-600 rounded inline-block"></span>
              <span className="text-stone-600 dark:text-stone-400">
                {isMr ? 'संभाव्य पट्टा (P10 - P90)' : isHi ? 'संभाव्य दायरा' : 'Confidence Band'}
              </span>
            </span>
          </div>
        </div>

        {/* Responsive SVG Chart Container */}
        <div className="relative overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px] select-none">
            <defs>
              <linearGradient id="advisorBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D1BF4B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#255919" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[1600, 1800, 2000, 2200, 2400].map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="currentColor"
                    className="text-stone-200 dark:text-stone-800"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[11px] fill-stone-400 dark:fill-stone-500 font-mono"
                  >
                    ₹{val}
                  </text>
                </g>
              );
            })}

            {/* Confidence Area */}
            <path d={areaPath} fill="url(#advisorBandGrad)" />

            {/* Price Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#255919"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:stroke-[#D1BF4B]"
            />

            {/* Today Dividing Vertical Line */}
            <line
              x1={getX(3)}
              y1={padding.top}
              x2={getX(3)}
              y2={height - padding.bottom}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text
              x={getX(3)}
              y={padding.top - 10}
              textAnchor="middle"
              className="text-[11px] font-bold fill-amber-700 dark:fill-amber-400"
            >
              {isMr ? 'आज' : isHi ? 'आज' : 'Today'}
            </text>

            {/* Data Points */}
            {FORECAST_DATA.map((d, i) => {
              const cx = getX(i);
              const cy = getY(d.price);
              const isToday = d.day === 'Today';

              return (
                <g
                  key={d.day}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(d)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isToday ? 7 : 5}
                    fill={isToday ? '#f59e0b' : '#047857'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-transform hover:scale-125"
                  />
                  {/* X-axis Label */}
                  <text
                    x={cx}
                    y={height - padding.bottom + 20}
                    textAnchor="middle"
                    className="text-[11px] font-semibold fill-stone-600 dark:fill-stone-400"
                  >
                    {d.day}
                  </text>
                  <text
                    x={cx}
                    y={height - padding.bottom + 34}
                    textAnchor="middle"
                    className="text-[10px] fill-stone-400 dark:fill-stone-500"
                  >
                    {d.date}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-4 right-4 bg-stone-900/90 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl text-xs space-y-1 pointer-events-none border border-stone-700">
              <div className="font-bold text-emerald-400">
                {hoveredPoint.day} ({hoveredPoint.date})
              </div>
              <div className="text-stone-200">
                {isMr ? 'अपेक्षित भाव:' : isHi ? 'अनुमानित भाव:' : 'Expected Rate:'}{' '}
                <strong className="text-white">₹{hoveredPoint.price}/qtl</strong>
              </div>
              <div className="text-stone-400 text-[11px]">
                {isMr ? 'संभाव्य श्रेणी:' : isHi ? 'संभाव्य दायरा:' : 'Band Range:'} ₹{hoveredPoint.min} - ₹{hoveredPoint.max}/qtl
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Scenarios Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Scenario 1: Hold produce 3-7 days */}
        <div className="relative bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-stone-900 dark:to-emerald-950/20 rounded-2xl border-2 border-emerald-500/70 dark:border-emerald-600/70 p-6 shadow-md flex flex-col justify-between">
          <div className="absolute top-0 right-0 bg-emerald-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
            <span>✨</span> {isMr ? 'शिफारस: थांबा' : isHi ? 'अनुशंसित: प्रतीक्षा करें' : 'Recommended Outlook'}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⏳</span>
              <h3 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
                {isMr ? '३ ते ७ दिवस थांबा' : isHi ? '3 से 7 दिन प्रतीक्षा करें' : 'Hold Produce 3–7 Days'}
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mb-4 leading-relaxed">
              {isMr
                ? 'आवक घटल्याने आणि पुढील आठवड्यात मुंबई/पुणे बाजारात सणासुदीच्या मागणीमुळे दरात मोठी वाढ अपेक्षित आहे.'
                : isHi
                ? 'आवक घटने और आगामी सप्ताह में उच्च उपभोक्ता मांग के कारण कीमतों में मजबूत उछाल का पूर्वानुमान है।'
                : 'Arrival crunch in major APMCs projected to lift clearing rates by +6% to +10% over current spot.'}
            </p>

            <div className="bg-white dark:bg-stone-900/90 rounded-xl p-4 border border-emerald-200 dark:border-emerald-900/60 mb-5">
              <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                {isMr ? 'अपेक्षित विक्री दर:' : isHi ? 'अनुमानित बिक्री मूल्य:' : 'Projected Realization:'}
              </div>
              <div className="text-3xl font-black text-emerald-800 dark:text-emerald-400">
                ₹1,960 – ₹2,040 <span className="text-sm font-normal text-stone-500">/qtl</span>
              </div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <span>▲</span> +₹110 – ₹190 /qtl {isMr ? 'अतिरिक्त नफा' : isHi ? 'अतिरिक्त लाभ' : 'Estimated Upside'}
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400 mb-6 bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
              <div className="flex justify-between">
                <span>{isMr ? 'कमाल घसरण जोखीम:' : isHi ? 'न्यूनतम समर्थन स्तर:' : 'Downside Floor (P10):'}</span>
                <strong className="text-stone-900 dark:text-stone-100">₹1,880/qtl</strong>
              </div>
              <div className="flex justify-between">
                <span>{isMr ? 'मॉडेल विश्वासार्हता:' : isHi ? 'मॉडल सटीकता:' : 'Model Confidence:'}</span>
                <strong className="text-emerald-700 dark:text-emerald-400">74% (Medium-High)</strong>
              </div>
              <div className="flex justify-between">
                <span>{isMr ? 'साठवणूक घट अंदाज:' : isHi ? 'भंडारण नुकसान:' : 'Storage Spoilage (Breaker Stage):'}</span>
                <strong className="text-amber-700 dark:text-amber-400">-2.0% maximum</strong>
              </div>
            </div>
          </div>

          <Link
            to="/farmer/pooling"
            className="w-full text-center bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>🤝</span>
            <span>{isMr ? 'FPO पूलमध्ये पूर्व-नोंदणी करा' : isHi ? 'FPO पूल में प्री-बुक करें' : 'Pre-Book in FPO Pool'}</span>
          </Link>
        </div>

        {/* Scenario 2: Sell Immediately */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚡</span>
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {isMr ? 'आजच त्वरित विक्री करा' : isHi ? 'आज ही तुरंत बेचें' : 'Liquidate Spot Today'}
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mb-4 leading-relaxed">
              {isMr
                ? 'जर तुम्हाला तातडीने रोख रक्कम हवी असेल किंवा तुमच्याकडे शीतगृह/हवेशीर साठवण सुविधा नसेल तर आजच विक्री करा.'
                : isHi
                ? 'यदि तत्काल नकदी की आवश्यकता है या भंडारण सुविधा उपलब्ध नहीं है, तो आज के हाजिर भाव पर तुरंत बेचें।'
                : 'Zero storage risk with immediate same-day settlement if liquidity is required today.'}
            </p>

            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-4 border border-stone-200 dark:border-stone-800 mb-5">
              <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                {isMr ? 'आजचा चालू थेट दर:' : isHi ? 'आज का हाजिर भाव:' : 'Current Spot Rate:'}
              </div>
              <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100">
                ₹1,850 – ₹1,900 <span className="text-sm font-normal text-stone-500">/qtl</span>
              </div>
              <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-1">
                {isMr ? 'पुणे व नारायणगाव APMC सरासरी' : isHi ? 'पुणे एवं नारायणगांव औसत' : 'Pune & Narayangaon Benchmark'}
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400 mb-6 bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
              <div className="flex justify-between">
                <span>{isMr ? 'किमान भाव हमी:' : isHi ? 'न्यूनतम दर:' : 'Downside Floor:'}</span>
                <strong className="text-stone-900 dark:text-stone-100">₹1,800/qtl</strong>
              </div>
              <div className="flex justify-between">
                <span>{isMr ? 'खराब होण्याचा धोका:' : isHi ? 'खराब होने का जोखिम:' : 'Perishability Loss:'}</span>
                <strong className="text-emerald-700 dark:text-emerald-400">0% (Zero holding exposure)</strong>
              </div>
              <div className="flex justify-between">
                <span>{isMr ? 'पैसे जमा होण्याचा वेळ:' : isHi ? 'भुगतान समय:' : 'Payout Timeline:'}</span>
                <strong className="text-stone-900 dark:text-stone-100">Same-day settlement</strong>
              </div>
            </div>
          </div>

          <Link
            to="/farmer/market"
            className="w-full text-center bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all border border-stone-300 dark:border-stone-700 flex items-center justify-center gap-2"
          >
            <span>⚖️</span>
            <span>{isMr ? 'सर्व बाजार समित्यांची तुलना करा' : isHi ? 'सभी मंडियों की तुलना करें' : 'Compare Nearby Mandis'}</span>
          </Link>
        </div>
      </div>

      {/* Perishability Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex gap-3 text-amber-950 dark:text-amber-200 text-xs shadow-xs">
        <span className="text-xl shrink-0 mt-0.5">⚠️</span>
        <div className="space-y-1">
          <p className="font-bold">
            {isMr
              ? 'नाशवंत पिकांसाठी महत्त्वाची सूचना (टोमॅटो / कांदा)'
              : isHi
              ? 'नाशवान फसलों के लिए महत्वपूर्ण सूचना'
              : 'Perishability Sensitivity Advisory'}
          </p>
          <p className="leading-relaxed">
            {isMr
              ? 'फळांची अवस्था जर पक्व (Red Ripe) असेल तर साठवणूक टाळा व तात्काळ विक्री करा. फळे हिरवट-पिवळसर (Breaker Stage) असल्यास ३ ते ५ दिवस सुरक्षितपणे ठेवू शकता.'
              : isHi
              ? 'यदि फल पूरी तरह से लाल और पके हुए हैं तो तत्काल बेचें। यदि फल ब्रेकर चरण (हल्के हरे-पीले) में हैं तो 3-5 दिनों तक होल्ड करना लाभदायक रहेगा।'
              : 'Only lots harvested at Breaker stage (pink-yellow blush) should be held. Red-ripe tomatoes must be liquidated within 24 hours to prevent weight and firmness degradation.'}
          </p>
        </div>
      </div>

      {/* Explainability Accordion */}
      <details className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 cursor-pointer text-stone-800 dark:text-stone-200 shadow-xs group">
        <summary className="font-bold text-sm flex items-center justify-between list-none">
          <span className="flex items-center gap-2">
            <span>ℹ️</span>
            {isMr
              ? 'हा अंदाज कसा तयार केला जातो? (एआय घटक)'
              : isHi
              ? 'यह पूर्वानुमान कैसे तैयार होता है? (एआई कारक)'
              : 'How KrishiSetu Calculates Price Projections'}
          </span>
          <span className="text-stone-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="text-xs text-stone-600 dark:text-stone-400 space-y-2 pt-4 border-t border-stone-100 dark:border-stone-800 mt-4 leading-relaxed">
          <p>
            {isMr
              ? 'आमचे मॉडेल खालील थेट डेटा घटकांचे विश्लेषण करून दररोज अंदाज अद्ययावत करते:'
              : isHi
              ? 'हमारा मॉडल निम्नलिखित डेटा स्रोतों का वास्तविक समय में विश्लेषण करता है:'
              : 'The algorithmic forecasting engine synthesizes four primary market vectors daily:'}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 font-medium">
            <li>
              <strong>Agmarknet & MSAMB APMC Inflow:</strong> Daily mandi arrivals across Nashik, Pune, Narayangaon, and Solapur.
            </li>
            <li>
              <strong>Buyer Institutional Inquiries:</strong> Direct procurement bids submitted by retail chains and HoReCa buyers.
            </li>
            <li>
              <strong>Historical Seasonality Curves:</strong> 5-year cyclical price bands during pre-festival and post-monsoon weeks.
            </li>
            <li>
              <strong>Diesel Freight Indices:</strong> Regional transport and freight rate fluctuations from taluka to major consumption centers.
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}
