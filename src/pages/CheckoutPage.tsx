import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  CreditCard,
  ShieldCheck,
  Plus,
  Check,
  Smartphone,
  Building,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { usePincode } from '../context/PincodeContext.js';
import { useToast } from '../context/ToastContext.js';
import { Address } from '../types.js';
import { UpiPaymentModal } from '../components/UpiPaymentModal.js';
import { SEOHead } from '../components/SEOHead.js';
import { ordersApi, userApi, checkoutApi, paymentsApi, ApiError } from '../services/api.js';

interface CheckoutPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { cart, clearCart } = useCart();
  const { user, token } = useAuth();
  const { deliveryInfo } = usePincode();
  const { showToast } = useToast();

  // Steps state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(false);
  const [deliverySpeed, setDeliverySpeed] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<'UPI_QR' | 'RAZORPAY_SIMULATED' | 'NET_BANKING' | 'COD'>('UPI_QR');
  const [selectedBank, setSelectedBank] = useState<string>('HDFC');

  // Loading & Modal state
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);
  const [upiModalOpen, setUpiModalOpen] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // New address form fields
  const [newAddress, setNewAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    alternatePhone: '',
    pincode: deliveryInfo.pincode || '400001',
    locality: '',
    addressLine: '',
    city: deliveryInfo.city || 'Mumbai',
    state: deliveryInfo.state || 'Maharashtra',
    landmark: '',
    type: 'HOME' as 'HOME' | 'WORK',
  });

  // Load user addresses
  const loadAddresses = async () => {
    if (!token) return;
    try {
      const data = await userApi.getAddresses();
      if (Array.isArray(data) && data.length > 0) {
        setAddresses(data);
        const def = data.find((a: Address) => a.isDefault) || data[0];
        setSelectedAddressId(def._id);
      } else {
        setShowNewAddressForm(true);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setShowNewAddressForm(true);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [token]);

  // Handle PIN code lookup when typing in address form
  const handlePincodeChange = async (pin: string) => {
    setNewAddress(prev => ({ ...prev, pincode: pin }));
    if (pin.length === 6 && !isNaN(Number(pin))) {
      try {
        const info = await checkoutApi.checkPincode(pin);
        if (info && info.city && info.state) {
          setNewAddress(prev => ({
            ...prev,
            city: info.city,
            state: info.state,
          }));
        }
      } catch (e) {
        // silent fallback
      }
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.fullName || !newAddress.phone || !newAddress.pincode || !newAddress.addressLine) {
      showToast('Please fill all mandatory address fields', 'error');
      return;
    }

    try {
      const savedAddress = await userApi.addAddress(newAddress);
      if (savedAddress) {
        setAddresses(prev => [savedAddress, ...prev]);
        setSelectedAddressId(savedAddress._id);
        setShowNewAddressForm(false);
        showToast('Address saved successfully!', 'success');
      }
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Error saving address';
      showToast(message, 'error');
    }
  };

  // Calculate pricing breakdown
  const subtotal = cart?.subtotal || 0;
  const baseShipping = subtotal >= 499 ? 0 : 49;
  const speedShipping = deliverySpeed === 'EXPRESS' ? 99 : 0;
  const codFee = paymentMethod === 'COD' && subtotal < 1000 ? 30 : 0;
  const totalShipping = baseShipping + speedShipping + codFee;
  const couponDiscount = cart?.couponDiscount || 0;
  const totalAmount = Math.max(0, subtotal - couponDiscount) + totalShipping;

  const handlePlaceOrder = async () => {
    const activeAddress = addresses.find(a => a._id === selectedAddressId);
    if (!activeAddress) {
      showToast('Please select or add a delivery address', 'warning');
      return;
    }

    if (!cart?.items || cart.items.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    setPlacingOrder(true);
    try {
      const order = await ordersApi.createOrder({
        shippingAddress: activeAddress,
        items: cart.items,
        couponCode: cart.couponCode,
        deliverySpeed,
        paymentMethod,
      });

      if (order && order._id) {
        setCreatedOrder(order);

        if (paymentMethod === 'COD') {
          showToast('Order confirmed with Cash on Delivery!', 'success');
          await clearCart();
          onNavigate('order-success', { orderId: order._id, orderNumber: order.orderNumber });
        } else if (paymentMethod === 'UPI_QR') {
          // Open dynamic UPI modal
          setUpiModalOpen(true);
        } else {
          // Cards / Net Banking simulated gateway
          // Trigger backend verification directly
          const verifyResult = await paymentsApi.verifyPayment({
            paymentId: `PAY-GATEWAY-${Date.now()}`,
            orderId: order._id,
          });

          if (verifyResult) {
            await clearCart();
            onNavigate('order-success', { orderId: order._id, orderNumber: order.orderNumber });
          } else {
            showToast('Card / Netbanking transaction could not be verified', 'error');
          }
        }
      }
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Error processing checkout';
      showToast(message, 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleUpiSuccess = async (payment: any) => {
    setUpiModalOpen(false);
    await clearCart();
    if (createdOrder) {
      onNavigate('order-success', { orderId: createdOrder._id, orderNumber: createdOrder.orderNumber });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEOHead title="Secure Checkout | BharatKart" />

      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Express Checkout</h1>
        <p className="text-xs text-slate-500">
          Complete your order in 3 simple steps with guaranteed Indian buyer protection
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Delivery Address */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-black">
                  1
                </div>
                <h2 className="text-base font-bold text-slate-900">Delivery Address</h2>
              </div>
              {!showNewAddressForm && (
                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(true)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add New Address
                </button>
              )}
            </div>

            {/* Existing Addresses */}
            {!showNewAddressForm && addresses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map(addr => (
                  <div
                    key={addr._id}
                    onClick={() => setSelectedAddressId(addr._id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedAddressId === addr._id
                        ? 'border-orange-600 bg-orange-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">{addr.fullName}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {addr.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">
                      {addr.addressLine}, {addr.locality ? `${addr.locality}, ` : ''}
                      {addr.city}, {addr.state} - <strong className="text-slate-900">{addr.pincode}</strong>
                    </p>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Phone: <span className="text-slate-800 font-bold">{addr.phone}</span>
                    </div>
                    {selectedAddressId === addr._id && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New Address Form */}
            {showNewAddressForm && (
              <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newAddress.fullName}
                      onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })}
                      placeholder="First and last name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">10-Digit Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={newAddress.phone}
                      onChange={e => setNewAddress({ ...newAddress, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">6-digit PIN Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={newAddress.pincode}
                      onChange={e => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 400001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City / District *</label>
                    <input
                      type="text"
                      required
                      value={newAddress.city}
                      onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={newAddress.state}
                      onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Flat, House no., Building, Apartment *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.addressLine}
                    onChange={e => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                    placeholder="e.g. Flat 402, Shivam Residency, MG Road"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Area, Colony, Street, Sector</label>
                    <input
                      type="text"
                      value={newAddress.locality}
                      onChange={e => setNewAddress({ ...newAddress, locality: e.target.value })}
                      placeholder="e.g. Bandra West"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      value={newAddress.landmark}
                      onChange={e => setNewAddress({ ...newAddress, landmark: e.target.value })}
                      placeholder="e.g. Near ICICI Bank ATM"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs font-semibold text-slate-700">Address Type:</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="addrType"
                      checked={newAddress.type === 'HOME'}
                      onChange={() => setNewAddress({ ...newAddress, type: 'HOME' })}
                    />
                    <span>Home (All day delivery)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="addrType"
                      checked={newAddress.type === 'WORK'}
                      onChange={() => setNewAddress({ ...newAddress, type: 'WORK' })}
                    />
                    <span>Work (10 AM - 6 PM)</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold"
                  >
                    Save &amp; Deliver Here
                  </button>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(false)}
                      className="px-4 py-2.5 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Step 2: Delivery Speed */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-black">
                2
              </div>
              <h2 className="text-base font-bold text-slate-900">Delivery Speed</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setDeliverySpeed('STANDARD')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                  deliverySpeed === 'STANDARD'
                    ? 'border-orange-600 bg-orange-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Truck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Standard Delivery</span>
                    <span className="text-xs font-black text-emerald-700">
                      {subtotal >= 499 ? 'FREE' : '₹49'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Delivered in 2-3 business days via {deliveryInfo.courierPartner}
                  </p>
                </div>
              </label>

              <label
                onClick={() => setDeliverySpeed('EXPRESS')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                  deliverySpeed === 'EXPRESS'
                    ? 'border-orange-600 bg-orange-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  ⚡
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Express Air Delivery</span>
                    <span className="text-xs font-black text-slate-900">₹99</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Priority flight cargo dispatch. Delivered in 24 - 48 Hours.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Step 3: Payment Options */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-black">
                3
              </div>
              <h2 className="text-base font-bold text-slate-900">Select Indian Payment Mode</h2>
            </div>

            <div className="space-y-3">
              {/* 1. UPI QR */}
              <label
                onClick={() => setPaymentMethod('UPI_QR')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start gap-3.5 transition-all ${
                  paymentMethod === 'UPI_QR'
                    ? 'border-orange-600 bg-orange-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'UPI_QR'}
                  onChange={() => setPaymentMethod('UPI_QR')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">UPI Instant QR (Recommended)</span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        Fastest
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">GPay &bull; PhonePe &bull; Paytm</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Scan dynamic QR code on screen from any UPI application with instant payment confirmation.
                  </p>
                </div>
              </label>

              {/* 2. Cards / Razorpay Gateway */}
              <label
                onClick={() => setPaymentMethod('RAZORPAY_SIMULATED')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start gap-3.5 transition-all ${
                  paymentMethod === 'RAZORPAY_SIMULATED'
                    ? 'border-orange-600 bg-orange-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'RAZORPAY_SIMULATED'}
                  onChange={() => setPaymentMethod('RAZORPAY_SIMULATED')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Credit / Debit Card (Razorpay)</span>
                    <span className="text-xs font-semibold text-slate-500">RuPay &bull; Visa &bull; Mastercard</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    All Indian domestic debit and credit cards supported with 3D Secure OTP verification.
                  </p>
                </div>
              </label>

              {/* 3. Net Banking */}
              <label
                onClick={() => setPaymentMethod('NET_BANKING')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start gap-3.5 transition-all ${
                  paymentMethod === 'NET_BANKING'
                    ? 'border-orange-600 bg-orange-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'NET_BANKING'}
                  onChange={() => setPaymentMethod('NET_BANKING')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Net Banking</span>
                    <span className="text-xs font-semibold text-slate-500">SBI, HDFC, ICICI, Axis</span>
                  </div>
                  {paymentMethod === 'NET_BANKING' && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {['HDFC', 'SBI', 'ICICI', 'AXIS', 'KOTAK'].map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedBank(b);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            selectedBank === b
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {b} Bank
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              {/* 4. Cash on Delivery (COD) */}
              <label
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start gap-3.5 transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-orange-600 bg-orange-50/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Cash on Delivery (COD)</span>
                    <span className="text-xs font-semibold text-emerald-700">Eligible</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pay with cash or UPI QR directly to the delivery executive upon arrival at your doorstep.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Sticky Order Summary */}
        <div className="space-y-4 sticky top-24">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
              Order Summary ({cart?.items?.reduce((s, i) => s + i.quantity, 0)} items)
            </h3>

            {/* Items mini list */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1 divide-y divide-slate-100">
              {cart?.items?.map(it => (
                <div key={it.productId} className="flex items-center gap-3 pt-2 first:pt-0">
                  <img src={it.image} alt={it.title} className="w-10 h-10 object-contain rounded-lg border border-slate-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{it.title}</div>
                    <div className="text-[11px] text-slate-400">
                      Qty: {it.quantity} &bull; ₹{it.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon ({cart?.couponCode})</span>
                  <span>- ₹{couponDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Shipping ({deliverySpeed === 'EXPRESS' ? 'Express' : 'Standard'})</span>
                <span>{totalShipping === 0 ? <span className="text-emerald-700 font-bold uppercase">Free</span> : `₹${totalShipping}`}</span>
              </div>

              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>18% GST (Tax)</span>
                <span>Included (₹{Math.round((subtotal * 0.18) / 1.18).toLocaleString('en-IN')})</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-900">Total Payable</span>
                <span className="text-2xl font-black text-slate-900">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              type="button"
              disabled={placingOrder || !selectedAddressId}
              onClick={handlePlaceOrder}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placingOrder ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Confirming Order...</span>
                </>
              ) : paymentMethod === 'UPI_QR' ? (
                <span>Proceed to UPI Payment &rarr;</span>
              ) : paymentMethod === 'COD' ? (
                <span>Confirm Cash on Delivery Order &rarr;</span>
              ) : (
                <span>Pay ₹{totalAmount.toLocaleString('en-IN')} &rarr;</span>
              )}
            </button>

            <div className="p-3 bg-slate-50 rounded-xl text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>BharatKart 100% Purchase Guarantee</span>
              </div>
              <p className="text-[10px] text-slate-400">
                7 Days Easy Doorstep Returns with Full Refund Protection
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic UPI Payment Modal */}
      {createdOrder && (
        <UpiPaymentModal
          isOpen={upiModalOpen}
          onClose={() => setUpiModalOpen(false)}
          orderId={createdOrder._id}
          orderNumber={createdOrder.orderNumber}
          amount={createdOrder.totalAmount}
          onSuccess={handleUpiSuccess}
        />
      )}
    </div>
  );
};
