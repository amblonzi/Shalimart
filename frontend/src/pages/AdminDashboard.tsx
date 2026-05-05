import { useState, useEffect } from 'react';
import { Package, Edit3, Trash2, X, ChevronDown, Upload, Users, Settings, Save, Shield, ShieldOff, Check, AlertCircle, BarChart3, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
import { useStore, type Product, type Order } from '../store/useStore';
import api from '../api/axios';

interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

interface AnalyticsData {
  revenue: { total: number; monthly: number };
  orders: { total: number; breakdown: Record<string, number> };
  top_products: { name: string; sold: number }[];
  total_customers: number;
}

const AdminDashboard = () => {
  const [tab, setTab] = useState<'products' | 'orders' | 'users' | 'settings' | 'analytics'>('analytics');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '', price: '', description: '', stock: '', badge: '' });
  const [userFormData, setUserFormData] = useState({ email: '', password: '', full_name: '', phone_number: '', is_admin: false });
  const [files, setFiles] = useState<FileList | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPriceFilter, setOrderPriceFilter] = useState({ min: '', max: '' });
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productPriceFilter, setProductPriceFilter] = useState({ min: '', max: '' });
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const { addToast } = useStore();

  const fetchProducts = () => api.get('/products').then(res => setProducts(res.data.items));
  const fetchOrders = () => api.get('/orders/admin').then(res => setOrders(res.data));
  const fetchUsers = () => api.get('/admin/users').then(res => setUsers(res.data));
  const fetchSettings = () => api.get('/admin/settings').then(res => setSettings(res.data));
  const fetchAnalytics = () => api.get('/admin/analytics').then(res => setAnalytics(res.data));

  const resetOrders = async () => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete ALL orders? This cannot be undone.')) return;
    try {
      await api.delete('/admin/orders/reset');
      fetchOrders();
      fetchAnalytics();
      addToast('All orders have been reset', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Reset failed', 'error');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchUsers();
    fetchSettings();
    fetchAnalytics();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v) data.append(k, v); });
    if (files) {
      Array.from(files).forEach(file => data.append('files', file));
    }
    try {
      await api.post('/products', data);
      setShowAdd(false);
      setFormData({ name: '', category: '', price: '', description: '', stock: '', badge: '' });
      setFiles(null);
      fetchProducts();
      addToast('Product created successfully', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Failed to create product', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;

    const data = new FormData();
    if (formData.name) data.append('name', formData.name);
    if (formData.category) data.append('category', formData.category);
    if (formData.price) data.append('price', formData.price);
    if (formData.description) data.append('description', formData.description);
    if (formData.stock) data.append('stock', formData.stock);
    if (formData.badge !== undefined) data.append('badge', formData.badge);
    if (files) {
      Array.from(files).forEach(file => data.append('files', file));
    }

    try {
      await api.put(`/products/${editProduct.id}`, data);
      setEditProduct(null);
      setFiles(null);
      fetchProducts();
      addToast('Product updated', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Update failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product permanently?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
      addToast('Product deleted', 'success');
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    const data = new FormData();
    data.append('file', csvFile);
    try {
      await api.post('/products/upload-csv', data);
      setShowCSVUpload(false);
      setCsvFile(null);
      fetchProducts();
      addToast('CSV imported successfully', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'CSV upload failed', 'error');
    }
  };
  
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', userFormData);
      setShowAddUser(false);
      setUserFormData({ email: '', password: '', full_name: '', phone_number: '', is_admin: false });
      fetchUsers();
      addToast('User created successfully', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Failed to create user', 'error');
    }
  };

  const updateOrderStatus = async (orderId: number, status: string, notes?: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status, notes });
      fetchOrders();
      setEditingOrder(null);
      addToast(`Order #${orderId} → ${status}`, 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Failed to update order', 'error');
    }
  };

  const toggleUserAdmin = async (userId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_admin: !currentStatus });
      fetchUsers();
      addToast('User permissions updated', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Update failed', 'error');
    }
  };

  const toggleUserActive = async (userId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_active: !currentStatus });
      fetchUsers();
      addToast(currentStatus ? 'User deactivated' : 'User activated', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Update failed', 'error');
    }
  };


  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await api.post('/admin/settings', { key, value });
      addToast('Setting updated', 'success');
      fetchSettings();
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Failed to update setting', 'error');
    }
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setFiles(null);
    setFormData({
      name: p.name,
      category: p.category,
      price: p.price.toString(),
      description: p.description || '',
      stock: p.stock.toString(),
      badge: p.badge || '',
    });
  };

  const statusColors: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-50',
    paid: 'text-blue-600 bg-blue-50',
    shipped: 'text-purple-600 bg-purple-50',
    delivered: 'text-green-600 bg-green-50',
    cancelled: 'text-gray-600 bg-gray-50',
    failed: 'text-red-600 bg-red-50',
  };

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'products', label: 'Products', icon: Package },
            { id: 'orders', label: `Orders (${orders.length})`, icon: ChevronDown },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all ${tab === t.id ? 'bg-[#1a5c38] text-white shadow-lg shadow-green-900/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── ANALYTICS TAB ─── */}
      {tab === 'analytics' && analytics && (
        <div className="space-y-8 animate-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-50 rounded-2xl">
                  <DollarSign className="w-6 h-6 text-[#1a5c38]" />
                </div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">KSh {analytics.revenue.total.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-2 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] font-bold">Lifetime Sales</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Monthly Sales</p>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">KSh {analytics.revenue.monthly.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-2">Current Month</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <ShoppingBag className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Orders</p>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{analytics.orders.total}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-2">{analytics.orders.breakdown['paid'] || 0} Successful</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-2xl">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Customers</p>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{analytics.total_customers}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-2">Registered Users</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Best Sellers */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#1a5c38]" />
                Top 5 Best Sellers
              </h3>
              <div className="space-y-4">
                {analytics.top_products.length > 0 ? (
                  analytics.top_products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-[#1a5c38] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {i + 1}
                        </span>
                        <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                      </div>
                      <p className="text-sm font-bold text-[#1a5c38]">{p.sold} sold</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-12">No sales data yet</p>
                )}
              </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#1a5c38]" />
                Order Distribution
              </h3>
              <div className="space-y-6">
                {Object.entries(analytics.orders.breakdown).map(([status, count]) => {
                  const percentage = (count / analytics.orders.total) * 100;
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-400',
                    paid: 'bg-blue-500',
                    shipped: 'bg-purple-500',
                    delivered: 'bg-green-500',
                    cancelled: 'bg-gray-400',
                    failed: 'bg-red-500',
                  };
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="capitalize">{status}</span>
                        <span>{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${statusColors[status] || 'bg-gray-300'} transition-all duration-1000`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRODUCTS TAB ─── */}
      {tab === 'products' && (
        <>
          <div className="flex justify-end mb-6 gap-3">
            <button 
              onClick={() => setShowCSVUpload(true)} 
              className="bg-white text-gray-700 border border-gray-200 px-6 py-2.5 rounded-full font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Bulk Upload (CSV)
            </button>
            <button onClick={() => { setShowAdd(true); setFormData({ name: '', category: '', price: '', description: '', stock: '', badge: '' }); }} className="bg-[#1a5c38] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#2d7a4d] transition-all shadow-lg shadow-green-900/20">
              + Add Product
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Products</label>
                <input 
                  type="text" 
                  placeholder="Name or description..." 
                  className="w-full p-2.5 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#1a5c38]"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                <select 
                  className="w-full p-2.5 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#1a5c38]"
                  value={productCategoryFilter}
                  onChange={e => setProductCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {Array.from(new Set(products.map(p => p.category))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price Range (KSh)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    className="w-full p-2.5 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#1a5c38]"
                    value={productPriceFilter.min}
                    onChange={e => setProductPriceFilter({...productPriceFilter, min: e.target.value})}
                  />
                  <span className="text-gray-300">-</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    className="w-full p-2.5 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#1a5c38]"
                    value={productPriceFilter.max}
                    onChange={e => setProductPriceFilter({...productPriceFilter, max: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-gray-600">Product</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Category</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Price</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Stock</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Badge</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter(p => {
                      const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.description?.toLowerCase().includes(productSearch.toLowerCase());
                      const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
                      const matchesMinPrice = !productPriceFilter.min || p.price >= parseFloat(productPriceFilter.min);
                      const matchesMaxPrice = !productPriceFilter.max || p.price <= parseFloat(productPriceFilter.max);
                      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice;
                    })
                    .map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img src={p.images?.split(',')[0] || '/placeholder.jpg'} className="w-10 h-10 object-contain bg-gray-50 rounded-lg" alt="" />
                        <span className="font-medium text-sm">{p.name}</span>
                      </td>
                      <td className="p-4 text-gray-500 text-sm">{p.category}</td>
                      <td className="p-4 font-bold text-sm">KSh {p.price.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`text-sm font-medium ${p.stock <= 5 ? 'text-red-500' : 'text-gray-600'}`}>
                          {p.stock} {p.stock <= 5 && '⚠️'}
                        </span>
                      </td>
                      <td className="p-4">
                        {p.badge && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{p.badge}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-all">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── ORDERS TAB ─── */}
      {tab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto">
              {['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'failed'].map(s => (
                <button
                  key={s}
                  onClick={() => setOrderStatusFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${
                    orderStatusFilter === s ? 'bg-[#1a5c38] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                placeholder="Min KSh" 
                className="w-24 p-1.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold focus:ring-1 focus:ring-[#1a5c38] outline-none"
                value={orderPriceFilter.min}
                onChange={e => setOrderPriceFilter({...orderPriceFilter, min: e.target.value})}
              />
              <span className="text-gray-300 text-xs">-</span>
              <input 
                type="number" 
                placeholder="Max KSh" 
                className="w-24 p-1.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold focus:ring-1 focus:ring-[#1a5c38] outline-none"
                value={orderPriceFilter.max}
                onChange={e => setOrderPriceFilter({...orderPriceFilter, max: e.target.value})}
              />
            </div>
            {orders.length > 0 && (
              <button 
                onClick={resetOrders} 
                className="bg-red-50 text-red-600 px-6 py-2 rounded-full font-bold hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100 text-sm"
              >
                <Trash2 className="w-4 h-4" /> Reset All
              </button>
            )}
          </div>

          {orders.filter(o => {
            const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
            const matchesMinPrice = !orderPriceFilter.min || o.total_amount >= parseFloat(orderPriceFilter.min);
            const matchesMaxPrice = !orderPriceFilter.max || o.total_amount <= parseFloat(orderPriceFilter.max);
            return matchesStatus && matchesMinPrice && matchesMaxPrice;
          }).length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
              <Package className="w-16 h-16 mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">No matches found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders
                .filter(o => {
                  const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
                  const matchesMinPrice = !orderPriceFilter.min || o.total_amount >= parseFloat(orderPriceFilter.min);
                  const matchesMaxPrice = !orderPriceFilter.max || o.total_amount <= parseFloat(orderPriceFilter.max);
                  return matchesStatus && matchesMinPrice && matchesMaxPrice;
                })
                .map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
                    <div className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${statusColors[order.status] || 'bg-gray-50 text-gray-400'}`}>
                            #{order.id}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-gray-900">{order.user?.full_name || 'Guest Customer'}</p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">{order.payment_method || 'M-Pesa'}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-2">
                            <p className="text-xl font-black text-gray-900">KSh {order.total_amount.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.items.reduce((a, b) => a + b.quantity, 0)} Items</p>
                          </div>
                          <button 
                            onClick={() => { setEditingOrder(order); setOrderNotes(order.notes || ''); }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-sm flex items-center gap-2 ${statusColors[order.status] || 'bg-gray-50 text-gray-600'}`}
                          >
                            {order.status}
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <ShoppingBag className="w-3 h-3" /> Items Summary
                          </p>
                          <div className="space-y-2 bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                            {order.items.map(item => (
                              <div key={item.id} className="flex items-start gap-3 text-sm">
                                <span className="font-black text-[#1a5c38] bg-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] border border-gray-100 shrink-0">{item.quantity}×</span>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-800 text-xs leading-tight">{item.product?.name || `Product #${item.product_id}`}</p>
                                  <p className="text-[10px] text-gray-400 font-medium">KSh {item.price_at_purchase.toLocaleString()} each</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Check className="w-3 h-3" /> Delivery & Notes
                          </p>
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                                <Package className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <p className="text-xs font-medium text-gray-600 leading-snug">
                                <span className="block font-black text-gray-900 text-[10px] uppercase mb-0.5">Address</span>
                                {order.delivery_address || 'Not provided'}
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <div className="bg-purple-50 p-2 rounded-lg shrink-0">
                                <Users className="w-3.5 h-3.5 text-purple-500" />
                              </div>
                              <p className="text-xs font-medium text-gray-600 leading-snug">
                                <span className="block font-black text-gray-900 text-[10px] uppercase mb-0.5">Contact</span>
                                {order.delivery_phone || order.user?.phone_number || 'No phone'}
                              </p>
                            </div>
                            {order.notes && (
                              <div className="flex gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-50">
                                <div className="bg-amber-50 p-1.5 rounded-lg shrink-0">
                                  <AlertCircle className="w-3 h-3 text-amber-500" />
                                </div>
                                <p className="text-xs font-medium text-amber-700 italic leading-snug italic">
                                  <span className="block font-black text-amber-900 text-[10px] uppercase mb-0.5 not-italic">Admin Note</span>
                                  "{order.notes}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ─── USERS TAB ─── */}
      {tab === 'users' && (
        <>
          <div className="flex justify-end mb-6">
            <button 
              onClick={() => setShowAddUser(true)}
              className="bg-[#1a5c38] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#2d7a4d] transition-all shadow-lg shadow-green-900/20 flex items-center gap-2"
            >
              <Users className="w-4 h-4" /> Add User / Shop Manager
            </button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-600">User</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Phone</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Joined</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Admin</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-medium text-sm">{u.full_name || 'No Name'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{u.phone_number || '-'}</td>
                    <td className="p-4 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {u.is_admin ? <Shield className="w-4 h-4 text-[#1a5c38] mx-auto" /> : <ShieldOff className="w-4 h-4 text-gray-300 mx-auto" />}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => toggleUserAdmin(u.id, u.is_admin)} 
                          title={u.is_admin ? "Remove Admin" : "Make Admin"}
                          className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleUserActive(u.id, u.is_active)} 
                          title={u.is_active ? "Block User" : "Activate User"}
                          className={`p-2 rounded-lg ${u.is_active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                        >
                          {u.is_active ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
      )}

      {/* ─── SETTINGS TAB ─── */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-50 rounded-2xl">
                <Settings className="w-6 h-6 text-[#1a5c38]" />
              </div>
              <div>
                <h3 className="text-xl font-bold">M-Pesa API Details</h3>
                <p className="text-sm text-gray-500">Configure Lipa Na M-Pesa payments</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {settings.map(s => (
                <div key={s.key}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{s.description || s.key}</label>
                  <div className="flex gap-2">
                    {s.key === 'mpesa_env' ? (
                      <select 
                        defaultValue={s.value}
                        id={`setting-${s.key}`}
                        className="flex-1 p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none text-sm"
                      >
                        <option value="sandbox">Sandbox</option>
                        <option value="production">Production</option>
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        defaultValue={s.value}
                        id={`setting-${s.key}`}
                        placeholder={`Enter ${s.key}...`}
                        className="flex-1 p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none text-sm font-mono"
                      />
                    )}
                    <button 
                      onClick={() => {
                        const el = document.getElementById(`setting-${s.key}`) as HTMLInputElement | HTMLSelectElement;
                        handleUpdateSetting(s.key, el.value);
                      }}
                      className="p-3 bg-[#1a5c38] text-white rounded-xl hover:bg-[#2d7a4d] transition-all"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-800">Security Note</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    API keys are used for processing M-Pesa STK push requests. Ensure these are kept private. Changes take effect immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1a5c38] p-8 rounded-3xl text-white shadow-xl shadow-green-900/20">
            <h3 className="text-xl font-bold mb-4">Paybill Information</h3>
            <p className="text-green-100 text-sm mb-8">This information is displayed to customers during checkout.</p>
            
            <div className="space-y-6">
              <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
                <p className="text-xs uppercase tracking-wider font-bold text-green-300 mb-1">Paybill Number</p>
                <p className="text-2xl font-mono font-bold">{settings.find(s => s.key === 'mpesa_paybill')?.value || 'Not Set'}</p>
              </div>
              
              <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
                <p className="text-xs uppercase tracking-wider font-bold text-green-300 mb-1">Account Name</p>
                <p className="text-2xl font-bold">{settings.find(s => s.key === 'mpesa_account_name')?.value || 'SHALINA MART'}</p>
              </div>
            </div>
            
            <div className="mt-12">
              <img src="/favicon.png" className="w-16 h-16 opacity-50 grayscale brightness-200" alt="" />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALS ─── */}
      {/* ... (Keep existing modals for Add/Edit/CSV) ... */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white p-8 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">New Product</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input type="text" placeholder="Product Name" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <select className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required>
                <option value="">Select Category</option>
                <option value="Household Items">Household Items</option>
                <option value="Agro / Farm Equipment">Agro / Farm Equipment</option>
                <option value="Automotive">Automotive</option>
                <option value="Fitness">Fitness</option>
                <option value="Fashion & Beauty">Fashion & Beauty</option>
                <option value="Health & Wellness">Health & Wellness</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Price (KSh)" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                <input type="number" placeholder="Stock Qty" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <select className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})}>
                <option value="">No Badge</option>
                <option value="New">New</option>
                <option value="Sale">Sale</option>
                <option value="Hot">Hot</option>
                <option value="Featured">Featured</option>
              </select>
              <textarea placeholder="Description" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Product Images</label>
                <input type="file" multiple accept="image/*" className="w-full" onChange={e => setFiles(e.target.files)} required />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#1a5c38] text-white font-bold hover:bg-[#2d7a4d] transition-colors">Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editProduct && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setEditProduct(null); setFiles(null); }}>
          <div className="bg-white p-8 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Edit Product</h3>
              <button onClick={() => setEditProduct(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input type="text" placeholder="Product Name" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <select className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="">Select Category</option>
                <option value="Household Items">Household Items</option>
                <option value="Agro / Farm Equipment">Agro / Farm Equipment</option>
                <option value="Automotive">Automotive</option>
                <option value="Fitness">Fitness</option>
                <option value="Fashion & Beauty">Fashion & Beauty</option>
                <option value="Health & Wellness">Health & Wellness</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Price (KSh)" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                <input type="number" placeholder="Stock Qty" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <select className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})}>
                <option value="">No Badge</option>
                <option value="New">New</option>
                <option value="Sale">Sale</option>
                <option value="Hot">Hot</option>
                <option value="Featured">Featured</option>
              </select>
              <textarea placeholder="Description" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Product Images</label>
                <input type="file" multiple accept="image/*" className="w-full" onChange={e => setFiles(e.target.files)} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setEditProduct(null); setFiles(null); }} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#1a5c38] text-white font-bold hover:bg-[#2d7a4d] transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCSVUpload && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCSVUpload(false)}>
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Bulk Upload Products</h3>
              <button onClick={() => setShowCSVUpload(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-sm text-amber-800 font-medium mb-2">CSV Format Requirements:</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Headers: <code className="bg-amber-100 px-1 rounded">name, category, price, description, stock, badge, image_url</code><br/>
                - <code className="bg-amber-100 px-1 rounded">name</code> and <code className="bg-amber-100 px-1 rounded">price</code> are required.<br/>
                - <code className="bg-amber-100 px-1 rounded">image_url</code> can be a comma-separated list of URLs.
              </p>
            </div>
            <form onSubmit={handleCSVUpload} className="space-y-6">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[#1a5c38] transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  required
                />
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-600">
                  {csvFile ? csvFile.name : "Click or drag CSV file here"}
                </p>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCSVUpload(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" disabled={!csvFile} className="flex-1 py-3 rounded-xl bg-[#1a5c38] text-white font-bold hover:bg-[#2d7a4d] transition-colors disabled:opacity-50">Upload & Process</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddUser(false)}>
          <div className="bg-white p-8 rounded-3xl w-full max-w-md scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Add User</h3>
              <button onClick={() => setShowAddUser(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input 
                type="text" 
                placeholder="Full Name" 
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" 
                value={userFormData.full_name} 
                onChange={e => setUserFormData({...userFormData, full_name: e.target.value})} 
                required 
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" 
                value={userFormData.email} 
                onChange={e => setUserFormData({...userFormData, email: e.target.value})} 
                required 
              />
              <input 
                type="tel" 
                placeholder="Phone Number (e.g. 254...)" 
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" 
                value={userFormData.phone_number} 
                onChange={e => setUserFormData({...userFormData, phone_number: e.target.value})} 
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#1a5c38] outline-none" 
                value={userFormData.password} 
                onChange={e => setUserFormData({...userFormData, password: e.target.value})} 
                required 
              />
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-[#1a5c38] focus:ring-[#1a5c38]" 
                  checked={userFormData.is_admin} 
                  onChange={e => setUserFormData({...userFormData, is_admin: e.target.checked})} 
                />
                <span className="text-sm font-bold text-gray-700">Grant Admin Permissions</span>
              </label>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#1a5c38] text-white font-bold hover:bg-[#2d7a4d] transition-colors">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingOrder(null)}>
          <div className="bg-white p-8 rounded-3xl w-full max-w-md scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black">Manage Order #{editingOrder.id}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Update Status & Notes</p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Order Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'failed'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateOrderStatus(editingOrder.id, s, orderNotes)}
                      className={`py-3 px-4 rounded-xl text-xs font-black capitalize transition-all border-2 flex items-center justify-between ${
                        editingOrder.status === s 
                        ? 'border-[#1a5c38] bg-green-50 text-[#1a5c38]' 
                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {s}
                      {editingOrder.status === s && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Admin Notes / Failure Reason</label>
                <textarea
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-[#1a5c38] outline-none transition-all text-sm font-medium min-h-[120px]"
                  placeholder="Add a reason for failure, or internal delivery notes..."
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => updateOrderStatus(editingOrder.id, editingOrder.status, orderNotes)}
                  className="w-full py-4 rounded-2xl bg-[#1a5c38] text-white font-black hover:bg-[#2d7a4d] transition-all shadow-xl shadow-green-900/20 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
