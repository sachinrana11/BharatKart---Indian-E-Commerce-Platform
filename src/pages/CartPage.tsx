import React, { useState } from 'react';
import {
  Trash2,
  Tag,
  ShieldCheck,
  Truck,
  ArrowRight,
  ShoppingBag,
  Percent,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { usePincode } from '../context/PincodeContext.js';
import { SEOHead } from '../components/SEOHead.js';

interface CartPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { cart, updateQuantity, removeFromCart, applyCoupon, removeCoupon } = useCart();
  const { deliveryInfo } = usePincode();
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const availableCoupons = [
    { code: 'WELCOME100', desc: 'Flat ₹100 Off on orders above ₹499' },
    { code: 'BHARAT15', desc: '15% Off (up to ₹300) on orders above ₹799' },
    { code: 'FESTIVE500', desc: 'Flat ₹500 Off on orders above ₹2,499' },
  ];

  const handleApplyCoupon = async (code: string) => {
    setCouponLoading(true);
    await applyCoupon(code);
    setCouponLoading(false);
    setCouponCodeInput('');
  };

  const totalMrp = cart?.items?.reduce((sum, item) => sum + (item.mrp || item.price) * item.quantity, 0) || 0;
  const productDiscount = Math.max(0, totalMrp - (cart?.subtotal || 0));
  const totalSavings = productDiscount + (cart?.couponDiscount || 0);

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <SEOHead title="Your Shopping Cart | BharatKart" />
        <div className="w-20 h-20 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-3xl">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Your BharatKart Cart is Empty</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Explore today's festival dhamaka deals, authentic Indian electronics, handloom fashion, and pure spices.
        </p>
        <button
          onClick={() => onNavigate('catalog')}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md"
        >
          Explore Trending Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SEOHead title={`Shopping Cart (${cart.items.length} items) | BharatKart`} />

      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Shopping Cart ({cart.items.reduce((s, i) => s + i.quantity, 0)} Items)
        </h1>
        <p className="text-xs text-slate-500">
          Items in your cart are reserved while you browse. Free delivery on orders over ₹499.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map(item => (
            <div
              key={`${item.productId}-${item.variantKey || 'def'}`}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xs"
            >
              {/* Product Thumbnail */}
              <div
                onClick={() => onNavigate('product-detail', { slug: item.productId })}
                className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-xl p-2 shrink-0 border border-slate-100 cursor-pointer overflow-hidden"
              >
                <img src={item.image} alt={item.title} className="w-full h-full object-contain mix-blend-multiply" />
              </div>

              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <h3
                  onClick={() => onNavigate('product-detail', { slug: item.productId })}
                  className="text-xs sm:text-sm font-bold text-slate-900 hover:text-orange-600 transition-colors line-clamp-2 cursor-pointer leading-snug"
                >
                  {item.title}
                </h3>

                {item.variantDetails && (
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Variant: <span className="text-slate-800 font-semibold">{item.variantDetails}</span>
                  </div>
                )}

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-base font-black text-slate-900">
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                  {item.mrp && item.mrp > item.price && (
                    <span className="text-xs text-slate-400 line-through">
                      ₹{item.mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Adjuster & Remove */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantKey)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 text-xs font-bold rounded-l-xl"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-black text-slate-900 min-w-[1.8rem] text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantKey)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 text-xs font-bold rounded-r-xl"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId, item.variantKey)}
                  className="text-slate-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>
          ))}

          {/* Delivery Note */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-950">
              <span className="font-bold">Delivering to {deliveryInfo.city} ({deliveryInfo.pincode})</span>
              <span className="block text-emerald-800 text-[11px] mt-0.5">
                Estimated Delivery in {deliveryInfo.estimatedDays} business days via {deliveryInfo.courierPartner}.
              </span>
            </div>
          </div>
        </div>

        {/* Right: Coupon & Price Summary */}
        <div className="space-y-4">
          {/* Coupon Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Percent className="w-4 h-4 text-orange-600" />
              <span>Apply Indian Festival Coupon</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCodeInput}
                onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                disabled={!couponCodeInput.trim() || couponLoading}
                onClick={() => handleApplyCoupon(couponCodeInput.trim())}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
            </div>

            {/* Active Coupon Banner */}
            {cart.couponCode && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Coupon {cart.couponCode} applied!</span>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-rose-600 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Quick-Apply Available Coupons */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Offers</span>
              {availableCoupons.map(cp => (
                <div
                  key={cp.code}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-orange-600 block">{cp.code}</span>
                    <span className="text-[11px] text-slate-500">{cp.desc}</span>
                  </div>
                  <button
                    type="button"
                    disabled={couponLoading || cart.couponCode === cp.code}
                    onClick={() => handleApplyCoupon(cp.code)}
                    className="text-xs font-bold text-slate-800 hover:text-orange-600 disabled:opacity-40"
                  >
                    {cart.couponCode === cp.code ? 'Applied' : 'Apply'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
              Price Details
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total MRP</span>
                <span>₹{totalMrp.toLocaleString('en-IN')}</span>
              </div>

              {productDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Product Discount</span>
                  <span>- ₹{productDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              {cart.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Savings ({cart.couponCode})</span>
                  <span>- ₹{cart.couponDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Delivery Charges</span>
                <span>
                  {cart.shipping === 0 ? (
                    <span className="text-emerald-700 font-bold uppercase">Free</span>
                  ) : (
                    `₹${cart.shipping}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Estimated GST (18%)</span>
                <span>Included (₹{(cart.tax || 0).toLocaleString('en-IN')})</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-900">Total Payable</span>
                <span className="text-xl font-black text-slate-900">
                  ₹{(cart.total || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {totalSavings > 0 && (
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-center font-bold text-xs">
                  🎉 You are saving ₹{totalSavings.toLocaleString('en-IN')} on this order!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('checkout')}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Safe &amp; 256-Bit Encrypted Indian Checkout
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
