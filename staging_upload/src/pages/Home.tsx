import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShoppingBag, Truck, Shield, Star, Heart, Plus, SlidersHorizontal } from 'lucide-react';
import { useStore, type Product } from '../store/useStore';
import api from '../api/axios';

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, toggleWishlist, wishlist } = useStore();

  const currentCategory = searchParams.get('category') || '';

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: '1', per_page: '12' }; // Show first 12 products on home
    if (currentCategory) params.category = currentCategory;

    api.get('/products', { params }).then(res => {
      setProducts(res.data.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentCategory]);

  const setFilter = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('category', value);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="fade-in">
      {/* Hero */}
      <section className="relative h-[650px] flex items-center overflow-hidden bg-gray-900">
        <div className="absolute inset-0 opacity-40 bg-[url('/hero-bg.png')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/50 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white w-full">
          <div className="max-w-2xl slide-in-left">
            <p className="text-[#e8a020] font-semibold tracking-wider uppercase text-sm mb-4 tracking-[0.2em] opacity-0 animate-[fadeIn_0.5s_ease-out_forwards_0.2s]">Quality is our Priority</p>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
              Premium Quality <br />
              <span className="gradient-text">Kenya's Finest</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed opacity-0 animate-[fadeIn_0.5s_ease-out_forwards_0.4s]">
              Everything you need, delivered straight to your doorstep across Nairobi. Quality farm equipment, household items, and more.
            </p>
            <div className="flex flex-wrap gap-4 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards_0.6s]">
              <Link to="/shop" className="bg-[#e8a020] text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-[#f4b444] transition-all transform hover:scale-105 inline-block shadow-lg shadow-amber-500/25">
                Explore Shop
              </Link>
              <button 
                onClick={() => {
                  const el = document.getElementById('products-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }} 
                className="bg-white/10 backdrop-blur text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-white/20 transition-all inline-block border border-white/20"
              >
                View Products
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overlay */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Truck, title: 'Fast Delivery', desc: 'Same-day delivery across Nairobi' },
            { icon: Shield, title: 'Secure Payments', desc: 'Pay safely via M-Pesa' },
            { icon: Star, title: 'Quality Products', desc: 'Curated selection of the best' },
          ].map((f, i) => (
            <div key={i} className={`reveal-up stagger-${i + 1} bg-white rounded-2xl p-6 shadow-xl flex items-start gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all border border-gray-50`}>
              <div className="bg-[#1a5c38]/10 p-3 rounded-xl">
                <f.icon className="w-6 h-6 text-[#1a5c38]" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{f.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Products Section */}
      <section id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Featured Collections</h2>
            <p className="text-gray-500 mt-2">Discover our high-quality products selected just for you.</p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
            <button
              onClick={() => setFilter('')}
              className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                !currentCategory ? 'bg-[#1a5c38] text-white shadow-lg shadow-green-900/20' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  currentCategory === cat ? 'bg-[#1a5c38] text-white shadow-lg shadow-green-900/20' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
                <div className="skeleton aspect-square mb-6 rounded-2xl"></div>
                <div className="skeleton h-3 w-20 mb-3"></div>
                <div className="skeleton h-5 w-full mb-3"></div>
                <div className="skeleton h-5 w-24"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-lg mb-4">No products in this category yet.</p>
            <button onClick={() => setFilter('')} className="bg-[#1a5c38] text-white px-6 py-2 rounded-full font-bold">Clear Filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-8">
            {products.map((product, i) => (
              <div key={product.id} className={`reveal-up stagger-${(i % 4) + 1} product-card bg-white rounded-xl md:rounded-3xl p-2 md:p-5 shadow-sm border border-gray-50 group relative`}>
                <Link to={`/product/${product.id}`} className="block">
                  <div className="relative aspect-square mb-2 md:mb-6 bg-gray-50 rounded-lg md:rounded-2xl overflow-hidden p-1 md:p-4">
                    <img
                      src={product.images?.split(',')[0] || '/placeholder.jpg'}
                      alt={product.name}
                      className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
                    />
                    {product.badge && (
                      <span className="absolute top-1 left-1 md:top-4 md:left-4 bg-red-500 text-white text-[8px] md:text-[10px] font-bold px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg uppercase tracking-wider badge-pulse">
                        {product.badge}
                      </span>
                    )}
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-gray-900 text-white text-[7px] md:text-[10px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full ring-2 md:ring-4 ring-white">SOLD OUT</span>
                      </div>
                    )}
                  </div>
                </Link>
                
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`absolute top-3 right-3 md:top-8 md:right-8 p-1.5 md:p-2.5 bg-white/90 backdrop-blur rounded-full shadow-lg transition-all transform active:scale-90 ${
                    wishlist.includes(product.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                  }`}
                >
                  <Heart className={`w-3 h-3 md:w-4 md:h-4 ${wishlist.includes(product.id) ? 'fill-current' : ''}`} />
                </button>

                <p className="text-[7px] md:text-[10px] font-black text-[#1a5c38] mb-0.5 md:mb-1.5 uppercase tracking-widest">{product.category}</p>
                <Link to={`/product/${product.id}`}>
                  <h3 className="font-bold text-gray-800 mb-1 md:mb-3 h-8 md:h-12 overflow-hidden hover:text-[#1a5c38] transition-colors leading-tight text-[9px] md:text-base">{product.name}</h3>
                </Link>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-auto pt-1 md:pt-2 gap-1">
                  <div>
                    <p className="text-sm md:text-xl font-black text-gray-900">KSh {product.price.toLocaleString()}</p>
                    {product.original_price && (
                      <p className="text-[8px] md:text-xs text-gray-400 line-through font-medium">KSh {product.original_price.toLocaleString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className="w-full md:w-auto bg-gray-50 p-2 md:p-3 rounded-lg md:rounded-2xl text-[#1a5c38] hover:bg-[#1a5c38] hover:text-white transition-all transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm border border-gray-100 flex justify-center items-center"
                  >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link to="/shop" className="group inline-flex items-center gap-3 bg-white border-2 border-[#1a5c38] text-[#1a5c38] px-10 py-4 rounded-full text-lg font-bold hover:bg-[#1a5c38] hover:text-white transition-all shadow-xl hover:shadow-green-900/10">
            <ShoppingBag className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Browse Full Catalog
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
