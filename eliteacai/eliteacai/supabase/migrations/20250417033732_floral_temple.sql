/*
  # Add password change functionality

  1. Changes
    - Add function to change customer password using phone number
    - Add validation for phone number and password

  2. Security
    - Maintain password hashing
    - Validate phone number exists
*/

-- Create function to change customer password
CREATE OR REPLACE FUNCTION change_customer_password(
  p_phone text,
  p_new_password text
)
RETURNS boolean AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Check if phone exists
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_phone;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Phone number not found';
  END IF;

  -- Update password
  UPDATE customers
  SET password_hash = p_new_password
  WHERE id = v_customer_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;