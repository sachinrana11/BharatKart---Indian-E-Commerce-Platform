import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  User as UserIcon,
  MapPin,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  LogOut,
  Package,
  LayoutDashboard,
  Menu,
  X,
  Zap,
  Headphones,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useWishlist } from '../context/WishlistContext.js';
import { usePincode } from '../context/PincodeContext.js';
import { UserRole } from '../types.js';
import { productsApi } from '../services/api.js';

interface HeaderProps {
  onNavigate: (view: string, params?: any) => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentView }) => {
  const { user, isAuthenticated, isAdmin, isSuperAdmin, logout, quickDemoLogin } = useAuth();
  const { itemCount, cart } = useCart();
  const { wishlistIds } = useWishlist();
  const { deliveryInfo, openModal } = usePincode();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search autocomplete debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const list = await productsApi.autocomplete(searchQuery);
        if (Array.isArray(list)) {
          setSuggestions(list);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      onNavigate('catalog', { q: searchQuery.trim() });
    }
  };

  const handleSelectSuggestion = (product: any) => {
    setShowSuggestions(false);
    setSearchQuery('');
    onNavigate('product-detail', { slug: product.slug || product._id });
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* 1. Top Offer Announcement & Demo Role Switcher */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-orange-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded tracking-wide uppercase">
              Maha Utsav
            </span>
            <span className="hidden sm:inline text-slate-300">
              🇮🇳 Flat 10% Off via UPI &bull; Free 2-Day Delivery on ₹499+ &bull; Cash on Delivery Available
            </span>
            <span className="sm:hidden text-slate-300">
              Free Express Delivery on ₹499+
            </span>
          </div>

          {/* Quick Demo Role Switcher for seamless testing */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-medium">Demo Role:</span>
            <button
              onClick={() => quickDemoLogin('CUSTOMER')}
              className={`px-2 py-0.5 rounded transition-all font-medium ${
                user?.role === 'CUSTOMER'
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => quickDemoLogin('ADMIN')}
              className={`px-2 py-0.5 rounded transition-all font-medium ${
                user?.role === 'ADMIN'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Store Admin
            </button>
            <button
              onClick={() => quickDemoLogin('SUPER_ADMIN')}
              className={`px-2 py-0.5 rounded transition-all font-medium ${
                user?.role === 'SUPER_ADMIN'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Super Admin
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4 sm:gap-6">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-slate-700 hover:text-slate-900 p-1"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div
              onClick={() => onNavigate('home')}
              className="cursor-pointer flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
                B
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-xl font-black tracking-tight text-slate-900">Bharat</span>
                  <span className="text-xl font-black tracking-tight text-orange-600">Kart</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block mt-0.5">
                  India's Store
                </span>
              </div>
            </div>
          </div>

          {/* Location Delivery Selector */}
          <button
            onClick={openModal}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all text-left group"
          >
            <MapPin className="w-4 h-4 text-orange-600 shrink-0 group-hover:animate-bounce" />
            <div className="text-xs">
              <span className="text-slate-400 block font-medium">Deliver to</span>
              <span className="font-bold text-slate-800 line-clamp-1">
                {deliveryInfo.city} {deliveryInfo.pincode}
              </span>
            </div>
          </button>

          {/* Search Bar with Autocomplete */}
          <div ref={searchRef} className="flex-1 max-w-xl relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search products, brands (boAt, Noise, FabIndia, Kesar)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  Matching Products
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {suggestions.map(sug => (
                    <div
                      key={sug._id}
                      onClick={() => handleSelectSuggestion(sug)}
                      className="flex items-center gap-3 p-3 hover:bg-orange-50/70 cursor-pointer transition-colors"
                    >
                      <img
                        src={sug.thumbnail}
                        alt={sug.title}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{sug.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{sug.brand}</span>
                          <span>&bull;</span>
                          <span className="font-semibold text-slate-800">₹{sug.price.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Icons: Wishlist, Cart, User Account, Admin Quick Button */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Wishlist */}
            <button
              onClick={() => onNavigate('wishlist')}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1.5 transition-colors relative ${
                currentView === 'wishlist' ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Saved Wishlist"
            >
              <Heart className="w-5 h-5" />
              <span className="hidden md:inline text-xs font-semibold">Wishlist</span>
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            {/* Shopping Cart */}
            <button
              onClick={() => onNavigate('cart')}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl flex items-center gap-2 transition-colors relative ${
                currentView === 'cart' ? 'bg-orange-600 text-white shadow-sm' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              <div className="hidden sm:block text-left leading-none">
                <span className="text-[10px] uppercase font-bold opacity-80 block">Cart</span>
                <span className="text-xs font-extrabold">
                  {itemCount > 0 ? `₹${(cart?.total || 0).toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Admin Switch Shortcut if user is Admin */}
            {isAdmin && (
              <button
                onClick={() => onNavigate(currentView.startsWith('admin') ? 'home' : 'admin-dashboard')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{currentView.startsWith('admin') ? 'Customer View' : 'Admin Panel'}</span>
              </button>
            )}

            {/* User Account Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-slate-300" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="hidden md:block leading-none">
                  <span className="text-[10px] text-slate-400 block font-medium">Hello,</span>
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {user ? user.name.split(' ')[0] : 'Sign In'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 divide-y divide-slate-100"
                >
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-2.5">
                        <div className="font-bold text-sm text-slate-900 line-clamp-1">{user?.name}</div>
                        <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                        <div className="mt-1">
                          <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                            {user?.role}
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('profile');
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          My Profile & Addresses
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('orders');
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Package className="w-4 h-4 text-slate-400" />
                          My Orders & Returns
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('wishlist');
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Heart className="w-4 h-4 text-slate-400" />
                          My Wishlist
                        </button>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            window.dispatchEvent(new CustomEvent('open-support'));
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                        >
                          <Headphones className="w-4 h-4 text-orange-600" />
                          24x7 Help &amp; Live Chat
                        </button>
                      </div>

                      {isAdmin && (
                        <div className="py-1 bg-indigo-50/50">
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onNavigate('admin-dashboard');
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-100/50 flex items-center gap-2"
                          >
                            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                            Admin Control Center
                          </button>
                        </div>
                      )}

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('auth');
                        }}
                        className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold text-center transition-colors"
                      >
                        Sign In / Register
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category & Deals Bar */}
      <div className="hidden lg:block bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs font-medium text-slate-700">
          <div className="flex items-center gap-6 py-2.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => onNavigate('catalog')}
              className={`hover:text-orange-600 font-bold flex items-center gap-1.5 shrink-0 ${
                currentView === 'catalog' ? 'text-orange-600' : ''
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => onNavigate('catalog', { category: 'Electronics & Gadgets' })}
              className="hover:text-orange-600 shrink-0"
            >
              Electronics & Gadgets
            </button>
            <button
              onClick={() => onNavigate('catalog', { category: 'Indian Ethnic & Modern Fashion' })}
              className="hover:text-orange-600 shrink-0"
            >
              Ethnic & Modern Fashion
            </button>
            <button
              onClick={() => onNavigate('catalog', { category: 'Home & Kitchen' })}
              className="hover:text-orange-600 shrink-0"
            >
              Home & Kitchen
            </button>
            <button
              onClick={() => onNavigate('catalog', { category: 'Ayurvedic Beauty & Wellness' })}
              className="hover:text-orange-600 shrink-0"
            >
              Ayurvedic Beauty & Wellness
            </button>
            <button
              onClick={() => onNavigate('catalog', { category: 'Spices, Dry Fruits & Sweets' })}
              className="hover:text-orange-600 shrink-0"
            >
              Kashmiri Kesar & Spices
            </button>
          </div>

          <div className="flex items-center gap-4 py-2">
            <button
              onClick={() => onNavigate('home', { scrollTo: 'flash-sale' })}
              className="flex items-center gap-1 text-orange-600 font-extrabold hover:text-orange-700 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              Flash Sale Dhamaka
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => onNavigate('orders')}
              className="text-slate-600 hover:text-slate-900 shrink-0"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Browse Categories</div>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigate('catalog');
            }}
            className="w-full text-left py-2 text-sm font-bold text-slate-800"
          >
            All Products
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigate('catalog', { category: 'Electronics & Gadgets' });
            }}
            className="w-full text-left py-2 text-sm text-slate-700"
          >
            Electronics & Gadgets
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigate('catalog', { category: 'Indian Ethnic & Modern Fashion' });
            }}
            className="w-full text-left py-2 text-sm text-slate-700"
          >
            Indian Ethnic & Modern Fashion
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigate('catalog', { category: 'Home & Kitchen' });
            }}
            className="w-full text-left py-2 text-sm text-slate-700"
          >
            Home & Kitchen
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigate('catalog', { category: 'Ayurvedic Beauty & Wellness' });
            }}
            className="w-full text-left py-2 text-sm text-slate-700"
          >
            Ayurvedic Beauty & Wellness
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigate('catalog', { category: 'Spices, Dry Fruits & Sweets' });
            }}
            className="w-full text-left py-2 text-sm text-slate-700"
          >
            Spices, Dry Fruits & Sweets
          </button>

          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openModal();
              }}
              className="w-full py-2 text-left text-sm text-orange-600 font-semibold flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Change Location ({deliveryInfo.city} {deliveryInfo.pincode})
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
