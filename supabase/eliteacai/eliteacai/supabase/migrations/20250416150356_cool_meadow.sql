/*
  # Fix customer login authentication

  1. Changes
    - Drop and recreate verify_customer_password function with proper password hashing
    - Add trigger to automatically hash passwords on insert/update
    - Fix password verification logic

  2. Security
    - Use proper password hashing with pgcrypto
    - Ensure passwords are never stored in plain text
*/

-- Drop existing function
DROP FUNCTION IF EXISTS verify_customer_password(text, text);

-- Create function to hash password before insert/update
CREATE OR REPLACE FUNCTION hash_customer_password()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.password_hash != OLD.password_hash THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password hashing
DROP TRIGGER IF EXISTS hash_customer_password_trigger ON customers;
CREATE TRIGGER hash_customer_password_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION hash_customer_password();

-- Recreate verify_customer_password function with proper verification
CREATE OR REPLACE FUNCTION verify_customer_password(
  p_phone text,
  p_password text
) RETURNS uuid AS $$
DECLARE
  v_customer_id uuid;
  v_password_hash text;
BEGIN
  -- Get customer password hash
  SELECT id, password_hash INTO v_customer_id, v_password_hash
  FROM customers
  WHERE phone = p_phone;

  -- Verify password if customer exists
  IF v_customer_id IS NOT NULL AND 
     v_password_hash = crypt(p_password, v_password_hash) THEN
    -- Update last login timestamp
    UPDATE customers
    SET last_login = now()
    WHERE id = v_customer_id;
    
    RETURN v_customer_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to function
COMMENT ON FUNCTION verify_customer_password IS 'Verifies customer password and returns customer ID if valid';