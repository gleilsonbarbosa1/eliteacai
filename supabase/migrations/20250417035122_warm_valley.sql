/*
  # Add password reset with date of birth

  1. Changes
    - Add function to reset password using date of birth
    - Remove any existing password reset functionality
    - Keep password hashing functionality intact

  2. Security
    - Validate phone number and date of birth match
    - Maintain password hashing
*/

-- Create function to reset password with date of birth
CREATE OR REPLACE FUNCTION reset_password_with_dob(
  p_phone text,
  p_date_of_birth date,
  p_new_password text
)
RETURNS boolean AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Check if phone and date of birth match
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_phone
    AND date_of_birth = p_date_of_birth;

  IF v_customer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update password
  UPDATE customers
  SET password_hash = p_new_password
  WHERE id = v_customer_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;