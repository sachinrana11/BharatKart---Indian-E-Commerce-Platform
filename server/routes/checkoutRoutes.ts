import { Router } from 'express';
import { checkPincodeDelivery } from '../services/pincodeService.js';
import { db } from '../db.js';
import { Product, Coupon } from '../../src/types.js';

const router = Router();

// POST /api/checkout/pincode - Check Indian PIN code delivery
router.post('/pincode', async (req, res) => {
  const { pincode, orderTotal = 0 } = req.body;
  if (!pincode) {
    return res.status(400).json({ success: false, error: '6-digit Indian PIN code is required.' });
  }

  const deliveryInfo = checkPincodeDelivery(pincode, Number(orderTotal));
  res.json({
    success: deliveryInfo.isDeliverable,
    data: deliveryInfo,
    message: deliveryInfo.isDeliverable
      ? `Deliverable to ${deliveryInfo.city}, ${deliveryInfo.state} in ${deliveryInfo.estimatedDays} business days via ${deliveryInfo.courierPartner}.`
      : 'Invalid PIN code. Please enter a valid 6-digit Indian postal code.',
  });
});

// POST /api/checkout/calculate - Server-side price & inventory validation
router.post('/calculate', async (req, res) => {
  try {
    const { items, couponCode, deliverySpeed = 'STANDARD', pincode = '400001' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cannot checkout with empty items.' });
    }

    const productsCol = db.collection<Product>('products');
    let subtotal = 0;
    let totalMrp = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await productsCol.findById(item.productId);
      if (!product) {
        return res.status(400).json({ success: false, error: `Product '${item.title}' is no longer available.` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for '${product.title}'. Only ${product.stock} units remaining.`,
        });
      }

      const price = product.price + (item.selectedVariant?.priceOffset || 0);
      const mrp = product.mrp + (item.selectedVariant?.priceOffset || 0);

      subtotal += price * item.quantity;
      totalMrp += mrp * item.quantity;

      validatedItems.push({
        productId: product._id,
        title: product.title,
        image: product.thumbnail || product.images[0],
        sku: product.sku,
        price,
        mrp,
        quantity: item.quantity,
        variantDetails: item.selectedVariant ? `${item.selectedVariant.variantName}: ${item.selectedVariant.optionName}` : undefined,
      });
    }

    // Coupon calculation
    let couponDiscount = 0;
    if (couponCode) {
      const couponsCol = db.collection<Coupon>('coupons');
      const coupon = await couponsCol.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
      if (coupon && subtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'PERCENTAGE') {
          couponDiscount = Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscountAmount);
        } else {
          couponDiscount = Math.min(coupon.discountValue, coupon.maxDiscountAmount);
        }
        couponDiscount = Math.round(couponDiscount);
      }
    }

    // Shipping calculation
    const baseShipping = subtotal >= 499 ? 0 : 49;
    const speedShipping = deliverySpeed === 'EXPRESS' ? 99 : 0;
    const shippingCharge = baseShipping + speedShipping;

    const taxableBase = Math.max(0, subtotal - couponDiscount);
    const taxAmount = Math.round((taxableBase * 0.18) / 1.18);
    const totalAmount = taxableBase + shippingCharge;

    const deliveryInfo = checkPincodeDelivery(pincode, totalAmount);

    res.json({
      success: true,
      data: {
        items: validatedItems,
        subtotal,
        discount: Math.max(0, totalMrp - subtotal),
        couponDiscount,
        couponCode: couponDiscount > 0 ? couponCode.toUpperCase().trim() : null,
        shippingCharge,
        taxAmount,
        totalAmount,
        deliveryInfo,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Checkout calculation failed' });
  }
});

export default router;
