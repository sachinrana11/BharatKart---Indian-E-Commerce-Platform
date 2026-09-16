import { Router } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireRoles, logAudit } from '../auth.js';
import { refundPayment } from '../services/paymentService.js';
import { Product, Order, Category, Brand, Coupon, FlashSale, Banner, Review, User, AuditLog } from '../../src/types.js';

const router = Router();

// Protect all admin routes with ADMIN or SUPER_ADMIN role
router.use(requireRoles(['ADMIN', 'SUPER_ADMIN']));

// GET /api/admin/analytics - KPI metrics and charts
router.get('/analytics', async (req: AuthenticatedRequest, res) => {
  try {
    const { range = 'last30days' } = req.query;

    const ordersCol = db.collection<Order>('orders');
    const productsCol = db.collection<Product>('products');
    const usersCol = db.collection<User>('users');
    const paymentsCol = db.collection('payments');
    const returnsCol = db.collection('returns');

    const allOrders = await ordersCol.find({});
    const allProducts = await productsCol.find({});
    const totalCustomers = await usersCol.countDocuments({ role: 'CUSTOMER' });

    // Date range filtering
    const now = new Date();
    let startDate = new Date(0);

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'last7days') {
      startDate = new Date(now.getTime() - 7 * 86400000);
    } else if (range === 'last30days') {
      startDate = new Date(now.getTime() - 30 * 86400000);
    } else if (range === 'thismonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filteredOrders = allOrders.filter(o => new Date(o.createdAt) >= startDate);

    // Metrics calculation
    const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'PAID' || (o.paymentMethod === 'COD' && o.orderStatus === 'DELIVERED'));
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;

    const pendingOrdersCount = allOrders.filter(o => ['PENDING', 'PAYMENT_PENDING', 'PROCESSING', 'PACKED'].includes(o.orderStatus)).length;
    const shippedOrdersCount = allOrders.filter(o => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)).length;
    const deliveredOrdersCount = allOrders.filter(o => o.orderStatus === 'DELIVERED').length;
    const cancelledOrdersCount = allOrders.filter(o => o.orderStatus === 'CANCELLED').length;
    const returnRequestsCount = await returnsCol.countDocuments({ status: 'REQUESTED' });

    const lowStockProducts = allProducts.filter(p => p.stock <= p.lowStockThreshold);
    const outOfStockProducts = allProducts.filter(p => p.stock === 0);

    // Sales over time chart (by day)
    const salesByDate: Record<string, { date: string; revenue: number; orders: number }> = {};
    const daysCount = range === 'today' ? 1 : range === 'last7days' ? 7 : 30;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      salesByDate[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
    }

    filteredOrders.forEach(o => {
      const dateKey = (o.createdAt || '').split('T')[0];
      if (salesByDate[dateKey]) {
        salesByDate[dateKey].orders += 1;
        if (o.paymentStatus === 'PAID' || o.paymentMethod === 'COD') {
          salesByDate[dateKey].revenue += o.totalAmount;
        }
      }
    });

    // Category distribution
    const categorySales: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        const prd = allProducts.find(p => p._id === item.productId);
        const catName = prd?.category || 'General';
        categorySales[catName] = (categorySales[catName] || 0) + item.price * item.quantity;
      });
    });

    // Top selling products
    const productSoldCounts: Record<string, { product: Product; unitsSold: number; revenue: number }> = {};
    allOrders.forEach(o => {
      o.items.forEach(item => {
        const prd = allProducts.find(p => p._id === item.productId);
        if (prd) {
          if (!productSoldCounts[prd._id]) {
            productSoldCounts[prd._id] = { product: prd, unitsSold: 0, revenue: 0 };
          }
          productSoldCounts[prd._id].unitsSold += item.quantity;
          productSoldCounts[prd._id].revenue += item.price * item.quantity;
        }
      });
    });

    const topSelling = Object.values(productSoldCounts)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 6);

    // Failed payments and refunds
    const failedPayments = await paymentsCol.countDocuments({ status: 'FAILED' });
    const processedRefunds = await paymentsCol.countDocuments({ status: 'REFUNDED' });

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalOrders: filteredOrders.length,
          avgOrderValue,
          totalCustomers,
          totalProducts: allProducts.length,
          pendingOrdersCount,
          shippedOrdersCount,
          deliveredOrdersCount,
          cancelledOrdersCount,
          returnRequestsCount,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
          failedPayments,
          processedRefunds,
        },
        chartData: Object.values(salesByDate),
        categorySales: Object.entries(categorySales).map(([name, value]) => ({ name, value })),
        topSelling,
        recentOrders: allOrders.slice(0, 8),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Analytics failed' });
  }
});

