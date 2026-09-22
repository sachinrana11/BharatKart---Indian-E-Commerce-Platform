/**
 * BharatKart Robust API Service Module (Powered by Axios)
 * 
 * Centralized HTTP communication layer featuring:
 * - Native Axios instance configured with robust defaults
 * - Axios Request Interceptor: Automatic Bearer JWT token injection & session ID tracking
 * - Axios Response Interceptor: Standardized error parsing, 401/429 event dispatch, & response payload unwrapping
 * - Standardized, typed ApiError class with HTTP status mapping & user-friendly localized messages
 * - Domain-specific type-safe endpoints for all backend modules (Auth, Products, Cart, Orders, Payments, Support, Admin)
 * - Custom event emitters for global UI error handling (e.g. 401 unauthorized, 429 rate limit, network down)
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

import {
  User,
  Product,
  Cart,
  Order,
  Address,
  Coupon,
  SupportTicket,
  SupportMessage,
  Payment,
  PaymentMethod,
  UserRole,
  Banner,
  FlashSale,
  Category,
  Brand,
  Review,
} from '../types.js';

// ============================================================================
// Extended Axios Request Configuration & Notification Types
// ============================================================================

export interface ApiNotification {
  type: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  status?: number;
  code?: string;
  timestamp?: number;
}

export type NotificationListener = (notification: ApiNotification) => void;

export interface CustomRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipSessionId?: boolean;
  rawResponse?: boolean;
  skipNotification?: boolean;
}

export interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  skipAuth?: boolean;
  skipSessionId?: boolean;
  rawResponse?: boolean;
  skipNotification?: boolean;
}

export interface BackendResponseBody<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  retryAfter?: number;
  count?: number;
  total?: number;
  page?: number;
  totalPages?: number;
  inWishlist?: boolean;
}

// ============================================================================
// Standardized API Error Class
// ============================================================================

export class ApiError extends Error {
  public status: number;
  public code: string;
  public data: any;
  public retryAfter?: number;
  public userMessage: string;
  public isNetworkError: boolean;
  public isTimeout: boolean;
  public isAuthError: boolean;
  public isRateLimited: boolean;
  public originalError?: AxiosError;

  constructor(options: {
    message: string;
    status: number;
    code?: string;
    data?: any;
    retryAfter?: number;
    userMessage?: string;
    isNetworkError?: boolean;
    isTimeout?: boolean;
    originalError?: AxiosError;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.data = options.data;
    this.retryAfter = options.retryAfter;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isTimeout = Boolean(options.isTimeout);
    this.isAuthError = options.status === 401;
    this.isRateLimited = options.status === 429;
    this.originalError = options.originalError;

    // Determine specific error code
    if (options.code) {
      this.code = options.code;
    } else if (this.isTimeout) {
      this.code = 'TIMEOUT';
    } else if (this.isNetworkError) {
      this.code = 'NETWORK_ERROR';
    } else {
      switch (options.status) {
        case 400:
          this.code = 'BAD_REQUEST';
          break;
        case 401:
          this.code = 'UNAUTHORIZED';
          break;
        case 403:
          this.code = 'FORBIDDEN';
          break;
        case 404:
          this.code = 'NOT_FOUND';
          break;
        case 409:
          this.code = 'CONFLICT';
          break;
        case 422:
          this.code = 'UNPROCESSABLE_ENTITY';
          break;
        case 429:
          this.code = 'RATE_LIMITED';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          this.code = 'SERVER_ERROR';
          break;
        default:
          this.code = 'UNKNOWN_ERROR';
      }
    }

    // Determine polished, customer-facing friendly message
    if (options.userMessage) {
      this.userMessage = options.userMessage;
    } else if (this.isTimeout) {
      this.userMessage = 'Request timed out. Please check your network and try again.';
    } else if (this.isNetworkError) {
      this.userMessage = 'Unable to reach the server. Please check your internet connection.';
    } else if (this.isRateLimited) {
      this.userMessage = options.retryAfter
        ? `Too many requests. Please wait ${options.retryAfter}s before retrying.`
        : 'Too many requests. Please slow down and try again shortly.';
    } else if (this.isAuthError) {
      this.userMessage = 'Your session has expired. Please sign in again to continue.';
    } else if (this.status === 403) {
      this.userMessage = 'You do not have administrative permission to perform this action.';
    } else if (this.status === 404) {
      this.userMessage = options.message || 'The requested item or page could not be found.';
    } else if (this.status >= 500) {
      this.userMessage = 'Our servers encountered an unexpected issue. Please try again in a few moments.';
    } else {
      this.userMessage = options.message || 'An error occurred while processing your request.';
    }

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ============================================================================
// Storage, Context Token Provider, & Global Notification System
// ============================================================================

export type AuthTokenProvider = () => string | null | undefined;
let activeTokenProvider: AuthTokenProvider | null = null;

/**
 * Configure an external token provider (such as React AuthContext).
 * When registered, the request interceptor queries this provider first,
 * falling back to localStorage if empty.
 */
