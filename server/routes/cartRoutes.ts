import { Router } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../auth.js';
import { Cart, CartItem, Product, Coupon } from '../../src/types.js';

const router = Router();

function getSessionId(req: AuthenticatedRequest): string {
  if (req.user) return req.user._id;
  const headerSession = req.headers['x-session-id'] as string;
  if (headerSession && headerSession.trim()) return headerSession.trim();
  return 'guest_session_' + (req.ip || 'local').replace(/\W/g, '');
}

async function recalculateCart(cart: Cart): Promise<Cart> {
  let subtotal = 0;
  let totalMrp = 0;

  const productsCol = db.collection<Product>('products');

  for (const item of cart.items) {
    const product = await productsCol.findById(item.productId);
    if (product) {
      item.price = product.price + (item.selectedVariant?.priceOffset || 0);
      item.mrp = product.mrp + (item.selectedVariant?.priceOffset || 0);
      item.maxStock = product.stock;
      if (item.quantity > product.stock) {
        item.quantity = Math.max(1, product.stock);
      }
    }
    subtotal += item.price * item.quantity;
    totalMrp += item.mrp * item.quantity;
  }

  let couponDiscount = 0;
  if (cart.couponCode) {
    const couponsCol = db.collection<Coupon>('coupons');
    const coupon = await couponsCol.findOne({ code: cart.couponCode.toUpperCase(), isActive: true });
    if (coupon && subtotal >= coupon.minOrderAmount) {
      if (coupon.discountType === 'PERCENTAGE') {
        couponDiscount = Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscountAmount);
      } else {
        couponDiscount = Math.min(coupon.discountValue, coupon.maxDiscountAmount);
      }
      couponDiscount = Math.round(couponDiscount);
    } else {
      cart.couponCode = undefined;
    }
  }

  const shipping = subtotal >= 499 || subtotal === 0 ? 0 : 49;
  const taxableBase = Math.max(0, subtotal - couponDiscount);
  // GST 18% is included in standard retail price in India, but we break it down for transparency
  const tax = Math.round((taxableBase * 0.18) / 1.18);
  const total = taxableBase + shipping;

  cart.subtotal = subtotal;
  cart.discount = Math.max(0, totalMrp - subtotal);
  cart.couponDiscount = couponDiscount;
  cart.shipping = shipping;
  cart.tax = tax;
  cart.total = total;

  return cart;
}

// GET /api/cart
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = getSessionId(req);
    const cartsCol = db.collection<Cart>('carts');
    let cart = await cartsCol.findOne({
      $or: [{ userId: req.user?._id }, { sessionId }],
    });

    if (!cart) {
      cart = {
        _id: `cart_${Date.now()}`,
        userId: req.user?._id,
        sessionId,
        items: [],
        subtotal: 0,
        discount: 0,
        couponDiscount: 0,
        shipping: 0,
        tax: 0,
        total: 0,
      };
      await cartsCol.insertOne(cart);
    } else {
      cart = await recalculateCart(cart);
      await cartsCol.updateOne({ _id: cart._id }, { $set: cart });
    }

    res.json({ success: true, data: cart });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch cart' });
  }
});

// POST /api/cart/items - Add item to cart
router.post('/items', async (req: AuthenticatedRequest, res) => {
  try {
    const { productId, quantity = 1, selectedVariant } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required.' });
    }

    const productsCol = db.collection<Product>('products');
    const product = await productsCol.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    if (product.stock < 1) {
      return res.status(400).json({ success: false, error: 'Sorry, this product is currently out of stock.' });
    }

    const sessionId = getSessionId(req);
    const cartsCol = db.collection<Cart>('carts');
    let cart = await cartsCol.findOne({
      $or: [{ userId: req.user?._id }, { sessionId }],
    });

    if (!cart) {
      cart = {
        _id: `cart_${Date.now()}`,
        userId: req.user?._id,
        sessionId,
        items: [],
        subtotal: 0,
        discount: 0,
        couponDiscount: 0,
        shipping: 0,
        tax: 0,
        total: 0,
      };
    }

    const variantKey = selectedVariant ? `${selectedVariant.variantId}_${selectedVariant.optionId}` : 'default';
    const existingIndex = cart.items.findIndex(
      i =>
        i.productId === productId &&
        (i.selectedVariant ? `${i.selectedVariant.variantId}_${i.selectedVariant.optionId}` : 'default') === variantKey
    );

    const price = product.price + (selectedVariant?.priceOffset || 0);
    const mrp = product.mrp + (selectedVariant?.priceOffset || 0);

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + Number(quantity);
      if (newQty > product.stock) {
        return res.status(400).json({
          success: false,
          error: `Only ${product.stock} units available in stock. Cannot add more.`,
        });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      const addQty = Math.min(Number(quantity), product.stock);
      cart.items.push({
        productId: product._id,
        title: product.title,
        image: product.thumbnail || product.images[0],
        sku: product.sku,
        price,
        mrp,
        quantity: addQty,
        selectedVariant,
        maxStock: product.stock,
      });
    }

    cart = await recalculateCart(cart);

    if (cart._id && (await cartsCol.findOne({ _id: cart._id }))) {
      await cartsCol.updateOne({ _id: cart._id }, { $set: cart });
    } else {
      await cartsCol.insertOne(cart);
    }

    res.json({
      success: true,
      message: 'Item added to your shopping cart!',
      data: cart,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to add item' });
  }
});

// PUT /api/cart/items/:productId - Update item quantity
router.put('/items/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.params;
    const { quantity, variantKey } = req.body;
    const qty = Number(quantity);

    const sessionId = getSessionId(req);
    const cartsCol = db.collection<Cart>('carts');
    let cart = await cartsCol.findOne({
      $or: [{ userId: req.user?._id }, { sessionId }],
    });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    if (qty <= 0) {
      cart.items = cart.items.filter(
        i =>
          !(
            i.productId === productId &&
            (!variantKey || (i.selectedVariant ? `${i.selectedVariant.variantId}_${i.selectedVariant.optionId}` : 'default') === variantKey)
          )
      );
    } else {
      const item = cart.items.find(
        i =>
          i.productId === productId &&
          (!variantKey || (i.selectedVariant ? `${i.selectedVariant.variantId}_${i.selectedVariant.optionId}` : 'default') === variantKey)
      );
      if (item) {
        if (qty > item.maxStock) {
          return res.status(400).json({
            success: false,
            error: `Maximum available inventory for this item is ${item.maxStock}.`,
          });
        }
        item.quantity = qty;
      }
    }

    cart = await recalculateCart(cart);
    await cartsCol.updateOne({ _id: cart._id }, { $set: cart });

    res.json({ success: true, data: cart });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update cart' });
  }
});

