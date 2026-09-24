import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <nav className="bg-[#2A5124] dark:bg-[#101911] text-white shadow-xl border-b border-[#D3D67A]/30 dark:border-emerald-900/40 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <Link to={user ? `/${user.role}/dashboard` : '/login'} className="flex items-center gap-2 group">
            <span className="text-2xl transform group-hover:scale-110 transition-transform">🌾</span>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#D3D67A] transition-colors">
              Krishi<span className="text-[#D3D67A]">-Setu</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-black/20 hover:text-[#D3D67A] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side: user info + Theme Toggle + logout */}
          <div className="hidden md:flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2 rounded-lg bg-black/20 hover:bg-black/30 text-[#D3D67A] transition-colors flex items-center justify-center border border-[#D3D67A]/30"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-stone-200" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {user ? (
              <>
                <span className="text-sm text-stone-200">
                  {user.name}{' '}
                  <span className="bg-black/30 text-[#D3D67A] text-xs font-semibold px-2 py-0.5 rounded-full ml-1 border border-[#D3D67A]/30">
                    {user.role}
                  </span>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-black/30 hover:bg-black/50 hover:text-red-300 px-3 py-1.5 rounded-md transition-colors border border-white/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="text-sm bg-black/30 hover:bg-black/40 text-[#D3D67A] px-3 py-1.5 rounded-md transition-colors border border-[#D3D67A]/30"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-[#D3D67A] hover:bg-[#c2c56a] text-[#2A5124] font-semibold px-3 py-1.5 rounded-md transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>


          {/* Mobile Right: Theme toggle & Menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2 rounded-lg bg-black/20 hover:bg-black/30 text-[#D3D67A] transition-colors border border-[#D3D67A]/30 cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-stone-200" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <button
              className="p-2 rounded-md hover:bg-green-700 cursor-pointer"
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