export const setAuthTokenProvider = (provider: AuthTokenProvider | null): void => {
  activeTokenProvider = provider;
};

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('bharatkart_token');
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem('bharatkart_token', token);
    } else {
      localStorage.removeItem('bharatkart_token');
    }
  } catch (e) {
    console.warn('Could not update token in localStorage', e);
  }
};

export const clearStoredToken = (): void => {
  setStoredToken(null);
};

/**
 * Resolves the authentication token from either the dynamic context provider
 * or browser localStorage.
 */
export const getAuthToken = (): string | null => {
  if (activeTokenProvider) {
    try {
      const contextToken = activeTokenProvider();
      if (contextToken) return contextToken;
    } catch (e) {
      console.warn('Error reading token from AuthContext provider:', e);
    }
  }
  return getStoredToken();
};

export const getSessionId = (): string => {
  try {
    let sessionId = localStorage.getItem('bharatkart_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('bharatkart_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return 'sess_fallback_' + Date.now();
  }
};

// Global Notification Listeners & Dispatcher
const notificationListeners = new Set<NotificationListener>();

export const onApiNotification = (listener: NotificationListener): (() => void) => {
  notificationListeners.add(listener);
  return () => {
    notificationListeners.delete(listener);
  };
};

export const dispatchGlobalNotification = (notification: ApiNotification): void => {
  const payload: ApiNotification = {
    ...notification,
    timestamp: notification.timestamp || Date.now(),
  };

  // 1. Notify subscribed in-app listeners (callbacks)
  notificationListeners.forEach(listener => {
    try {
      listener(payload);
    } catch (e) {
      console.error('Notification listener execution error:', e);
    }
  });

  // 2. Dispatch browser CustomEvents for decoupled components (e.g., ToastProvider)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api-notification', { detail: payload }));

    if (payload.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-unauthorized', { detail: payload }));
    } else if (payload.status === 403) {
      window.dispatchEvent(new CustomEvent('api-forbidden', { detail: payload }));
    } else if (payload.status && payload.status >= 500) {
      window.dispatchEvent(new CustomEvent('api-server-error', { detail: payload }));
    }
  }
};

