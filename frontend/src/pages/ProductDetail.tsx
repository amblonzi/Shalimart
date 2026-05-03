import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowLeft, Package, Truck, ShieldCheck, Lock, Star } from 'lucide-react';
import { useStore, type Product, type Review } from '../store/useStore';
import api from '../api/axios';

import SEO from '../components/SEO';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { addToCart, toggleWishlist, wishlist, user, addToast } = useStore();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/products/${id}`),
      api.get(`/products/${id}/reviews`)
    ]).then(([resProduct, resReviews]) => {
      setProduct(resProduct.data);
      setReviews(resReviews.data);
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
    addToast('Added to cart', 'success');
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('Please login to submit a review', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await api.post(`/products/${id}/reviews`, { rating: ratingInput, comment: commentInput });
      setReviews([res.data, ...reviews]);
      setCommentInput('');
      setRatingInput(5);
      addToast('Review submitted!', 'success');
      // Update local product average rating calculation
      setProduct(p => p ? { ...p, review_count: (p.review_count || 0) + 1 } : null);
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Structured Data for Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": images.map(img => `https://shalimart.co.ke${img}`),
    "description": product.description?.replace(/<[^>]+>/g, '') || product.name,
    "sku": `PROD-${product.id}`,
    "offers": {
      "@type": "Offer",
      "url": `https://shalimart.co.ke/product/${product.id}`,
      "priceCurrency": "KES",
      "price": product.price,
      "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    }
  };

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 py-8">
      <SEO 
        title={`${product.name} | Shalina Mart`} 
        description={product.description?.replace(/<[^>]+>/g, '').substring(0, 160) || `Buy ${product.name} at Shalina Mart.`}
        image={`https://shalimart.co.ke${images[0]}`}
        url={`https://shalimart.co.ke/product/${product.id}`}
        jsonLd={jsonLd}
      />
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

          {/* Star Rating Display */}
          {(product.review_count ?? 0) > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} className={`w-4 h-4 ${star <= Math.round(product.average_rating || 0) ? 'fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-600">
                {product.average_rating?.toFixed(1)} ({product.review_count} reviews)
              </span>
            </div>
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
            <div 
              className="text-gray-600 leading-relaxed mb-8 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
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
          <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3 mb-4">
            <Truck className="w-5 h-5 text-[#1a5c38] mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Delivery across Kenya</p>
              <p className="text-gray-500 text-sm mt-1">Free delivery for orders over KSh 10,000. Pay via M-Pesa or Cash on Delivery.</p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">Secure Checkout Guaranteed</p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
                <Lock className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-gray-700">Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-gray-700">Quality Verified</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="h-4" />
                <span className="text-xs font-bold text-gray-700">Lipa Na M-Pesa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-20 pt-12 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Review Form */}
          <div className="md:col-span-1">
            <h3 className="text-lg font-bold mb-4">Write a Review</h3>
            {user ? (
              <form onSubmit={submitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        className={`p-1 transition-transform hover:scale-110 ${star <= ratingInput ? 'text-amber-400' : 'text-gray-300'}`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comment (optional)</label>
                  <textarea
                    rows={4}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="What did you think about this product?"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none text-sm resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-[#1a5c38] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#2d7a4d] transition-all disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                <p className="text-gray-600 text-sm mb-4">You must be logged in to leave a review.</p>
                <Link to="/profile" className="inline-block bg-[#1a5c38] text-white px-6 py-2 rounded-lg text-sm font-bold">
                  Login to Review
                </Link>
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div className="md:col-span-2 space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-[#1a5c38] font-bold">
                        {(review.user_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{review.user_name || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'fill-current' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-600 text-sm leading-relaxed mt-3">{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
