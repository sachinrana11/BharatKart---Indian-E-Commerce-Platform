import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { SupportTicket, SupportMessage, Order } from '../../src/types.js';

const router = Router();

// Curated Indian E-Commerce Support FAQs
const SUPPORT_FAQS = [
  {
    id: 'faq_upi_deducted',
    question: 'Money deducted via UPI (GPay/PhonePe/Paytm) but order not confirmed?',
    answer:
      'UPI transactions occasionally experience banking gateway lag. Under RBI and NPCI guidelines, if payment was debited from your bank account without an order being created, the funds are automatically refunded to your original source account within 2 to 4 business hours. If not received after 24 hours, provide your 12-digit UPI UTR number in a ticket for manual reconciliation.',
    category: 'PAYMENT_UPI',
  },
  {
    id: 'faq_delivery_tracking',
    question: 'How do I track my delivery with BlueDart or Delhivery?',
    answer:
      'Once your parcel is dispatched from our Bhiwandi or Gurugram fulfillment hub, an SMS and email with your tracking AWB number are dispatched. You can track live transit milestones on the Order Tracking page or directly through BlueDart / Delhivery courier portals.',
    category: 'ORDER_STATUS',
  },
  {
    id: 'faq_returns_exchange',
    question: 'What is the 7-day doorstep return and refund policy?',
    answer:
      'We offer a 7-day doorstep return on eligible electronics, fashion, and home appliances. Simply open the order details and click "Request 7-Day Return". Our delivery partner will pick up the package from your doorstep, and refund will be credited instantly to your UPI or original payment mode once verified.',
    category: 'RETURN_REFUND',
  },
  {
    id: 'faq_cod_rules',
    question: 'Can I pay via UPI on delivery for Cash on Delivery (COD) orders?',
    answer:
      'Yes! All our courier delivery executives carry a dynamic UPI QR code on their handheld scanner. You can pay using GPay, PhonePe, Paytm, BHIM or cash directly at your doorstep.',
    category: 'GENERAL',
  },
  {
    id: 'faq_gst_invoice',
    question: 'How can I download a GST tax invoice with my business GSTIN?',
    answer:
      'Every order on BharatKart comes with an authentic GST tax invoice inclusive of 18% GST. You can print or download the PDF invoice directly from your Order Details page after dispatch.',
    category: 'GENERAL',
  },
];

// GET /api/support/faqs
router.get('/faqs', (req, res) => {
  res.json({ success: true, data: SUPPORT_FAQS });
});

// GET /api/support/tickets
router.get('/tickets', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const ticketCol = db.collection<SupportTicket>('support_tickets');
    const userRole = req.user?.role;
    const userId = req.user?._id;

    let filter: any = {};
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      filter = { userId };
    }

    const tickets = await ticketCol.find(filter);
    // Sort by latest updated
    tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({ success: true, data: tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch tickets' });
  }
});

// GET /api/support/tickets/:id
router.get('/tickets/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const ticketCol = db.collection<SupportTicket>('support_tickets');
    const ticket = await ticketCol.findOne({ _id: req.params.id });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found' });
    }

    // Customer can only view their own tickets
    if (
      req.user?.role !== 'ADMIN' &&
      req.user?.role !== 'SUPER_ADMIN' &&
      ticket.userId !== req.user?._id
    ) {
      return res.status(403).json({ success: false, error: 'Access unauthorized' });
    }

    // Attach live order context if available
    let orderDetails: Order | null = null;
    if (ticket.orderId) {
      const orderCol = db.collection<Order>('orders');
      orderDetails = await orderCol.findOne({ _id: ticket.orderId });
    }

    res.json({ success: true, data: { ticket, orderDetails } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching ticket' });
  }
});