// ============================================================================
// Axios Instance Creation
// ============================================================================

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ============================================================================
// Request Interceptor: Auth Token (localStorage / Context) & Session Tracking
// ============================================================================

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const customConfig = config as CustomInternalAxiosRequestConfig;

    // 1. Inject Bearer token from context or localStorage unless explicitly skipped
    if (!customConfig.skipAuth) {
      const token = getAuthToken();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 2. Inject x-session-id for guest carts, security tracking, and audit
    if (!customConfig.skipSessionId) {
      const sessionId = getSessionId();
      if (sessionId && !config.headers['x-session-id']) {
        config.headers['x-session-id'] = sessionId;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor: Standard Error Codes (401, 403, 500) & Global Notifications
// ============================================================================

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const customConfig = response.config as CustomInternalAxiosRequestConfig;

    // Return raw response object if caller specified rawResponse
    if (customConfig.rawResponse) {
      return response;
    }

    const resData = response.data;

    // Check if backend returned an explicit success: false payload inside 200 OK
    if (resData && typeof resData === 'object' && resData.success === false) {
      const error = new ApiError({
        message: resData.error || resData.message || 'Operation failed',
        status: response.status,
        data: resData,
        retryAfter: resData.retryAfter,
      });

      // Dispatch global api-error
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-error', { detail: error }));
      }

      if (!customConfig.skipNotification) {
        dispatchGlobalNotification({
          type: 'error',
          title: 'Operation Failed',
          message: error.userMessage,
          status: response.status,
          code: error.code,
        });
      }

      throw error;
    }

    return response;
  },
  (error: AxiosError<BackendResponseBody>) => {
    const customConfig = (error.config || {}) as CustomInternalAxiosRequestConfig;
    let apiError: ApiError;

    if (error.response) {
      // Server responded with an HTTP status code outside the 2xx range
      const status = error.response.status;
      const resData = error.response.data;
      const retryAfterHeader = error.response.headers?.['retry-after'];
      const retryAfter = retryAfterHeader
        ? parseInt(String(retryAfterHeader), 10)
        : resData?.retryAfter;

      const message =
        resData?.error ||
        resData?.message ||
        `HTTP Error ${status}: ${error.response.statusText || 'Unknown error'}`;

      apiError = new ApiError({
        message,
        status,
        data: resData,
        retryAfter,
        originalError: error,
      });

      // Centralized Error Code Notification Dispatch
      if (!customConfig.skipNotification) {
        if (status === 401) {
          // 401 Unauthorized: Expired or invalid session token
          clearStoredToken();
          dispatchGlobalNotification({
            type: 'warning',
            title: 'Session Expired',
            message: 'Your session has expired. Please sign in again.',
            status: 401,
            code: 'UNAUTHORIZED',
          });
        } else if (status === 403) {
          // 403 Forbidden: Missing administrative / role permissions
          dispatchGlobalNotification({
            type: 'error',
            title: 'Access Forbidden',
            message: apiError.userMessage || 'You do not have permission to perform this action.',
            status: 403,
            code: 'FORBIDDEN',
          });
        } else if (status === 429) {
          // 429 Too Many Requests: Rate limited
          dispatchGlobalNotification({
            type: 'warning',
            title: 'Rate Limited',
            message: apiError.userMessage || 'Too many requests. Please wait a moment before trying again.',
            status: 429,
            code: 'RATE_LIMITED',
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('api-rate-limited', {
                detail: { retryAfter: apiError.retryAfter, message: apiError.userMessage },
              })
            );
          }
        } else if (status >= 500) {
          // 500 Server Errors: Internal server error, bad gateway, service unavailable
          dispatchGlobalNotification({
            type: 'error',
            title: 'Server Error',
            message: apiError.userMessage || 'A server error occurred. Our engineers have been alerted.',
            status,
            code: 'SERVER_ERROR',
          });
        } else {
          // Other 4xx client errors (e.g. 400 Bad Request, 404 Not Found, 409 Conflict)
          dispatchGlobalNotification({
            type: 'error',
            title: 'Request Failed',
            message: apiError.userMessage,
            status,
            code: apiError.code,
          });
        }
      }
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      // Request timeout
      apiError = new ApiError({
        message: 'Request timed out after 15 seconds. Please check your connectivity.',
        status: 408,
        isTimeout: true,
        originalError: error,
      });

      if (!customConfig.skipNotification) {
        dispatchGlobalNotification({
          type: 'error',
          title: 'Request Timeout',
          message: apiError.userMessage,
          status: 408,
          code: 'TIMEOUT',
        });
      }
    } else if (error.request) {
      // Network failure / server not reachable
      apiError = new ApiError({
        message: 'Network connection failure. The server could not be reached.',
        status: 0,
        isNetworkError: true,
        originalError: error,
      });

      if (!customConfig.skipNotification) {
        dispatchGlobalNotification({
          type: 'error',
          title: 'Network Error',
          message: apiError.userMessage,
          status: 0,
          code: 'NETWORK_ERROR',
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-network-error', { detail: apiError }));
      }
    } else {
      // Setup or runtime configuration error
      apiError = new ApiError({
        message: error.message || 'An unexpected error occurred during request dispatch',
        status: 500,
        originalError: error,
      });
    }

    // Dispatch global error event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-error', { detail: apiError }));
    }

    return Promise.reject(apiError);
  }
);

// ============================================================================
// ApiClient Wrapper (Compatible with both Axios & Promise calls)
// ============================================================================

export class ApiClient {
  public axios: AxiosInstance = axiosInstance;
  public interceptors = axiosInstance.interceptors;

  public getToken(): string | null {
    return getAuthToken();
  }

  public setToken(token: string | null): void {
    setStoredToken(token);
  }

  public clearToken(): void {
    clearStoredToken();
  }

  public setTokenProvider(provider: AuthTokenProvider | null): void {
    setAuthTokenProvider(provider);
  }

  public onNotification(listener: NotificationListener): (() => void) {
    return onApiNotification(listener);
  }

  public dispatchNotification(notification: ApiNotification): void {
    dispatchGlobalNotification(notification);
  }

  public getSessionId(): string {
    return getSessionId();
  }

  /**
   * Universal Request Helper
   * Automatically unwraps standard `{ success: true, data: T }` response envelopes.
   */
  public async request<T = any>(config: CustomRequestConfig): Promise<T> {
    const response = await this.axios.request<any>(config);
    return this.unwrapData<T>(response);
  }

  public async get<T = any>(url: string, config?: CustomRequestConfig): Promise<T> {
    const response = await this.axios.get<any>(url, config);
    return this.unwrapData<T>(response);
  }

  public async post<T = any>(url: string, data?: any, config?: CustomRequestConfig): Promise<T> {
    const response = await this.axios.post<any>(url, data, config);
    return this.unwrapData<T>(response);
  }

  public async put<T = any>(url: string, data?: any, config?: CustomRequestConfig): Promise<T> {
    const response = await this.axios.put<any>(url, data, config);
    return this.unwrapData<T>(response);
  }

  public async patch<T = any>(url: string, data?: any, config?: CustomRequestConfig): Promise<T> {
    const response = await this.axios.patch<any>(url, data, config);
    return this.unwrapData<T>(response);
  }

  public async delete<T = any>(url: string, config?: CustomRequestConfig): Promise<T> {
    const response = await this.axios.delete<any>(url, config);
    return this.unwrapData<T>(response);
  }

  /**
   * Helper to unwrap server envelope { success: true, data: T } to T
   */
  private unwrapData<T>(response: AxiosResponse): T {
    if (response.config && (response.config as CustomRequestConfig).rawResponse) {
      return response as unknown as T;
    }

    const body = response.data;
    if (body && typeof body === 'object') {
      // If server returned { success: true, data: ... }
      if ('data' in body && 'success' in body) {
        return body.data as T;
      }
      return body as T;
    }
    return body as T;
  }
}

export const apiClient = new ApiClient();

// ============================================================================
// Domain-Specific Type-Safe API Services
// ============================================================================

/**
 * Authentication & Account API
 */
export const authApi = {
  login: (email: string, password: string = 'user123') =>
    apiClient.post<{ token: string; user: User }>('/auth/login', { email, password }),

  register: (payload: { name: string; email: string; password?: string; phone?: string }) =>
    apiClient.post<{ token: string; user: User }>('/auth/register', payload),

  getMe: () => apiClient.get<User>('/auth/me'),

  logout: () => {
    apiClient.clearToken();
  },
};

/**
 * Product Catalog & Discovery API
 */
export const productsApi = {
  getAll: (params?: {
    category?: string;
    subcategory?: string;
    brand?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    sort?: string;
    page?: number;
    limit?: number;
    inStock?: boolean;
    featured?: boolean;
    trending?: boolean;
    deal?: boolean;
  }) => apiClient.get<Product[]>('/products', { params }),

  queryCatalog: async (params?: Record<string, any>) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: Product[];
      total: number;
      page: number;
      pages: number;
      limit: number;
    }>('/products', { params });
    return res.data;
  },

  getById: (id: string) => apiClient.get<Product>(`/products/${id}`),

  getBySlug: (slug: string) => apiClient.get<Product>(`/products/slug/${slug}`),

  getDetails: async (slugOrId: string) => {
    const res = await axiosInstance.get<{
      success: boolean;
      data: Product;
      reviews?: any[];
      related?: Product[];
    }>(`/products/${slugOrId}`);
    return res.data;
  },

  getCategories: () => apiClient.get<Category[]>('/products/meta/categories'),

  getBrands: () => apiClient.get<Brand[]>('/products/meta/brands'),

  getBanners: () => apiClient.get<Banner[]>('/products/meta/banners'),

  getFlashSale: () =>
    apiClient.get<{ sale: FlashSale | null; products: Product[] }>('/products/meta/flash-sale'),

  autocomplete: (query: string) =>
    apiClient.get<string[]>('/products/autocomplete', { params: { q: query } }),

  getReviews: (productId: string) => apiClient.get<Review[]>(`/products/${productId}/reviews`),

  addReview: (
    productId: string,
    review: { rating: number; title: string; comment: string; reviewerName?: string }
  ) => apiClient.post<Review>(`/products/${productId}/reviews`, review),
};

