import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Truck,
  Package,
  ArrowRight,
  FileText,
  Clock,
  Printer,
  Home,
} from 'lucide-react';
import { Order } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { SEOHead } from '../components/SEOHead.js';
import { ordersApi } from '../services/api.js';

interface PaymentSuccessPageProps {
  orderId?: string;
  orderNumber?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({
  orderId,
  orderNumber,
  onNavigate,
}) => {
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const targetId = orderId || orderNumber;
      if (!targetId || !token) {
        setLoading(false);
        return;
      }

      try {
        const data = await ordersApi.getOrderById(targetId);
        if (data) {
          setOrder(data);
        }
      } catch (err) {
        console.error('Error fetching order for success page:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, orderNumber, token]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <SEOHead title="Order Confirmed! | BharatKart" />

      {/* Confirmation Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            Payment &amp; Order Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Thank you for your order!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Your package is being prepared at our fulfillment hub. An SMS and email confirmation have been dispatched.
          </p>
        </div>

        {/* Order Details Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Number</span>
            <span className="font-mono font-bold text-slate-900">{order?.orderNumber || orderNumber || 'BK-2026-PENDING'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
            <span className="font-bold text-slate-900">₹{(order?.totalAmount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Mode</span>
            <span className="font-bold text-emerald-700">{order?.paymentMethod || 'UPI / Online'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Delivery</span>
            <span className="font-bold text-slate-900">
              {order?.estimatedDeliveryDate
                ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })
                : '2-3 Business Days'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {order && (
            <button
              onClick={() => onNavigate('order-detail', { id: order._id })}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Track Consignment</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('catalog')}
            className="px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Items Preview & Shipping Destination */}
      {order && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-xs space-y-2">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-orange-600" />
              <span>Delivery Destination</span>
            </h3>
            <div className="font-bold text-slate-900 text-sm">{order.shippingAddress.fullName}</div>
            <p className="text-slate-600 leading-relaxed">
              {order.shippingAddress.addressLine}, {order.shippingAddress.locality ? `${order.shippingAddress.locality}, ` : ''}
              {order.shippingAddress.city}, {order.shippingAddress.state} - <strong>{order.shippingAddress.pincode}</strong>
            </p>
            <div className="text-slate-500 font-medium">
              Contact: <span className="font-bold text-slate-800">{order.shippingAddress.phone}</span>
            </div>
          </div>

          {/* Consignment Items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-orange-600" />
              <span>Ordered Items ({order.items.length})</span>
            </h3>
            <div className="divide-y divide-slate-100 space-y-2">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3 pt-2 first:pt-0">
                  <img src={it.image} alt={it.title} className="w-10 h-10 object-contain rounded-lg border border-slate-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{it.title}</div>
                    <div className="text-[11px] text-slate-400">Qty: {it.quantity} &bull; ₹{it.price.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="font-bold text-slate-900">₹{(it.price * it.quantity).toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
