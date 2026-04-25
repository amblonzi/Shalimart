import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, cart, setUser } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 glass border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="text-2xl font-bold text-[#1a5c38] flex items-center gap-2 hover:scale-105 transition-transform">
              <ShoppingBag className="w-8 h-8" />
              <span>Shalina Mart</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-600 hover:text-[#1a5c38] font-medium transition-colors">Home</Link>
              <Link to="/shop" className="text-gray-600 hover:text-[#1a5c38] font-medium transition-colors">Shop</Link>
              <Link to="/contact" className="text-gray-600 hover:text-[#1a5c38] font-medium transition-colors">Contact</Link>
              {user && (
                <Link to="/orders" className="text-gray-600 hover:text-[#1a5c38] font-medium transition-colors">My Orders</Link>
              )}
              {user?.is_admin && (
                <Link to="/admin" className="text-gray-600 hover:text-[#1a5c38] font-medium transition-colors">Admin</Link>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-gray-500 hover:text-[#1a5c38] transition-colors rounded-full hover:bg-gray-100"
              >
                <Search className="w-5 h-5"/>
              </button>
              <Link to="/wishlist" className="p-2 text-gray-500 hover:text-[#1a5c38] relative transition-colors rounded-full hover:bg-gray-100">
                <Heart className="w-5 h-5"/>
              </Link>
              <Link to="/cart" className="p-2 text-gray-500 hover:text-[#1a5c38] relative transition-colors rounded-full hover:bg-gray-100">
                <ShoppingBag className="w-5 h-5"/>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#e8a020] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full badge-pulse">
                    {cartCount}
                  </span>
                )}
              </Link>
              {user ? (
                <div className="flex items-center gap-1">
                  <Link to="/profile" className="p-2 text-gray-500 hover:text-[#1a5c38] transition-colors rounded-full hover:bg-gray-100">
                    <User className="w-5 h-5"/>
                  </Link>
                  <button onClick={logout} className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100">
                    <LogOut className="w-5 h-5"/>
                  </button>
                </div>
              ) : (
                <Link to="/login" className="bg-[#1a5c38] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#2d7a4d] transition-all hover:shadow-lg hover:shadow-green-900/20">
                  Login
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-500 hover:text-[#1a5c38]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 scale-in">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-[#1a5c38] font-medium py-2">Home</Link>
            <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-[#1a5c38] font-medium py-2">Shop</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-[#1a5c38] font-medium py-2">Contact</Link>
            {user && <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-[#1a5c38] font-medium py-2">My Orders</Link>}
            {user?.is_admin && <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-[#1a5c38] font-medium py-2">Admin</Link>}
          </div>
        )}
      </nav>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="max-w-2xl mx-auto pt-24 px-4" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="scale-in">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-2xl border-0 text-lg focus:outline-none focus:ring-2 focus:ring-[#1a5c38]"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