/**
 * Shopping Cart & Discounts API
 */
export const cartApi = {
  getCart: () => apiClient.get<Cart>('/cart'),

  addToCart: (productId: string, quantity: number = 1, selectedVariant?: any) =>
    apiClient.post<Cart>('/cart/items', { productId, quantity, selectedVariant }),

  updateQuantity: (productId: string, quantity: number, variantKey?: string) =>
    apiClient.put<Cart>(`/cart/items/${productId}`, { quantity, variantKey }),

  removeFromCart: (productId: string, variantKey?: string) =>
    apiClient.delete<Cart>(`/cart/items/${productId}`, { params: { variantKey } }),

  clearCart: () => apiClient.delete<{ success: boolean }>('/cart'),

  applyCoupon: (code: string) => apiClient.post<Cart>('/cart/apply-coupon', { code }),

  removeCoupon: () => apiClient.post<Cart>('/cart/remove-coupon'),
};

/**
 * Checkout & Calculation API
 */
export const checkoutApi = {
  checkPincode: (pincode: string, orderTotal: number = 0) =>
    apiClient.post<any>('/checkout/pincode', { pincode, orderTotal }),

  calculateSummary: (payload: {
    items: any[];
    couponCode?: string;
    deliverySpeed?: 'STANDARD' | 'EXPRESS';
    pincode?: string;
  }) => apiClient.post<any>('/checkout/calculate', payload),
};

