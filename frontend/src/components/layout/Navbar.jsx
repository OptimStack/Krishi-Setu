import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = () => {
    if (!user) return [];
    switch (user.role) {
      case 'farmer':
        return [
          { to: '/farmer/dashboard', label: 'Dashboard' },
          { to: '/farmer/submit-ask', label: 'New Listing' },
          { to: '/farmer/payouts', label: 'Payouts' },
        ];
      case 'buyer':
        return [
          { to: '/buyer/dashboard', label: 'Dashboard' },
          { to: '/buyer/browse', label: 'Browse Batches' },
          { to: '/buyer/submit-bid', label: 'Place Bid' },
        ];
      case 'admin':
        return [
          { to: '/admin/auctions', label: 'Auctions' },
          { to: '/admin/grading', label: 'Grading Queue' },
        ];
      default:
        return [];
    }
  };

  const links = navLinks();

  return (
    <nav className="bg-green-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <Link to={user ? `/${user.role}/dashboard` : '/login'} className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <span className="text-xl font-bold tracking-tight">Krishi-Setu</span>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side: user info + logout */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-green-200">
                  {user.name}{' '}
                  <span className="bg-green-900 text-green-300 text-xs px-2 py-0.5 rounded-full ml-1">
                    {user.role}
                  </span>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-green-900 hover:bg-green-950 px-3 py-1.5 rounded-md transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="text-sm bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-md transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-md transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-green-700"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-green-700 mt-1 pt-2">
            {user ? (
              <>
                <div className="px-3 py-2 text-sm text-green-200 border-b border-green-700 mb-2">
                  {user.name} ({user.role})
                </div>
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block px-3 py-2 rounded-md text-sm hover:bg-green-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-green-700 text-red-300 mt-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-3">
                <Link to="/login" className="py-2 text-sm" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="py-2 text-sm" onClick={() => setMenuOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
