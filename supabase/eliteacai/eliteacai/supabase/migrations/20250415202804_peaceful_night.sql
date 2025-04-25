/*
  # Update balance calculation to use transactions

  1. Changes
    - Drop existing triggers and functions
    - Create new balance calculation based on transaction history
    - Add proper validation for redemptions
    - Ensure atomic updates

  2. Security
    - Maintain existing RLS policies
    - Prevent balance manipulation
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trg_handle_balance ON transactions;
DROP FUNCTION IF EXISTS handle_customer_balance();

-- Create new function to handle balance updates
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  customer_id uuid;
  available_balance decimal;
BEGIN
  -- Determine which customer to update
  customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  
  -- For redemptions, verify balance is sufficient
  IF TG_OP IN ('INSERT', 'UPDATE') AND 
     NEW.type = 'redemption' AND 
     NEW.status = 'approved' THEN
    
    -- Calculate available balance from approved purchases
    SELECT COALESCE(SUM(cashback_amount), 0) INTO available_balance
    FROM transactions
    WHERE customer_id = customer_id
    AND type = 'purchase'
    AND status = 'approved'
    AND id != NEW.id;

    -- Subtract approved redemptions
    available_balance := available_balance - COALESCE((
      SELECT SUM(amount)
      FROM transactions
      WHERE customer_id = customer_id
      AND type = 'redemption'
      AND status = 'approved'
      AND id != NEW.id
    ), 0);

    IF available_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient balance for redemption. Available: %, Requested: %', 
        available_balance, NEW.amount;
    END IF;
  END IF;

  -- Update customer balance based on transaction history
  UPDATE customers c
  SET balance = (
    SELECT COALESCE(
      -- Sum of approved purchase cashbacks
      (SELECT COALESCE(SUM(cashback_amount), 0)
       FROM transactions
       WHERE customer_id = c.id
       AND type = 'purchase'
       AND status = 'approved')
      -
      -- Minus sum of approved redemptions
      (SELECT COALESCE(SUM(amount), 0)
       FROM transactions
       WHERE customer_id = c.id
       AND type = 'redemption'
       AND status = 'approved')
    , 0)
  ),
  updated_at = NOW()
  WHERE id = customer_id;

  RETURN CASE TG_OP
    WHEN 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER trg_handle_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_customer_balance();

-- Add comment to function for documentation
COMMENT ON FUNCTION handle_customer_balance() IS 'Handles customer balance updates based on transaction history. Uses cashback_amount from purchases and subtracts redemption amounts.';