/**
 * Orders & Consignment Tracking API
 */
export const ordersApi = {
  createOrder: (payload: {
    shippingAddress: Partial<Address>;
    items?: any[];
    couponCode?: string;
    deliverySpeed?: 'STANDARD' | 'EXPRESS';
    paymentMethod?: PaymentMethod;
  }) => apiClient.post<Order>('/orders', payload),

  getOrders: () => apiClient.get<Order[]>('/orders'),

  getOrderById: (id: string) => apiClient.get<Order>(`/orders/${id}`),

  trackOrder: (orderId: string) => apiClient.get<any>(`/orders/${orderId}/track`),

  cancelOrder: (id: string, reason?: string) =>
    apiClient.post<Order>(`/orders/${id}/cancel`, { reason }),

  requestReturn: (id: string, reason: string, items?: any[]) =>
    apiClient.post<Order>(`/orders/${id}/return`, { reason, items }),
};

/**
 * Payments & UPI Integration API
 */
export const paymentsApi = {
  createPaymentSession: (payload: {
    orderId: string;
    method?: PaymentMethod;
    upiId?: string;
  }) => apiClient.post<any>('/payments/create', payload),

  verifyPayment: (payload: {
    orderId: string;
    paymentId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    upiTransactionRef?: string;
    transactionRef?: string;
    simulateSuccess?: boolean;
    method?: PaymentMethod;
  }) => apiClient.post<any>('/payments/verify', payload),
};

