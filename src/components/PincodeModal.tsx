import React, { useState } from 'react';
import { MapPin, X, CheckCircle, AlertCircle, Clock, Truck } from 'lucide-react';
import { usePincode } from '../context/PincodeContext.js';
import { useToast } from '../context/ToastContext.js';

export const PincodeModal: React.FC = () => {
  const { pincode, deliveryInfo, isModalOpen, closeModal, updatePincode } = usePincode();
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPin || inputPin.length !== 6 || isNaN(Number(inputPin))) {
      setError('Please enter a valid 6-digit Indian PIN code');
      return;
    }

    setLoading(true);
    setError('');
    const success = await updatePincode(inputPin);
    setLoading(false);

    if (success) {
      showToast(`Location set to ${inputPin}`, 'success');
      closeModal();
    } else {
      setError('Could not verify PIN code. Please try again.');
    }
  };

  const samplePins = [
    { pin: '110001', city: 'New Delhi' },
    { pin: '400001', city: 'Mumbai' },
    { pin: '560001', city: 'Bengaluru' },
    { pin: '600001', city: 'Chennai' },
    { pin: '700001', city: 'Kolkata' },
    { pin: '500001', city: 'Hyderabad' },
    { pin: '411001', city: 'Pune' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Choose Delivery Location</h3>
            <p className="text-xs text-slate-500">Check product availability & delivery speed across India</p>
          </div>
        </div>

        {/* Current Active Location */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Selected</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-sm">
                {deliveryInfo.city}, {deliveryInfo.state} ({deliveryInfo.pincode})
              </div>
              <div className="flex items-center gap-3 text-xs text-emerald-700 font-medium mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {deliveryInfo.estimatedDays} Day Delivery
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  {deliveryInfo.courierPartner}
                </span>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-semibold">
              Active
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Enter 6-digit Indian PIN Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 110001, 560001"
              value={inputPin}
              onChange={e => {
                setInputPin(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Apply'}
            </button>
          </div>
          {error && <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
        </form>

        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">Quick Select Popular Cities</div>
          <div className="flex flex-wrap gap-1.5">
            {samplePins.map(sp => (
              <button
                key={sp.pin}
                type="button"
                onClick={() => updatePincode(sp.pin)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  pincode === sp.pin
                    ? 'bg-orange-50 border-orange-500 text-orange-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {sp.city} ({sp.pin})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
