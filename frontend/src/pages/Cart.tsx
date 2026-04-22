import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import api from '../api/axios';

const Cart = () => {
  const { cart, updateCartQty, removeFromCart, clearCart, user, addToast } = useStore();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!user) {
      addToast('Please login to complete your order', 'error');
      return;
    }
    setCheckingOut(true);
    try {
      const res = await api.post('/orders', {
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
        delivery_address: deliveryAddress,
        delivery_phone: deliveryPhone,
      });
      if (res.data.status === 'success') {
        addToast('STK Push sent! Check your phone.', 'success');
        clearCart();
      } else {
        addToast(res.data.message || 'Order created — payment pending.', 'info');
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
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-8">Your Cart</h2>
      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 mb-6">Your cart is feeling a bit light.</p>
          <Link to="/shop" className="bg-[#1a5c38] text-white px-6 py-3 rounded-full font-bold hover:bg-[#2d7a4d] transition-all">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {cart.map((item, i) => (
            <div key={item.id} className={`reveal-up stagger-${(i % 5) + 1} bg-white p-4 rounded-xl shadow-sm flex gap-4 items-center`}>
              <Link to={`/product/${item.id}`}>
                <img src={item.images?.split(',')[0] || '/placeholder.jpg'} className="w-20 h-20 object-contain bg-gray-50 rounded-lg" alt={item.name} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.id}`}>
                  <h3 className="font-semibold truncate hover:text-[#1a5c38] transition-colors">{item.name}</h3>
                </Link>
                <p className="text-[#1a5c38] font-bold">KSh {item.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateCartQty(item.id, -1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors font-bold">-</button>
                <span className="font-bold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateCartQty(item.id, 1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors font-bold">+</button>
              </div>
              <p className="font-bold text-gray-900 w-24 text-right">KSh {(item.price * item.quantity).toLocaleString()}</p>
              <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Delivery Info */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Delivery Details</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Delivery address (e.g. Westlands, Nairobi)"
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none transition-colors"
              />
              <input
                type="tel"
                value={deliveryPhone}
                onChange={e => setDeliveryPhone(e.target.value)}
                placeholder="M-Pesa phone number (e.g. 254712345678)"
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Total + Checkout */}
          <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-[#e8a020]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500">Subtotal ({cart.reduce((a, i) => a + i.quantity, 0)} items)</span>
              <span className="font-bold">KSh {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500">Delivery</span>
              <span className="text-green-600 font-medium text-sm">Free within Nairobi</span>
            </div>
            <div className="flex justify-between text-2xl font-bold mb-6 pt-4 border-t border-gray-100">
              <span>Total</span>
              <span>KSh {total.toLocaleString()}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full bg-[#1a5c38] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#2d7a4d] transition-all disabled:opacity-50 shadow-lg shadow-green-900/20"
            >
              {checkingOut ? 'Processing...' : 'Pay via M-Pesa'}
            </button>
            {!user && (
              <p className="text-center text-sm text-gray-500 mt-3">
                <Link to="/login" className="text-[#1a5c38] font-bold">Login</Link> to complete your order
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
