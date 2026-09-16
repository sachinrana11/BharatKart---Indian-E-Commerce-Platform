import React, { createContext, useContext, useState, useEffect } from 'react';
import { Cart, CartItem } from '../types.js';
import { useAuth } from './AuthContext.js';
import { useToast } from './ToastContext.js';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  addToCart: (productId: string, quantity?: number, selectedVariant?: any) => Promise<boolean>;
  updateQuantity: (productId: string, quantity: number, variantKey?: string) => Promise<void>;
  removeFromCart: (productId: string, variantKey?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const storedSession = localStorage.getItem('bharatkart_session_id');
    if (storedSession) {
      headers['x-session-id'] = storedSession;
    } else {
      const newSession = 'sess_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('bharatkart_session_id', newSession);
      headers['x-session-id'] = newSession;
    }
    return headers;
  };

  const refreshCart = async () => {
    try {
      const res = await fetch('/api/cart', { headers: getHeaders() });
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [token, user?._id]);

  const addToCart = async (productId: string, quantity: number = 1, selectedVariant?: any): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productId, quantity, selectedVariant }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
        showToast('Item added to your shopping cart!', 'success');
        return true;
      } else {
        showToast(json.error || 'Failed to add item to cart', 'error');
        return false;
      }
    } catch (err: any) {
      showToast(err.message || 'Cart error', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number, variantKey?: string) => {
    try {
      const res = await fetch(`/api/cart/items/${productId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ quantity, variantKey }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
      } else {
        showToast(json.error || 'Failed to update quantity', 'error');
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const removeFromCart = async (productId: string, variantKey?: string) => {
    try {
      const url = `/api/cart/items/${productId}${variantKey ? `?variantKey=${encodeURIComponent(variantKey)}` : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
        showToast('Item removed from cart', 'info');
      }
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  const clearCart = async () => {
    try {
      await fetch('/api/cart', {
        method: 'DELETE',
        headers: getHeaders(),
      });
      setCart({
        items: [],
        subtotal: 0,
        discount: 0,
        couponDiscount: 0,
        shipping: 0,
        tax: 0,
        total: 0,
      });
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/cart/apply-coupon', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
        showToast(json.message || `Coupon ${code} applied successfully!`, 'success');
        return true;
      } else {
        showToast(json.error || 'Invalid coupon code', 'error');
        return false;
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to apply coupon', 'error');
      return false;
    }
  };

  const removeCoupon = async () => {
    try {
      const res = await fetch('/api/cart/remove-coupon', {
        method: 'POST',
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
        showToast('Coupon removed', 'info');
      }
    } catch (err) {
      console.error('Failed to remove coupon:', err);
    }
  };

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        itemCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
