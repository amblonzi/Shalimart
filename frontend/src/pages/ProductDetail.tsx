import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowLeft, Package, Truck } from 'lucide-react';
import { useStore, type Product } from '../store/useStore';
import api from '../api/axios';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, toggleWishlist, wishlist } = useStore();

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${id}`).then(res => {
      setProduct(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="skeleton aspect-square rounded-2xl"></div>
          <div className="space-y-4">
            <div className="skeleton h-4 w-24"></div>
            <div className="skeleton h-8 w-full"></div>
            <div className="skeleton h-6 w-32"></div>
            <div className="skeleton h-24 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
        <Link to="/shop" className="text-[#1a5c38] font-bold underline">Back to Shop</Link>
      </div>
    );
  }

  const images = product.images ? product.images.split(',') : ['/placeholder.jpg'];
  const isWished = wishlist.includes(product.id);
  const inStock = product.stock > 0;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
  };

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link to="/shop" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1a5c38] mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Shop</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div>
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-4 aspect-square flex items-center justify-center overflow-hidden">
            <img
              src={images[selectedImage]}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    i === selectedImage ? 'border-[#1a5c38] shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain bg-gray-50" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <p className="text-sm font-bold text-[#1a5c38] uppercase tracking-wider mb-2">{product.category}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>

          {product.badge && (
            <span className="inline-block bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
              {product.badge}
            </span>
          )}

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-extrabold text-gray-900">KSh {product.price.toLocaleString()}</span>
            {product.original_price && (
              <span className="text-xl text-gray-400 line-through">KSh {product.original_price.toLocaleString()}</span>
            )}
            {product.original_price && (
              <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-full">
                -{Math.round((1 - product.price / product.original_price) * 100)}%
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-gray-600 leading-relaxed mb-8">{product.description}</p>
          )}

          {/* Stock */}
          <div className="flex items-center gap-2 mb-6">
            <Package className={`w-4 h-4 ${inStock ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
              {inStock ? `${product.stock} in stock` : 'Out of stock'}
            </span>
          </div>

          {/* Quantity + Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-bold"
              >
                -
              </button>
              <span className="px-6 py-3 font-bold text-center min-w-[60px]">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-bold"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="flex-1 bg-[#1a5c38] text-white py-3 rounded-xl font-bold text-lg hover:bg-[#2d7a4d] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
            >
              <ShoppingBag className="w-5 h-5" />
              Add to Cart
            </button>
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`p-3 rounded-xl border-2 transition-all ${
                isWished ? 'border-red-500 text-red-500 bg-red-50' : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400'
              }`}
            >
              <Heart className={`w-6 h-6 ${isWished ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Delivery info */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
            <Truck className="w-5 h-5 text-[#1a5c38] mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Delivery across Nairobi</p>
              <p className="text-gray-500 text-sm mt-1">Same-day delivery available for orders placed before 2PM. Pay securely via M-Pesa.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
