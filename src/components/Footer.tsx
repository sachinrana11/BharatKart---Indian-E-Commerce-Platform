import React, { useState } from 'react';
import { ShieldCheck, Truck, RefreshCw, Headphones, Mail, ArrowRight, Heart } from 'lucide-react';
import { useToast } from '../context/ToastContext.js';

interface FooterProps {
  onNavigate: (view: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    showToast('Subscribed to BharatKart Dhamaka offers and updates!', 'success');
    setEmail('');
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      {/* 1. Value Proposition Pillars */}
      <div className="border-b border-slate-800/80 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Free Express Delivery</h4>
                <p className="text-xs text-slate-400 mt-0.5">Across 19,000+ Indian PIN codes on orders above ₹499</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">100% Authentic Brands</h4>
                <p className="text-xs text-slate-400 mt-0.5">Direct from verified Indian artisans & certified manufacturers</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">7-Day Easy Returns</h4>
                <p className="text-xs text-slate-400 mt-0.5">Hassle-free doorstep pickup with instant UPI/Bank refund</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">24/7 Dedicated Support</h4>
                <p className="text-xs text-slate-400 mt-0.5">Assistance available in Hindi, English, and regional languages</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Brand info */}
          <div className="lg:col-span-2">
            <div
              onClick={() => onNavigate('home')}
              className="cursor-pointer flex items-center gap-2 mb-3"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-emerald-600 flex items-center justify-center text-white font-black text-lg">
                B
              </div>
              <div className="flex items-center gap-1 leading-none">
                <span className="text-xl font-black tracking-tight text-white">Bharat</span>
                <span className="text-xl font-black tracking-tight text-orange-500">Kart</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-4">
              BharatKart is India's premier indigenous digital marketplace, connecting modern Indian shoppers with authentic local brands, premium consumer electronics, ethnic handlooms, Ayurvedic wellness, and GI-tagged culinary treasures.
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <div>📍 Registered Office: BharatKart Tech Pvt Ltd, Bandra Kurla Complex, Mumbai, MH 400051</div>
              <div>📞 Toll-Free Customer Desk: 1800-209-9988 (9 AM - 9 PM IST)</div>
              <div>✉️ Helpdesk: support@bharatkart.in</div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Popular Categories</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('catalog', { category: 'Electronics & Gadgets' })} className="hover:text-orange-400 transition-colors">
                  Audio & Wireless Earbuds
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog', { category: 'Electronics & Gadgets' })} className="hover:text-orange-400 transition-colors">
                  Smartwatches & Wearables
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog', { category: 'Indian Ethnic & Modern Fashion' })} className="hover:text-orange-400 transition-colors">
                  Banarasi & Kanjeevaram Sarees
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog', { category: 'Indian Ethnic & Modern Fashion' })} className="hover:text-orange-400 transition-colors">
                  Men's Handloom Kurtas
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog', { category: 'Home & Kitchen' })} className="hover:text-orange-400 transition-colors">
                  Cast Iron Cookware & Kadhai
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog', { category: 'Ayurvedic Beauty & Wellness' })} className="hover:text-orange-400 transition-colors">
                  Pure Ayurvedic Ubtan & Kumkumadi
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog', { category: 'Spices, Dry Fruits & Sweets' })} className="hover:text-orange-400 transition-colors">
                  Kashmiri Mongra Kesar
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care & Policies */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Customer Support</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('orders')} className="hover:text-orange-400 transition-colors">
                  Track Your Consignment
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', { slug: 'returns' })} className="hover:text-orange-400 transition-colors">
                  Return & Refund Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', { slug: 'shipping' })} className="hover:text-orange-400 transition-colors">
                  Shipping & PIN Delivery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', { slug: 'terms' })} className="hover:text-orange-400 transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', { slug: 'privacy' })} className="hover:text-orange-400 transition-colors">
                  Privacy Policy & Data Security
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('policy', { slug: 'contact' })} className="hover:text-orange-400 transition-colors">
                  Contact Us / Grievance Redressal
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscription */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Newsletter & Offers</h4>
            <p className="text-xs text-slate-400 mb-3">
              Subscribe to get secret festival coupons, flash sale notifications, and new arrival alerts.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="absolute right-1.5 top-1.5 p-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 block">We respect your privacy. No spam ever.</span>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800/60">
              <div className="text-[11px] font-semibold text-slate-400 mb-2">Accepted Indian Payment Modes</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-bold border border-slate-800">
                  UPI / GPay / PhonePe
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-bold border border-slate-800">
                  RuPay
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-bold border border-slate-800">
                  Visa / Master
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-bold border border-slate-800">
                  NetBanking
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-bold border border-slate-800">
                  Cash on Delivery
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Copyright & Legal */}
      <div className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            &copy; {new Date().getFullYear()} BharatKart Technologies Pvt. Ltd. All rights reserved. Made with pride in India.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>CIN: U74999MH2026PTC123456</span>
            <span>&bull;</span>
            <span>GSTIN: 27AABCB1234F1Z5</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
