import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import SubmitAskPage from './pages/farmer/SubmitAskPage';
import PayoutsPage from './pages/farmer/PayoutsPage';
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import BrowseBatchesPage from './pages/buyer/BrowseBatchesPage';
import SubmitBidPage from './pages/buyer/SubmitBidPage';
import AuctionMonitorPage from './pages/admin/AuctionMonitorPage';
import GradingReviewQueuePage from './pages/admin/GradingReviewQueuePage';
import IntroAnimation from './components/ui/IntroAnimation';

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    // Play on initial visit in session
    return !sessionStorage.getItem('krishisetu_intro_played');
  });

  useEffect(() => {
    const handleReplay = () => setShowIntro(true);
    window.addEventListener('krishisetu_replay_intro', handleReplay);
    return () => window.removeEventListener('krishisetu_replay_intro', handleReplay);
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem('krishisetu_intro_played', 'true');
    setShowIntro(false);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#F5F8F4] via-[#EBF3EA] to-[#DFEDE1] dark:from-[#071309] dark:via-[#0E1F12] dark:to-[#142617] flex flex-col font-sans text-stone-900 dark:text-stone-100 transition-colors duration-500">
      {/* Subtle organic ambient glow overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,_rgba(42,81,36,0.14),_transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,_rgba(34,197,94,0.08),_transparent_70%)]"
        aria-hidden="true"
      />

      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-10">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage onReplayIntro={() => setShowIntro(true)} />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/farmer/*" element={<ProtectedRoute allowedRoles={['farmer']} />}>
              <Route path="dashboard" element={<FarmerDashboard />} />
              <Route path="submit-ask" element={<SubmitAskPage />} />
              <Route path="payouts" element={<PayoutsPage />} />
            </Route>

            <Route path="/buyer/*" element={<ProtectedRoute allowedRoles={['buyer']} />}>
              <Route path="dashboard" element={<BuyerDashboard />} />
              <Route path="browse" element={<BrowseBatchesPage />} />
              <Route path="bid/:batchId" element={<SubmitBidPage />} />
              <Route path="submit-bid" element={<SubmitBidPage />} />
            </Route>

            <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="auctions" element={<AuctionMonitorPage />} />
              <Route path="grading" element={<GradingReviewQueuePage />} />
            </Route>
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
