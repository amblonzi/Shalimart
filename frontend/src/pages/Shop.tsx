import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Heart, Plus, SlidersHorizontal } from 'lucide-react';
import { useStore, type Product } from '../store/useStore';
import api from '../api/axios';

const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, toggleWishlist, wishlist } = useStore();

  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: currentPage.toString(), per_page: '20' };
    if (currentCategory) params.category = currentCategory;
    if (currentSearch) params.search = currentSearch;

    api.get('/products', { params }).then(res => {
      setProducts(res.data.items);
      setTotalPages(res.data.pages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentCategory, currentSearch, currentPage]);

  const setFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {currentSearch ? `Results for "${currentSearch}"` : currentCategory || 'All Products'}
          </h2>
          {!loading && <p className="text-gray-500 mt-1 text-sm">{products.length} products found</p>}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
          <button
            onClick={() => setFilter('category', '')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              !currentCategory ? 'bg-[#1a5c38] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter('category', cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                currentCategory === cat ? 'bg-[#1a5c38] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search active banner */}
      {currentSearch && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-gray-500">Searching for:</span>
          <span className="bg-[#1a5c38]/10 text-[#1a5c38] px-3 py-1 rounded-full text-sm font-medium">{currentSearch}</span>
          <button onClick={() => setFilter('search', '')} className="text-gray-400 hover:text-gray-600 text-sm underline">Clear</button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="skeleton aspect-square mb-4 rounded-xl"></div>
              <div className="skeleton h-3 w-20 mb-2"></div>
              <div className="skeleton h-4 w-full mb-2"></div>
              <div className="skeleton h-4 w-24"></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg mb-4">No products found</p>
          <button onClick={() => { setSearchParams({}); }} className="text-[#1a5c38] font-bold underline">Browse all products</button>
        </div>
      ) : (
        <>
          {/* Product Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6">
            {products.map((product, i) => (
              <div key={product.id} className={`reveal-up stagger-${(i % 4) + 1} product-card bg-white rounded-xl md:rounded-2xl p-2 md:p-4 shadow-sm group relative`}>
                <Link to={`/product/${product.id}`} className="block">
                  <div className="relative aspect-square mb-2 md:mb-4 bg-gray-50 rounded-lg md:rounded-xl overflow-hidden p-1 md:p-0">
                    <img
                      src={product.images?.split(',')[0] || '/placeholder.jpg'}
                      alt={product.name}
                      className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                    />
                    {product.badge && (
                      <span className="absolute top-1 left-1 md:top-3 md:left-3 bg-red-500 text-white text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded uppercase tracking-wider badge-pulse">
                        {product.badge}
                      </span>
                    )}
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="bg-gray-900 text-white text-[7px] md:text-xs font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full">Out of Stock</span>
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`absolute top-3 right-3 md:top-7 md:right-7 p-1.5 md:p-2 bg-white/90 backdrop-blur rounded-full shadow-md transition-colors ${wishlist.includes(product.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                >
                  <Heart className={`w-3 h-3 md:w-4 md:h-4 ${wishlist.includes(product.id) ? 'fill-current' : ''}`} />
                </button>
                <p className="text-[7px] md:text-xs font-bold text-[#1a5c38] mb-0.5 md:mb-1">{product.category}</p>
                <Link to={`/product/${product.id}`}>
                  <h3 className="font-semibold text-gray-800 mb-1 md:mb-2 h-8 md:h-12 overflow-hidden hover:text-[#1a5c38] transition-colors text-[9px] md:text-base leading-tight">{product.name}</h3>
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-auto gap-1">
                  <div>
                    <p className="text-sm md:text-lg font-bold text-gray-900">KSh {product.price.toLocaleString()}</p>
                    {product.original_price && (
                      <p className="text-[8px] md:text-sm text-gray-400 line-through">KSh {product.original_price.toLocaleString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className="w-full md:w-auto bg-gray-100 p-2 md:p-2.5 rounded-lg md:rounded-xl text-[#1a5c38] hover:bg-[#1a5c38] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center"
                  >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-12 gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('page', (i + 1).toString());
                    setSearchParams(newParams);
                  }}
                  className={`w-10 h-10 rounded-xl font-medium transition-all ${
                    currentPage === i + 1
                      ? 'bg-[#1a5c38] text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Shop;
