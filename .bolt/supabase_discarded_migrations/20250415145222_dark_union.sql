/*
  # Fix customer balance updates for redemptions

  1. Changes
    - Update trigger function to correctly handle redemptions
    - Fix balance calculation for both purchases and redemptions
    - Add proper validation to prevent negative balances
    - Ensure atomic updates

  2. Security
    - Maintain existing RLS policies
    - Prevent balance manipulation
*/

CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process approved transactions
  IF NEW.status = 'approved' THEN
    -- Update customer balance based on cashback_amount
    -- This works for both purchases (positive) and redemptions (negative)
    UPDATE customers
    SET 
      balance = balance + NEW.cashback_amount,
      updated_at = now()
    WHERE id = NEW.customer_id
    -- Prevent negative balances
    AND (balance + NEW.cashback_amount >= 0);
    
    -- If no rows were updated (would result in negative balance), raise an error
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient balance for redemption';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;