// DELETE /api/cart/items/:productId - Remove item from cart
router.delete('/items/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.params;
    const { variantKey } = req.query;

    const sessionId = getSessionId(req);
    const cartsCol = db.collection<Cart>('carts');
    let cart = await cartsCol.findOne({
      $or: [{ userId: req.user?._id }, { sessionId }],
    });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      i =>
        !(
          i.productId === productId &&
          (!variantKey || (i.selectedVariant ? `${i.selectedVariant.variantId}_${i.selectedVariant.optionId}` : 'default') === variantKey)
        )
    );

    cart = await recalculateCart(cart);
    await cartsCol.updateOne({ _id: cart._id }, { $set: cart });

    res.json({ success: true, message: 'Item removed from cart.', data: cart });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to remove item' });
  }
});

// DELETE /api/cart - Clear cart
router.delete('/', async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = getSessionId(req);
    const cartsCol = db.collection<Cart>('carts');
    await cartsCol.updateOne(
      { $or: [{ userId: req.user?._id }, { sessionId }] },
      {
        $set: {
          items: [],
          subtotal: 0,
          discount: 0,
          couponCode: null,
          couponDiscount: 0,
          shipping: 0,
          tax: 0,
          total: 0,
        },
      }
    );

    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to clear cart' });
  }
});

// POST /api/cart/apply-coupon
router.post('/apply-coupon', async (req: AuthenticatedRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required.' });
    }

    const cleanCode = code.toUpperCase().trim();
    const couponsCol = db.collection<Coupon>('coupons');
    const coupon = await couponsCol.findOne({ code: cleanCode, isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, error: `Coupon code '${cleanCode}' is invalid or expired.` });
    }

    const now = new Date();
    if (new Date(coupon.endDate) < now || new Date(coupon.startDate) > now) {
      return res.status(400).json({ success: false, error: `Coupon '${cleanCode}' has expired.` });
    }

    const sessionId = getSessionId(req);
    const cartsCol = db.collection<Cart>('carts');
    let cart = await cartsCol.findOne({
      $or: [{ userId: req.user?._id }, { sessionId }],
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Your cart is empty.' });
    }

    if (cart.subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        error: `Minimum cart value of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for coupon ${cleanCode}.`,
      });
    }

    cart.couponCode = cleanCode;
    cart = await recalculateCart(cart);
    await cartsCol.updateOne({ _id: cart._id }, { $set: cart });

    res.json({
      success: true,
      message: `Coupon '${cleanCode}' applied! You saved ₹${cart.couponDiscount.toLocaleString('en-IN')}.`,
      data: cart,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to apply coupon' });
  }
});

// POST /api/cart/remove-coupon
router.post('/remove-coupon', async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = getSessionId(req);
    const cartsCol = db.collection<Cart>('carts');
    let cart = await cartsCol.findOne({
      $or: [{ userId: req.user?._id }, { sessionId }],
    });

    if (cart) {
      cart.couponCode = undefined;
      cart = await recalculateCart(cart);
      await cartsCol.updateOne({ _id: cart._id }, { $set: cart });
    }

    res.json({ success: true, message: 'Coupon removed.', data: cart });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to remove coupon' });
  }
});

export default router;