/**
 * User Profile & Saved Addresses API
 */
export const userApi = {
  getAddresses: () => apiClient.get<Address[]>('/user/addresses'),

  addAddress: (address: Partial<Address>) => apiClient.post<Address>('/user/addresses', address),

  updateAddress: (id: string, address: Partial<Address>) =>
    apiClient.put<Address>(`/user/addresses/${id}`, address),

  deleteAddress: (id: string) => apiClient.delete<{ success: boolean }>(`/user/addresses/${id}`),

  setDefaultAddress: (id: string) =>
    apiClient.patch<Address>(`/user/addresses/${id}/default`),

  getWishlist: () => apiClient.get<Product[]>('/user/wishlist'),

  toggleWishlist: (productId: string) =>
    apiClient.post<{ inWishlist: boolean; message: string; success?: boolean }>('/user/wishlist/toggle', { productId }),
};

/**
 * 24x7 Customer Support & Live Helpdesk API
 */
export const supportApi = {
  getFaqs: () => apiClient.get<any[]>('/support/faqs'),

  getTickets: () => apiClient.get<SupportTicket[]>('/support/tickets'),

  getTicketById: (id: string) =>
    apiClient.get<{ ticket: SupportTicket; orderDetails?: Order }>(`/support/tickets/${id}`),

  createTicket: (payload: {
    subject: string;
    message: string;
    category?: string;
    orderId?: string;
    priority?: string;
  }) => apiClient.post<SupportTicket>('/support/tickets', payload),

  sendMessage: (ticketId: string, text: string) =>
    apiClient.post<SupportTicket>(`/support/tickets/${ticketId}/messages`, { text }),

  updateTicketStatus: (ticketId: string, status: string) =>
    apiClient.patch<SupportTicket>(`/support/tickets/${ticketId}/status`, { status }),
};

/**
 * Admin Operations & Inventory Management API
 */
export const adminApi = {
  getStats: () => apiClient.get<any>('/admin/metrics'),

  getMetrics: () => apiClient.get<any>('/admin/metrics'),

  getProducts: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    apiClient.get<Product[]>('/admin/products', { params }),

  createProduct: (product: Partial<Product>) =>
    apiClient.post<Product>('/admin/products', product),

  updateProduct: (id: string, product: Partial<Product>) =>
    apiClient.put<Product>(`/admin/products/${id}`, product),

  deleteProduct: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/products/${id}`),

  getOrders: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get<Order[]>('/admin/orders', { params }),

  updateOrderStatus: (
    orderId: string,
    status: string,
    payload?: { courierPartner?: string; trackingNumber?: string }
  ) => apiClient.patch<Order>(`/admin/orders/${orderId}/status`, { status, ...payload }),

  getCoupons: () => apiClient.get<Coupon[]>('/admin/coupons'),

  createCoupon: (coupon: Partial<Coupon>) => apiClient.post<Coupon>('/admin/coupons', coupon),

  deleteCoupon: (id: string) => apiClient.delete<{ success: boolean }>(`/admin/coupons/${id}`),

  getAuditLogs: (limit: number = 50) =>
    apiClient.get<any[]>('/admin/audit-logs', { params: { limit } }),
};

// Default export unified object
export const api = {
  axios: axiosInstance,
  client: apiClient,
  auth: authApi,
  products: productsApi,
  cart: cartApi,
  checkout: checkoutApi,
  orders: ordersApi,
  payments: paymentsApi,
  user: userApi,
  support: supportApi,
  admin: adminApi,
};

export default api;
