/*
  # Remove email-based password reset and switch to phone-based

  1. Changes
    - Remove email-related functions and constraints
    - Update reset token functions to use phone number instead of email
    - Keep reset token and expiration columns
    - Remove email column and constraints

  2. Security
    - Maintain existing RLS policies
    - Keep password reset security measures
*/

-- Drop email-related constraints and indexes
ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_email_format_check;
DROP INDEX IF EXISTS idx_customers_email;

-- Drop email column
ALTER TABLE customers
DROP COLUMN IF EXISTS email;

-- Drop existing functions
DROP FUNCTION IF EXISTS generate_customer_reset_token(text);
DROP FUNCTION IF EXISTS reset_customer_password(text, text, text);

-- Create new function to generate reset token using phone
CREATE OR REPLACE FUNCTION generate_customer_reset_token(p_phone text)
RETURNS text AS $$
DECLARE
  v_token text;
  v_customer_id uuid;
BEGIN
  -- Check if phone exists
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_phone;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Phone number not found';
  END IF;

  -- Generate token (6 digits for simplicity)
  v_token := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Store token with expiration
  UPDATE customers
  SET reset_token = v_token,
      reset_token_expires_at = now() + interval '1 hour'
  WHERE id = v_customer_id;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new function to reset password using phone
CREATE OR REPLACE FUNCTION reset_customer_password(
  p_phone text,
  p_token text,
  p_new_password text
)
RETURNS boolean AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Find customer with valid token
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_phone
    AND reset_token = p_token
    AND reset_token_expires_at > now();

  IF v_customer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Reset password and clear token
  UPDATE customers
  SET password_hash = p_new_password,
      reset_token = NULL,
      reset_token_expires_at = NULL
  WHERE id = v_customer_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;