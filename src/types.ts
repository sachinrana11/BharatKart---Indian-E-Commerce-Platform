export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Address {
  _id: string;
  userId: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  pincode: string;
  locality: string;
  addressLine: string;
  city: string;
  state: string;
  landmark?: string;
  type: 'HOME' | 'WORK';
  isDefault: boolean;
  createdAt?: string;
}

export interface ProductVariantOption {
  id: string;
  name: string;
  sku: string;
  priceOffset: number;
  stock: number;
  image?: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Color", "Size", "Storage"
  type: 'color' | 'size' | 'storage' | 'general';
  options: ProductVariantOption[];
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  brand: string;
  category: string;
  subcategory?: string;
  description: string;
  features: string[];
  specifications: Record<string, string>;
  images: string[];
  thumbnail: string;
  mrp: number;
  price: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  variants?: ProductVariant[];
  sku: string;
  stock: number;
  lowStockThreshold: number;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  tags: string[];
  codAvailable: boolean;
  shippingCharges: number;
  returnDays: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  image: string;
  icon?: string;
  subcategories: string[];
  itemCount?: number;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  isPopular?: boolean;
}

export interface CartItem {
  productId: string;
  title: string;
  image: string;
  sku: string;
  price: number;
  mrp: number;
  quantity: number;
  selectedVariant?: {
    variantId?: string;
    variantName: string;
    optionId?: string;
    optionName: string;
    priceOffset: number;
  };
  variantKey?: string;
  variantDetails?: string;
  maxStock: number;
}

export interface Cart {
  _id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  couponDiscount: number;
  shipping: number;
  tax: number; // 18% GST standard
  total: number;
  updatedAt?: string;
}

export type PaymentMethod =
  | 'UPI_QR'
  | 'UPI_ID'
  | 'RAZORPAY'
  | 'RAZORPAY_SIMULATED'
  | 'CARD'
  | 'NET_BANKING'
  | 'WALLET'
  | 'COD';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export interface OrderTimelineStep {
  status: OrderStatus;
  title: string;
  description: string;
  timestamp: string;
  location?: string;
  completed: boolean;
}

export type OrderTimelineItem = OrderTimelineStep;

export interface Payment {
  _id: string;
  orderId: string;
  orderNumber: string;
  paymentId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  upiDeepLink?: string;
  qrCodeDataUrl?: string;
  transactionRef?: string;
  failureReason?: string;
  paidAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  image: string;
  sku: string;
  price: number;
  mrp: number;
  quantity: number;
  variantDetails?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  couponDiscount: number;
  shippingCharge: number;
  shippingFee?: number;
  taxAmount: number;
  tax?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  orderStatus: OrderStatus;
  status?: OrderStatus;
  timeline: OrderTimelineStep[];
  courierPartner?: string;
  trackingNumber?: string;
  estimatedDeliveryDate: string;
  deliveredAt?: string;
  cancelledReason?: string;
  cancelledAt?: string;
  returnReason?: string;
  returnDetails?: string;
  returnRequestedAt?: string;
  returnStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  refundAmount?: number;
  refundedAt?: string;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FLAT';
  discountValue: number;
  minOrderAmount?: number;
  minOrderValue?: number;
  maxDiscountAmount: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  isActive: boolean;
  categoryRestriction?: string;
}

export interface FlashSale {
  _id: string;
  title: string;
  subtitle: string;
  discountPercent: number;
  startTime: string;
  endTime: string;
  productIds: string[];
  bannerImage: string;
  isActive: boolean;
}

export interface Review {
  _id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  isVerifiedPurchase?: boolean;
  helpfulVotes: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string;
}

export interface Banner {
  _id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  badge?: string;
  bgColor?: string;
  order: number;
  isActive: boolean;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'PROMO' | 'SYSTEM';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface PincodeDeliveryInfo {
  pincode: string;
  city: string;
  state: string;
  isDeliverable: boolean;
  estimatedDays: number;
  courierPartner: string;
  shippingCharge: number;
  codAvailable: boolean;
}

export type TicketCategory =
  | 'ORDER_STATUS'
  | 'PAYMENT_UPI'
  | 'RETURN_REFUND'
  | 'PRODUCT_QUERY'
  | 'GENERAL';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportMessage {
  id: string;
  sender: 'USER' | 'AGENT' | 'SYSTEM';
  senderName: string;
  text: string;
  timestamp: string;
  orderContext?: {
    orderNumber: string;
    status: string;
    totalAmount: number;
    trackingNumber?: string;
    courierPartner?: string;
  };
}

export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  orderId?: string;
  orderNumber?: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  total?: number;
  page?: number;
  pages?: number;
}
