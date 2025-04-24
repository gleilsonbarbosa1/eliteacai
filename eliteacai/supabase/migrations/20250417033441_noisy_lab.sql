/*
  # Remove password recovery functionality

  1. Changes
    - Drop password recovery related columns
    - Drop password recovery functions
    - Keep core password functionality intact

  2. Security
    - Maintain existing RLS policies
    - Keep password hashing functionality
*/

-- Drop password recovery columns
ALTER TABLE customers 
DROP COLUMN IF EXISTS reset_token,
DROP COLUMN IF EXISTS reset_token_expires_at,
DROP COLUMN IF EXISTS original_password;

-- Drop password recovery functions
DROP FUNCTION IF EXISTS generate_customer_reset_token(text);
DROP FUNCTION IF EXISTS reset_customer_password(text, text, text);
DROP FUNCTION IF EXISTS get_customer_password_hash(text);

-- Update password hashing function to remove original password storage
CREATE OR REPLACE FUNCTION hash_customer_password()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.password_hash != OLD.password_hash THEN
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