import { PincodeDeliveryInfo } from '../../src/types.js';

interface PincodeEntry {
  pincode: string;
  city: string;
  state: string;
  days: number;
  courier: string;
  cod: boolean;
}

const KNOWN_PINCODES: Record<string, PincodeEntry> = {
  '110001': { pincode: '110001', city: 'New Delhi', state: 'Delhi', days: 1, courier: 'BlueDart Air Express', cod: true },
  '110020': { pincode: '110020', city: 'Okhla, South Delhi', state: 'Delhi', days: 1, courier: 'Delhivery Surface', cod: true },
  '400001': { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', days: 1, courier: 'BlueDart Air Express', cod: true },
  '400051': { pincode: '400051', city: 'Bandra, Mumbai', state: 'Maharashtra', days: 1, courier: 'Shadowfax Express', cod: true },
  '411001': { pincode: '411001', city: 'Pune', state: 'Maharashtra', days: 2, courier: 'Delhivery Express', cod: true },
  '560001': { pincode: '560001', city: 'Bengaluru', state: 'Karnataka', days: 2, courier: 'BlueDart Air Express', cod: true },
  '560034': { pincode: '560034', city: 'Koramangala, Bengaluru', state: 'Karnataka', days: 1, courier: 'Xpressbees Prime', cod: true },
  '500001': { pincode: '500001', city: 'Hyderabad', state: 'Telangana', days: 2, courier: 'BlueDart Express', cod: true },
  '600001': { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu', days: 2, courier: 'Delhivery Surface', cod: true },
  '700001': { pincode: '700001', city: 'Kolkata', state: 'West Bengal', days: 2, courier: 'BlueDart Express', cod: true },
  '302001': { pincode: '302001', city: 'Jaipur', state: 'Rajasthan', days: 2, courier: 'Delhivery Surface', cod: true },
  '380001': { pincode: '380001', city: 'Ahmedabad', state: 'Gujarat', days: 2, courier: 'BlueDart Express', cod: true },
  '226001': { pincode: '226001', city: 'Lucknow', state: 'Uttar Pradesh', days: 3, courier: 'Xpressbees Prime', cod: true },
  '160017': { pincode: '160017', city: 'Chandigarh', state: 'Punjab / Haryana', days: 2, courier: 'BlueDart Express', cod: true },
  '682001': { pincode: '682001', city: 'Kochi', state: 'Kerala', days: 3, courier: 'Delhivery Express', cod: true },
  '800001': { pincode: '800001', city: 'Patna', state: 'Bihar', days: 3, courier: 'Delhivery Surface', cod: true },
  '781001': { pincode: '781001', city: 'Guwahati', state: 'Assam', days: 4, courier: 'BlueDart Air Express', cod: true },
};

export function checkPincodeDelivery(pincode: string, orderTotal: number = 0): PincodeDeliveryInfo {
  const cleanPin = pincode.trim().replace(/\D/g, '');

  if (cleanPin.length !== 6) {
    return {
      pincode: cleanPin,
      city: 'Unknown',
      state: 'Unknown',
      isDeliverable: false,
      estimatedDays: 0,
      courierPartner: 'None',
      shippingCharge: 0,
      codAvailable: false,
    };
  }

  // Check known map
  const found = KNOWN_PINCODES[cleanPin];
  const shippingCharge = orderTotal >= 499 ? 0 : 49;

  if (found) {
    return {
      pincode: cleanPin,
      city: found.city,
      state: found.state,
      isDeliverable: true,
      estimatedDays: found.days,
      courierPartner: found.courier,
      shippingCharge,
      codAvailable: found.cod,
    };
  }

  // Fallback intelligent derivation for all valid 6-digit Indian PIN codes based on zone:
  const firstDigit = cleanPin.charAt(0);
  let state = 'India Central';
  let city = 'Regional Center';

  switch (firstDigit) {
    case '1':
      state = 'Delhi, Haryana, Punjab, Himachal Pradesh, J&K';
      city = 'North India Hub';
      break;
    case '2':
      state = 'Uttar Pradesh, Uttarakhand';
      city = 'UP & UK Region';
      break;
    case '3':
      state = 'Rajasthan, Gujarat, Daman & Diu';
      city = 'Western Zone';
      break;
    case '4':
      state = 'Maharashtra, Goa, Madhya Pradesh, Chhattisgarh';
      city = 'West / Central Hub';
      break;
    case '5':
      state = 'Andhra Pradesh, Telangana, Karnataka';
      city = 'South Central Zone';
      break;
    case '6':
      state = 'Tamil Nadu, Kerala, Lakshadweep';
      city = 'Southern Region';
      break;
    case '7':
      state = 'West Bengal, Odisha, North Eastern States';
      city = 'East & North East Zone';
      break;
    case '8':
      state = 'Bihar, Jharkhand';
      city = 'Eastern Region';
      break;
    default:
      state = 'Pan India Delivery Zone';
      city = 'National Courier Network';
  }

  return {
    pincode: cleanPin,
    city,
    state,
    isDeliverable: true,
    estimatedDays: 3,
    courierPartner: 'Delhivery Express Surface & Air',
    shippingCharge,
    codAvailable: true,
  };
}