// GET /api/admin/products - List all products for admin
router.get('/products', async (req, res) => {
  const productsCol = db.collection<Product>('products');
  const products = await productsCol.find({}, { sort: { createdAt: -1 } });
  res.json({ success: true, data: products });
});

// POST /api/admin/products - Create new product
router.post('/products', async (req: AuthenticatedRequest, res) => {
  try {
    const { title, brand, category, subcategory, description, features, specifications, images, mrp, price, stock, sku, codAvailable, shippingCharges } = req.body;

    if (!title || !price || !category || !sku) {
      return res.status(400).json({ success: false, error: 'Title, category, SKU, and price are required.' });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

    const productsCol = db.collection<Product>('products');
    const newProduct = await productsCol.insertOne({
      title: title.trim(),
      slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
      brand: brand || 'BharatKart Essentials',
      category,
      subcategory: subcategory || '',
      description: description || '',
      features: Array.isArray(features) ? features : [],
      specifications: typeof specifications === 'object' ? specifications : {},
      images: Array.isArray(images) && images.length ? images : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
      thumbnail: Array.isArray(images) && images.length ? images[0] : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80',
      mrp: Number(mrp) || Number(price),
      price: Number(price),
      discountPercent,
      rating: 5.0,
      reviewCount: 0,
      sku: sku.toUpperCase().trim(),
      stock: Number(stock) || 0,
      lowStockThreshold: 5,
      status: Number(stock) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      tags: [category.toLowerCase(), brand?.toLowerCase() || ''],
      codAvailable: codAvailable !== false,
      shippingCharges: Number(shippingCharges) || 0,
      returnDays: 7,
    });

    await logAudit(req, 'PRODUCT_CREATE', 'PRODUCT', newProduct._id, `Created product: ${newProduct.title} (SKU: ${newProduct.sku})`);
    res.status(201).json({ success: true, message: 'Product created successfully.', data: newProduct });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create product' });
  }
});

// PUT /api/admin/products/:id - Update product
router.put('/products/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const productsCol = db.collection<Product>('products');

    if (updateData.mrp && updateData.price) {
      updateData.discountPercent = Math.round(((updateData.mrp - updateData.price) / updateData.mrp) * 100);
    }

    if (updateData.stock !== undefined) {
      updateData.status = Number(updateData.stock) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';
    }

    await productsCol.updateOne({ _id: id }, { $set: updateData });
    const updated = await productsCol.findById(id);

    await logAudit(req, 'PRODUCT_UPDATE', 'PRODUCT', id, `Updated product details for ${id}`);
    res.json({ success: true, message: 'Product updated.', data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id - Delete product
router.delete('/products/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const productsCol = db.collection<Product>('products');
    await productsCol.deleteOne({ _id: id });

    await logAudit(req, 'PRODUCT_DELETE', 'PRODUCT', id, `Deleted product ${id}`);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete product' });
  }
});

// GET /api/admin/inventory - Inventory overview
router.get('/inventory', async (req, res) => {
  const productsCol = db.collection<Product>('products');
  const products = await productsCol.find({}, { sort: { stock: 1 } });
  res.json({ success: true, data: products });
});

// PUT /api/admin/inventory/:id - Adjust stock
router.put('/inventory/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { stock, lowStockThreshold } = req.body;
    const productsCol = db.collection<Product>('products');

    const updateObj: any = {};
    if (stock !== undefined) {
      updateObj.stock = Number(stock);
      updateObj.status = Number(stock) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';
    }
    if (lowStockThreshold !== undefined) {
      updateObj.lowStockThreshold = Number(lowStockThreshold);
    }

    await productsCol.updateOne({ _id: id }, { $set: updateObj });
    const updated = await productsCol.findById(id);

    await logAudit(req, 'INVENTORY_ADJUST', 'INVENTORY', id, `Adjusted stock to ${stock} for product ${id}`);
    res.json({ success: true, message: 'Inventory updated successfully.', data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update inventory' });
  }
});

// GET /api/admin/orders - All orders with status filtering
router.get('/orders', async (req, res) => {
  try {
    const { status, search } = req.query;
    const ordersCol = db.collection<Order>('orders');
    let orders = await ordersCol.find({}, { sort: { createdAt: -1 } });

    if (status && typeof status === 'string' && status !== 'ALL') {
      orders = orders.filter(o => o.orderStatus === status);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      orders = orders.filter(
        o =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          o.customerPhone.includes(q)
      );
    }

    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch orders' });
  }
});

// PUT /api/admin/orders/:id/status - Update order lifecycle status
router.put('/orders/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, courierPartner, note, location } = req.body;

    const ordersCol = db.collection<Order>('orders');
    const order = await ordersCol.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const updatedTimeline = [...order.timeline];
    let title = `Order Status: ${status}`;
    let description = note || `Status transitioned to ${status} by BharatKart logistics coordinator.`;

    if (status === 'PACKED') {
      title = 'Packed & Ready for Dispatch';
      description = note || 'Quality check passed. Sealed in tamper-evident security packaging.';
    } else if (status === 'SHIPPED') {
      title = `Dispatched with ${courierPartner || order.courierPartner || 'Express Air Courier'}`;
      description = note || `Tracking number: ${trackingNumber || order.trackingNumber || 'Assigned'}. Handed over to logistics carrier.`;
    } else if (status === 'OUT_FOR_DELIVERY') {
      title = 'Out for Delivery';
      description = note || 'Delivery executive has departed delivery station for your address.';
    } else if (status === 'DELIVERED') {
      title = 'Order Delivered';
      description = note || 'Package successfully handed over to customer with OTP verification.';
    }

    updatedTimeline.push({
      status,
      title,
      description,
      timestamp: new Date().toISOString(),
      location: location || 'Regional Fulfillment Center',
      completed: true,
    });

    const updateFields: any = {
      orderStatus: status,
      timeline: updatedTimeline,
      ...(trackingNumber ? { trackingNumber } : {}),
      ...(courierPartner ? { courierPartner } : {}),
    };

    if (status === 'DELIVERED') {
      updateFields.deliveredAt = new Date().toISOString();
      if (order.paymentMethod === 'COD') {
        updateFields.paymentStatus = 'PAID';
      }
    }

    await ordersCol.updateOne({ _id: id }, { $set: updateFields });
    const updated = await ordersCol.findById(id);

    await logAudit(req, 'ORDER_STATUS_UPDATE', 'ORDER', id, `Updated order ${order.orderNumber} status to ${status}`);
    res.json({ success: true, message: `Order status updated to ${status}.`, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update order status' });
  }
});

// GET /api/admin/coupons
router.get('/coupons', async (req, res) => {
  const couponsCol = db.collection<Coupon>('coupons');
  const coupons = await couponsCol.find({}, { sort: { createdAt: -1 } });
  res.json({ success: true, data: coupons });
});

// POST /api/admin/coupons - Create coupon
router.post('/coupons', async (req: AuthenticatedRequest, res) => {
  try {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, startDate, endDate, usageLimit } = req.body;

    if (!code || !discountValue || !minOrderAmount) {
      return res.status(400).json({ success: false, error: 'Code, discount value, and min order amount are required.' });
    }

    const couponsCol = db.collection<Coupon>('coupons');
    const newCoupon = await couponsCol.insertOne({
      code: code.toUpperCase().trim(),
      description: description || '',
      discountType: discountType || 'PERCENTAGE',
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount),
      maxDiscountAmount: Number(maxDiscountAmount) || 500,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 86400000 * 30).toISOString(),
      usageLimit: Number(usageLimit) || 1000,
      usedCount: 0,
      perUserLimit: 1,
      isActive: true,
    });

    await logAudit(req, 'COUPON_CREATE', 'COUPON', newCoupon._id, `Created coupon ${newCoupon.code}`);
    res.status(201).json({ success: true, message: 'Coupon created successfully.', data: newCoupon });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create coupon' });
  }
});