// POST /api/support/tickets
router.post('/tickets', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { subject, category = 'GENERAL', message, orderId, priority = 'MEDIUM' } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, error: 'Subject and message are required' });
    }

    const ticketCol = db.collection<SupportTicket>('support_tickets');
    const orderCol = db.collection<Order>('orders');

    let linkedOrder: Order | null = null;
    let orderContext: SupportMessage['orderContext'] = undefined;

    if (orderId) {
      linkedOrder = await orderCol.findOne({ _id: orderId });
      if (linkedOrder) {
        orderContext = {
          orderNumber: linkedOrder.orderNumber,
          status: linkedOrder.status || linkedOrder.orderStatus,
          totalAmount: linkedOrder.totalAmount,
          trackingNumber: linkedOrder.trackingNumber,
          courierPartner: linkedOrder.courierPartner,
        };
      }
    }

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const initialMessages: SupportMessage[] = [
      {
        id: `msg_${Date.now()}_1`,
        sender: 'USER',
        senderName: req.user?.name || 'Customer',
        text: message.trim(),
        timestamp: now,
        orderContext,
      },
    ];

    // Formulate automated AI executive acknowledgement tailored for Indian shoppers
    let autoReplyText = `Namaste ${req.user?.name || 'Customer'}! Thank you for reaching out to BharatKart 24x7 Customer Care. Your ticket #${ticketNumber} has been logged.`;

    if (category === 'ORDER_STATUS' && linkedOrder) {
      autoReplyText = `Namaste ${req.user?.name}! I have pulled up your consignment details for Order #${linkedOrder.orderNumber}.\n\n` +
        `• Current Status: ${linkedOrder.status || linkedOrder.orderStatus}\n` +
        `• Courier Partner: ${linkedOrder.courierPartner || 'Fulfillment Hub Dispatch'}\n` +
        `• AWB Tracking: ${linkedOrder.trackingNumber || 'Generating in Bhiwandi hub'}\n` +
        `• Delivery Destination: ${linkedOrder.shippingAddress?.city}, ${linkedOrder.shippingAddress?.pincode}\n\n` +
        `Our logistics support agent is monitoring this shipment. What specific query can I help you with?`;
    } else if (category === 'PAYMENT_UPI') {
      autoReplyText = `Namaste ${req.user?.name}! For UPI payments (GPay / PhonePe / Paytm / BHIM), if money was deducted without instant confirmation:\n\n` +
        `1. Under NPCI guidelines, failed transactions auto-reverse within 2-4 business hours.\n` +
        `2. If your order is pending verification, please share your 12-digit UPI UTR number here for instant manual reconciliation.`;
    } else if (category === 'RETURN_REFUND') {
      autoReplyText = `Namaste ${req.user?.name}! BharatKart offers a hassle-free 7-day doorstep return policy. Please specify if there is a defect, incorrect size, or transit damage so we can arrange an immediate pickup executive.`;
    }

    initialMessages.push({
      id: `msg_${Date.now()}_2`,
      sender: 'AGENT',
      senderName: 'BharatKart Care Support',
      text: autoReplyText,
      timestamp: new Date(Date.now() + 500).toISOString(),
    });

    const newTicket: SupportTicket = {
      _id: ticketId,
      ticketNumber,
      userId: req.user?._id || 'guest',
      userName: req.user?.name || 'Customer',
      userEmail: req.user?.email || '',
      orderId: linkedOrder?._id,
      orderNumber: linkedOrder?.orderNumber,
      subject: subject.trim(),
      category,
      status: 'OPEN',
      priority,
      messages: initialMessages,
      createdAt: now,
      updatedAt: now,
    };

    await ticketCol.insertOne(newTicket);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: newTicket,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create support ticket' });
  }
});

// POST /api/support/tickets/:id/messages
router.post('/tickets/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Message text cannot be empty' });
    }

    const ticketCol = db.collection<SupportTicket>('support_tickets');
    const ticket = await ticketCol.findOne({ _id: req.params.id });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found' });
    }

    const isAgent = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    const senderRole = isAgent ? 'AGENT' : 'USER';
    const now = new Date().toISOString();

    const userMessage: SupportMessage = {
      id: `msg_${Date.now()}_u`,
      sender: senderRole,
      senderName: req.user?.name || (isAgent ? 'Support Specialist' : 'Customer'),
      text: text.trim(),
      timestamp: now,
    };

    ticket.messages.push(userMessage);
    ticket.updatedAt = now;
    if (ticket.status === 'OPEN' && isAgent) {
      ticket.status = 'IN_PROGRESS';
    }

    // If a user sent the message, generate an intelligent automated response if helpful
    if (!isAgent) {
      const lower = text.toLowerCase();
      let smartReply: string | null = null;

      if (lower.includes('where is') || lower.includes('status') || lower.includes('track')) {
        if (ticket.orderNumber) {
          smartReply = `Regarding Order #${ticket.orderNumber}: Our system confirms the consignment is on track. You can monitor live courier dispatch events under "My Orders & Consignments". An executive will also review if there are regional weather delays.`;
        } else {
          smartReply = `To help track your order immediately, please share your BharatKart Order Number (e.g. BK-2026-...) or select it from the ticket order dropdown.`;
        }
      } else if (lower.includes('cancel')) {
        smartReply = `If your order has not yet been dispatched by the courier, you can cancel directly from your Order Details page for an instant refund. If already shipped, you can refuse delivery at your doorstep for automated return.`;
      } else if (lower.includes('refund') || lower.includes('money')) {
        smartReply = `Refunds for cancelled or returned orders are credited back within 2-4 hours for UPI payments, and 2-5 business days for Credit/Debit cards per Indian banking clearing cycles.`;
      }

      if (smartReply) {
        const agentMsg: SupportMessage = {
          id: `msg_${Date.now()}_auto`,
          sender: 'AGENT',
          senderName: 'BharatKart Care Support',
          text: smartReply,
          timestamp: new Date(Date.now() + 800).toISOString(),
        };
        ticket.messages.push(agentMsg);
      }
    }

    await ticketCol.updateOne({ _id: ticket._id }, ticket);

    res.json({
      success: true,
      message: 'Message sent',
      data: ticket,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to send message' });
  }
});

// PATCH /api/support/tickets/:id/status
router.patch('/tickets/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body;
    const allowed = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket status' });
    }

    const ticketCol = db.collection<SupportTicket>('support_tickets');
    const ticket = await ticketCol.findOne({ _id: req.params.id });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();

    await ticketCol.updateOne({ _id: ticket._id }, ticket);

    res.json({
      success: true,
      message: `Ticket status updated to ${status}`,
      data: ticket,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update ticket status' });
  }
});

export default router;
