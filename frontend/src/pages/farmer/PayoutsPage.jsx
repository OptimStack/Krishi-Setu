import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getPayouts } from '../../api/payments';
import { formatCurrency, formatQuantity, formatDate } from '../../utils/format';

export default function PayoutsPage() {
  const { lang, t } = useLanguage();
  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL | SETTLED | ESCROW
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchPayouts = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await getPayouts();
      if (res && res.data) {
        setPayouts(res.data);
      }
    } catch (err) {
      console.error('Failed to load payouts:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts(false);
    const interval = setInterval(() => fetchPayouts(true), 6000);

    const handleSync = () => fetchPayouts(true);
    window.addEventListener('krishisetu_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('krishisetu_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchPayouts]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getPayoutAmount = (p) => parseFloat(p.amount ?? p.net_payout ?? p.gross_amount ?? 0);
  const getPayoutPrice = (p) => {
    if (p.clearing_price_per_kg) return parseFloat(p.clearing_price_per_kg);
    const qty = parseFloat(p.quantity_kg || 0);
    const amt = getPayoutAmount(p);
    return qty > 0 ? amt / qty : 25;
  };

  const totalEarnings = useMemo(() => payouts.reduce((sum, p) => sum + getPayoutAmount(p), 0), [payouts]);
  const settledEarnings = useMemo(
    () =>
      payouts
        .filter((p) => p.status === 'settled' || p.status === 'credited' || p.status === 'paid')
        .reduce((sum, p) => sum + getPayoutAmount(p), 0),
    [payouts]
  );
  const escrowEarnings = totalEarnings - settledEarnings;
  const totalVolumeKg = useMemo(() => payouts.reduce((sum, p) => sum + (parseFloat(p.quantity_kg) || 0), 0), [payouts]);

  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      const s = (p.status || '').toLowerCase();
      if (selectedFilter === 'SETTLED' && !['settled', 'credited', 'paid'].includes(s)) return false;
      if (selectedFilter === 'ESCROW' && ['settled', 'credited', 'paid'].includes(s)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (p.id || '').toLowerCase().includes(q);
        const matchCrop = (p.crop || '').toLowerCase().includes(q);
        if (!matchId && !matchCrop) return false;
      }
      return true;
    });
  }, [payouts, selectedFilter, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 font-sans animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-stone-700 flex items-center gap-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl text-emerald-700 dark:text-emerald-400">💳</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              {isMr ? 'शेतकरी जमा व हिशोब इतिहास' : isHi ? 'किसान भुगतान एवं खाता विवरण' : 'Farmer Settlement & Payouts'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] dark:bg-emerald-950/80 text-[#1B5E20] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              RBI Escrow Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            {isMr
              ? 'द्विपक्षीय लिलाव व्यवहारांची थेट आणि पारदर्शक बँक जमा माहिती.'
              : isHi
              ? 'डबल-नीलामी व्यापारों का पारदर्शी बैंक खाता निपटान एवं रसीद।'
              : 'Transparent, instant per-lot settlement breakdown powered by RBI-regulated nodal escrow.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              fetchPayouts(false);
              showToast(isMr ? 'खात्याची माहिती ताजी झाली' : 'Payout records refreshed');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold shadow-xs transition-all cursor-pointer hover:-translate-y-0.5"
          >
            ↻ {isMr ? 'ताजे करा' : 'Refresh'}
          </button>
          <Link
            to="/farmer/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold transition-all hover:-translate-y-0.5"
          >
            ← {isMr ? 'डॅशबोर्ड' : 'Dashboard'}
          </Link>
        </div>
      </div>

      {/* Verified Bank Account & PFMS Verification Card */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/40 dark:from-emerald-950/30 dark:via-stone-900 dark:to-stone-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-2xl shadow-xs shrink-0">
            🏦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                State Bank of India (SBI) — Baramati Branch
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                <span>✓</span> NPCI / PFMS Verified
              </span>
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex flex-wrap items-center gap-3 font-mono">
              <span>A/C: •••• •••• •••• 4821</span>
              <span>•</span>
              <span>IFSC: SBIN0001234</span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-sans font-semibold">T+0 Direct Credit</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-stone-500 dark:text-stone-400 bg-white/80 dark:bg-stone-800/80 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 shrink-0">
          <span className="block text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Settlement Protocol</span>
          <strong className="text-stone-800 dark:text-stone-200 font-sans">RBI Nodal Escrow Auto-Release</strong>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Settled Card */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-emerald-500/30 dark:border-emerald-700/40 shadow-xs hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <span>{isMr ? 'खात्यावर जमा रक्कम' : isHi ? 'प्राप्त शुद्ध राशि' : 'Settled Direct to Bank'}</span>
            <span className="text-emerald-600 text-base">✓</span>
          </div>
          <p className="text-3xl font-black text-[#15803D] dark:text-[#D1BF4B] mt-2">
            {formatCurrency(settledEarnings)}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            Transferred directly via IMPS/NEFT with zero commission
          </p>
        </div>

        {/* Traded Volume */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <span>{isMr ? 'एकूण विक्री केलेले प्रमाण' : isHi ? 'कुल व्यापारिक मात्रा' : 'Total Traded Volume'}</span>
            <span className="text-stone-400 text-base">⚖️</span>
          </div>
          <p className="text-3xl font-black text-stone-900 dark:text-stone-100 mt-2">
            {(totalVolumeKg / 100).toFixed(1)} <span className="text-base font-normal text-stone-500">Qtl</span>
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            {totalVolumeKg.toLocaleString('en-IN')} kg across {payouts.length} auction trade(s)
          </p>
        </div>

        {/* In-Escrow Funds */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <span>{isMr ? 'एस्क्रो खात्यात सुरक्षित' : isHi ? 'एस्क्रो में सुरक्षित' : 'Protected in Escrow'}</span>
            <span className="text-amber-500 text-base">🔒</span>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(escrowEarnings)}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            Buyer funds held 100% upfront; auto-releases on delivery
          </p>
        </div>
      </div>

      {/* Escrow Settlement Flow Banner */}
      <div className="bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5">
        <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>⚡</span>
          <span>KrishiSetu 4-Step Guaranteed Settlement Cycle</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">1. Upfront Escrow</span>
            <span className="text-stone-600 dark:text-stone-400">Buyer locks 100% invoice amount in RBI nodal account before dispatch.</span>
          </div>
          <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">2. Digital Weighment</span>
            <span className="text-stone-600 dark:text-stone-400">Lot gross &amp; tare weights logged at FPO collection center with QR tag.</span>
          </div>
          <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">3. Buyer Delivery OTP</span>
            <span className="text-stone-600 dark:text-stone-400">Buyer confirms grade verification and gate receipt via cryptographic token.</span>
          </div>
          <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">4. Instant Payout</span>
            <span className="text-stone-600 dark:text-stone-400">Escrow smart contract triggers automatic direct-to-bank credit within seconds.</span>
          </div>
        </div>
      </div>

      {/* Payout Records Table Container */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'ALL', label: isMr ? 'सर्व व्यवहार' : 'All Trades' },
              { id: 'SETTLED', label: isMr ? 'जमा झालेले' : 'Settled' },
              { id: 'ESCROW', label: isMr ? 'एस्क्रो मधील' : 'In Escrow' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedFilter === tab.id
                    ? 'bg-[#15803D] text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder={isMr ? 'आयडी किंवा पिकाने शोधा...' : 'Search payout ID or crop...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-500">
            <span className="animate-spin inline-block text-2xl mb-2">⏳</span>
            <p>Syncing settlement ledger...</p>
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <span className="text-4xl mb-3 block">💰</span>
            <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">No payout records found</h3>
            <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 max-w-sm mx-auto">
              Once your pooled produce is matched with buyer bids in an auction round, your transparent settlement receipt will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-[11px] uppercase tracking-wider font-bold bg-stone-50/50 dark:bg-stone-800/40">
                  <th className="py-3 px-4">Payout ID</th>
                  <th className="py-3 px-4">Crop &amp; Quality</th>
                  <th className="py-3 px-4">Net Quantity</th>
                  <th className="py-3 px-4">Clearing Rate</th>
                  <th className="py-3 px-4">Net In-Hand</th>
                  <th className="py-3 px-4">Escrow Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {filteredPayouts.map((p) => {
                  const amt = getPayoutAmount(p);
                  const rate = getPayoutPrice(p);
                  const isSettled = ['settled', 'credited', 'paid'].includes((p.status || '').toLowerCase());

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-800 dark:text-stone-200 text-xs">
                        {p.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-stone-900 dark:text-stone-100 capitalize block">
                          {p.crop}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {p.variety || 'Hybrid'} • {p.quality_grade || 'Grade A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-stone-900 dark:text-stone-100">{formatQuantity(p.quantity_kg)}</span>
                        <span className="text-[11px] text-stone-400 block">
                          {(parseFloat(p.quantity_kg) / 100).toFixed(1)} Qtl
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-stone-800 dark:text-stone-200">
                        {formatCurrency(rate)}/kg
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-[#15803D] dark:text-[#D1BF4B] text-base">
                        {formatCurrency(amt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F5E9] dark:bg-emerald-950 text-[#1B5E20] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            ✓ Direct Credited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            🔒 In Escrow
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-stone-500 dark:text-stone-400">
                        {formatDate(p.date || p.settled_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium transition cursor-pointer hover:border-emerald-500"
                        >
                          📄 Slip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Double-Auction Settlement Slip */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 dark:border-stone-800 relative">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-lg p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              ✕
            </button>

            {/* Slip Header */}
            <div className="text-center border-b border-stone-200 dark:border-stone-800 pb-5">
              <span className="text-2xl mb-1 inline-block">🌱</span>
              <h3 className="text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                KrishiSetu Double-Auction Settlement Voucher
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Nodal Escrow Reference ID: <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{selectedReceipt.id}</span>
              </p>
            </div>

            {/* Slip Details Grid */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                <span className="text-stone-500">Beneficiary Farmer:</span>
                <strong className="text-stone-900 dark:text-stone-100">Ramesh Patil (Baramati Cluster)</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                <span className="text-stone-500">Credited Bank Account:</span>
                <strong className="font-mono text-stone-900 dark:text-stone-100">SBI •••• 4821 (IFSC: SBIN0001234)</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                <span className="text-stone-500">Produce Lot:</span>
                <strong className="text-stone-900 dark:text-stone-100 capitalize">
                  {selectedReceipt.crop} ({selectedReceipt.quantity_kg} kg @ {formatCurrency(getPayoutPrice(selectedReceipt))}/kg)
                </strong>
              </div>

              {/* Deductions Breakdown */}
              <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-xl space-y-2 mt-2">
                <div className="flex justify-between text-stone-600 dark:text-stone-300">
                  <span>Gross Auction Realization:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(getPayoutPrice(selectedReceipt) * parseFloat(selectedReceipt.quantity_kg || 1))}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Mandi Cess / Statutory Fee (1.0%):</span>
                  <span>-₹{Math.round(getPayoutPrice(selectedReceipt) * parseFloat(selectedReceipt.quantity_kg || 1) * 0.01)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>FPO Shared Freight Contribution:</span>
                  <span>-₹{Math.round(parseFloat(selectedReceipt.quantity_kg || 1) * 0.45)}</span>
                </div>
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between font-black text-sm text-[#15803D] dark:text-[#D1BF4B]">
                  <span>Net Credited to Farmer:</span>
                  <span>{formatCurrency(getPayoutAmount(selectedReceipt))}</span>
                </div>
              </div>
            </div>

            {/* Slip Footer CTA */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-stone-400 font-mono">
                UTR: NPCI_{selectedReceipt.id.replace('pay_', '')}_SBI99
              </span>
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-[#15803D] hover:bg-[#11632f] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                🖨️ Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
