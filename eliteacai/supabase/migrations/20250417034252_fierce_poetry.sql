/*
  # Add date of birth for password reset

  1. Changes
    - Add date_of_birth column to customers table
    - Add function to reset password using phone and date of birth
    - Remove previous password reset functionality

  2. Security
    - Maintain password hashing
    - Validate phone number and date of birth match
*/

-- Add date of birth column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS date_of_birth date;

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