// DELETE /api/admin/coupons/:id
router.delete('/coupons/:id', async (req: AuthenticatedRequest, res) => {
  const couponsCol = db.collection('coupons');
  await couponsCol.deleteOne({ _id: req.params.id });
  res.json({ success: true, message: 'Coupon deleted.' });
});

// GET /api/admin/flash-sales
router.get('/flash-sales', async (req, res) => {
  const flashSalesCol = db.collection<FlashSale>('flashSales');
  const sales = await flashSalesCol.find({});
  res.json({ success: true, data: sales });
});

// POST /api/admin/flash-sales
router.post('/flash-sales', async (req: AuthenticatedRequest, res) => {
  try {
    const { title, subtitle, discountPercent, startTime, endTime, productIds, bannerImage, isActive } = req.body;
    const flashSalesCol = db.collection<FlashSale>('flashSales');

    const newSale = await flashSalesCol.insertOne({
      title: title.trim(),
      subtitle: subtitle || 'Limited time festive discount event',
      discountPercent: Number(discountPercent) || 40,
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date(Date.now() + 86400000).toISOString(),
      productIds: Array.isArray(productIds) ? productIds : [],
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=80',
      isActive: isActive !== false,
    });

    await logAudit(req, 'FLASHSALE_CREATE', 'FLASHSALE', newSale._id, `Created flash sale ${newSale.title}`);
    res.status(201).json({ success: true, message: 'Flash sale created.', data: newSale });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create flash sale' });
  }
});

