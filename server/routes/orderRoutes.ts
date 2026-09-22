import { Router } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth, logAudit } from '../auth.js';
import { checkPincodeDelivery } from '../services/pincodeService.js';
import { Order, OrderItem, Product, Coupon, Address } from '../../src/types.js';

const router = Router();

// POST /api/orders - Create new order
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      shippingAddress,
      items,
      couponCode,
      deliverySpeed = 'STANDARD',
      paymentMethod = 'UPI_QR',
    } = req.body;

    if (!shippingAddress || !shippingAddress.pincode || !shippingAddress.addressLine) {
      return res.status(400).json({ success: false, error: 'Complete shipping address is required.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order must have at least one item.' });
    }

    const productsCol = db.collection<Product>('products');
    let subtotal = 0;
    let totalMrp = 0;
    const validatedItems: OrderItem[] = [];

    // Server-side inventory and price check
    for (const item of items) {
      const product = await productsCol.findById(item.productId);
      if (!product) {
        return res.status(400).json({ success: false, error: `Product '${item.title}' is no longer available.` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for '${product.title}'. Only ${product.stock} units available.`,
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
        variantDetails: item.variantDetails || (item.selectedVariant ? `${item.selectedVariant.variantName}: ${item.selectedVariant.optionName}` : undefined),
      });
    }

    // Coupon verification
    let couponDiscount = 0;
    let validCouponCode: string | undefined = undefined;
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
        validCouponCode = coupon.code;
        // Increment coupon used count
        await couponsCol.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
      }
    }

    // Shipping fee
    const baseShipping = subtotal >= 499 ? 0 : 49;
    const speedShipping = deliverySpeed === 'EXPRESS' ? 99 : 0;
    const codFee = paymentMethod === 'COD' && subtotal < 1000 ? 30 : 0;
    const shippingCharge = baseShipping + speedShipping + codFee;

    const taxableBase = Math.max(0, subtotal - couponDiscount);
    const taxAmount = Math.round((taxableBase * 0.18) / 1.18);
    const totalAmount = taxableBase + shippingCharge;

    const deliveryInfo = checkPincodeDelivery(shippingAddress.pincode, totalAmount);
    const estimatedDeliveryDate = new Date(Date.now() + (deliveryInfo.estimatedDays || 2) * 86400000).toISOString().split('T')[0];

    const orderNumber = `BK-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const isCod = paymentMethod === 'COD';

    const initialTimeline = [
      {
        status: isCod ? 'CONFIRMED' : 'PAYMENT_PENDING',
        title: isCod ? 'Order Placed (Cash on Delivery)' : 'Order Received - Awaiting Payment',
        description: isCod
          ? `Order confirmed. You will pay ₹${totalAmount.toLocaleString('en-IN')} cash or UPI upon delivery.`
          : `Order placed. Please complete payment of ₹${totalAmount.toLocaleString('en-IN')} to proceed with shipping.`,
        timestamp: new Date().toISOString(),
        completed: true,
      },
    ];

    if (isCod) {
      initialTimeline.push({
        status: 'PROCESSING',
        title: 'Sent to Warehouse for Packing',
        description: 'Order details transmitted to BharatKart regional logistics fulfillment center.',
        timestamp: new Date().toISOString(),
        completed: true,
      });

      // Deduct inventory immediately for COD orders
      for (const it of validatedItems) {
        await productsCol.updateOne({ _id: it.productId }, { $inc: { stock: -it.quantity } });
      }
    }

    const ordersCol = db.collection('orders');
    const newOrder = await ordersCol.insertOne({
      orderNumber,
      userId: req.user!._id,
      customerName: shippingAddress.fullName || req.user!.name,
      customerEmail: req.user!.email,
      customerPhone: shippingAddress.phone || req.user!.phone,
      shippingAddress,
      items: validatedItems,
      subtotal,
      discount: Math.max(0, totalMrp - subtotal),
      couponCode: validCouponCode,
      couponDiscount,
      shippingCharge,
      taxAmount,
      totalAmount,
      paymentMethod,
      paymentStatus: isCod ? 'PENDING' : 'PENDING',
      orderStatus: isCod ? 'PROCESSING' : 'PAYMENT_PENDING',
      timeline: initialTimeline,
      estimatedDeliveryDate,
      courierPartner: deliveryInfo.courierPartner,
      trackingNumber: `TRK-BK-${Date.now().toString(36).toUpperCase()}`,
      invoiceNumber: `INV-BK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    // Clear user cart
    const cartsCol = db.collection('carts');
    await cartsCol.updateOne(
      { userId: req.user!._id },
      { $set: { items: [], subtotal: 0, discount: 0, couponCode: null, couponDiscount: 0, shipping: 0, tax: 0, total: 0 } }
    );

    await logAudit(req, 'ORDER_CREATE', 'ORDER', newOrder._id, `Order ${orderNumber} created for ₹${totalAmount} via ${paymentMethod}`);

    res.status(201).json({
      success: true,
      message: isCod ? 'Order confirmed successfully!' : 'Order created! Please complete payment.',
      data: newOrder,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create order' });
  }
});

// GET /api/orders, /api/orders/my-orders, /api/orders/user/my-orders - User past orders
router.get(['/', '/my-orders', '/user/my-orders'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const ordersCol = db.collection('orders');
    const orders = await ordersCol.find(
      { userId: req.user!._id },
      { sort: { createdAt: -1 } }
    );
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Order details
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const ordersCol = db.collection<Order>('orders');
    let order = await ordersCol.findById(id);
    if (!order) {
      order = await ordersCol.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // Verify ownership or admin access
    if (order.userId !== req.user!._id && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied to this order.' });
    }

    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch order details' });
  }
});

// GET /api/orders/:id/track - Tracking timeline
router.get('/:id/track', async (req, res) => {
  try {
    const { id } = req.params;
    const ordersCol = db.collection<Order>('orders');
    let order = await ordersCol.findById(id);
    if (!order) {
      order = await ordersCol.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found for tracking.' });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        courierPartner: order.courierPartner,
        trackingNumber: order.trackingNumber,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        timeline: order.timeline,
        shippingAddress: order.shippingAddress,
        items: order.items,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to track order' });
  }
});

// POST /api/orders/:id/cancel - User cancels order
router.post('/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Customer requested cancellation' } = req.body;

    const ordersCol = db.collection<Order>('orders');
    const order = await ordersCol.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.userId !== req.user!._id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized to cancel this order' });
    }

    // Cancellation only allowed if not yet shipped or delivered
    const nonCancellable = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    if (nonCancellable.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        error: `Order cannot be cancelled because it is already ${order.orderStatus.replace(/_/g, ' ')}. You may request a return upon delivery.`,
      });
    }

    const updatedTimeline = [
      ...order.timeline,
      {
        status: 'CANCELLED' as any,
        title: 'Order Cancelled',
        description: `Cancelled by customer. Reason: ${reason}.`,
        timestamp: new Date().toISOString(),
        completed: true,
      },
    ];

    await ordersCol.updateOne(
      { _id: order._id },
      {
        $set: {
          orderStatus: 'CANCELLED',
          cancelledReason: reason,
          cancelledAt: new Date().toISOString(),
          timeline: updatedTimeline,
        },
      }
    );

    // Restore inventory if it was confirmed
    if (order.paymentStatus === 'PAID' || order.paymentMethod === 'COD') {
      const productsCol = db.collection<Product>('products');
      for (const item of order.items) {
        await productsCol.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } });
      }
    }

    await logAudit(req, 'ORDER_CANCEL', 'ORDER', order._id, `Order ${order.orderNumber} cancelled by user`);

    res.json({
      success: true,
      message: 'Order has been successfully cancelled.',
      data: { orderId: order._id, status: 'CANCELLED' },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to cancel order' });
  }
});

// POST /api/orders/:id/return - User requests return
router.post('/:id/return', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { reason, description, images = [] } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reason for return is required.' });
    }

    const ordersCol = db.collection<Order>('orders');
    const order = await ordersCol.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.userId !== req.user!._id) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    if (order.orderStatus !== 'DELIVERED') {
      return res.status(400).json({ success: false, error: 'Returns can only be requested for delivered orders.' });
    }

    const updatedTimeline = [
      ...order.timeline,
      {
        status: 'RETURN_REQUESTED' as any,
        title: 'Return Requested by Customer',
        description: `Return initiated for: ${reason}. Notes: ${description || 'None'}. Under review by BharatKart Support.`,
        timestamp: new Date().toISOString(),
        completed: true,
      },
    ];

    await ordersCol.updateOne(
      { _id: order._id },
      {
        $set: {
          orderStatus: 'RETURN_REQUESTED',
          returnReason: reason,
          returnDetails: description,
          returnRequestedAt: new Date().toISOString(),
          returnStatus: 'PENDING',
          timeline: updatedTimeline,
        },
      }
    );

    const returnsCol = db.collection('returns');
    await returnsCol.insertOne({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: req.user!._id,
      customerName: req.user!.name,
      reason,
      description,
      images,
      status: 'REQUESTED',
      refundAmount: order.totalAmount,
      createdAt: new Date().toISOString(),
    });

    await logAudit(req, 'RETURN_REQUEST', 'ORDER', order._id, `Return requested for order ${order.orderNumber}: ${reason}`);

    res.json({
      success: true,
      message: 'Return request submitted successfully. Our customer support team will review within 24 hours.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to request return' });
  }
});

export default router;
