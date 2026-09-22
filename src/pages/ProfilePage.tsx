import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Package,
  Phone,
  Mail,
  LogOut,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Address } from '../types.js';
import { SEOHead } from '../components/SEOHead.js';
import { userApi, checkoutApi, ApiError } from '../services/api.js';

interface ProfilePageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, token, logout, loginDemo } = useAuth();
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Address Form
  const [newAddr, setNewAddr] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    alternatePhone: '',
    pincode: '400001',
    locality: '',
    addressLine: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    landmark: '',
    type: 'HOME' as 'HOME' | 'WORK',
  });

  const fetchAddresses = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await userApi.getAddresses();
      if (Array.isArray(data)) {
        setAddresses(data);
      }
    } catch (e) {
      console.error('Failed to load user addresses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [token]);

  const handlePincodeChange = async (pin: string) => {
    setNewAddr(prev => ({ ...prev, pincode: pin }));
    if (pin.length === 6 && !isNaN(Number(pin))) {
      try {
        const info = await checkoutApi.checkPincode(pin);
        if (info && info.city && info.state) {
          setNewAddr(prev => ({
            ...prev,
            city: info.city,
            state: info.state,
          }));
        }
      } catch (e) {
        // silent
      }
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userApi.addAddress(newAddr);
      showToast('Address added successfully', 'success');
      setShowAddModal(false);
      fetchAddresses();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Error saving address';
      showToast(message, 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await userApi.deleteAddress(id);
      showToast('Address deleted', 'info');
      setAddresses(prev => prev.filter(a => a._id !== id));
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Failed to delete address';
      showToast(message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEOHead title="My Account & Profile | BharatKart" />

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">{user?.name}</h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                {user?.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user?.email}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {user?.phone || '+91 98765 43210'}</span>
            </div>
          </div>
        </div>

        {/* Persona quick switch */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Demo Role Switcher</span>
          <div className="flex gap-2">
            <button
              onClick={() => loginDemo('customer')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                user?.role === 'CUSTOMER' ? 'bg-orange-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => loginDemo('admin')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Admin / Super Admin
            </button>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-500 transition-all cursor-pointer shadow-xs flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-orange-600">My Orders</h3>
            <p className="text-[11px] text-slate-500">Track shipments &amp; invoices</p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('wishlist')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-500 transition-all cursor-pointer shadow-xs flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-orange-600">Saved Wishlist</h3>
            <p className="text-[11px] text-slate-500">View favorite saved products</p>
          </div>
        </div>

        {user?.role !== 'CUSTOMER' && (
          <div
            onClick={() => onNavigate('admin')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-500 transition-all cursor-pointer shadow-xs flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-orange-600">Admin Control Center</h3>
              <p className="text-[11px] text-slate-500">Inventory, orders &amp; analytics</p>
            </div>
          </div>
        )}
      </div>

      {/* Saved Addresses Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Manage Saved Addresses</h2>
            <p className="text-xs text-slate-500">All saved addresses for fast Indian checkout</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Address</span>
          </button>
        </div>

        {/* Addresses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map(addr => (
            <div key={addr._id} className="p-4 rounded-2xl border border-slate-200 relative bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{addr.fullName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {addr.type}
                  </span>
                  <button
                    onClick={() => handleDeleteAddress(addr._id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {addr.addressLine}, {addr.locality ? `${addr.locality}, ` : ''}
                {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
              </p>
              <div className="text-[11px] text-slate-500">
                Phone: <strong className="text-slate-800">{addr.phone}</strong>
              </div>
              {addr.isDefault && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                  Default Delivery Address
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Add New Delivery Address</h3>
            <form onSubmit={handleCreateAddress} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={newAddr.fullName}
                  onChange={e => setNewAddr({ ...newAddr, fullName: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit Phone"
                  value={newAddr.phone}
                  onChange={e => setNewAddr({ ...newAddr, phone: e.target.value.replace(/\D/g, '') })}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={newAddr.pincode}
                  onChange={e => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                />
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={newAddr.city}
                  onChange={e => setNewAddr({ ...newAddr, city: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={newAddr.state}
                  onChange={e => setNewAddr({ ...newAddr, state: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <input
                type="text"
                required
                placeholder="Flat, House no., Building, Apartment"
                value={newAddr.addressLine}
                onChange={e => setNewAddr({ ...newAddr, addressLine: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
