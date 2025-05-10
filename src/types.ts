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
  distance?: number;
}

// Store locations for geofencing
export const STORE_LOCATIONS: StoreLocation[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000', // Store 1 UUID
    name: 'Loja Teste',
    latitude: -3.8631793248061084,
    longitude: -38.63185830651373,
    radius: 40,
    address: 'Loja Teste'
  }
];