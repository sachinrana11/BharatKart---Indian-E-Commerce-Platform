import { Router } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth, logAudit } from '../auth.js';
import { createPaymentOrder, verifyPayment, processPaymentWebhook } from '../services/paymentService.js';
import { Order } from '../../src/types.js';

const router = Router();

// POST /api/payments/create - Generate payment intent, dynamic UPI QR, or Razorpay order
router.post('/create', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, method = 'UPI_QR', upiId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const ordersCol = db.collection<Order>('orders');
    const order = await ordersCol.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, error: 'Order has already been paid.' });
    }

    const paymentData = await createPaymentOrder({
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      method,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      upiId,
    });

    await logAudit(req, 'PAYMENT_INITIATE', 'PAYMENT', paymentData.paymentId, `Payment initialized for order ${order.orderNumber} via ${method}`);

    res.json({
      success: true,
      message: 'Payment session created.',
      data: paymentData,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create payment session' });
  }
});

// POST /api/payments/verify - Secure backend payment verification
router.post('/verify', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { paymentId, orderId, razorpayPaymentId, razorpaySignature, transactionRef, simulateSuccess } = req.body;

    if (!paymentId || !orderId) {
      return res.status(400).json({ success: false, error: 'Payment ID and Order ID are required.' });
    }

    const result = await verifyPayment({
      paymentId,
      orderId,
      razorpayPaymentId,
      razorpaySignature,
      transactionRef,
      simulateSuccess: simulateSuccess === true || simulateSuccess === 'true',
    });

    if (!result.success) {
      await logAudit(req, 'PAYMENT_VERIFY_FAIL', 'PAYMENT', paymentId, `Payment verification failed: ${result.message}`);
      return res.status(400).json({ success: false, error: result.message });
    }

    await logAudit(req, 'PAYMENT_VERIFY_SUCCESS', 'PAYMENT', paymentId, `Payment verified successfully for order ${orderId}`);

    res.json({
      success: true,
      message: result.message,
      data: result.payment,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Payment verification failed' });
  }
});

// POST /api/payments/webhook - Webhook listener for payment events
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    // In production, verify crypto HMAC signature against webhook secret
    const result = await processPaymentWebhook(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Webhook processing failed' });
  }
});

export default router;
