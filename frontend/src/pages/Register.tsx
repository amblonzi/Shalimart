import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../api/axios';

const Register = () => {
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '', phone_number: '' });
  const [loading, setLoading] = useState(false);
  const { addToast } = useStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/register', formData);
      addToast('Account created! Please login.', 'success');
      navigate('/login');
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Registration failed';
      addToast(detail, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter max-md mx-auto px-4 py-20">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 reveal-up">
        <h2 className="text-3xl font-bold mb-2 text-[#1a5c38]">Create Account</h2>
        <p className="text-gray-500 mb-6">Join Shalina Mart today</p>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/10 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/10 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="e.g. 254712345678"
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/10 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="At least 6 characters"
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/10 outline-none transition-all"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a5c38] text-white py-3 rounded-xl font-bold hover:bg-[#2d7a4d] transition-all disabled:opacity-50 shadow-lg shadow-green-900/20"
          >
            {loading ? 'Creating Account...' : 'Register Now'}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-500">
          Already have an account? <Link to="/login" className="text-[#1a5c38] font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
