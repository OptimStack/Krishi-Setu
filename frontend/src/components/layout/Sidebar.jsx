import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isBuyer = user?.role === 'buyer';

  const farmerNavItems = [
    {
      to: '/farmer/dashboard',
      label: t('dashboard', 'Dashboard'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      to: '/farmer/grade',
      label: t('grade_crop', 'Grade Crop'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      to: '/farmer/auction-listing',
      label: t('auction_listing', 'Auction Listing'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      to: '/farmer/market',
      label: t('market_prices', 'Market Prices'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      to: '/farmer/advisor',
      label: t('sale_advisor', 'Sale Advisor'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      to: '/farmer/procurement',
      label: t('buyer_procurement', 'Buyer Procurement'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      to: '/farmer/pooling',
      label: t('pooling', 'Pooling'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      to: '/farmer/products',
      label: t('my_products', 'My Products'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      to: '/farmer/payouts',
      label: t('settlement', 'Settlement'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  // Buyer navigation exactly matching Screenshots 1, 2, 3, 4 + Trades
  const buyerNavItems = [
    {
      to: '/buyer/marketplace',
      alias: ['/buyer/dashboard', '/buyer'],
      label: t('buyer_nav_marketplace', 'Marketplace'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      to: '/buyer/offers',
      alias: ['/buyer/orders'],
      label: t('buyer_nav_offers', 'My Offers'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      to: '/buyer/delivery',
      alias: ['/buyer/acceptance'],
      label: t('buyer_nav_delivery', 'Delivery Acceptance'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      to: '/buyer/trades',
      alias: ['/buyer/settlements'],
      label: t('buyer_nav_trades', 'Trades & Settlements'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    },
  ];

  const activeNavItems = isBuyer ? buyerNavItems : farmerNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-[#0c170e] border-r border-stone-200 dark:border-emerald-900/40 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header matching screenshot */}
        <div>
          <div className="p-5 border-b border-stone-100 dark:border-emerald-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#255919] to-[#D1BF4B] text-white flex items-center justify-center text-xl shadow-md border border-[#D1BF4B]/40 shrink-0">
                🌾
              </div>
              <div>
                <h1 className="font-black text-base tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
                  KrishiSetu AI
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#255919] dark:text-[#D1BF4B] block mt-0.5">
                  FPO &amp; MARKET LINKAGE
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
            >
              ✕
            </button>
          </div>

          {/* Navigation Section */}
          <div className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-3 block mb-2">
              NAVIGATION
            </span>

            <nav className="space-y-1">
              {activeNavItems.map((item) => {
                const isExact = location.pathname === item.to;
                const isAliased = Boolean(item.alias && item.alias.includes(location.pathname));
                const isActive = isExact || isAliased;

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      navigate(item.to);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#255919]/10 dark:bg-[#D1BF4B]/15 text-[#255919] dark:text-[#D1BF4B] shadow-xs border border-[#D1BF4B]/40 dark:border-[#D1BF4B]/30'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-emerald-950/30 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    <span className={isActive ? 'text-[#255919] dark:text-[#D1BF4B]' : 'text-stone-400 dark:text-stone-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card & Logout matching screenshot */}
        <div className="p-4 border-t border-stone-100 dark:border-emerald-900/30 space-y-3">
          <div className="flex items-center gap-3 p-2 bg-stone-50 dark:bg-[#111e13] rounded-xl border border-stone-200/80 dark:border-emerald-900/40">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-extrabold flex items-center justify-center text-sm border border-emerald-300 dark:border-emerald-700 shrink-0">
              {isBuyer ? (user?.name ? user.name[0].toUpperCase() : 'F') : (user?.name ? user.name[0].toUpperCase() : 'R')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                {isBuyer ? (user?.name || 'FreshMart Foods Pvt. Ltd.') : (user?.name || 'Ramesh Patil')}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 capitalize">
                {user?.role || (isBuyer ? 'Buyer' : 'Farmer')}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs transition cursor-pointer"
          >
            <span>↳</span>
            <span>{t('logout', 'Logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
