/*
  # Add customers and notifications tables

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `phone` (text, unique)
      - `balance` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `amount` (decimal)
      - `cashback_amount` (decimal)
      - `type` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  balance decimal NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) NOT NULL,
  amount decimal NOT NULL,
  cashback_amount decimal NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'redemption')),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies for customers
CREATE POLICY "Customers are viewable by authenticated users"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Customers are insertable by authenticated users"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Customers are updatable by authenticated users"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for transactions
CREATE POLICY "Transactions are viewable by authenticated users"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Transactions are insertable by authenticated users"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Transactions are updatable by authenticated users"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Function to update customer balance
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE customers
    SET balance = balance + NEW.cashback_amount,
        updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update balance on transaction status change
CREATE TRIGGER update_customer_balance_on_transaction
  AFTER INSERT OR UPDATE OF status
  ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_balance();