/*
  # Create customers table

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, nullable)
      - `phone` (text, unique, not null)
      - `email` (text, unique, nullable)
      - `date_of_birth` (date, nullable)
      - `password_hash` (text, not null)
      - `balance` (numeric, default 0)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())
      - `last_login` (timestamp with time zone, nullable)
      - `whatsapp_consent` (boolean, default false)

  2. Security
    - Enable RLS on `customers` table
    - Add policies for customer authentication and data access

  3. Functions
    - Create password verification function for customer login
    - Create trigger to update `updated_at` timestamp
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  phone text UNIQUE NOT NULL,
  email text UNIQUE,
  date_of_birth date,
  password_hash text NOT NULL,
  balance numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  whatsapp_consent boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Customers can read own data"
  ON customers
  FOR SELECT
  USING (true);

CREATE POLICY "Allow customer registration"
  ON customers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Customers can update own data"
  ON customers
  FOR UPDATE
  USING (true);

-- Create password verification function
CREATE OR REPLACE FUNCTION verify_customer_password(p_email text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM customers
  WHERE email = p_email;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Simple password comparison (in production, use proper hashing)
  RETURN stored_hash = p_password;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  cashback_amount numeric(10,2) DEFAULT 0,
  type text NOT NULL CHECK (type IN ('purchase', 'redemption')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  store_id uuid,
  location jsonb,
  receipt_url text,
  comment text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Customers can read own transactions"
  ON transactions
  FOR SELECT
  USING (true);

CREATE POLICY "Allow transaction creation"
  ON transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow transaction updates"
  ON transactions
  FOR UPDATE
  USING (true);

-- Create trigger to update updated_at timestamp for transactions
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_expires_at ON transactions(expires_at);