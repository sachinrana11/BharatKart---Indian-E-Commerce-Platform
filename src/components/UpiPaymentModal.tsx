import React, { useState, useEffect } from 'react';
import { X, Check, Copy, AlertCircle, ShieldCheck, Smartphone } from 'lucide-react';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import { paymentsApi, ApiError } from '../services/api.js';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  amount: number;
  onSuccess: (payment: any) => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  amount,
  onSuccess,
}) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Fetch or generate payment session
  useEffect(() => {
    if (!isOpen || !orderId) return;

    const initPayment = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await paymentsApi.createPaymentSession({
          orderId,
          method: 'UPI_QR',
        });
        if (data) {
          setPaymentData(data);
        }
      } catch (err: any) {
        const message = err instanceof ApiError ? err.userMessage : err.message || 'Payment initialization failed';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    initPayment();
  }, [isOpen, orderId, token]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const copyUpiId = () => {
    if (paymentData?.upiDeepLink) {
      navigator.clipboard.writeText(paymentData.upiId || 'bharatkart@icici');
      setCopied(true);
      showToast('UPI ID copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async (simulateSuccess: boolean = false) => {
    if (!paymentData) return;
    setVerifying(true);
    setError('');

    try {
      const data = await paymentsApi.verifyPayment({
        paymentId: paymentData.paymentId,
        orderId,
        transactionRef: `UPI-TXN-${Date.now()}`,
        simulateSuccess,
      });

      if (data) {
        showToast('Payment verified successfully!', 'success');
        onSuccess(data);
      }
    } catch (err: any) {
      const message = err instanceof ApiError ? err.userMessage : err.message || 'Verification failed';
      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
              ₹
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">UPI Instant Payment</h3>
              <p className="text-xs text-slate-500">Order #{orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-semibold text-slate-600">Generating Secure UPI QR Code...</p>
          </div>
        ) : error && !paymentData ? (
          <div className="py-10 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 mb-1">Could not start payment</p>
            <p className="text-xs text-rose-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Close & Try Another Method
            </button>
          </div>
        ) : (
          <div className="py-4 text-center">
            {/* Amount display */}
            <div className="mb-4">
              <span className="text-xs text-slate-400 font-medium block">Total Payable Amount</span>
              <span className="text-3xl font-black text-slate-900">₹{amount.toLocaleString('en-IN')}</span>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 font-semibold mt-1">
                <span>⏱ QR expires in:</span>
                <span className="font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {formattedTime}
                </span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="relative inline-block p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm mb-4">
              {paymentData?.qrCodeDataUrl ? (
                <img
                  src={paymentData.qrCodeDataUrl}
                  alt="UPI Payment QR Code"
                  className="w-52 h-52 object-contain mx-auto"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center bg-slate-100 text-slate-400 text-xs font-mono">
                  Loading QR Code...
                </div>
              )}
              <div className="absolute inset-x-0 bottom-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                BHIM &bull; UPI &bull; BharatPe
              </div>
            </div>

            {/* UPI ID copy */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between mb-4">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Merchant UPI VPA</span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {paymentData?.upiId || 'bharatkart@icici'}
                </span>
              </div>
              <button
                type="button"
                onClick={copyUpiId}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Supported UPI Apps logos / text */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mb-5">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>Scan with GPay, PhonePe, Paytm, BHIM, or any Banking App</span>
            </div>

            {error && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {/* Sandbox verification shortcut */}
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {verifying ? 'Verifying Transaction with Bank...' : 'Simulate Successful UPI Payment (Sandbox)'}
              </button>

              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Check Payment Status from Server
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
