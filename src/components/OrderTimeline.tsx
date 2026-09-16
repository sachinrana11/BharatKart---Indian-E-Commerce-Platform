import React from 'react';
import { CheckCircle2, Clock, Truck, Package, Home, XCircle, RefreshCw } from 'lucide-react';
import { OrderTimelineItem, OrderStatus } from '../types.js';

interface OrderTimelineProps {
  timeline: OrderTimelineItem[];
  currentStatus: OrderStatus;
  estimatedDeliveryDate?: string;
  courierPartner?: string;
  trackingNumber?: string;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  timeline = [],
  currentStatus,
  estimatedDeliveryDate,
  courierPartner,
  trackingNumber,
}) => {
  const isCancelled = currentStatus === 'CANCELLED';
  const isReturned = currentStatus === 'RETURNED' || currentStatus === 'RETURN_REQUESTED';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PAYMENT_PENDING':
        return <Clock className="w-4 h-4" />;
      case 'CONFIRMED':
      case 'PROCESSING':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'PACKED':
        return <Package className="w-4 h-4" />;
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return <Truck className="w-4 h-4" />;
      case 'DELIVERED':
        return <Home className="w-4 h-4" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />;
      case 'RETURN_REQUESTED':
      case 'RETURNED':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Shipment Status & Tracking</h3>
          <p className="text-xs text-slate-500 mt-0.5">Live tracking updates from carrier logistics hub</p>
        </div>
        {courierPartner && (
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Carrier Partner</span>
            <span className="text-xs font-bold text-slate-800">{courierPartner}</span>
            {trackingNumber && (
              <span className="text-[11px] text-slate-500 block font-mono">AWB: {trackingNumber}</span>
            )}
          </div>
        )}
      </div>

      {/* Timeline Steps */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {timeline.map((item, idx) => {
          const isLatest = idx === timeline.length - 1;
          const isAlert = item.status === 'CANCELLED' || item.status === 'RETURN_REQUESTED';

          return (
            <div key={idx} className="relative flex items-start gap-4">
              {/* Step indicator node */}
              <div
                className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs z-10 shadow-xs ${
                  isAlert
                    ? 'bg-rose-600 ring-4 ring-rose-100'
                    : isLatest
                    ? 'bg-orange-600 ring-4 ring-orange-100 animate-pulse'
                    : 'bg-emerald-600 ring-4 ring-emerald-50'
                }`}
              >
                {getStatusIcon(item.status)}
              </div>

              {/* Step Content */}
              <div className="flex-1 bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
                <div className="flex flex-wrap items-baseline justify-between gap-1 mb-1">
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }) : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                {item.location && (
                  <span className="inline-block mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                    📍 {item.location}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estimated Delivery Note */}
      {estimatedDeliveryDate && !isCancelled && currentStatus !== 'DELIVERED' && (
        <div className="mt-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-950">Expected Delivery by</div>
              <div className="text-xs font-semibold text-emerald-800">
                {new Date(estimatedDeliveryDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs">
            On Schedule
          </span>
        </div>
      )}
    </div>
  );
};
