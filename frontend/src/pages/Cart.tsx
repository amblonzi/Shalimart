import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Shield, Banknote, Smartphone, Truck, Lock, ShieldCheck, MessageCircle, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import api from '../api/axios';

const Cart = () => {
  const { cart, updateCartQty, removeFromCart, clearCart, user, addToast } = useStore();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cash' | 'pay'>('mpesa');
  const [checkoutMode, setCheckoutMode] = useState<'site' | 'whatsapp'>('site');
  const [checkingOut, setCheckingOut] = useState(false);
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const freeDelivery = total >= 10000;

  // Normalize phone: 07... → 2547..., +254... → 254..., 254... stays
  const normalizePhone = (phone: string): string | null => {
    let cleaned = phone.replace(/\s+/g, '').replace(/^[+]+/, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '254' + cleaned.substring(1);
    }
    if (cleaned.startsWith('254') && cleaned.length === 12 && /^\d+$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  };

  const handleWhatsAppDirect = () => {
    const itemsList = cart.map(item => `• ${item.name} (x${item.quantity}) - KSh ${(item.price * item.quantity).toLocaleString()}`).join('\n');
    const message = `Hi Shalimart! 🛍️\n\nI'd like to order the following items:\n\n${itemsList}\n\n*Total: KSh ${total.toLocaleString()}*\n\nPlease help me complete my order. Thank you!`;
    window.open(`https://wa.me/254708898477?text=${encodeURIComponent(message)}`, '_blank');
    addToast('Opening WhatsApp...', 'info');
    setTimeout(clearCart, 1000);
  };

  const handleCheckout = async () => {
    if (checkoutMode === 'whatsapp') {
      handleWhatsAppDirect();
      return;
    }

    if (!user) {
      addToast('Please login to complete your order on the site', 'error');
      return;
    }
    if (!deliveryAddress.trim()) {
      addToast('Please provide a delivery address', 'error');
      return;
    }

    let phone = deliveryPhone;
    if (paymentMethod === 'mpesa') {
      const normalized = normalizePhone(deliveryPhone);
      if (!normalized) {
        addToast('Please enter a valid phone number (e.g. 0712345678 or +254712345678)', 'error');
        return;
      }
      phone = normalized;
    }

    setCheckingOut(true);
    try {
      const res = await api.post('/orders', {
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
        delivery_address: deliveryAddress,
        delivery_phone: phone,
        payment_method: paymentMethod,
      });
      if (res.data.status === 'success') {
        if (paymentMethod === 'cash') {
          addToast('Order placed! Pay with cash on delivery.', 'success');
        } else if (paymentMethod === 'pay') {
          addToast('Order created! Please proceed to pay.', 'success');
        } else {
          addToast('STK Push sent! Check your phone.', 'success');
        }
        clearCart();
      } else {
        const msg = res.data.mpesa?.errorMessage || res.data.message || 'Order created — payment pending.';
        addToast(msg, 'info');
        clearCart();
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Error during checkout';
      addToast(detail, 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold">Your Cart</h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-gray-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors">
                <Trash2 className="w-4 h-4" /> Clear Cart
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 mb-8">
              <ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 mb-6 font-medium">Your cart is currently empty.</p>
              <Link to="/shop" className="bg-gray-100 text-[#1a5c38] px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-all inline-block">
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item, i) => (
                <div key={item.id} className={`reveal-up stagger-${(i % 5) + 1} bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-50 flex gap-4 md:gap-6 items-center group`}>
                  <Link to={`/product/${item.id}`} className="shrink-0">
                    <img src={item.images?.split(',')[0] || '/placeholder.jpg'} className="w-16 h-16 md:w-24 md:h-24 object-contain bg-gray-50 rounded-xl group-hover:scale-105 transition-transform" alt={item.name} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#1a5c38] uppercase tracking-wider mb-0.5">{item.category}</p>
                    <Link to={`/product/${item.id}`}>
                      <h3 className="font-bold text-gray-900 truncate hover:text-[#1a5c38] transition-colors md:text-lg">{item.name}</h3>
                    </Link>
                    <p className="text-[#1a5c38] font-bold md:text-lg">KSh {item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                    <div className="flex items-center bg-gray-50 rounded-full px-2 py-1">
                      <button onClick={() => updateCartQty(item.id, -1)} className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center hover:bg-white hover:shadow-sm transition-all font-bold text-gray-400 hover:text-gray-900">-</button>
                      <span className="font-bold w-6 md:w-8 text-center text-sm md:text-base">{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.id, 1)} className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center hover:bg-white hover:shadow-sm transition-all font-bold text-gray-400 hover:text-gray-900">+</button>
                    </div>
                    <div className="hidden md:block text-right min-w-[100px]">
                      <p className="text-xs text-gray-400 font-medium">Subtotal</p>
                      <p className="font-black text-gray-900">KSh {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Checkout Details */}
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Items ({cart.reduce((a, i) => a + i.quantity, 0)})</span>
                <span className="font-bold text-gray-900">KSh {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Delivery</span>
                {freeDelivery ? (
                  <span className="text-green-600 font-bold">FREE</span>
                ) : (
                  <span className="text-amber-600 font-medium text-xs">To be discussed</span>
                )}
              </div>
              {!freeDelivery && cart.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <Truck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 leading-tight">
                    Free delivery for orders over KSh 10,000. Delivery charges for this order will be discussed upon confirmation.
                  </p>
                </div>
              )}
              {freeDelivery && cart.length > 0 && (
                <div className="flex items-start gap-2 bg-green-50 p-3 rounded-xl border border-green-100">
                  <Truck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-green-700 leading-tight">
                    Your order qualifies for free delivery within and outside Nairobi!
                  </p>
                </div>
              )}
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-black text-[#1a5c38]">KSh {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Mode Selection */}
            <div className="mb-8">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest mb-4">How would you like to checkout?</h4>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setCheckoutMode('site')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                    checkoutMode === 'site'
                      ? 'border-[#1a5c38] bg-green-50/50'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${checkoutMode === 'site' ? 'bg-[#1a5c38] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className={`font-bold ${checkoutMode === 'site' ? 'text-[#1a5c38]' : 'text-gray-700'}`}>Checkout on Site</p>
                      <p className="text-[10px] text-gray-400">Order directly through our system</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform ${checkoutMode === 'site' ? 'text-[#1a5c38] translate-x-1' : 'text-gray-300'}`} />
                </button>

                <button
                  onClick={() => setCheckoutMode('whatsapp')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                    checkoutMode === 'whatsapp'
                      ? 'border-[#25D366] bg-green-50/50'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${checkoutMode === 'whatsapp' ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className={`font-bold ${checkoutMode === 'whatsapp' ? 'text-[#25D366]' : 'text-gray-700'}`}>Order via WhatsApp</p>
                      <p className="text-[10px] text-gray-400">Chat with us to finalize</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform ${checkoutMode === 'whatsapp' ? 'text-[#25D366] translate-x-1' : 'text-gray-300'}`} />
                </button>
              </div>
            </div>

            {checkoutMode === 'site' ? (
              <div className="space-y-6 slide-up">
                {/* Payment Method Toggle */}
                <div>
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest mb-4">Payment Method</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPaymentMethod('mpesa')}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        paymentMethod === 'mpesa'
                          ? 'border-[#1a5c38] bg-green-50 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <Smartphone className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === 'mpesa' ? 'text-[#1a5c38]' : 'text-gray-400'}`} />
                      <p className={`text-[10px] font-bold ${paymentMethod === 'mpesa' ? 'text-[#1a5c38]' : 'text-gray-500'}`}>M-Pesa</p>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-[#e8a020] bg-amber-50 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <Banknote className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === 'cash' ? 'text-[#e8a020]' : 'text-gray-400'}`} />
                      <p className={`text-[10px] font-bold ${paymentMethod === 'cash' ? 'text-[#e8a020]' : 'text-gray-500'}`}>Cash</p>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('pay')}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        paymentMethod === 'pay'
                          ? 'border-[#1a5c38] bg-green-50 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <ShieldCheck className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === 'pay' ? 'text-[#1a5c38]' : 'text-gray-400'}`} />
                      <p className={`text-[10px] font-bold ${paymentMethod === 'pay' ? 'text-[#1a5c38]' : 'text-gray-500'}`}>Pay Online</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest">Delivery Details</h4>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                        placeholder="Delivery address (e.g. Westlands, Nairobi)"
                        className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#1a5c38] outline-none transition-all text-sm font-medium"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="tel"
                        value={deliveryPhone}
                        onChange={e => setDeliveryPhone(e.target.value)}
                        placeholder={paymentMethod === 'mpesa' ? 'M-Pesa number (07...)' : 'Phone number (07...)'}
                        className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#1a5c38] outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 p-6 rounded-3xl border border-green-100 mb-8 slide-up">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-[#25D366]">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Direct WhatsApp Order</h4>
                    <p className="text-[10px] text-gray-500 leading-tight">Proceed to chat with our representative to finalize your order details and delivery.</p>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-[10px] text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                    No account required
                  </li>
                  <li className="flex items-center gap-2 text-[10px] text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                    Fast response
                  </li>
                  <li className="flex items-center gap-2 text-[10px] text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                    Flexible payment options
                  </li>
                </ul>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkingOut || cart.length === 0}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 shadow-xl flex items-center justify-center gap-2 mt-8 ${
                checkoutMode === 'whatsapp'
                  ? 'bg-[#25D366] text-white hover:bg-[#128C7E] shadow-green-500/20'
                  : paymentMethod === 'mpesa' || paymentMethod === 'pay'
                  ? 'bg-[#1a5c38] text-white hover:bg-[#2d7a4d] shadow-green-900/20'
                  : 'bg-[#e8a020] text-white hover:bg-[#f4b444] shadow-amber-500/20'
              }`}
            >
              {checkoutMode === 'whatsapp' ? (
                <MessageCircle className="w-5 h-5" />
              ) : paymentMethod === 'mpesa' ? (
                <Smartphone className="w-5 h-5" />
              ) : (
                <Banknote className="w-5 h-5" />
              )}
              {checkingOut 
                ? 'Processing...' 
                : checkoutMode === 'whatsapp' 
                ? 'Send to WhatsApp' 
                : paymentMethod === 'mpesa' 
                ? 'Pay via M-Pesa' 
                : paymentMethod === 'pay' 
                ? 'Pay Now' 
                : 'Place Order (Cash on Delivery)'}
            </button>
            
            {!user && cart.length > 0 && checkoutMode === 'site' && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Please <Link to="/login" className="text-[#1a5c38] font-bold hover:underline">Login</Link> to complete your order.
              </p>
            )}

            <div className="mt-8 pt-6 border-t border-gray-50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Shield className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {paymentMethod === 'mpesa'
                    ? 'Your payment is secure with M-Pesa. Shalimart does not store your PIN or sensitive data.'
                    : 'Cash on Delivery — pay when your order arrives. No advance payment required.'}
                </p>
              </div>

              {/* Enhanced Trust Badges */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-md border border-gray-100">
                  <Lock className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-500">Secure 256-bit SSL</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-md border border-gray-100">
                  <ShieldCheck className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-500">Verified Seller</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
