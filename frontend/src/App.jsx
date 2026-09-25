import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import SubmitAskPage from './pages/farmer/SubmitAskPage';
import PayoutsPage from './pages/farmer/PayoutsPage';
import MarketPricesPage from './pages/farmer/MarketPricesPage';
import SaleAdvisorPage from './pages/farmer/SaleAdvisorPage';
import PoolingPage from './pages/farmer/PoolingPage';
import FarmerProductsPage from './pages/farmer/FarmerProductsPage';
import ProductDetailPage from './pages/farmer/ProductDetailPage';
import GradeCropPage from './pages/farmer/GradeCropPage';
import AuctionListingPage from './pages/farmer/AuctionListingPage';
import BuyerProcurementPage from './pages/farmer/BuyerProcurementPage';
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import BuyerMarketplacePage from './pages/buyer/BuyerMarketplacePage';
import BuyerOffersPage from './pages/buyer/BuyerOffersPage';
import BuyerDeliveryPage from './pages/buyer/BuyerDeliveryPage';
import BuyerTradesPage from './pages/buyer/BuyerTradesPage';
import BuyerProductDetailPage from './pages/buyer/BuyerProductDetailPage';
import BrowseBatchesPage from './pages/buyer/BrowseBatchesPage';
import SubmitBidPage from './pages/buyer/SubmitBidPage';
import AuctionMonitorPage from './pages/admin/AuctionMonitorPage';
import GradingReviewQueuePage from './pages/admin/GradingReviewQueuePage';
import FPODashboard from './pages/fpo/FPODashboard';
import FPOVerifyPage from './pages/fpo/FPOVerifyPage';
import FPOPoolsPage from './pages/fpo/FPOPoolsPage';
import FPOLogisticsPage from './pages/fpo/FPOLogisticsPage';
import FPOBuyersPage from './pages/fpo/FPOBuyersPage';
import IntroAnimation from './components/ui/IntroAnimation';
import KrishiSetuAIAssistant from './components/widgets/KrishiSetuAIAssistant';
import { useAuth } from './context/AuthContext';
import { useOffline } from './context/OfflineContext';

function App() {
  const { user } = useAuth();
  const { syncToast } = useOffline();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  const [showIntro, setShowIntro] = useState(() => {
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

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const isFpo = user?.role === 'fpo';
  const hasSidebar = isFarmer || isBuyer || isFpo;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#F5F8F4] via-[#EBF3EA] to-[#DFEDE1] dark:from-[#071309] dark:via-[#0E1F12] dark:to-[#142617] flex flex-col font-sans text-stone-900 dark:text-stone-100 transition-colors duration-500">
      {/* Subtle organic ambient glow overlay with sap green (#255919) and yellowish gold (#D1BF4B) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,_rgba(37,89,25,0.12),_rgba(209,191,75,0.08),_transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,_rgba(37,89,25,0.22),_rgba(209,191,75,0.06),_transparent_70%)]"
        aria-hidden="true"
      />

      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>🔄</span>
          <span>{syncToast}</span>
        </div>
      )}

      {/* Left Sidebar for Farmer & Buyer (Matching Screenshot) */}
      {hasSidebar && (
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      )}

      {/* Main Layout Area */}
      <div className={`relative z-10 flex flex-col min-h-screen transition-all ${hasSidebar ? 'lg:pl-64' : ''}`}>
        {user && <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />}

        <main className="flex-grow container mx-auto px-4 sm:px-6 py-6 md:py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage onReplayIntro={() => setShowIntro(true)} />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/farmer/*" element={<ProtectedRoute allowedRoles={['farmer', 'fpo', 'admin']} />}>
              <Route path="dashboard" element={<FarmerDashboard />} />
              <Route path="auction-listing" element={<AuctionListingPage />} />
              <Route path="submit-ask" element={<AuctionListingPage />} />
              <Route path="grade" element={<GradeCropPage />} />
              <Route path="market" element={<MarketPricesPage />} />
              <Route path="advisor" element={<SaleAdvisorPage />} />
              <Route path="procurement" element={<BuyerProcurementPage />} />
              <Route path="buyer-procurement" element={<BuyerProcurementPage />} />
              <Route path="pooling" element={<PoolingPage />} />
              <Route path="products" element={<FarmerProductsPage />} />
              <Route path="products/:id" element={<ProductDetailPage />} />
              <Route path="payouts" element={<PayoutsPage />} />
              <Route path="logistics" element={<FPOLogisticsPage />} />
            </Route>

            <Route path="/buyer/*" element={<ProtectedRoute allowedRoles={['buyer', 'fpo', 'admin']} />}>
              <Route path="dashboard" element={<BuyerMarketplacePage />} />
              <Route path="marketplace" element={<BuyerMarketplacePage />} />
              <Route path="offers" element={<BuyerOffersPage />} />
              <Route path="orders" element={<BuyerOffersPage />} />
              <Route path="delivery" element={<BuyerDeliveryPage />} />
              <Route path="acceptance" element={<BuyerDeliveryPage />} />
              <Route path="trades" element={<BuyerTradesPage />} />
              <Route path="settlements" element={<BuyerTradesPage />} />
              <Route path="products/:id" element={<BuyerProductDetailPage />} />
              <Route path="browse" element={<BrowseBatchesPage />} />
              <Route path="bid/:batchId" element={<SubmitBidPage />} />
              <Route path="submit-bid" element={<SubmitBidPage />} />
              <Route path="logistics" element={<BuyerDeliveryPage />} />
            </Route>

            <Route path="/fpo/*" element={<ProtectedRoute allowedRoles={['fpo', 'farmer', 'buyer', 'admin']} />}>
              <Route path="" element={<FPODashboard />} />
              <Route path="dashboard" element={<FPODashboard />} />
              <Route path="verify" element={<FPOVerifyPage />} />
              <Route path="pools" element={<FPOPoolsPage />} />
              <Route path="logistics" element={<FPOLogisticsPage />} />
              <Route path="buyers" element={<FPOBuyersPage />} />
            </Route>

            <Route path="/logistics" element={<ProtectedRoute allowedRoles={['farmer', 'buyer', 'fpo', 'admin']} />}>
              <Route path="" element={<FPOLogisticsPage />} />
            </Route>

            <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="auctions" element={<AuctionMonitorPage />} />
              <Route path="grading" element={<GradingReviewQueuePage />} />
            </Route>
          </Routes>
        </main>
      </div>

      {/* AI Assistant Widget (Voice, Multilingual, Floating launcher) - Only rendered when user is logged in */}
      {user && (
        <KrishiSetuAIAssistant
          isOpen={aiAssistantOpen}
          setIsOpen={setAiAssistantOpen}
        />
      )}
    </div>
  );
}

export default App;
