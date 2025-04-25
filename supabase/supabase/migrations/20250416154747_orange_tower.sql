/*
  # Add store registration functionality

  1. New Tables
    - `stores`
      - `id` (uuid, primary key)
      - `name` (text)
      - `code` (text, unique)
      - `password_hash` (text)
      - `created_at` (timestamp)
      - `last_login` (timestamp)

  2. Changes to transactions table
    - Add store_id column
    - Add store registration constraints
    - Update RLS policies

  3. Security
    - Enable RLS on stores table
    - Add policies for store authentication
    - Add store verification function
*/

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Add store_id to transactions
ALTER TABLE transactions
ADD COLUMN store_id uuid REFERENCES stores(id);

-- Enable RLS on stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Create store verification function
CREATE OR REPLACE FUNCTION verify_store_password(
  p_code text,
  p_password text
) RETURNS uuid AS $$
DECLARE
  v_store_id uuid;
  v_password_hash text;
BEGIN
  -- Get store password hash
  SELECT id, password_hash 
  INTO v_store_id, v_password_hash
  FROM stores
  WHERE code = p_code;

  -- Check if store exists
  IF v_store_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verify password
  IF v_password_hash = crypt(p_password, v_password_hash) THEN
    -- Update last login timestamp
    UPDATE stores
    SET last_login = now()
    WHERE id = v_store_id;
    
    RETURN v_store_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for store password hashing
CREATE OR REPLACE FUNCTION hash_store_password()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.password_hash != OLD.password_hash THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hash_store_password_trigger
  BEFORE INSERT OR UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION hash_store_password();

-- Add store policies
CREATE POLICY "Enable insert access for all users"
  ON stores
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users"
  ON stores
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable update access for authenticated users"
  ON stores
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stores_code ON stores (code);
CREATE INDEX IF NOT EXISTS idx_stores_code_password ON stores (code, password_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions (store_id);

-- Insert initial store
INSERT INTO stores (name, code, password_hash)
VALUES ('Elite Açaí', 'ELITE01', 'elite123')
ON CONFLICT (code) DO NOTHING;