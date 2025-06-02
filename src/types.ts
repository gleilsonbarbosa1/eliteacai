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

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}