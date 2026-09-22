import React, { useState, useEffect } from 'react';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { Product } from '../types.js';
import { useWishlist } from '../context/WishlistContext.js';
import { useCart } from '../context/CartContext.js';
import { ProductCard } from '../components/ProductCard.js';
import { SEOHead } from '../components/SEOHead.js';
import { productsApi } from '../services/api.js';

interface WishlistPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({ onNavigate }) => {
  const { wishlistIds, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      try {
        setLoading(true);
        const data = await productsApi.getAll({ limit: 50 });
        if (Array.isArray(data)) {
          const matching = data.filter((p: Product) => wishlistIds.includes(p._id));
          setProducts(matching);
        }
      } catch (e) {
        console.error('Failed to load wishlist products:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistProducts();
  }, [wishlistIds]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-bold text-slate-600">Loading your saved items...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEOHead title={`My Wishlist (${products.length}) | BharatKart`} />

      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          My Saved Wishlist ({products.length})
        </h1>
        <p className="text-xs text-slate-500">
          Keep track of festival price drops, restocked handlooms, and trending audio gear.
        </p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map(prod => (
            <div key={prod._id} className="relative group">
              <ProductCard
                product={prod}
                onSelectProduct={slug => onNavigate('product-detail', { slug })}
              />
              <button
                type="button"
                onClick={() => addToCart(prod._id, 1)}
                className="w-full mt-2 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Move to Cart</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Your Wishlist is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Save items you love by tapping the heart icon on any product card while browsing.
          </p>
          <button
            onClick={() => onNavigate('catalog')}
            className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold"
          >
            Explore Catalog
          </button>
        </div>
      )}
    </div>
  );
};