// GET /api/admin/banners
router.get('/banners', async (req, res) => {
  const bannersCol = db.collection<Banner>('banners');
  const banners = await bannersCol.find({}, { sort: { order: 1 } });
  res.json({ success: true, data: banners });
});

// POST /api/admin/banners
router.post('/banners', async (req: AuthenticatedRequest, res) => {
  try {
    const { title, subtitle, ctaText, ctaLink, imageUrl, badge, bgColor, order } = req.body;
    const bannersCol = db.collection<Banner>('banners');

    const newBanner = await bannersCol.insertOne({
      title: title.trim(),
      subtitle: subtitle || '',
      ctaText: ctaText || 'Shop Now',
      ctaLink: ctaLink || '/products',
      imageUrl,
      badge: badge || 'EXCLUSIVE OFFER',
      bgColor: bgColor || 'from-indigo-900 to-slate-900',
      order: Number(order) || 1,
      isActive: true,
    });

    await logAudit(req, 'BANNER_CREATE', 'BANNER', newBanner._id, `Created banner ${newBanner.title}`);
    res.status(201).json({ success: true, message: 'Banner added.', data: newBanner });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create banner' });
  }
});

// DELETE /api/admin/banners/:id
router.delete('/banners/:id', async (req, res) => {
  const bannersCol = db.collection('banners');
  await bannersCol.deleteOne({ _id: req.params.id });
  res.json({ success: true, message: 'Banner removed.' });
});

// GET /api/admin/reviews
router.get('/reviews', async (req, res) => {
  const reviewsCol = db.collection<Review>('reviews');
  const reviews = await reviewsCol.find({}, { sort: { createdAt: -1 } });
  res.json({ success: true, data: reviews });
});

