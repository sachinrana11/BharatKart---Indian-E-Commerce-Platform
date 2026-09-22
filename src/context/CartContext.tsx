import React, { createContext, useContext, useState, useEffect } from 'react';
import { Cart, CartItem } from '../types.js';
import { useAuth } from './AuthContext.js';
import { useToast } from './ToastContext.js';
import { cartApi, ApiError } from '../services/api.js';

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

  const refreshCart = async () => {
    try {
      const data = await cartApi.getCart();
      if (data) {
        setCart(data);
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
      const updatedCart = await cartApi.addToCart(productId, quantity, selectedVariant);
      if (updatedCart) {
        setCart(updatedCart);
        showToast('Item added to your shopping cart!', 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Failed to add item to cart';
      showToast(message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number, variantKey?: string) => {
    try {
      const updatedCart = await cartApi.updateQuantity(productId, quantity, variantKey);
      if (updatedCart) {
        setCart(updatedCart);
      }
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Failed to update quantity';
      showToast(message, 'error');
    }
  };

  const removeFromCart = async (productId: string, variantKey?: string) => {
    try {
      const updatedCart = await cartApi.removeFromCart(productId, variantKey);
      if (updatedCart) {
        setCart(updatedCart);
        showToast('Item removed from cart', 'info');
      }
    } catch (err: any) {
      console.error('Error removing item:', err);
    }
  };

  const clearCart = async () => {
    try {
      await cartApi.clearCart();
      setCart({
        _id: 'cart_' + Date.now(),
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
      const updatedCart = await cartApi.applyCoupon(code);
      if (updatedCart) {
        setCart(updatedCart);
        showToast(`Coupon '${code.toUpperCase()}' applied successfully!`, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Failed to apply coupon';
      showToast(message, 'error');
      return false;
    }
  };

  const removeCoupon = async () => {
    try {
      const updatedCart = await cartApi.removeCoupon();
      if (updatedCart) {
        setCart(updatedCart);
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
