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

  useEffect(() => {
    api.get('/orders')
      .then(res => {
        setOrders(res.data);
        setLoading(false);
      })
      .catch(() => {
        addToast('Failed to load orders', 'error');
        setLoading(false);
      });
  }, []);

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
      <h2 className="text-3xl font-bold mb-8">My Orders</h2>

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
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between p-5 border-b border-gray-50 gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Order #{order.id}</p>
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.color} ${config.bg}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {order.status}
                    </span>
                    <span className="font-bold text-gray-900">KSh {order.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-5 space-y-3">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.product && (
                        <img
                          src={item.product.images?.split(',')[0] || '/placeholder.jpg'}
                          className="w-12 h-12 object-contain bg-gray-50 rounded-lg"
                          alt=""
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product?.name || `Product #${item.product_id}`}</p>
                        <p className="text-xs text-gray-400">Qty: {item.quantity} × KSh {item.price_at_purchase.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
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
