import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

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
      setError(typeof result.error === 'string' ? result.error : 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] py-8">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-green-800">Create an Account</h2>
          <p className="text-stone-500 text-sm mt-1">Join the Krishi-Setu marketplace</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            name="name"
            placeholder="e.g. Ramesh Patil"
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
            placeholder="e.g. ramesh@example.com"
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700 mb-2">I am a:</label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="farmer"
                  checked={formData.role === 'farmer'}
                  onChange={handleChange}
                  className="mr-2 text-green-600 focus:ring-green-500"
                />
                <span className="flex items-center gap-1">
                  <span>🌾</span> Farmer / FPO
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="buyer"
                  checked={formData.role === 'buyer'}
                  onChange={handleChange}
                  className="mr-2 text-green-600 focus:ring-green-500"
                />
                <span className="flex items-center gap-1">
                  <span>🏢</span> Buyer
                </span>
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Registering...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-stone-600">
          Already have an account?{' '}
          <Link to="/login" className="text-green-700 font-medium hover:underline">
            Login here
          </Link>
        </p>
      </Card>
    </div>
  );
}
