import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../api/axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, addToast } = useStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      const res = await api.post('/token', params);
      localStorage.setItem('token', res.data.access_token);
      const profile = await api.get('/profile');
      setUser(profile.data);

      // Sync wishlist from backend
      try {
        const wishlistRes = await api.get('/wishlist');
        const ids = wishlistRes.data.map((item: any) => item.product_id);
        useStore.getState().setWishlist(ids);
      } catch {
        // Wishlist sync is non-critical
      }

      addToast('Welcome back!', 'success');
      navigate('/');
    } catch {
      addToast('Login failed. Check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter max-w-md mx-auto px-4 py-20">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 reveal-up">
        <h2 className="text-3xl font-bold mb-2 text-[#1a5c38]">Welcome Back</h2>
        <p className="text-gray-500 mb-6">Sign in to your Shalina Mart account</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/10 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/10 outline-none transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a5c38] text-white py-3 rounded-xl font-bold hover:bg-[#2d7a4d] transition-all disabled:opacity-50 shadow-lg shadow-green-900/20"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-500">
          New to Shalina Mart? <Link to="/register" className="text-[#1a5c38] font-bold hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
