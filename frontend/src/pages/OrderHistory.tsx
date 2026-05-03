import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { useStore, type Order } from '../store/useStore';
import api from '../api/axios';

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
  pending: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  paid: { color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle },
  shipped: { color: 'text-purple-600', bg: 'bg-purple-50', icon: Truck },
  delivered: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  cancelled: { color: 'text-gray-600', bg: 'bg-gray-50', icon: XCircle },
  failed: { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

const OrderHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useStore();

  const fetchOrders = () => {
    setLoading(true);
    api.get('/orders')
      .then(res => {
        setOrders(res.data);
        setLoading(false);
      })
      .catch(() => {
        addToast('Failed to load orders', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.post(`/orders/${id}/cancel`);
      addToast('Order cancelled', 'success');
      fetchOrders();
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Failed to cancel order', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
        <div className="skeleton h-8 w-48 mb-8"></div>
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 w-full rounded-2xl"></div>)}
      </div>
    );
  }

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">My Orders</h2>
        <Link to="/shop" className="text-[#1a5c38] font-bold text-sm hover:underline">Continue Shopping →</Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <Package className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
          <Link to="/shop" className="bg-[#1a5c38] text-white px-6 py-3 rounded-full font-bold hover:bg-[#2d7a4d] transition-all">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between p-5 border-b border-gray-50 gap-4 bg-gray-50/30">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm">
                      <Package className="w-5 h-5 text-[#1a5c38]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Order #{order.id}</p>
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Amount</p>
                      <p className="font-black text-gray-900">KSh {order.total_amount.toLocaleString()}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${config.color} ${config.bg} ring-1 ring-inset ring-current/10`}>
                      <StatusIcon className="w-3 h-3" />
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-5 space-y-4">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-4">
                      <Link to={item.product ? `/product/${item.product.id}` : '#'}>
                        <img
                          src={item.product?.images?.split(',')[0] || '/placeholder.jpg'}
                          className="w-14 h-14 object-contain bg-gray-50 rounded-xl border border-gray-100 p-1"
                          alt=""
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={item.product ? `/product/${item.product.id}` : '#'}>
                          <p className="font-bold text-sm text-gray-800 truncate hover:text-[#1a5c38] transition-colors">{item.product?.name || `Product #${item.product_id}`}</p>
                        </Link>
                        <p className="text-xs text-gray-400 font-medium">Qty: {item.quantity} × <span className="text-gray-900">KSh {item.price_at_purchase.toLocaleString()}</span></p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Actions */}
                <div className="p-4 bg-gray-50/50 border-t border-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <a 
                      href={`https://wa.me/254700000000?text=Hi, I need help with Order #${order.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-gray-500 hover:text-[#1a5c38] transition-colors"
                    >
                      Need help? Contact Support
                    </a>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => handleCancel(order.id)}
                        className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      >
                        Cancel Order
                      </button>
                    )}
                    <Link 
                      to="/shop" 
                      className="px-4 py-2 text-xs font-bold text-[#1a5c38] bg-white border border-gray-100 rounded-lg hover:border-[#1a5c38] transition-all"
                    >
                      Buy Again
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
