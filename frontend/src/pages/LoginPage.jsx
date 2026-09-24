import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
      setError(typeof result.error === 'string' ? result.error : 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-green-800">Login to Krishi-Setu</h2>
          <p className="text-stone-500 text-sm mt-1">Strengthening Market Linkages for Farmers</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-stone-600">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="text-green-700 font-medium hover:underline">
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-200">
          <p className="text-xs text-stone-400 text-center">
            Demo credentials: Phone <code className="bg-stone-100 px-1 rounded">9876543210</code> / Password <code className="bg-stone-100 px-1 rounded">demo123</code>
          </p>
        </div>
      </Card>
    </div>
  );
}
