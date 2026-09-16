import React, { createContext, useContext, useState, useEffect } from 'react';
import { PincodeDeliveryInfo } from '../types.js';

interface PincodeContextType {
  pincode: string;
  deliveryInfo: PincodeDeliveryInfo;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  updatePincode: (newPin: string) => Promise<boolean>;
}

const DEFAULT_INFO: PincodeDeliveryInfo = {
  pincode: '400001',
  city: 'Mumbai',
  state: 'Maharashtra',
  isDeliverable: true,
  estimatedDays: 1,
  courierPartner: 'BlueDart Air Express',
  shippingCharge: 0,
  codAvailable: true,
};

const PincodeContext = createContext<PincodeContextType | undefined>(undefined);

export const PincodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pincode, setPincode] = useState<string>(() => localStorage.getItem('bharatkart_pincode') || '400001');
  const [deliveryInfo, setDeliveryInfo] = useState<PincodeDeliveryInfo>(DEFAULT_INFO);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const checkPin = async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/checkout/pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: pin, orderTotal: 999 }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDeliveryInfo(json.data);
        setPincode(pin);
        localStorage.setItem('bharatkart_pincode', pin);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to verify PIN code:', e);
      return false;
    }
  };

  useEffect(() => {
    checkPin(pincode);
  }, []);

  const updatePincode = async (newPin: string): Promise<boolean> => {
    const success = await checkPin(newPin);
    if (success) {
      setIsModalOpen(false);
    }
    return success;
  };

  return (
    <PincodeContext.Provider
      value={{
        pincode,
        deliveryInfo,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
        updatePincode,
      }}
    >
      {children}
    </PincodeContext.Provider>
  );
};

export const usePincode = () => {
  const context = useContext(PincodeContext);
  if (!context) {
    throw new Error('usePincode must be used within a PincodeProvider');
  }
  return context;
};
