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

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2A5124] to-[#D3D67A] dark:from-[#0c160e] dark:via-[#132216] dark:to-[#1b2311] flex flex-col font-sans text-stone-900 dark:text-stone-100 transition-colors duration-500">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">

        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
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
  );
}

export default App;
