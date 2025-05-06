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
  comment?: string;
}

export interface Credit {
  id: string;
  customer_id: string;
  amount: number;
  expires_at: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_method: 'pix' | 'credit_card' | 'debit_card' | 'cash';
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
  title?: string;
  date?: string;
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
  address: string;
}

// Store locations for geofencing
export const STORE_LOCATIONS: StoreLocation[] = [
  {
    id: 'store1',
    name: 'Elite Açaí 1',
    latitude: -3.859981833155958,
    longitude: -38.63311136233465,
    radius: 40, // 40 meters radius
    address: 'Rua Dois, 2130‑A, Residencial 1 – Cágado'
  },
  {
    id: 'store2',
    name: 'Elite Açaí 2',
    latitude: -3.8585200957980037,
    longitude: -38.63444706015108,
    radius: 40, // 40 meters radius
    address: 'Rua Um, 1614‑C, Residencial 1 – Cágado'
  },
  {
    id: 'store3',
    name: 'Elite Açaí (Teste)',
    latitude: -3.863115098058069,
    longitude: -38.631793933498614,
    radius: 40, // 40 meters radius
    address: 'Loja de Teste'
  }
];