// PUT /api/admin/reviews/:id/status
router.put('/reviews/:id/status', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const reviewsCol = db.collection('reviews');
  await reviewsCol.updateOne({ _id: id }, { $set: { status } });
  res.json({ success: true, message: `Review ${status.toLowerCase()}.` });
});

// GET /api/admin/returns
router.get('/returns', async (req, res) => {
  const returnsCol = db.collection('returns');
  const returns = await returnsCol.find({}, { sort: { createdAt: -1 } });
  res.json({ success: true, data: returns });
});

// POST /api/admin/returns/:id/process - Approve return & trigger refund
router.post('/returns/:id/process', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'APPROVE_AND_REFUND' or 'REJECT'
    const returnsCol = db.collection('returns');
    const returnReq = await returnsCol.findById(id);

    if (!returnReq) {
      return res.status(404).json({ success: false, error: 'Return request not found' });
    }

    if (action === 'APPROVE_AND_REFUND') {
      const refund = await refundPayment({
        orderId: returnReq.orderId,
        amount: returnReq.refundAmount,
        reason: returnReq.reason,
        adminUserId: req.user!._id,
      });

      await returnsCol.updateOne(
        { _id: id },
        {
          $set: {
            status: 'APPROVED',
            adminNotes: notes || 'Approved and refund initiated',
            refundId: refund._id,
          },
        }
      );

      await logAudit(req, 'RETURN_REFUND_APPROVE', 'RETURN', id, `Approved return & processed refund of ₹${returnReq.refundAmount}`);
      return res.json({ success: true, message: 'Return approved and full refund initiated successfully.', data: refund });
    } else {
      await returnsCol.updateOne(
        { _id: id },
        {
          $set: {
            status: 'REJECTED',
            adminNotes: notes || 'Rejected per policy guidelines',
          },
        }
      );

      await logAudit(req, 'RETURN_REJECT', 'RETURN', id, `Rejected return request ${id}`);
      return res.json({ success: true, message: 'Return request has been marked as rejected.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to process return' });
  }
});

// GET /api/admin/customers
router.get('/customers', async (req, res) => {
  const usersCol = db.collection<User>('users');
  const ordersCol = db.collection<Order>('orders');

  const customers = await usersCol.find({ role: 'CUSTOMER' }, { sort: { createdAt: -1 } });
  const allOrders = await ordersCol.find({});

  const enriched = customers.map(c => {
    const userOrders = allOrders.filter(o => o.userId === c._id);
    const totalSpent = userOrders
      .filter(o => o.paymentStatus === 'PAID' || o.orderStatus === 'DELIVERED')
      .reduce((s, o) => s + o.totalAmount, 0);

    return {
      _id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      avatar: c.avatar,
      ordersCount: userOrders.length,
      totalSpent,
      createdAt: c.createdAt,
    };
  });

  res.json({ success: true, data: enriched });
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  const usersCol = db.collection<User>('users');
  const admins = await usersCol.find({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } });
  res.json({ success: true, data: admins });
});

// PUT /api/admin/users/:id/role - SUPER_ADMIN only
router.put('/users/:id/role', async (req: AuthenticatedRequest, res) => {
  if (req.user!.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only SUPER_ADMIN can modify administrator permissions.' });
  }

  const { id } = req.params;
  const { role } = req.body;
  const usersCol = db.collection('users');

  await usersCol.updateOne({ _id: id }, { $set: { role } });
  await logAudit(req, 'ROLE_CHANGE', 'USER', id, `Changed role of user ${id} to ${role}`);

  res.json({ success: true, message: `User role updated to ${role}.` });
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  const auditCol = db.collection<AuditLog>('auditLogs');
  const logs = await auditCol.find({}, { sort: { createdAt: -1 }, limit: 100 });
  res.json({ success: true, data: logs });
});

export default router;
