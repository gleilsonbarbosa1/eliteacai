/*
  # Fix password verification and add indexes

  1. Changes
    - Drop and recreate verify_customer_password function with better error handling
    - Add index for faster password verification
    - Add function to check if password is valid

  2. Security
    - Maintain existing RLS policies
    - Ensure secure password verification
*/

-- Drop existing function
DROP FUNCTION IF EXISTS verify_customer_password(text, text);

-- Create function to verify if password meets requirements
CREATE OR REPLACE FUNCTION is_valid_password(password text)
RETURNS boolean AS $$
BEGIN
  -- Password must be at least 6 characters
  RETURN length(password) >= 6;
END;
$$ LANGUAGE plpgsql;

-- Recreate verify_customer_password function with better error handling
CREATE OR REPLACE FUNCTION verify_customer_password(
  p_phone text,
  p_password text
) RETURNS uuid AS $$
DECLARE
  v_customer_id uuid;
  v_password_hash text;
BEGIN
  -- Validate phone format
  IF NOT (p_phone ~ '^\d{11}$') THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;

  -- Get customer password hash
  SELECT id, password_hash 
  INTO v_customer_id, v_password_hash
  FROM customers
  WHERE phone = p_phone;

  -- Check if customer exists
  IF v_customer_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verify password
  IF v_password_hash = crypt(p_password, v_password_hash) THEN
    -- Update last login timestamp
    UPDATE customers
    SET last_login = now()
    WHERE id = v_customer_id;
    
    RETURN v_customer_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for faster password verification
CREATE INDEX IF NOT EXISTS idx_customers_phone_password 
ON customers (phone, password_hash);

-- Add comment to function
COMMENT ON FUNCTION verify_customer_password IS 'Verifies customer password and returns customer ID if valid. Returns NULL if customer not found or password incorrect.';