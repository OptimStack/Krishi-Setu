import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { slideUp } from '../utils/animations';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      slideUp(cardRef.current, { distance: 30, duration: 0.6 });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login({ phone, password });

    if (result.success) {
      if (result.role === 'farmer') navigate('/farmer/dashboard');
      else if (result.role === 'buyer') navigate('/buyer/dashboard');
      else if (result.role === 'admin') navigate('/admin/auctions');
      else navigate('/');
    } else {
      const msg = typeof result.error === 'string' ? result.error : 'Invalid credentials';
      setError(
        msg.includes('page could not be found')
          ? 'Unable to connect. You can use demo credentials: 9876543210 / demo123'
          : msg
      );
    }

    setLoading(false);
  };

  const autofillDemo = (demoPhone, demoRole) => {
    setPhone(demoPhone);
    setPassword('demo123');
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4">
      <div ref={cardRef} className="w-full max-w-md">
        <Card className="shadow-2xl border-white/20 dark:border-emerald-800/40">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 text-3xl mb-3">
              🌾
            </div>
            <h2 className="text-2xl font-extrabold text-[#2A5124] dark:text-[#D3D67A]">
              Login to Krishi-Setu
            </h2>
            <p className="text-stone-600 dark:text-stone-300 text-sm mt-1">
              Strengthening Market Linkages for Farmers
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full mt-4 bg-[#2A5124] hover:bg-[#1f3d1b] dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] dark:text-[#182d15] text-white font-bold py-2.5 rounded-lg shadow-md"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-stone-600 dark:text-stone-300">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="text-[#2A5124] dark:text-[#D3D67A] font-bold hover:underline">
                Register here
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200 dark:border-emerald-900/40">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2 text-center">
              Quick Click-to-Fill Demo Accounts:
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-xs text-center">
              <button
                type="button"
                onClick={() => autofillDemo('9876543210', 'farmer')}
                className="py-1 px-2 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-medium"
              >
                Farmer
              </button>
              <button
                type="button"
                onClick={() => autofillDemo('9876543220', 'buyer')}
                className="py-1 px-2 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 text-blue-800 dark:text-blue-300 font-medium"
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => autofillDemo('9000000000', 'admin')}
                className="py-1 px-2 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-medium"
              >
                Admin
              </button>
            </div>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 text-center mt-2">
              Password for all demo accounts: <code className="text-[#2A5124] dark:text-[#D3D67A] font-mono">demo123</code>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
