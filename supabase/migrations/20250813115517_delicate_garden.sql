/*
  # Create missing database objects

  1. New Tables
    - `admins` - Administrator accounts table
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `role` (text, default 'admin')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. New Views
    - `customer_balances` - View for customer balance calculations
      - `customer_id` (uuid)
      - `total_balance` (numeric)
      - `expiring_amount` (numeric)
      - `expiration_date` (timestamp)

  3. New Functions
    - `get_available_balance(p_customer_id)` - Calculate available cashback balance
    - `handle_new_user()` - Trigger function for new user registration

  4. Security
    - Enable RLS on `admins` table
    - Add policies for admin access
    - Update existing policies as needed

  5. Sample Data
    - Create a default admin user for testing
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'admin' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policies for admins table
CREATE POLICY "Enable read access for authenticated users" ON admins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable update for users based on id" ON admins
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create indexes for admins table
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get available balance
CREATE OR REPLACE FUNCTION get_available_balance(p_customer_id uuid)
RETURNS numeric AS $$
DECLARE
  total_cashback numeric := 0;
  total_redeemed numeric := 0;
  available_balance numeric := 0;
BEGIN
  -- Calculate total cashback earned from purchases
  SELECT COALESCE(SUM(cashback_amount), 0)
  INTO total_cashback
  FROM transactions
  WHERE customer_id = p_customer_id
    AND type = 'purchase'
    AND status = 'approved'
    AND (expires_at IS NULL OR expires_at > now());

  -- Calculate total redeemed
  SELECT COALESCE(SUM(amount), 0)
  INTO total_redeemed
  FROM transactions
  WHERE customer_id = p_customer_id
    AND type = 'redemption'
    AND status = 'approved';

  -- Calculate available balance
  available_balance := total_cashback - total_redeemed;
  
  -- Ensure balance is never negative
  IF available_balance < 0 THEN
    available_balance := 0;
  END IF;

  RETURN available_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create customer_balances view
CREATE OR REPLACE VIEW customer_balances AS
SELECT 
  c.id as customer_id,
  c.name,
  c.email,
  c.phone,
  get_available_balance(c.id) as total_balance,
  COALESCE(
    (SELECT SUM(t.cashback_amount)
     FROM transactions t
     WHERE t.customer_id = c.id
       AND t.type = 'purchase'
       AND t.status = 'approved'
       AND t.expires_at IS NOT NULL
       AND t.expires_at > now()
       AND t.expires_at <= (now() + interval '30 days')
    ), 0
  ) as expiring_amount,
  (SELECT MIN(t.expires_at)
   FROM transactions t
   WHERE t.customer_id = c.id
     AND t.type = 'purchase'
     AND t.status = 'approved'
     AND t.expires_at IS NOT NULL
     AND t.expires_at > now()
  ) as expiration_date
FROM customers c;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if this is an admin email (you can customize this logic)
  IF NEW.email LIKE '%@admin.%' OR NEW.email = 'admin@eliteacai.com' THEN
    INSERT INTO public.admins (id, email, role)
    VALUES (NEW.id, NEW.email, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert a default admin user (this will only work if you have a user with this email in auth.users)
-- You'll need to create this user through Supabase Auth first
INSERT INTO admins (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'admin@eliteacai.com'
ON CONFLICT (email) DO NOTHING;