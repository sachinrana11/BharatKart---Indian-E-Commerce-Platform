import React, { useState, useEffect } from 'react';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Truck,
  RefreshCw,
  Star,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Award,
} from 'lucide-react';
import { Product, Banner, FlashSale } from '../types.js';
import { ProductCard } from '../components/ProductCard.js';
import { SEOHead } from '../components/SEOHead.js';

interface HomePageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const [flashProducts, setFlashProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Flash sale countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 32,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial home data
  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        // Load banners & flash sale
        const [bannersRes, flashRes, productsRes] = await Promise.all([
          fetch('/api/products/meta/banners'),
          fetch('/api/products/meta/flash-sale'),
          fetch('/api/products?limit=20'),
        ]);

        const bannersJson = await bannersRes.json();
        const flashJson = await flashRes.json();
        const productsJson = await productsRes.json();

        if (bannersJson.success) setBanners(bannersJson.data);
        if (flashJson.success && flashJson.data) {
          setFlashSale(flashJson.data.sale);
          setFlashProducts(flashJson.data.products || []);
        }
        if (productsJson.success && Array.isArray(productsJson.data)) {
          const prods: Product[] = productsJson.data;
          setFeaturedProducts(prods.filter(p => p.isFeatured || p.rating >= 4.5).slice(0, 8));
          setBestSellers(prods.filter(p => p.isBestSeller || p.reviewCount > 1000).slice(0, 8));
        }
      } catch (err) {
        console.error('Failed to load homepage content:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  // Auto-advance banner
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const categoryCards = [
    {
      name: 'Electronics & Audio',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80',
      category: 'Electronics & Gadgets',
      badge: 'Up to 70% Off',
    },
    {
      name: 'Indian Ethnic Fashion',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=80',
      category: 'Indian Ethnic & Modern Fashion',
      badge: 'Festive Handlooms',
    },
    {
      name: 'Traditional Home & Kitchen',
      image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&auto=format&fit=crop&q=80',
      category: 'Home & Kitchen',
      badge: 'Cast Iron & Brass',
    },
    {
      name: 'Ayurvedic Beauty & Wellness',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
      category: 'Ayurvedic Beauty & Wellness',
      badge: 'Pure Herbs & Haldi',
    },
    {
      name: 'Kashmiri Kesar & Spices',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
      category: 'Spices, Dry Fruits & Sweets',
      badge: '100% Certified GI-Tag',
    },
  ];

  return (
    <div className="space-y-10 pb-16">
      <SEOHead
        title="BharatKart | India's Premier Online Store - Electronics, Ethnic Fashion, Spices & Ayurveda"
        description="Shop 100% authentic Indian products with instant UPI payment, cash on delivery, and 2-day delivery across 19,000+ Indian PIN codes."
      />

      {/* 1. Hero Banner Carousel */}
      <section className="relative overflow-hidden bg-slate-900 rounded-3xl mx-4 sm:mx-8 shadow-xl mt-4">
        {banners.length > 0 ? (
          <div className="relative min-h-[380px] sm:min-h-[460px] flex items-center">
            {banners.map((banner, idx) => (
              <div
                key={banner._id}
                className={`absolute inset-0 transition-opacity duration-700 flex flex-col md:flex-row items-center justify-between p-8 sm:p-14 ${
                  idx === currentBannerIdx ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent z-10"></div>
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-40 mix-blend-overlay"
                />

                {/* Banner Content */}
                <div className="relative z-20 max-w-xl text-white">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-600 text-white mb-4 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    {banner.badge || 'EXCLUSIVE INDIAN DHAMAKA'}
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-3">
                    {banner.title}
                  </h1>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                    {banner.subtitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => onNavigate('catalog')}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm transition-all shadow-lg flex items-center gap-2 group"
                    >
                      <span>{banner.ctaText || 'Shop Collection'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => onNavigate('catalog', { isBestSeller: 'true' })}
                      className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-xs transition-colors border border-white/20"
                    >
                      Explore Best Sellers
                    </button>
                  </div>
                </div>

                {/* Right side floating hero badge */}
                <div className="relative z-20 hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center text-white">
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
                    Special Offer
                  </div>
                  <div className="text-4xl font-black mb-1">Extra 10% OFF</div>
                  <div className="text-xs text-slate-200">On all Prepaid UPI / RuPay Orders</div>
                  <div className="mt-3 px-3 py-1 bg-amber-400 text-slate-950 text-xs font-black rounded-lg">
                    Code: BHARAT10
                  </div>
                </div>
              </div>
            ))}

            {/* Carousel Controls */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentBannerIdx((currentBannerIdx - 1 + banners.length) % banners.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition-all"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentBannerIdx((currentBannerIdx + 1) % banners.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition-all"
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBannerIdx(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentBannerIdx ? 'w-6 bg-orange-500' : 'w-2 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-white">
            <h1 className="text-3xl font-black">BharatKart Indian Marketplace</h1>
            <p className="text-sm text-slate-300 mt-2">Connecting India to Authentic Quality & Innovation</p>
          </div>
        )}
      </section>

      {/* 2. Trust Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Pan-India Delivery</div>
              <div className="text-[11px] text-slate-500">19,000+ PIN Codes Covered</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">100% Genuine Brands</div>
              <div className="text-[11px] text-slate-500">Direct from Indian Makers</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">7 Days Easy Return</div>
              <div className="text-[11px] text-slate-500">Doorstep pickup & instant refund</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">COD Available</div>
              <div className="text-[11px] text-slate-500">Pay on Delivery via Cash / UPI</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Flash Sale Section with Countdown Timer */}
      <section id="flash-sale" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
                  <Zap className="w-5 h-5 fill-amber-300 text-amber-300 animate-pulse" />
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {flashSale?.title || 'Flash Sale Dhamaka'}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-rose-100">
                {flashSale?.subtitle || 'Grab heavy discounts on popular electronics and festive ethnic wear before stock runs out.'}
              </p>
            </div>

            {/* Countdown Box */}
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 self-start md:self-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 mr-1">
                Ends In:
              </span>
              <div className="flex items-center gap-1.5 font-mono font-black text-sm">
                <span className="bg-black/50 px-2.5 py-1.5 rounded-lg">{timeLeft.hours.toString().padStart(2, '0')}h</span>
                <span>:</span>
                <span className="bg-black/50 px-2.5 py-1.5 rounded-lg">{timeLeft.minutes.toString().padStart(2, '0')}m</span>
                <span>:</span>
                <span className="bg-black/50 px-2.5 py-1.5 rounded-lg text-amber-300">{timeLeft.seconds.toString().padStart(2, '0')}s</span>
              </div>
            </div>
          </div>

          {/* Flash Sale Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flashProducts.slice(0, 4).map(prod => (
              <ProductCard
                key={prod._id}
                product={prod}
                onSelectProduct={slug => onNavigate('product-detail', { slug })}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Shop by Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Explore Popular Categories
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Carefully curated collections crafted for Indian households</p>
          </div>
          <button
            onClick={() => onNavigate('catalog')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categoryCards.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate('catalog', { category: cat.category })}
              className="group relative rounded-2xl overflow-hidden cursor-pointer border border-slate-200 bg-white hover:border-orange-500 hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                />
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                  {cat.name}
                </h3>
                <span className="inline-block mt-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-max">
                  {cat.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Featured Trending Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Trending & Featured Products
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Top-rated items handpicked for quality, durability, and Indian value</p>
          </div>
          <button
            onClick={() => onNavigate('catalog', { isFeatured: 'true' })}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
          >
            <span>Browse All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {featuredProducts.map(prod => (
            <ProductCard
              key={prod._id}
              product={prod}
              onSelectProduct={slug => onNavigate('product-detail', { slug })}
            />
          ))}
        </div>
      </section>

      {/* 6. Promotional Handloom Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-900 via-orange-950 to-slate-950 text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 border border-amber-800/40">
          <div className="max-w-lg">
            <span className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
              Heritage Handloom Collection
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-3">
              Pure Silk Sarees & Handcrafted Kurtas
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
              Sourced directly from master weavers of Varanasi, Kanchipuram, and Chanderi. Certified Silk Mark India authenticity with uncompromised zari craft.
            </p>
            <button
              onClick={() => onNavigate('catalog', { category: 'Indian Ethnic & Modern Fashion' })}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md"
            >
              Explore Ethnic Wardrobe
            </button>
          </div>

          <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/30">
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80"
              alt="Indian Silk Sarees"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 7. Best Sellers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Customer Best Sellers
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Most loved items with verified positive feedback across India</p>
          </div>
          <button
            onClick={() => onNavigate('catalog', { isBestSeller: 'true' })}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
          >
            <span>See Best Sellers</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {bestSellers.map(prod => (
            <ProductCard
              key={prod._id}
              product={prod}
              onSelectProduct={slug => onNavigate('product-detail', { slug })}
            />
          ))}
        </div>
      </section>

      {/* 8. Customer Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Loved by Shoppers Across India
          </h2>
          <p className="text-xs text-slate-500 mt-1">Real experiences from customers in Mumbai, Delhi, Bengaluru, and tier-2/3 cities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              "The boAt Airdopes arrived in Pune in just 24 hours! UPI payment was smooth with instant verification on the website, and the sound quality is mindblowing for the price."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs">
                AK
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Aditya Kulkarni</div>
                <div className="text-[10px] text-slate-500">Pune, Maharashtra &bull; Verified Buyer</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              "Ordered the Pure Banarasi Silk Saree for my sister's wedding. The fabric drape and golden zari work are truly authentic. Love the Silk Mark guarantee card inside the package!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                PS
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Pooja Sengupta</div>
                <div className="text-[10px] text-slate-500">Kolkata, West Bengal &bull; Verified Buyer</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              "The Kashmiri Mongra Kesar is 100% genuine. The aroma and deep saffron color when infused in milk is outstanding. BharatKart is now my go-to for traditional Indian items."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                RR
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Dr. Rajesh Rao</div>
                <div className="text-[10px] text-slate-500">Bengaluru, Karnataka &bull; Verified Buyer</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
