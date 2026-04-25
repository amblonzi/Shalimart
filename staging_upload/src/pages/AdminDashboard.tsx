import { useState, useEffect } from 'react';
import { Package, Edit3, Trash2, X, ChevronDown, Upload } from 'lucide-react';
import { useStore, type Product, type Order } from '../store/useStore';
import api from '../api/axios';

const AdminDashboard = () => {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '', price: '', description: '', stock: '', badge: '' });
  const [files, setFiles] = useState<FileList | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const { addToast } = useStore();

  const fetchProducts = () => api.get('/products').then(res => setProducts(res.data.items));
  const fetchOrders = () => api.get('/orders/admin').then(res => setOrders(res.data));

  useEffect(() => {
    fetchProducts();
    fetchOrders();
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
    const updates: Record<string, any> = {};
    if (formData.name) updates.name = formData.name;
    if (formData.category) updates.category = formData.category;
    if (formData.price) updates.price = parseFloat(formData.price);
    if (formData.description) updates.description = formData.description;
    if (formData.stock) updates.stock = parseInt(formData.stock);
    if (formData.badge !== undefined) updates.badge = formData.badge || null;

    try {
      await api.put(`/products/${editProduct.id}`, updates);
      setEditProduct(null);
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

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      fetchOrders();
      addToast(`Order #${orderId} → ${status}`, 'success');
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Failed to update order', 'error');
    }
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
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
        <div className="flex gap-3">
          <button
            onClick={() => setTab('products')}
            className={`px-5 py-2 rounded-full font-medium transition-all ${tab === 'products' ? 'bg-[#1a5c38] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Products
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`px-5 py-2 rounded-full font-medium transition-all ${tab === 'orders' ? 'bg-[#1a5c38] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Orders ({orders.length})
          </button>
        </div>
      </div>

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
                  {products.map(p => (
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
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
              <Package className="w-16 h-16 mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          ) : orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <p className="font-bold text-gray-900">Order #{order.id}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString('en-KE')}</p>
                  {order.delivery_address && <p className="text-xs text-gray-400 mt-1">📍 {order.delivery_address}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColors[order.status] || 'bg-gray-50 text-gray-600'}`}>
                    {order.status}
                  </span>
                  <span className="font-bold">KSh {order.total_amount.toLocaleString()}</span>
                  <div className="relative group">
                    <button className="p-2 text-gray-400 hover:text-[#1a5c38] rounded-lg hover:bg-gray-50">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-36 hidden group-hover:block z-10">
                      {['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map(s => (
                        <button
                          key={s}
                          onClick={() => updateOrderStatus(order.id, s)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 capitalize"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400">{item.quantity}×</span>
                    <span className="flex-1 truncate">{item.product?.name || `#${item.product_id}`}</span>
                    <span className="text-gray-500">KSh {(item.price_at_purchase * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── ADD PRODUCT MODAL ─── */}
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

      {/* ─── EDIT PRODUCT MODAL ─── */}
      {editProduct && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditProduct(null)}>
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
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditProduct(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#1a5c38] text-white font-bold hover:bg-[#2d7a4d] transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CSV UPLOAD MODAL ─── */}
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
    </div>
  );
};

export default AdminDashboard;
