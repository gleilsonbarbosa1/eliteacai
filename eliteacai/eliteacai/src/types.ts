import type { User } from '@supabase/supabase-js';

export interface Customer {
  id: string;
  name?: string;
  phone: string;
  password_hash?: string;
  balance: number;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CustomerLogin {
  phone: string;
  password: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  amount: number;
  cashback_amount: number;
  type: 'purchase' | 'redemption';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  receipt_url?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Admin {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface WhatsAppNotification {
  type: 'welcome' | 'purchase' | 'redemption';
  customerId: string;
  amount?: number;
  cashbackAmount?: number;
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  message?: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

// Store locations for geofencing
export const STORE_LOCATIONS: StoreLocation[] = [
  {
    id: 'store1',
    name: 'Elite Açaí 1',
    latitude: -3.859981833155958,
    longitude: -38.63311136233465,
    radius: 40 // 40 meters radius
  },
  {
    id: 'store2',
    name: 'Elite Açaí 2',
    latitude: -3.8585200957980037,
    longitude: -38.63444706015108,
    radius: 40 // 40 meters radius
  },
  {
    id: 'store3',
    name: 'Elite Açaí 3',
    latitude: -3.8633379,
    longitude: -38.6319105,
    radius: 40 // 40 meters radius
  }
];