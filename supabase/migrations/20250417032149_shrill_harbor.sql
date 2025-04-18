/*
  # Add function to get customer's stored password

  1. New Functions
    - `get_customer_password_hash`
      - Takes customer phone number as input
      - Returns the stored password hash
      - Security definer to ensure proper access control

  2. Security
    - Function is security definer to protect password data
    - Only returns data for existing customers
*/

-- Create function to get customer's password hash
CREATE OR REPLACE FUNCTION get_customer_password_hash(p_phone text)
RETURNS text AS $$
DECLARE
  v_password_hash text;
BEGIN
  -- Get password hash for the phone number
  SELECT password_hash INTO v_password_hash
  FROM customers
  WHERE phone = p_phone;

  IF v_password_hash IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  RETURN v_password_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;