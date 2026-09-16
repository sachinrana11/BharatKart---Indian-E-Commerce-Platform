import React, { useState } from 'react';
import { Heart, Star, ShoppingCart, Check, Zap, Truck } from 'lucide-react';
import { Product } from '../types.js';
import { useCart } from '../context/CartContext.js';
import { useWishlist } from '../context/WishlistContext.js';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (slugOrId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isSaved = isInWishlist(product._id);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock || adding) return;

    setAdding(true);
    const success = await addToCart(product._id, 1);
    setAdding(false);
    if (success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product._id);
  };

  return (
    <div
      onClick={() => onSelectProduct(product.slug || product._id)}
      className="group relative bg-white rounded-2xl border border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
        {product.discountPercent > 0 && (
          <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-xs">
            {product.discountPercent}% OFF
          </span>
        )}
        {product.isBestSeller && (
          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
            Best Seller
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        type="button"
        onClick={handleWishlistClick}
        aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
        className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xs transition-all ${
          isSaved
            ? 'bg-rose-50 text-rose-600 shadow-sm'
            : 'bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white shadow-xs'
        }`}
      >
        <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
      </button>

      {/* Image Container with Hover Zoom */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 flex items-center justify-center p-3">
        <img
          src={product.thumbnail || product.images[0]}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-108 transition-transform duration-500"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand and category */}
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
            {product.brand}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug mb-2">
            {product.title}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="flex items-center gap-1 bg-emerald-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
              <span>{product.rating.toFixed(1)}</span>
              <Star className="w-3 h-3 fill-white" />
            </div>
            <span className="text-xs text-slate-400">({product.reviewCount.toLocaleString('en-IN')})</span>
          </div>
        </div>

        <div>
          {/* Price */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-black text-slate-900">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.mrp > product.price && (
              <span className="text-xs text-slate-400 line-through">
                ₹{product.mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Shipping badge / Stock warning */}
          <div className="text-[11px] mb-3">
            {isLowStock ? (
              <span className="text-rose-600 font-bold">Only {product.stock} units left!</span>
            ) : product.codAvailable ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <Truck className="w-3 h-3" /> Free Express Delivery &bull; COD
              </span>
            ) : (
              <span className="text-slate-500 font-medium">Standard Delivery</span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            disabled={isOutOfStock || adding}
            onClick={handleQuickAdd}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              justAdded
                ? 'bg-emerald-600 text-white'
                : isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs hover:shadow-md'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4" /> Added to Cart
              </>
            ) : adding ? (
              'Adding...'
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
