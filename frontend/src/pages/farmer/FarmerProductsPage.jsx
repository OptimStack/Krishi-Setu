import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { mockService } from '../../api/mockService';

export default function FarmerProductsPage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [lots, setLots] = useState([]);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Modals state
  const [qrModalTarget, setQrModalTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const gridContainerRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, [user]);

  const loadProducts = () => {
    const all = mockService.getListings();
    setLots(all);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Distinct crops
  const distinctCrops = useMemo(() => {
    const set = new Set();
    lots.forEach((l) => {
      if (l.crop) set.add(l.crop);
    });
    return Array.from(set);
  }, [lots]);

  // 9 KPI summary metrics matching Screenshot 2
  const kpiStats = useMemo(() => {
    const total = lots.length;
    const drafts = lots.filter((l) =>
      ['DRAFT', 'PHOTOS_UPLOADED', 'draft'].includes(l.productStatus || l.status)
    ).length;
    const underAnalysis = lots.filter((l) =>
      ['UNDER_ANALYSIS', 'NEEDS_REUPLOAD'].includes(l.productStatus || '')
    ).length;
    const awaitingVerification = lots.filter((l) =>
      ['AWAITING_FPO_VERIFICATION', 'submitted', 'AWAITING_VERIFICATION'].includes(l.productStatus || l.status)
    ).length;
    const published = lots.filter((l) =>
      l.productStatus === 'PUBLISHED' || l.marketplaceVisibility === 'PUBLIC'
    ).length;
    const inPool = lots.filter((l) =>
      ['IN_POOL', 'POOL_REQUESTED', 'pooled'].includes(l.productStatus || l.status) || l.poolId
    ).length;
    const buyerReserved = lots.filter((l) =>
      ['BUYER_RESERVED', 'reserved'].includes(l.productStatus || l.status)
    ).length;
    const sold = lots.filter((l) =>
      ['SOLD', 'DELIVERED', 'DISPATCHED', 'settled', 'paid'].includes(l.productStatus || l.status)
    ).length;
    const archived = lots.filter((l) =>
      ['ARCHIVED', 'WITHDRAWN', 'archived', 'withdrawn'].includes(l.productStatus || '') || l.archivedAt
    ).length;

    return {
      total,
      drafts,
      underAnalysis,
      awaitingVerification,
      published,
      inPool,
      buyerReserved,
      sold,
      archived,
    };
  }, [lots]);

  // Tab filtering logic matching Screenshot 2
  const filteredProducts = useMemo(() => {
    return lots
      .filter((l) => {
        const s = (l.productStatus || l.status || '').toUpperCase();
        if (selectedTab === 'DRAFT') {
          if (!['DRAFT', 'PHOTOS_UPLOADED'].includes(s)) return false;
        } else if (selectedTab === 'AWAITING_VERIFICATION') {
          if (!['AWAITING_FPO_VERIFICATION', 'SUBMITTED', 'AWAITING_VERIFICATION'].includes(s)) return false;
        } else if (selectedTab === 'FPO_VERIFIED') {
          if (!['FPO_VERIFIED', 'VERIFIED'].includes(s)) return false;
        } else if (selectedTab === 'PUBLISHED') {
          if (l.productStatus !== 'PUBLISHED' && l.marketplaceVisibility !== 'PUBLIC') return false;
        } else if (selectedTab === 'IN_POOL') {
          if (!['IN_POOL', 'POOL_REQUESTED', 'POOLED'].includes(s) && !l.poolId) return false;
        } else if (selectedTab === 'BUYER_RESERVED') {
          if (!['BUYER_RESERVED', 'RESERVED'].includes(s)) return false;
        } else if (selectedTab === 'DISPATCHED') {
          if (s !== 'DISPATCHED') return false;
        } else if (selectedTab === 'DELIVERED') {
          if (s !== 'DELIVERED') return false;
        } else if (selectedTab === 'SOLD') {
          if (!['SOLD', 'ACCEPTED', 'PAID', 'SETTLED'].includes(s)) return false;
        } else if (selectedTab === 'ARCHIVED') {
          if (!['ARCHIVED', 'WITHDRAWN'].includes(s) && !l.archivedAt) return false;
        }

        // Crop dropdown
        if (selectedCrop !== 'ALL' && l.crop?.toLowerCase() !== selectedCrop.toLowerCase()) {
          return false;
        }

        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchId = (l.id || l._id || '').toLowerCase().includes(q);
          const matchCrop = (l.crop || '').toLowerCase().includes(q);
          const matchVariety = (l.variety || '').toLowerCase().includes(q);
          const matchHub = (l.locationName || '').toLowerCase().includes(q);
          if (!matchId && !matchCrop && !matchVariety && !matchHub) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
        } else if (sortBy === 'oldest') {
          return new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0);
        } else if (sortBy === 'qty_desc') {
          return (b.quantityKg || b.quantity_kg || 0) - (a.quantityKg || a.quantity_kg || 0);
        } else if (sortBy === 'qty_asc') {
          return (a.quantityKg || a.quantity_kg || 0) - (b.quantityKg || b.quantity_kg || 0);
        }
        return 0;
      });
  }, [lots, selectedTab, selectedCrop, searchQuery, sortBy]);

  // GSAP animation on items render
  useEffect(() => {
    if (gridContainerRef.current) {
      gsap.fromTo(
        gridContainerRef.current.querySelectorAll('.product-card'),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, stagger: 0.04, duration: 0.35, ease: 'power2.out' }
      );
    }
  }, [filteredProducts, viewMode]);

  // Status Badge Helper matching Screenshot 2
  const getStatusBadge = (lot) => {
    const s = (lot.productStatus || lot.status || '').toUpperCase();
    if (lot.marketplaceVisibility === 'PUBLIC' || s === 'PUBLISHED') {
      return (
        <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live on Marketplace
        </span>
      );
    }
    if (['DRAFT', 'PHOTOS_UPLOADED'].includes(s)) {
      return (
        <span className="bg-stone-900/80 backdrop-blur-md text-stone-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-stone-600">
          Draft
        </span>
      );
    }
    if (['AWAITING_FPO_VERIFICATION', 'SUBMITTED', 'AWAITING_VERIFICATION'].includes(s)) {
      return (
        <span className="bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-200" /> Awaiting FPO Verification
        </span>
      );
    }
    if (['FPO_VERIFIED', 'VERIFIED'].includes(s)) {
      return (
        <span className="bg-teal-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span>🛡️</span> FPO Verified
        </span>
      );
    }
    if (['IN_POOL', 'POOL_REQUESTED', 'POOLED'].includes(s) || lot.poolId) {
      return (
        <span className="bg-purple-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span>📦</span> In FPO Pool
        </span>
      );
    }
    return (
      <span className="bg-stone-700 text-stone-200 text-[11px] px-2.5 py-0.5 rounded-full">
        {s}
      </span>
    );
  };

  const handlePublish = (lot) => {
    mockService.publishProduct(lot.id || lot._id);
    loadProducts();
    showToast(`Product ${lot.id || lot._id} is now Live on Buyer Marketplace!`);
  };

  const handleConfirmWithdraw = () => {
    if (!withdrawTarget) return;
    mockService.withdrawProduct(withdrawTarget.id || withdrawTarget._id);
    loadProducts();
    setWithdrawTarget(null);
    showToast(`Product ${withdrawTarget.id || withdrawTarget._id} withdrawn from Marketplace.`);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    mockService.deleteProduct(deleteTarget.id || deleteTarget._id);
    loadProducts();
    setDeleteTarget(null);
    showToast(`Draft product deleted successfully.`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-stone-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header with Title & Add Product CTA matching Screenshot 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-50 flex items-center gap-2.5 tracking-tight">
            <span className="text-emerald-700 dark:text-emerald-400">📦</span>
            My Products
            <span className="text-base font-normal text-stone-500 dark:text-stone-400">
              ({lots.length} items)
            </span>
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-0.5">
            Manage your crop inventory, multi-angle AI quality assessments, pooling, and marketplace listings.
          </p>
        </div>

        <Link
          to="/farmer/grade"
          className="bg-gradient-to-r from-[#255919] to-[#386b24] hover:opacity-95 hover:-translate-y-0.5 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <span>➕</span> Add New Product
        </Link>
      </div>

      {/* 2. 9 KPI Summary Metric Cards matching Screenshot 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
        {[
          { label: 'Total Products', count: kpiStats.total, color: 'text-stone-900 dark:text-stone-100', tab: 'ALL' },
          { label: 'Drafts', count: kpiStats.drafts, color: 'text-stone-600 dark:text-stone-300', tab: 'DRAFT' },
          { label: 'Under Analysis', count: kpiStats.underAnalysis, color: 'text-amber-700 dark:text-amber-400', tab: 'UNDER_ANALYSIS' },
          { label: 'Awaiting Verification', count: kpiStats.awaitingVerification, color: 'text-blue-700 dark:text-blue-400', tab: 'AWAITING_VERIFICATION' },
          { label: 'Published Live', count: kpiStats.published, color: 'text-emerald-700 dark:text-emerald-400 font-bold', tab: 'PUBLISHED' },
          { label: 'In FPO Pool', count: kpiStats.inPool, color: 'text-purple-700 dark:text-purple-400', tab: 'IN_POOL' },
          { label: 'Buyer Reserved', count: kpiStats.buyerReserved, color: 'text-amber-800 dark:text-amber-300 font-bold', tab: 'BUYER_RESERVED' },
          { label: 'Sold & Settled', count: kpiStats.sold, color: 'text-emerald-800 dark:text-emerald-300', tab: 'SOLD' },
          { label: 'Archived', count: kpiStats.archived, color: 'text-stone-500 dark:text-stone-400', tab: 'ARCHIVED' },
        ].map((kpi, idx) => {
          const isSelected = selectedTab === kpi.tab;
          return (
            <div
              key={idx}
              onClick={() => setSelectedTab(kpi.tab)}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 hover:-translate-y-0.5 ${
                isSelected
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-[#255919] dark:border-[#D1BF4B] shadow-xs ring-1 ring-[#255919] dark:ring-[#D1BF4B]'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50/50'
              }`}
            >
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block truncate" title={kpi.label}>
                {kpi.label}
              </span>
              <span className={`text-xl font-black mt-1 block ${kpi.color}`}>
                {kpi.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. Filter Bar & Controls Container matching Screenshot 2 */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-xs space-y-4">
        {/* Top Filter Row: Search, Crop select, Sort & Grid/Table switch */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search by ID, crop, variety, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 h-9 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Filters & View Switches */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Crop Filter Dropdown */}
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="text-xs h-9 rounded-xl border border-stone-200 dark:border-stone-700 px-3 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">All Crops ({distinctCrops.length})</option>
              {distinctCrops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs h-9 rounded-xl border border-stone-200 dark:border-stone-700 px-3 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="qty_desc">Quantity: High to Low</option>
              <option value="qty_asc">Quantity: Low to High</option>
            </select>

            {/* Grid / Table Toggle */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-stone-700 text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="Grid Cards"
              >
                ⊞
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-stone-700 text-emerald-800 dark:text-emerald-300 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="Table View"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Status Tabs Bar matching Screenshot 2 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-stone-100 dark:border-stone-800 pt-3 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Products' },
            { id: 'DRAFT', label: 'Drafts' },
            { id: 'AWAITING_VERIFICATION', label: 'Awaiting Verification' },
            { id: 'FPO_VERIFIED', label: 'FPO Verified' },
            { id: 'PUBLISHED', label: 'Published Live' },
            { id: 'IN_POOL', label: 'In FPO Pool' },
            { id: 'BUYER_RESERVED', label: 'Buyer Reserved' },
            { id: 'DISPATCHED', label: 'Dispatched' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'SOLD', label: 'Sold & Settled' },
            { id: 'ARCHIVED', label: 'Archived/Withdrawn' },
          ].map((tab) => {
            const active = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#255919] text-white font-semibold shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Products Display (Grid View matching Screenshot 2) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-800 p-12 text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-emerald-50 dark:bg-emerald-950 rounded-2xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-2xl">
            📦
          </div>
          <div>
            <h3 className="font-bold text-lg text-stone-800 dark:text-stone-200">No Products Found</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mt-1">
              No registered crops match your active filters. Try switching tabs or clearing your search term.
            </p>
          </div>
          <Link
            to="/farmer/grade"
            className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs"
          >
            + Grade &amp; Add New Crop
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div ref={gridContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((lot) => {
            const lotId = lot.id || lot._id;
            const isDraft = ['DRAFT', 'PHOTOS_UPLOADED', 'draft'].includes(lot.productStatus || lot.status);
            const isPublished = lot.productStatus === 'PUBLISHED' || lot.marketplaceVisibility === 'PUBLIC';
            const canDeleteDraft = isDraft && !lot.poolId;
            const canWithdraw = isPublished;
            const canPublish = !isPublished && !lot.archivedAt;

            const coverImg =
              lot.coverImageUrl ||
              lot.images?.[0] ||
              '/demo/tomato-top.jpg';

            return (
              <div
                key={lotId}
                className="product-card bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-[#255919] dark:hover:border-[#D1BF4B] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Image & Overlay Banner matching Screenshot 2 */}
                  <div className="relative aspect-video bg-stone-950 overflow-hidden">
                    <img
                      src={coverImg}
                      alt={lot.crop}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      {getStatusBadge(lot)}
                    </div>

                    {/* AI Grade Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-900 dark:text-stone-100 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1">
                      <span className="text-emerald-600">✨</span>
                      {lot.grade || lot.aiGrade || 'Grade A'}
                    </div>

                    {/* Bottom Overlay Info */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-white">
                      <h3 className="font-black text-base sm:text-lg leading-tight">
                        {lot.crop}{' '}
                        <span className="text-xs font-normal text-stone-200">({lot.variety})</span>
                      </h3>
                      <div className="flex items-center justify-between text-xs text-stone-300 mt-0.5">
                        <span className="font-mono text-[11px] font-semibold">{lotId}</span>
                        <span className="text-[11px]">
                          {new Date(lot.created_at || lot.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body Details matching Screenshot 2 */}
                  <div className="p-4 space-y-3 text-xs">
                    {/* Volume and Target Price Card */}
                    <div className="grid grid-cols-2 gap-2 bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-700/60">
                      <div>
                        <span className="text-stone-400 text-[10px] block font-medium">Volume</span>
                        <strong className="text-stone-800 dark:text-stone-200 font-bold text-sm">
                          {lot.quantityKg || lot.quantity_kg || 500} {lot.unit || 'metric_ton'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[10px] block font-medium">Target Price</span>
                        <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                          {lot.askingPricePerQtl || lot.askingPricePaise
                            ? `₹${lot.askingPricePerQtl || (lot.askingPricePaise ? lot.askingPricePaise / 100 : 1800)} / ${lot.unit || 'metric_ton'}`
                            : 'Market Rate'}
                        </strong>
                      </div>
                    </div>

                    {/* Quality Confidence */}
                    <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                      <span className="text-[11px]">Quality Confidence:</span>
                      <strong className="text-stone-900 dark:text-stone-100 font-semibold text-xs">
                        {lot.confidenceScore || 91}% (High)
                      </strong>
                    </div>

                    {/* Collection Hub */}
                    <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                      <span className="text-[11px]">FPO Hub:</span>
                      <span className="text-stone-800 dark:text-stone-200 font-medium truncate max-w-[170px] text-xs">
                        {lot.locationName || 'Baramati FPO Hub #1'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions matching Screenshot 2 (NO POOL BUTTON) */}
                <div className="p-3 bg-stone-50/80 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-1.5">
                  {/* Left: QR Pass Button */}
                  <button
                    type="button"
                    onClick={() => setQrModalTarget(lot)}
                    className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    title="View QR Dispatch Pass"
                  >
                    <span>📱</span>
                    <span className="font-medium">Pass</span>
                  </button>

                  {/* Right: Actions (Delete / Withdraw / Publish / View) */}
                  <div className="flex items-center gap-1.5">
                    {/* Delete button (Strictly uncommitted draft only) */}
                    {canDeleteDraft && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(lot)}
                        className="text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs px-2.5 h-8 rounded-xl font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Delete Draft Product"
                      >
                        <span>🗑️</span> Delete
                      </button>
                    )}

                    {/* Withdraw button (if live on marketplace) */}
                    {canWithdraw && (
                      <button
                        type="button"
                        onClick={() => setWithdrawTarget(lot)}
                        className="text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs px-2.5 h-8 rounded-xl font-medium transition-colors cursor-pointer"
                      >
                        Withdraw
                      </button>
                    )}

                    {/* Quick Publish button (if draft/awaiting) */}
                    {canPublish && (
                      <button
                        type="button"
                        onClick={() => handlePublish(lot)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 h-8 rounded-xl font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>🌐</span> Publish
                      </button>
                    )}

                    {/* Full Product Detail Link matching Screenshot 1 */}
                    <Link
                      to={`/farmer/products/${lotId}`}
                      className="bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs px-3 h-8 rounded-xl font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>👁️</span> View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View Mode */
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-x-auto shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">Product</th>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Grade</th>
                <th className="p-3.5">Quantity</th>
                <th className="p-3.5">Target Price</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredProducts.map((lot) => {
                const lotId = lot.id || lot._id;
                const coverImg = lot.coverImageUrl || lot.images?.[0] || '/demo/tomato-top.jpg';
                return (
                  <tr key={lotId} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="p-3.5 flex items-center gap-3">
                      <img
                        src={coverImg}
                        alt={lot.crop}
                        className="w-10 h-10 rounded-xl object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                      />
                      <div>
                        <strong className="text-stone-900 dark:text-stone-100 text-xs block">{lot.crop}</strong>
                        <span className="text-stone-500 text-[11px] block">{lot.variety}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-stone-700 dark:text-stone-300 font-semibold">{lotId}</td>
                    <td className="p-3.5">{getStatusBadge(lot)}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {lot.grade || lot.aiGrade || 'Grade A'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-semibold">
                      {lot.quantityKg || lot.quantity_kg || 500} {lot.unit || 'metric_ton'}
                    </td>
                    <td className="p-3.5 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      {lot.askingPricePerQtl ? `₹${lot.askingPricePerQtl}` : 'Market Rate'}
                    </td>
                    <td className="p-3.5 text-stone-500">
                      {new Date(lot.created_at || lot.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        to={`/farmer/products/${lotId}`}
                        className="text-xs font-bold text-stone-900 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 underline"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Dispatch Pass Modal */}
      {qrModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-black text-base text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <span>📱</span> Digital Dispatch Pass
              </h3>
              <button
                onClick={() => setQrModalTarget(null)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl text-center space-y-3 border border-stone-200 dark:border-stone-700">
              <div className="w-44 h-44 bg-white p-3 rounded-2xl mx-auto border border-stone-300 shadow-inner flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    qrModalTarget.qrCode || `KS-${qrModalTarget.id || qrModalTarget._id}`
                  )}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <strong className="text-stone-900 dark:text-stone-100 text-sm block">
                  {qrModalTarget.crop} ({qrModalTarget.variety})
                </strong>
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400 block mt-0.5">
                  {qrModalTarget.qrCode || `KS-${qrModalTarget.id || qrModalTarget._id}`}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center leading-relaxed">
              Show this QR pass at the FPO Weighbridge / Collection Center gate for instant batch weighing and receipt generation.
            </p>

            <button
              onClick={() => setQrModalTarget(null)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

      {/* Delete Draft Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base text-rose-600 flex items-center gap-2">
              <span>⚠️</span> Delete Draft Product?
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to permanently delete draft <strong>{deleteTarget.id || deleteTarget._id}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold py-2.5 rounded-xl hover:bg-stone-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base text-amber-600 flex items-center gap-2">
              <span>🛑</span> Withdraw from Marketplace?
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              This will immediately unlist product <strong>{withdrawTarget.id || withdrawTarget._id}</strong> from all buyer search catalogs and commercial purchase bids.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setWithdrawTarget(null)}
                className="flex-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold py-2.5 rounded-xl hover:bg-stone-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWithdraw}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Confirm Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
