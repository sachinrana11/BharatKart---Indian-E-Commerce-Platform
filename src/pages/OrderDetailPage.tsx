import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  ArrowLeft,
  Printer,
  XCircle,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  MapPin,
  Clock,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { Order } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { OrderTimeline } from '../components/OrderTimeline.js';
import { SEOHead } from '../components/SEOHead.js';

interface OrderDetailPageProps {
  orderId: string;
  onNavigate: (view: string, params?: any) => void;
}

export const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ orderId, onNavigate }) => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = async () => {
    if (!token || !orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setOrder(json.data);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId, token]);

  const handleCancelOrder = async () => {
    const reason = prompt('Please enter the reason for cancelling this order:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Order cancelled successfully. Refund initiated if prepaid.', 'info');
        await fetchOrder();
      } else {
        showToast(json.error || 'Failed to cancel order', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error cancelling order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnOrder = async () => {
    const reason = prompt('Please state the issue (e.g. Defective item, size mismatch, damaged packaging):');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Doorstep return request accepted. Courier executive assigned for pickup.', 'success');
        await fetchOrder();
      } else {
        showToast(json.error || 'Failed to initiate return', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error requesting return', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-bold text-slate-600">Loading consignment information...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Order not found</h2>
        <button
          onClick={() => onNavigate('orders')}
          className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
  const canReturn = order.status === 'DELIVERED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SEOHead title={`Order #${order.orderNumber} Details | BharatKart`} />

      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('orders')}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                Order #{order.orderNumber}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('open-support', {
                  detail: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                  },
                })
              );
            }}
            className="px-3.5 py-2 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Headphones className="w-4 h-4 text-orange-600" />
            <span>Chat with Support</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>

          {canCancel && (
            <button
              disabled={actionLoading}
              onClick={handleCancelOrder}
              className="px-3.5 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Order</span>
            </button>
          )}

          {canReturn && (
            <button
              disabled={actionLoading}
              onClick={handleReturnOrder}
              className="px-3.5 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Request 7-Day Return</span>
            </button>
          )}
        </div>
      </div>

      {/* Lifecycle Timeline */}
      <OrderTimeline
        currentStatus={order.status}
        courierPartner={order.courierPartner}
        trackingNumber={order.trackingNumber}
        estimatedDeliveryDate={order.estimatedDeliveryDate}
      />

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ordered Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
              Items in Consignment ({order.items.length})
            </h3>

            <div className="divide-y divide-slate-100 space-y-3">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-4 pt-3 first:pt-0">
                  <img src={it.image} alt={it.title} className="w-16 h-16 object-contain rounded-xl border border-slate-100 bg-slate-50 p-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{it.title}</h4>
                    {it.variantDetails && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Variant: {it.variantDetails}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      Qty: {it.quantity} &bull; ₹{it.price.toLocaleString('en-IN')} each
                    </div>
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Address & Payment Summary */}
        <div className="space-y-4">
          {/* Shipping Address Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-xs space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider">Delivery Destination</h3>
            </div>
            <div className="font-bold text-slate-900 text-sm">{order.shippingAddress.fullName}</div>
            <p className="text-slate-600 leading-relaxed">
              {order.shippingAddress.addressLine}, {order.shippingAddress.locality ? `${order.shippingAddress.locality}, ` : ''}
              {order.shippingAddress.city}, {order.shippingAddress.state} - <strong>{order.shippingAddress.pincode}</strong>
            </p>
            <div className="text-slate-500 pt-1">
              Contact: <span className="font-bold text-slate-800">{order.shippingAddress.phone}</span>
            </div>
          </div>

          {/* Payment & Invoice Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-xs space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Payment Summary
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Payment Mode</span>
                <span className="font-bold text-slate-900">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Status</span>
                <span className={`font-bold ${order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentId && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Txn Ref</span>
                  <span className="font-mono text-slate-700">{order.paymentId}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount</span>
                  <span>- ₹{order.couponDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charges</span>
                <span>{order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>18% GST (Tax)</span>
                <span>Included (₹{order.tax.toLocaleString('en-IN')})</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-900">Total Paid</span>
                <span className="text-xl font-black text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
