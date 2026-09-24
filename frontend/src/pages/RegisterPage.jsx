import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { slideUp } from '../utils/animations';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'farmer',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      slideUp(cardRef.current, { distance: 30, duration: 0.6 });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      password: formData.password,
      role: formData.role,
    });

    if (result.success) {
      if (result.role === 'farmer') navigate('/farmer/dashboard');
      else if (result.role === 'buyer') navigate('/buyer/dashboard');
      else navigate('/');
    } else {
      const msg = typeof result.error === 'string' ? result.error : 'Registration failed';
      setError(
        msg.includes('page could not be found')
          ? 'Unable to connect to server. Please check your network or try logging in.'
          : msg
      );
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] py-8 px-4">
      <div ref={cardRef} className="w-full max-w-md">
        <Card className="shadow-2xl border-white/20 dark:border-emerald-800/40">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 text-3xl mb-3">
              🌱
            </div>
            <h2 className="text-2xl font-extrabold text-[#2A5124] dark:text-[#D3D67A]">
              Create an Account
            </h2>
            <p className="text-stone-600 dark:text-stone-300 text-sm mt-1">
              Join the Krishi-Setu marketplace
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Full Name"
              name="name"
              placeholder="e.g. Sambuddha Dutta"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <Input
              label="Email (optional)"
              name="email"
              type="email"
              placeholder="e.g. user@example.com"
              value={formData.email}
              onChange={handleChange}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            <div className="pt-2 pb-1">
              <label className="block text-sm font-semibold text-stone-700 dark:text-stone-200 mb-2">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.role === 'farmer'
                      ? 'border-[#2A5124] dark:border-[#D3D67A] bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 font-bold text-[#2A5124] dark:text-[#D3D67A]'
                      : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="farmer"
                    checked={formData.role === 'farmer'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span>🌾 Farmer / FPO</span>
                </label>

                <label
                  className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.role === 'buyer'
                      ? 'border-[#2A5124] dark:border-[#D3D67A] bg-[#2A5124]/10 dark:bg-[#D3D67A]/20 font-bold text-[#2A5124] dark:text-[#D3D67A]'
                      : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="buyer"
                    checked={formData.role === 'buyer'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span>🏢 Bulk Buyer</span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-4 bg-[#2A5124] hover:bg-[#1f3d1b] dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] dark:text-[#182d15] text-white font-bold py-2.5 rounded-lg shadow-md"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-stone-600 dark:text-stone-300">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="text-[#2A5124] dark:text-[#D3D67A] font-bold hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
