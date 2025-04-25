/*
  # Fix balance calculation trigger

  1. Changes
    - Drop existing triggers and functions
    - Create new balance calculation function
    - Add proper validation and locking
    - Ensure atomic updates
    - Prevent race conditions
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trg_handle_balance ON transactions;
DROP FUNCTION IF EXISTS handle_customer_balance();

-- Create new function to handle balance updates
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance decimal;
BEGIN
  -- Lock the customer row for update to prevent race conditions
  SELECT balance INTO current_balance
  FROM customers 
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id)
  FOR UPDATE;

  -- For redemptions, verify balance is sufficient before proceeding
  IF TG_OP IN ('INSERT', 'UPDATE') AND 
     NEW.type = 'redemption' AND 
     NEW.status = 'approved' THEN
    
    IF current_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient balance for redemption. Available: %, Requested: %', 
        current_balance, NEW.amount;
    END IF;
  END IF;

  -- Calculate new balance
  WITH transaction_summary AS (
    SELECT COALESCE(SUM(
      CASE 
        WHEN type = 'purchase' AND status = 'approved' THEN cashback_amount
        WHEN type = 'redemption' AND status = 'approved' THEN -amount
        ELSE 0
      END
    ), 0) as total_balance
    FROM transactions
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND status = 'approved'
  )
  UPDATE customers
  SET 
    balance = (SELECT total_balance FROM transaction_summary),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

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
COMMENT ON FUNCTION handle_customer_balance() IS 'Handles customer balance updates based on transaction changes with proper validation and locking.';