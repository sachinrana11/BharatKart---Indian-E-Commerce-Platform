import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  HelpCircle,
  Package,
  ChevronRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Headphones,
  RotateCcw,
  CreditCard,
  Truck,
  ExternalLink,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { SupportTicket, SupportMessage, Order, TicketCategory } from '../types.js';

interface CustomerSupportWidgetProps {
  onNavigate?: (view: string, params?: any) => void;
}

export const CustomerSupportWidget: React.FC<CustomerSupportWidgetProps> = ({ onNavigate }) => {
  const { user, token, isAuthenticated, loginAsDemo } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'faqs'>('chat');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // New Ticket State
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('ORDER_STATUS');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [initialMessage, setInitialMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Conversation Message State
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // FAQs
  const [faqs, setFaqs] = useState<any[]>([]);
  const [faqSearch, setFaqSearch] = useState('');

  // Fetch Tickets
  const fetchTickets = async () => {
    if (!token) return;
    try {
      setLoadingTickets(true);
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTickets(json.data);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch Orders for linking
  const fetchUserOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUserOrders(json.data);
      }
    } catch (err) {
      console.error('Failed to load user orders:', err);
    }
  };

  // Fetch FAQs
  const fetchFaqs = async () => {
    try {
      const res = await fetch('/api/support/faqs');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFaqs(json.data);
      }
    } catch (err) {
      console.error('Failed to load FAQs:', err);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
      fetchUserOrders();
    }
  }, [isAuthenticated, token]);

  // Listen for custom event to open support for a specific order
  useEffect(() => {
    const handleOpenSupport = (e: CustomEvent) => {
      setIsOpen(true);
      setActiveTab('chat');
      if (e.detail?.orderId) {
        setIsCreatingTicket(true);
        setSelectedOrderId(e.detail.orderId);
        setNewCategory('ORDER_STATUS');
        setNewSubject(`Query regarding Order #${e.detail.orderNumber || ''}`);
      }
    };

    window.addEventListener('open-support' as any, handleOpenSupport as any);
    return () => window.removeEventListener('open-support' as any, handleOpenSupport as any);
  }, []);

  // Scroll to bottom of message list
  useEffect(() => {
    if (selectedTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages]);

  // Handle Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !initialMessage.trim()) {
      showToast('Please provide both subject and details of your query', 'error');
      return;
    }

    try {
      setSubmittingTicket(true);
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: newSubject.trim(),
          category: newCategory,
          orderId: selectedOrderId || undefined,
          message: initialMessage.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast('Support ticket logged. Connected to care executive!', 'success');
        setTickets(prev => [json.data, ...prev]);
        setSelectedTicket(json.data);
        setIsCreatingTicket(false);
        setNewSubject('');
        setInitialMessage('');
        setSelectedOrderId('');
      } else {
        showToast(json.error || 'Failed to submit ticket', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error submitting ticket', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Handle Send Message in active ticket
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedTicket) return;

    const userText = messageInput.trim();
    setMessageInput('');

    try {
      setSendingMessage(true);
      const res = await fetch(`/api/support/tickets/${selectedTicket._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: userText }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setSelectedTicket(json.data);
        setTickets(prev => prev.map(t => (t._id === json.data._id ? json.data : t)));
      } else {
        showToast(json.error || 'Failed to send message', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error sending message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Close / Resolve Ticket
  const handleUpdateStatus = async (ticketId: string, status: 'RESOLVED' | 'CLOSED') => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Ticket marked as ${status.toLowerCase()}`, 'success');
        setSelectedTicket(json.data);
        setTickets(prev => prev.map(t => (t._id === ticketId ? json.data : t)));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update ticket status', 'error');
    }
  };

  const getCategoryLabel = (cat: TicketCategory) => {
    switch (cat) {
      case 'ORDER_STATUS':
        return 'Delivery & Tracking';
      case 'PAYMENT_UPI':
        return 'UPI & Refunds';
      case 'RETURN_REFUND':
        return '7-Day Return';
      case 'PRODUCT_QUERY':
        return 'Product Info';
      default:
        return 'General Query';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Open</span>;
      case 'IN_PROGRESS':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">In Progress</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Resolved</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  const activeTicketsCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  const filteredFaqs = faqs.filter(
    f =>
      f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5"
            aria-label="Open 24x7 Customer Support"
          >
            <div className="relative">
              <Headphones className="w-5 h-5 animate-pulse" />
              {activeTicketsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {activeTicketsCount}
                </span>
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-black tracking-tight leading-none">24x7 Live Care</div>
              <div className="text-[10px] text-orange-100 font-medium leading-tight">Order &amp; UPI Support</div>
            </div>
          </button>
        )}
      </div>

      {/* Support Chat Floating Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-xs">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black tracking-tight text-white">BharatKart Customer Care</h3>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <span>Pan-India Helpdesk</span>
                  <span>&bull;</span>
                  <span className="text-emerald-400 font-semibold">Live &bull; Avg reply &lt; 2 mins</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center border-b border-slate-100 bg-slate-50/80 px-3 py-1.5 shrink-0 text-xs">
            <button
              onClick={() => {
                setActiveTab('chat');
                setIsCreatingTicket(false);
              }}
              className={`flex-1 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'chat'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
              <span>Tickets &amp; Live Chat</span>
              {activeTicketsCount > 0 && (
                <span className="bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {activeTicketsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('faqs');
                setSelectedTicket(null);
                setIsCreatingTicket(false);
              }}
              className={`flex-1 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'faqs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Instant Help &amp; FAQs</span>
            </button>
          </div>

          {/* Tab 1: Chat & Tickets */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
              {/* Not Authenticated Guard */}
              {!isAuthenticated ? (
                <div className="p-6 text-center space-y-4 my-auto">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Sign in to Access Order Support</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Link active consignments, track UPI refund status, or log tickets with our executives.
                    </p>
                  </div>
                  <button
                    onClick={() => loginAsDemo('customer')}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                  >
                    Quick Sign-In as Rahul Sharma
                  </button>
                </div>
              ) : selectedTicket ? (
                /* Active Ticket Conversation View */
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Ticket Header & Back Button */}
                  <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                        title="Back to Tickets"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-slate-800">
                            #{selectedTicket.ticketNumber}
                          </span>
                          {getStatusBadge(selectedTicket.status)}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                          {selectedTicket.subject}
                        </h4>
                      </div>
                    </div>

                    {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedTicket._id, 'RESOLVED')}
                        className="text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>

                  {/* Linked Order Preview Banner */}
                  {selectedTicket.orderNumber && (
                    <div className="bg-orange-50/80 border-b border-orange-100 p-2.5 flex items-center justify-between text-xs shrink-0">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 text-[11px]">
                            Order #{selectedTicket.orderNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            BlueDart / Delhivery Consignment
                          </span>
                        </div>
                      </div>
                      {onNavigate && selectedTicket.orderId && (
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            onNavigate('order-detail', { id: selectedTicket.orderId });
                          }}
                          className="text-[10px] font-bold text-orange-700 hover:underline flex items-center gap-0.5"
                        >
                          <span>Track</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Message Bubble List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {selectedTicket.messages.map(msg => {
                      const isMe = msg.sender === 'USER';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="text-[10px] text-slate-400 font-medium mb-0.5 px-1">
                            {msg.senderName} &bull;{' '}
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>

                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs whitespace-pre-line leading-relaxed ${
                              isMe
                                ? 'bg-orange-600 text-white rounded-br-xs'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                            }`}
                          >
                            {msg.text}
                          </div>

                          {/* Render Context Card if attached */}
                          {msg.orderContext && (
                            <div className="mt-1.5 p-2 bg-slate-100/90 border border-slate-200 rounded-xl text-[10px] text-slate-700 max-w-[85%] space-y-1">
                              <div className="font-bold flex items-center gap-1 text-slate-900">
                                <Truck className="w-3 h-3 text-orange-600" />
                                <span>Consignment #{msg.orderContext.orderNumber}</span>
                              </div>
                              <div>Status: <strong>{msg.orderContext.status}</strong></div>
                              {msg.orderContext.courierPartner && (
                                <div>Courier: <strong>{msg.orderContext.courierPartner}</strong> ({msg.orderContext.trackingNumber})</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Action Chips */}
                  <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[10px]">
                    {[
                      'Where is my delivery?',
                      'UPI deducted without order',
                      'Request 7-day pickup',
                      'Invoice copy',
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMessageInput(chip)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 font-semibold rounded-lg shrink-0 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Input form */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
                  >
                    <input
                      type="text"
                      placeholder="Type your message to support..."
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !messageInput.trim()}
                      className="p-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 shadow-xs"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : isCreatingTicket ? (
                /* New Ticket Creation Form */
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <button
                      onClick={() => setIsCreatingTicket(false)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Tickets</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">New Support Query</span>
                  </div>

                  <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
                    {/* Category */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Select Issue Category</label>
                      <select
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value as TicketCategory)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs"
                      >
                        <option value="ORDER_STATUS">Delivery, Courier &amp; Tracking</option>
                        <option value="PAYMENT_UPI">UPI &amp; Payment Reconciliation</option>
                        <option value="RETURN_REFUND">7-Day Doorstep Return &amp; Refund</option>
                        <option value="PRODUCT_QUERY">Product Specifications &amp; Warranty</option>
                        <option value="GENERAL">General Account / GST Invoice</option>
                      </select>
                    </div>

                    {/* Link Recent Order */}
                    {userOrders.length > 0 && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Link Order (Optional)
                        </label>
                        <select
                          value={selectedOrderId}
                          onChange={e => setSelectedOrderId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs"
                        >
                          <option value="">No specific order</option>
                          {userOrders.map(ord => (
                            <option key={ord._id} value={ord._id}>
                              Order #{ord.orderNumber} (₹{ord.totalAmount} &bull; {ord.status || ord.orderStatus})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Subject */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Delivery delay / UPI refund confirmation"
                        value={newSubject}
                        onChange={e => setNewSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    {/* Message Details */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Message Details</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Describe your issue with details (e.g. UPI UTR number, preferred callback timing)..."
                        value={initialMessage}
                        onChange={e => setInitialMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingTicket}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      {submittingTicket ? (
                        <span>Connecting to Agent...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Ticket &amp; Connect to Agent</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* Ticket List View */
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* Create New Ticket CTA */}
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Need personal assistance?</h4>
                      <p className="text-[10px] text-slate-500">
                        Chat directly with our fulfillment &amp; payments team.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCreatingTicket(true)}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                    >
                      New Ticket
                    </button>
                  </div>

                  {/* List of Tickets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                      <span>Your Support History ({tickets.length})</span>
                      <button onClick={fetchTickets} className="hover:text-orange-600">
                        Refresh
                      </button>
                    </div>

                    {loadingTickets ? (
                      <div className="py-8 text-center text-xs text-slate-400">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="text-xs font-bold text-slate-700">No support tickets yet</div>
                        <p className="text-[11px] text-slate-500">
                          Have questions regarding your orders, UPI payments, or 7-day returns? Open a ticket.
                        </p>
                      </div>
                    ) : (
                      tickets.map(ticket => (
                        <div
                          key={ticket._id}
                          onClick={() => setSelectedTicket(ticket)}
                          className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-orange-300 transition-all cursor-pointer shadow-2xs space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-slate-900">
                                #{ticket.ticketNumber}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {getCategoryLabel(ticket.category)}
                              </span>
                            </div>
                            {getStatusBadge(ticket.status)}
                          </div>

                          <div className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                            {ticket.subject}
                          </div>

                          {ticket.orderNumber && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Package className="w-3 h-3 text-orange-500" />
                              <span>Order #{ticket.orderNumber}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>{ticket.messages.length} message(s)</span>
                            <span>{new Date(ticket.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Instant Help & FAQs */}
          {activeTab === 'faqs' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
              {/* FAQ Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search FAQ (e.g. UPI refund, BlueDart tracking, COD)..."
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  className="w-full px-3 py-2 pl-8 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                />
                <HelpCircle className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* FAQ Accordion List */}
              <div className="space-y-2">
                {filteredFaqs.map(faq => (
                  <div key={faq.id} className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs">
                    <div className="font-bold text-xs text-slate-900 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"></span>
                      <span>{faq.question}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed pl-3.5">
                      {faq.answer}
                    </p>
                    <div className="pt-1 pl-3.5 flex justify-end">
                      <button
                        onClick={() => {
                          setActiveTab('chat');
                          setIsCreatingTicket(true);
                          setNewCategory(faq.category as TicketCategory);
                          setNewSubject(faq.question);
                        }}
                        className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-1"
                      >
                        <span>Need more help? Chat with Agent</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
            <span>🛡️ Official BharatKart Escrow &amp; Care</span>
            <span>Toll-Free: 1800-209-BHARAT</span>
          </div>
        </div>
      )}
    </>
  );
};
