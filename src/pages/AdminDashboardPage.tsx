import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Users,
  AlertTriangle,
  Tag,
  Clock,
  CheckCircle,
  Truck,
  Plus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Product, Order, Coupon, FlashSale } from '../types.js';
import { SEOHead } from '../components/SEOHead.js';
import { adminApi, ApiError } from '../services/api.js';

interface AdminDashboardPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user, token, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders' | 'coupons' | 'logs'>('analytics');
  const [metrics, setMetrics] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // New Coupon Modal State
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    discountValue: 15,
    minOrderValue: 799,
    maxDiscountAmount: 300,
  });

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [mRes, pRes, oRes, cRes, lRes] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getProducts({ limit: 100 }),
        adminApi.getOrders({ limit: 50 }),
        adminApi.getCoupons(),
        adminApi.getAuditLogs(50),
      ]);

      if (mRes) setMetrics(mRes);
      if (Array.isArray(pRes)) setProducts(pRes);
      if (Array.isArray(oRes)) setOrders(oRes);
      if (Array.isArray(cRes)) setCoupons(cRes);
      if (Array.isArray(lRes)) setLogs(lRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Handle Order Status Transition
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const courier = newStatus === 'SHIPPED' ? 'BlueDart Air Express' : undefined;
      const tracking = newStatus === 'SHIPPED' ? `BLUEDART-${Math.floor(100000000 + Math.random() * 900000000)}` : undefined;

      const updated = await adminApi.updateOrderStatus(orderId, newStatus, {
        courierPartner: courier,
        trackingNumber: tracking,
      });
      if (updated) {
        showToast(`Order status updated to ${newStatus}`, 'success');
        setOrders(prev => prev.map(o => (o._id === orderId ? updated : o)));
      }
    } catch (e: any) {
      const message = e instanceof ApiError ? e.userMessage : e.message || 'Error updating order';
      showToast(message, 'error');
    }
  };

  // Handle Product Save / Create
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.title || !editingProduct?.price) {
      showToast('Title and Price are required', 'error');
      return;
    }

    try {
      const isEdit = !!editingProduct._id;
      const productPayload = {
        ...editingProduct,
        images: editingProduct.images || [editingProduct.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
      };

      if (isEdit && editingProduct._id) {
        await adminApi.updateProduct(editingProduct._id, productPayload);
      } else {
        await adminApi.createProduct(productPayload);
      }

      showToast(isEdit ? 'Product updated' : 'Product created', 'success');
      setShowProductModal(false);
      setEditingProduct(null);
      fetchAdminData();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Error saving product';
      showToast(message, 'error');
    }
  };

  // Handle Coupon Create
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return;

    try {
      const created = await adminApi.createCoupon(newCoupon);
      if (created) {
        showToast(`Coupon ${newCoupon.code} created!`, 'success');
        setShowCouponModal(false);
        setCoupons(prev => [created, ...prev]);
      }
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Error creating coupon';
      showToast(message, 'error');
    }
  };

  if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <SEOHead title="Access Denied | BharatKart" />
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-slate-900">Admin Authorization Required</h2>
        <p className="text-xs text-slate-500">
          You must be signed in with an Indian Administrator or Merchant role to access the control center.
        </p>
        <button
          onClick={() => onNavigate('profile')}
          className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold"
        >
          Switch to Admin Persona in Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEOHead title="Admin Control Center & Operations | BharatKart" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              BharatKart Operations &amp; Admin Panel
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800">
              Live Production
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Pan-India catalog, consignment shipments, real-time GST invoices, and festive marketing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingProduct({
                title: '',
                slug: `item-${Date.now()}`,
                description: 'Authentic Indian product handcrafted with care.',
                brand: 'BharatKart Direct',
                category: 'Electronics & Gadgets',
                price: 999,
                mrp: 1999,
                discountPercent: 50,
                stock: 50,
                sku: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
                thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
                rating: 4.8,
                reviewCount: 12,
                returnDays: 7,
                codAvailable: true,
                isFeatured: true,
                isBestSeller: false,
              });
              setShowProductModal(true);
            }}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
          <button
            onClick={() => setShowCouponModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Tag className="w-4 h-4" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: 'analytics', label: 'Analytics & GMV', icon: TrendingUp },
          { id: 'products', label: `Catalog & Stock (${products.length})`, icon: Package },
          { id: 'orders', label: `Consignments (${orders.length})`, icon: ShoppingBag },
          { id: 'coupons', label: `Coupons (${coupons.length})`, icon: Tag },
          { id: 'logs', label: `Audit Trail (${logs.length})`, icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Merchandise (GMV)</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                ₹{(metrics?.totalRevenue || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                +18.4% growth across Indian Tier 1 &amp; 2 cities
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Consignments</span>
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {metrics?.totalOrders || orders.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics?.pendingOrders || 0} currently processing for dispatch
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Catalog Inventory</span>
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {metrics?.totalProducts || products.length}
              </div>
              <p className="text-[11px] text-rose-600 font-semibold mt-1">
                {metrics?.lowStockCount || 0} items low on stock
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Registered Shoppers</span>
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {metrics?.totalUsers || 2480}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Active across 19,000+ PIN codes
              </p>
            </div>
          </div>

          {/* Quick Insights Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              High-Velocity Regional Highlights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
                <div className="font-bold text-orange-950 mb-1">Top Selling Category</div>
                <div className="text-base font-black text-orange-600">Electronics &amp; Gadgets</div>
                <p className="text-[11px] text-slate-600 mt-1">
                  boAt Airdopes and Noise Smartwatches dominate 42% of total order volume.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="font-bold text-emerald-950 mb-1">Prepaid UPI Adoption</div>
                <div className="text-base font-black text-emerald-700">76% Prepaid</div>
                <p className="text-[11px] text-slate-600 mt-1">
                  High trust rate with instant UPI QR verification reducing COD RTO rates to under 3.2%.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <div className="font-bold text-blue-950 mb-1">Average Dispatch SLA</div>
                <div className="text-base font-black text-blue-700">14 Hours</div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Same-day handover to BlueDart and Delhivery fulfillment centers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Products & Inventory Management */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Manage Catalog Inventory</h3>
            <span className="text-xs text-slate-500">{products.length} Products Active</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Stock</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(prod => (
                  <tr key={prod._id} className="hover:bg-slate-50/80">
                    <td className="py-3 flex items-center gap-3">
                      <img src={prod.thumbnail} alt={prod.title} className="w-10 h-10 object-contain rounded-lg border border-slate-100 bg-slate-50 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate max-w-xs">{prod.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{prod.category}</td>
                    <td className="py-3">
                      <span className="font-bold text-slate-900">₹{prod.price.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-400 line-through block">₹{prod.mrp.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="py-3">
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${prod.stock <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {prod.stock} units
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {prod.isFeatured && (
                          <span className="text-[9px] font-bold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">Featured</span>
                        )}
                        {prod.isBestSeller && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">Best Seller</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setShowProductModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-orange-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Orders Processing */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Orders &amp; Consignment Fulfillment</h3>
            <span className="text-xs text-slate-500">{orders.length} total orders recorded</span>
          </div>

          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-slate-900">{order.orderNumber}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-600">{order.shippingAddress.fullName} ({order.shippingAddress.city})</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="font-bold text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Status update controller */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Move Status:</span>
                    <select
                      value={order.status}
                      onChange={e => handleUpdateOrderStatus(order._id, e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="SHIPPED">SHIPPED (Assign Courier)</option>
                      <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                {order.courierPartner && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg flex items-center gap-4">
                    <span>🚚 Courier: <strong>{order.courierPartner}</strong></span>
                    <span>AWB: <strong className="font-mono">{order.trackingNumber}</strong></span>
                    <span>Payment: <strong className={order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>{order.paymentStatus} ({order.paymentMethod})</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 4: Coupons Management */}
      {activeTab === 'coupons' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Festival Marketing &amp; Coupons</h3>
            <button
              onClick={() => setShowCouponModal(true)}
              className="px-3.5 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map(cp => (
              <div key={cp._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-orange-600 text-sm">{cp.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {cp.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {cp.discountType === 'PERCENTAGE'
                    ? `${cp.discountValue}% Off (Up to ₹${cp.maxDiscountAmount || 'N/A'})`
                    : `Flat ₹${cp.discountValue} Off`}
                </p>
                <div className="text-[11px] text-slate-400">
                  Min Order Value: ₹{cp.minOrderValue} &bull; Used {cp.usedCount} times
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 5: Audit Trail Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Administrative Audit Trail</h3>
            <span className="text-xs text-slate-500">Security &amp; change history</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto divide-y divide-slate-100">
            {logs.map((log, idx) => (
              <div key={idx} className="pt-2.5 first:pt-0 flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0"></div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{log.action}</div>
                  <div className="text-[11px] text-slate-500">
                    By {log.userName} ({log.userEmail}) &bull; IP: {log.ip || '127.0.0.1'} &bull; {new Date(log.timestamp).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Edit / Create Modal */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              {editingProduct._id ? 'Edit Product' : 'Add New Indian Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={editingProduct.title || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.brand || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.category || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || 0}
                    onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.mrp || 0}
                    onChange={e => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Units</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock || 0}
                    onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thumbnail Image URL</label>
                <input
                  type="text"
                  required
                  value={editingProduct.thumbnail || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, thumbnail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured || false}
                    onChange={e => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                  />
                  <span>Featured Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isBestSeller || false}
                    onChange={e => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                  />
                  <span>Best Seller</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.codAvailable !== false}
                    onChange={e => setEditingProduct({ ...editingProduct, codAvailable: e.target.checked })}
                  />
                  <span>COD Available</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Create Promotional Coupon
            </h3>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Coupon Code (e.g. DIWALI25)</label>
                <input
                  type="text"
                  required
                  value={newCoupon.code}
                  onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={newCoupon.discountType}
                    onChange={e => setNewCoupon({ ...newCoupon, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Rupee (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={newCoupon.discountValue}
                    onChange={e => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={newCoupon.minOrderValue}
                    onChange={e => setNewCoupon({ ...newCoupon, minOrderValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={newCoupon.maxDiscountAmount}
                    onChange={e => setNewCoupon({ ...newCoupon, maxDiscountAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
