import React, { useState, useEffect } from 'react';
import {
  Star,
  Truck,
  ShieldCheck,
  RefreshCw,
  Heart,
  ShoppingCart,
  Zap,
  Check,
  MapPin,
  Clock,
  Award,
  AlertCircle,
  FileText,
  Share2,
} from 'lucide-react';
import { Product, Review } from '../types.js';
import { useCart } from '../context/CartContext.js';
import { useWishlist } from '../context/WishlistContext.js';
import { usePincode } from '../context/PincodeContext.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import { ProductCard } from '../components/ProductCard.js';
import { SEOHead } from '../components/SEOHead.js';
import { productsApi, ApiError } from '../services/api.js';

interface ProductDetailPageProps {
  slug: string;
  onNavigate: (view: string, params?: any) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug, onNavigate }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { pincode: activePincode, deliveryInfo, updatePincode, openModal } = usePincode();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // PIN check inside page
  const [checkPin, setCheckPin] = useState<string>(activePincode);
  const [pinLoading, setPinLoading] = useState<boolean>(false);

  // Review Form
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const json = await productsApi.getDetails(slug);
        if (json && json.success && json.data) {
          const prod: Product = json.data;
          setProduct(prod);
          setSelectedImage(prod.images[0] || prod.thumbnail);
          if (prod.variants && prod.variants.length > 0) {
            setSelectedVariant({
              variantName: prod.variants[0].name,
              optionName: prod.variants[0].options[0].name,
              priceOffset: prod.variants[0].options[0].priceOffset || 0,
            });
          }
          setReviews(json.reviews || []);
          setRelatedProducts(json.related || []);
        }
      } catch (e) {
        console.error('Failed to load product details:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-semibold text-slate-600">Loading authentic product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <p className="text-xs text-slate-500 mb-4">The item you are looking for might have been archived or removed.</p>
        <button
          onClick={() => onNavigate('catalog')}
          className="px-5 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const effectivePrice = product.price + (selectedVariant?.priceOffset || 0);
  const effectiveMrp = product.mrp + (selectedVariant?.priceOffset || 0);
  const savings = Math.max(0, effectiveMrp - effectivePrice);
  const isSaved = isInWishlist(product._id);
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    await addToCart(product._id, quantity, selectedVariant);
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    const added = await addToCart(product._id, quantity, selectedVariant);
    if (added) {
      onNavigate('checkout');
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkPin || checkPin.length !== 6) {
      showToast('Please enter a 6-digit Indian PIN code', 'error');
      return;
    }
    setPinLoading(true);
    await updatePincode(checkPin);
    setPinLoading(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please sign in to share your verified review', 'warning');
      return;
    }
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please provide both title and review comment', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const newReview = await productsApi.addReview(product._id, {
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      });
      if (newReview) {
        setReviews(prev => [newReview, ...prev]);
        showToast('Thank you! Your review has been submitted.', 'success');
        setReviewTitle('');
        setReviewComment('');
      }
    } catch (e: any) {
      const message = e instanceof ApiError ? e.userMessage : e.message || 'Error submitting review';
      showToast(message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      <SEOHead
        title={`${product.title} | Buy Online at BharatKart`}
        description={product.description.slice(0, 160)}
        schema={{
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.title,
          image: product.images,
          description: product.description,
          sku: product.sku,
          brand: {
            '@type': 'Brand',
            name: product.brand,
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: effectivePrice,
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        }}
      />

      {/* Breadcrumb */}
      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
        <span className="cursor-pointer hover:text-orange-600" onClick={() => onNavigate('home')}>Home</span>
        <span>&gt;</span>
        <span className="cursor-pointer hover:text-orange-600" onClick={() => onNavigate('catalog', { category: product.category })}>
          {product.category}
        </span>
        {product.subcategory && (
          <>
            <span>&gt;</span>
            <span className="text-slate-600">{product.subcategory}</span>
          </>
        )}
        <span>&gt;</span>
        <span className="font-semibold text-slate-800 line-clamp-1">{product.title}</span>
      </div>

      {/* Product Primary Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          {/* Main Zoom Preview Container */}
          <div className="relative aspect-square w-full bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden flex items-center justify-center p-6 group">
            <img
              src={selectedImage}
              alt={product.title}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-125 transition-transform duration-300"
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {product.discountPercent > 0 && (
                <span className="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
                  {product.discountPercent}% OFF
                </span>
              )}
              {product.isBestSeller && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                  Best Seller
                </span>
              )}
            </div>

            {/* Wishlist button */}
            <button
              onClick={() => toggleWishlist(product._id)}
              className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-xs transition-all ${
                isSaved ? 'bg-rose-50 text-rose-600 shadow-sm' : 'bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white shadow-xs'
              }`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>

          {/* Thumbnails Row */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-18 h-18 rounded-2xl border-2 p-1 overflow-hidden transition-all shrink-0 ${
                    selectedImage === img ? 'border-orange-600 bg-orange-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={img} alt={`${product.title} view ${idx + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Pricing, Variants, PIN Check & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-50 px-2.5 py-0.5 rounded-md">
                {product.brand}
              </span>
              <span className="text-xs text-slate-400 font-mono">SKU: {product.sku}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {product.title}
            </h1>

            {/* Rating Stars & Count */}
            <div className="flex items-center gap-2.5 mt-2.5">
              <div className="flex items-center gap-1 bg-emerald-700 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                <span>{product.rating.toFixed(1)}</span>
                <Star className="w-3.5 h-3.5 fill-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">
                {product.reviewCount.toLocaleString('en-IN')} verified customer reviews & ratings
              </span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900">
                ₹{effectivePrice.toLocaleString('en-IN')}
              </span>
              {effectiveMrp > effectivePrice && (
                <span className="text-sm text-slate-400 line-through">
                  M.R.P.: ₹{effectiveMrp.toLocaleString('en-IN')}
                </span>
              )}
              {product.discountPercent > 0 && (
                <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Save ₹{savings.toLocaleString('en-IN')} ({product.discountPercent}%)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Inclusive of all taxes &bull; 18% GST invoice provided upon dispatch
            </p>
          </div>

          {/* Variants Selector (Color / Size / Storage) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4">
              {product.variants.map((v, vIdx) => (
                <div key={vIdx}>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Select {v.name}: <span className="text-orange-600 font-extrabold">{selectedVariant?.optionName || v.options[0].name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {v.options.map((opt, optIdx) => {
                      const isSelected = selectedVariant?.optionName === opt.name;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() =>
                            setSelectedVariant({
                              variantName: v.name,
                              optionName: opt.name,
                              priceOffset: opt.priceOffset || 0,
                            })
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-orange-50 border-orange-600 text-orange-700 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {opt.name}
                          {opt.priceOffset ? ` (+₹${opt.priceOffset})` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity and Action Buttons */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Quantity:</span>
              <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-sm font-bold"
                >
                  -
                </button>
                <span className="px-3 py-1.5 text-xs font-bold text-slate-900 min-w-[2rem] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= product.stock}
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-sm font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-slate-500">
                {product.stock > 0 ? (
                  product.stock <= 5 ? (
                    <span className="text-rose-600 font-bold">Only {product.stock} left in stock!</span>
                  ) : (
                    <span className="text-emerald-700 font-medium">In Stock &bull; Ready to ship</span>
                  )
                ) : (
                  <span className="text-rose-600 font-bold">Currently Out of Stock</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-black text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Buy Now</span>
              </button>
            </div>
          </div>

          {/* Delivery & PIN Checker Widget */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-slate-800">Check Delivery & COD Availability</span>
              </div>
              <span className="text-[11px] text-orange-600 font-semibold cursor-pointer hover:underline" onClick={openModal}>
                Select City
              </span>
            </div>

            <form onSubmit={handlePinSubmit} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={checkPin}
                onChange={e => setCheckPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit PIN code"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={pinLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {pinLoading ? 'Checking...' : 'Check'}
              </button>
            </form>

            {deliveryInfo && deliveryInfo.isDeliverable ? (
              <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Deliverable to {deliveryInfo.city}, {deliveryInfo.state}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-3">
                  <span>⏱ Estimated Delivery: <strong>{deliveryInfo.estimatedDays} business days</strong></span>
                  <span>&bull;</span>
                  <span>🚚 Partner: <strong>{deliveryInfo.courierPartner}</strong></span>
                </div>
                {deliveryInfo.codAvailable && (
                  <div className="text-[11px] text-emerald-700 font-medium">
                    ✓ Cash on Delivery (COD) eligible for this PIN code
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-rose-600 font-medium">
                Invalid or unserviceable PIN code. Please check another code.
              </div>
            )}
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-800">100% Genuine</div>
              <div className="text-[9px] text-slate-400">Verified Origin</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <RefreshCw className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-800">{product.returnDays} Days Return</div>
              <div className="text-[9px] text-slate-400">Doorstep Pickup</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <Award className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-800">GST Invoice</div>
              <div className="text-[9px] text-slate-400">Tax Compliant</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <Truck className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-800">Safe Shipping</div>
              <div className="text-[9px] text-slate-400">Insured Cargo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Key Features Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
          Product Overview & Specifications
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-3xl">
          {product.description}
        </p>

        {/* Key Features */}
        {product.features && product.features.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Key Highlights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {product.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Specifications Table */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Technical Specifications</h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
              {Object.entries(product.specifications).map(([key, val], idx) => (
                <div key={idx} className="grid grid-cols-3 p-3 bg-white odd:bg-slate-50/60">
                  <span className="font-semibold text-slate-500">{key}</span>
                  <span className="col-span-2 text-slate-800 font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Verified Customer Reviews Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Verified Customer Reviews</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 bg-emerald-700 text-white text-xs font-bold px-2 py-0.5 rounded">
                <span>{product.rating.toFixed(1)}</span>
                <Star className="w-3.5 h-3.5 fill-white" />
              </div>
              <span className="text-xs text-slate-500">Based on {reviews.length} customer ratings</span>
            </div>
          </div>
        </div>

        {/* Write a Review Form */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Write a Review for this Product
          </h3>
          <form onSubmit={handleSubmitReview} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        reviewRating >= star ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-700 ml-2">{reviewRating} out of 5</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Review Headline / Title</label>
              <input
                type="text"
                value={reviewTitle}
                onChange={e => setReviewTitle(e.target.value)}
                placeholder="e.g. Excellent bass, battery lasts 40 hours as promised!"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Detailed Experience</label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Share thoughts on build quality, battery, performance, or packaging..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {submittingReview ? 'Submitting Review...' : 'Submit Verified Review'}
            </button>
          </form>
        </div>

        {/* Existing Reviews List */}
        <div className="space-y-4 divide-y divide-slate-100">
          {reviews.length > 0 ? (
            reviews.map(rev => (
              <div key={rev._id} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                      {rev.userName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{rev.userName}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  {rev.isVerifiedPurchase && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Verified Purchase
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{rev.title}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Be the first verified customer to review this product!
            </p>
          )}
        </div>
      </div>

      {/* Recommended & Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Customers Also Viewed
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedProducts.slice(0, 4).map(rel => (
              <ProductCard
                key={rel._id}
                product={rel}
                onSelectProduct={s => onNavigate('product-detail', { slug: s })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
