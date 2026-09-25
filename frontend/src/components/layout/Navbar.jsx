import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { isOnline, toggleOnline, lastSavedLocation } = useOffline();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenVoice = () => {
    window.dispatchEvent(new CustomEvent('krishisetu_open_voice'));
  };

  const isFarmer = user?.role === 'farmer';

  return (
    <header className="bg-white dark:bg-[#0c170e] text-stone-900 dark:text-stone-100 border-b border-stone-200/90 dark:border-emerald-900/40 sticky top-0 z-30 transition-colors shadow-2xs">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Location Grid Indicator */}
        <div className="flex items-center gap-3">
          {/* Hamburger button for sidebar on mobile/tablet */}
          {user && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-emerald-950/40 border border-stone-200 dark:border-emerald-900/50 cursor-pointer"
              title="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Location & APMC Grid Pill matching screenshot */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100/90 dark:bg-[#132416] text-xs font-semibold text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-emerald-800/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-[#255919] dark:text-[#D1BF4B]">{lastSavedLocation}</span>
            <span className="text-stone-400">|</span>
            <span className="text-stone-500 dark:text-stone-400">{t('live_apmc_grid', 'Live APMC Grid: Pune Cluster')}</span>
          </div>

          {/* Brand for non-farmer viewports or unauthenticated */}
          {(!isFarmer || !user) && (
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <span className="text-xl">🌾</span>
              <span className="font-black text-base text-stone-900 dark:text-stone-100">
                Krishi<span className="text-[#255919] dark:text-[#D1BF4B]">-Setu</span>
              </span>
            </Link>
          )}
        </div>

        {/* Right Side: The THREE Core Items Specified by User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. LANGUAGE SWITCHER: English, Hindi, Marathi */}
          <div className="inline-flex items-center bg-stone-100 dark:bg-[#142617] rounded-xl p-0.5 border border-stone-300/80 dark:border-emerald-800/50 shadow-2xs">
            <span className="px-2 text-stone-400 dark:text-stone-500 text-xs hidden md:inline">🌐</span>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-white dark:bg-emerald-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('mr')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'mr'
                  ? 'bg-white dark:bg-emerald-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              मराठी
            </button>
            <button
              type="button"
              onClick={() => setLang('hi')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'hi'
                  ? 'bg-white dark:bg-emerald-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* 2. VOICE ASSISTANT BUTTON */}
          <button
            type="button"
            onClick={handleOpenVoice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-300/80 dark:border-emerald-700/60 transition shadow-2xs cursor-pointer active:scale-95"
            title="Open AI Voice Assistant"
          >
            <span className="text-sm">🎙️</span>
            <span>{t('voice', 'Voice')}</span>
          </button>

          {/* 3. ONLINE / OFFLINE STATUS TOGGLE */}
          <button
            type="button"
            onClick={toggleOnline}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition shadow-2xs cursor-pointer active:scale-95 ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700'
                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700'
            }`}
            title={`Status: ${isOnline ? 'Online (Click to simulate Offline)' : 'Offline (Click to go Online)'}`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isOnline ? t('online', 'Online') : t('offline', 'Offline')}</span>
          </button>

          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#142617] dark:hover:bg-[#1b341f] text-stone-600 dark:text-[#D3D67A] transition border border-stone-200 dark:border-emerald-800/40 cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-stone-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
