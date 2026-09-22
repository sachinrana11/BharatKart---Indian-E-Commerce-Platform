import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Order } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { SEOHead } from '../components/SEOHead.js';
import { ordersApi } from '../services/api.js';

interface OrdersPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ onNavigate }) => {
  const { token, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await ordersApi.getOrders();
        if (Array.isArray(data)) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to load user orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <SEOHead title="Your Orders | BharatKart" />
        <Package className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Please Sign In to View Orders</h2>
        <p className="text-xs text-slate-500">Track current consignments, download invoices, or initiate returns.</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold"
        >
          Go to Home &amp; Sign In
        </button>
      </div>
    );
  }

  const filteredOrders = orders.filter(o => {
    if (filter === 'ACTIVE') {
      if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status)) return false;
    } else if (filter === 'DELIVERED') {
      if (o.status !== 'DELIVERED') return false;
    } else if (filter === 'CANCELLED') {
      if (o.status !== 'CANCELLED') return false;
    }

    if (searchTerm) {
      const matchNumber = o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProduct = o.items.some(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchNumber || matchProduct;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'OUT_FOR_DELIVERY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SHIPPED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEOHead title="My Orders & Consignments | BharatKart" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Orders &amp; Returns</h1>
          <p className="text-xs text-slate-500">Track shipments, download GST tax receipts, or manage returns</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order or product..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab === 'ALL' ? 'All Orders' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse p-4" />
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div
              key={order._id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
            >
              {/* Order Header */}
              <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Order Placed</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Amount</span>
                    <span className="font-bold text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ship To</span>
                    <span className="text-slate-800 font-medium truncate max-w-[120px] block">
                      {order.shippingAddress.fullName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Order #</span>
                    <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
                  </div>
                  <button
                    onClick={() => onNavigate('order-detail', { id: order._id })}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-orange-500 text-slate-700 hover:text-orange-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Order Body / Items */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                    Status: {order.status.replace(/_/g, ' ')}
                  </span>
                  {order.courierPartner && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Carrier: <strong>{order.courierPartner}</strong> &bull; AWB: <span className="font-mono">{order.trackingNumber}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img src={it.image} alt={it.title} className="w-14 h-14 object-contain rounded-xl border border-slate-100 bg-slate-50 p-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{it.title}</h4>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Quantity: {it.quantity} &bull; Price: ₹{it.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Orders Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            You have no orders under this filter. Browse our catalog to place your first order.
          </p>
          <button
            onClick={() => onNavigate('catalog')}
            className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold"
          >
            Start Shopping
          </button>
        </div>
      )}
    </div>
  );
};
