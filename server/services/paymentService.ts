import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '../db.js';
import { PaymentMethod, PaymentStatus, Order, Payment } from '../../src/types.js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_BHARATKART2026';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'secret_mock_rzp_bharatkart_prod_key';
const UPI_VPA = process.env.UPI_MERCHANT_VPA || 'bharatkart@icici';
const MERCHANT_NAME = 'BharatKart India';

export interface CreatePaymentOptions {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  upiId?: string;
}

export async function createPaymentOrder(options: CreatePaymentOptions) {
  const paymentCol = db.collection('payments');
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const razorpayOrderId = `order_rzp_${Date.now().toString(36).toUpperCase()}`;

  let qrCodeDataUrl: string | undefined = undefined;
  let upiDeepLink: string | undefined = undefined;

  if (options.method === 'UPI_QR' || options.method === 'UPI_ID') {
    // Standard NPCI UPI URI Specification
    // upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...
    upiDeepLink = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${options.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${options.orderNumber}`)}&tr=${paymentId}`;

    try {
      qrCodeDataUrl = await QRCode.toDataURL(upiDeepLink, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (e) {
      console.error('Failed to generate UPI QR code:', e);
    }
  }

  // Create payment record in DB with PENDING status
  const paymentDoc = await paymentCol.insertOne({
    _id: paymentId,
    orderId: options.orderId,
    orderNumber: options.orderNumber,
    paymentId,
    amount: options.amount,
    currency: 'INR',
    method: options.method,
    status: (options.method === 'COD' ? 'PENDING' : 'PENDING') as PaymentStatus,
    razorpayOrderId,
    razorpayPaymentId: null,
    razorpaySignature: null,
    upiId: options.upiId || UPI_VPA,
    upiDeepLink,
    qrCodeUrl: qrCodeDataUrl,
    webhookProcessed: false,
    refunds: [],
  });

  return {
    paymentId,
    orderId: options.orderId,
    orderNumber: options.orderNumber,
    amount: options.amount,
    currency: 'INR',
    method: options.method,
    razorpayOrderId,
    razorpayKeyId: RAZORPAY_KEY_ID, // Safe public key ID for client checkout
    upiDeepLink,
    qrCodeDataUrl,
  };
}

export function generatePaymentSignature(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

export async function verifyPayment(params: {
  paymentId: string;
  orderId: string;
  transactionRef?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  simulateSuccess?: boolean;
}): Promise<{ success: boolean; message: string; payment?: any }> {
  const paymentCol = db.collection('payments');
  const ordersCol = db.collection('orders');
  const productsCol = db.collection('products');

  const payment = await paymentCol.findOne({ _id: params.paymentId });
  if (!payment) {
    return { success: false, message: 'Payment record not found.' };
  }

  if (payment.status === 'PAID') {
    return { success: true, message: 'Payment has already been verified and processed.', payment };
  }

  const order = await ordersCol.findOne({ _id: payment.orderId });
  if (!order) {
    return { success: false, message: 'Associated order not found.' };
  }

  // Verification Logic:
  // If razorpay credentials were submitted, verify HMAC signature
  if (params.razorpayPaymentId && params.razorpaySignature) {
    const expectedSig = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${payment.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest('hex');

    // In test environment, allow valid HMAC or simulated valid signature
    const isValid = expectedSig === params.razorpaySignature || params.simulateSuccess;
    if (!isValid) {
      await paymentCol.updateOne({ _id: payment._id }, { $set: { status: 'FAILED' } });
      await ordersCol.updateOne({ _id: order._id }, { $set: { paymentStatus: 'FAILED', orderStatus: 'PAYMENT_PENDING' } });
      return { success: false, message: 'Invalid payment signature. Verification failed.' };
    }
  }

  // Update payment to PAID
  const verifiedTxnId = params.razorpayPaymentId || params.transactionRef || `txn_upi_${Date.now()}`;
  await paymentCol.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: 'PAID',
        razorpayPaymentId: verifiedTxnId,
        verifiedAt: new Date().toISOString(),
      },
    }
  );

  // Update Order Status to CONFIRMED and add timeline entry
  const updatedTimeline = [
    ...order.timeline,
    {
      status: 'CONFIRMED',
      title: 'Payment Received & Order Confirmed',
      description: `Payment of ₹${order.totalAmount.toLocaleString('en-IN')} verified successfully via ${payment.method}. Reference: ${verifiedTxnId}`,
      timestamp: new Date().toISOString(),
      completed: true,
    },
    {
      status: 'PROCESSING',
      title: 'Sent to Warehouse for Packing',
      description: 'Order details transmitted to BharatKart regional logistics fulfillment center.',
      timestamp: new Date().toISOString(),
      completed: true,
    },
  ];

  await ordersCol.updateOne(
    { _id: order._id },
    {
      $set: {
        paymentStatus: 'PAID',
        paymentId: verifiedTxnId,
        orderStatus: 'PROCESSING',
        timeline: updatedTimeline,
      },
    }
  );

  // Safely decrement inventory for ordered items
  for (const item of order.items) {
    await productsCol.updateOne(
      { _id: item.productId },
      {
        $inc: { stock: -item.quantity },
      }
    );
  }

  const updatedPayment = await paymentCol.findOne({ _id: payment._id });
  return { success: true, message: 'Payment verified and order confirmed successfully.', payment: updatedPayment };
}

export async function processPaymentWebhook(payload: any) {
  const paymentCol = db.collection('payments');
  const event = payload.event;
  const paymentEntity = payload.payload?.payment?.entity;

  if (!paymentEntity) {
    return { success: false, message: 'Missing payment entity in webhook' };
  }

  const paymentRecord = await paymentCol.findOne({
    $or: [{ razorpayOrderId: paymentEntity.order_id }, { _id: paymentEntity.notes?.paymentId }],
  });

  if (!paymentRecord) {
    return { success: false, message: 'No matching payment order found for webhook' };
  }

  if (paymentRecord.webhookProcessed) {
    return { success: true, message: 'Webhook already processed (idempotent)' };
  }

  if (event === 'payment.captured') {
    await verifyPayment({
      paymentId: paymentRecord._id,
      orderId: paymentRecord.orderId,
      transactionRef: paymentEntity.id,
      simulateSuccess: true,
    });
    await paymentCol.updateOne({ _id: paymentRecord._id }, { $set: { webhookProcessed: true } });
    return { success: true, message: 'Payment captured processed via webhook' };
  } else if (event === 'payment.failed') {
    await paymentCol.updateOne(
      { _id: paymentRecord._id },
      { $set: { status: 'FAILED', failureReason: paymentEntity.error_description, webhookProcessed: true } }
    );
    const ordersCol = db.collection('orders');
    await ordersCol.updateOne({ _id: paymentRecord.orderId }, { $set: { paymentStatus: 'FAILED' } });
    return { success: true, message: 'Payment failure recorded from webhook' };
  }

  return { success: true, message: `Event ${event} recorded` };
}

export async function refundPayment(params: {
  orderId: string;
  amount: number;
  reason: string;
  adminUserId: string;
}) {
  const paymentCol = db.collection('payments');
  const ordersCol = db.collection('orders');
  const refundsCol = db.collection('refunds');

  const order = await ordersCol.findOne({ _id: params.orderId });
  if (!order) {
    throw new Error('Order not found');
  }

  const refundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const refundDoc = {
    _id: refundId,
    orderId: params.orderId,
    paymentId: order.paymentId || 'N/A',
    amount: params.amount,
    status: 'PROCESSED',
    reason: params.reason,
    refundMethod: order.paymentMethod === 'COD' ? 'NEFT / UPI Bank Transfer' : `Original ${order.paymentMethod}`,
    transactionRef: `ref_txn_${Date.now()}`,
    processedBy: params.adminUserId,
    createdAt: new Date().toISOString(),
  };

  await refundsCol.insertOne(refundDoc);

  // Update order status to REFUNDED
  const updatedTimeline = [
    ...order.timeline,
    {
      status: 'REFUNDED',
      title: 'Refund Processed to Source Account',
      description: `Refund of ₹${params.amount.toLocaleString('en-IN')} approved and initiated. Expected credit in 2-4 business days. Ref: ${refundDoc.transactionRef}`,
      timestamp: new Date().toISOString(),
      completed: true,
    },
  ];

  await ordersCol.updateOne(
    { _id: params.orderId },
    {
      $set: {
        paymentStatus: 'REFUNDED',
        orderStatus: 'REFUNDED',
        refundAmount: params.amount,
        refundedAt: new Date().toISOString(),
        returnStatus: 'REFUNDED',
        timeline: updatedTimeline,
      },
    }
  );

  // Update payment doc
  await paymentCol.updateOne(
    { orderId: params.orderId },
    {
      $set: { status: 'REFUNDED' },
      $push: { refunds: refundDoc },
    }
  );

  return refundDoc;
}
