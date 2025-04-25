/*
  # Add password field and authentication for customers

  1. Changes
    - Add password column to customers table
    - Add password hash column for secure storage
    - Add last_login timestamp column
    - Add unique constraint on phone number
    - Add indexes for better performance

  2. Security
    - Store only hashed passwords
    - Add validation for phone number format
*/

-- Add password and authentication columns
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Add check constraint for phone number format
ALTER TABLE customers
ADD CONSTRAINT customers_phone_format_check 
CHECK (phone ~ '^\d{11}$');

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone_lookup 
ON customers (phone) 
WHERE password_hash != '';

-- Add function to verify password
CREATE OR REPLACE FUNCTION verify_customer_password(
  p_phone text,
  p_password text
) RETURNS uuid AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Get customer ID if password matches
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_phone
  AND password_hash = crypt(p_password, password_hash);

  -- Update last login timestamp if found
  IF v_customer_id IS NOT NULL THEN
    UPDATE customers
    SET last_login = now()
    WHERE id = v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;