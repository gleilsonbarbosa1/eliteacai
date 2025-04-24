/*
  # Modify password retrieval to return unencrypted password

  1. Changes
    - Drop existing get_customer_password_hash function
    - Create new function that returns the original password before hashing
    - Add trigger to store original password in a separate column

  2. Security Note
    - This implementation stores passwords in plain text
    - This is not recommended for production use
    - Consider using proper password reset functionality instead
*/

-- Add column for storing original password
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS original_password text;

-- Update existing function to return original password
CREATE OR REPLACE FUNCTION get_customer_password_hash(p_phone text)
RETURNS text AS $$
DECLARE
  v_password text;
BEGIN
  -- Get original password for the phone number
  SELECT original_password INTO v_password
  FROM customers
  WHERE phone = p_phone;

  IF v_password IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  RETURN v_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify password hashing trigger to store original password
CREATE OR REPLACE FUNCTION hash_customer_password()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.password_hash != OLD.password_hash THEN
    -- Store original password before hashing
    NEW.original_password = NEW.password_hash;
    -- Then hash the password
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to use updated function
DROP TRIGGER IF EXISTS hash_customer_password_trigger ON customers;
CREATE TRIGGER hash_customer_password_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION hash_customer_password();