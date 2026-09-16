import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types.js';
import { useAuth } from './AuthContext.js';
import { useToast } from './ToastContext.js';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistItems: Product[];
  loading: boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const refreshWishlist = async () => {
    if (!token) {
      setWishlistIds([]);
      setWishlistItems([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/user/wishlist', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setWishlistItems(json.data);
        setWishlistIds(json.data.map((p: Product) => p._id));
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, [token, user?._id]);

  const toggleWishlist = async (productId: string) => {
    if (!token) {
      showToast('Please sign in to save items to your wishlist', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/user/wishlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.inWishlist) {
          setWishlistIds(prev => [...prev, productId]);
          showToast('Added to your Wishlist!', 'success');
        } else {
          setWishlistIds(prev => prev.filter(id => id !== productId));
          setWishlistItems(prev => prev.filter(p => p._id !== productId));
          showToast('Removed from your Wishlist', 'info');
        }
        refreshWishlist();
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
    }
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistItems,
        loading,
        toggleWishlist,
        isInWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
