/*
  # Fix balance calculation to use cashback_amount

  1. Changes
    - Update trigger function to use cashback_amount for balance calculations
    - Fix redemption validation to check against current cashback balance
    - Ensure proper balance updates for both purchases and redemptions
    - Add proper transaction locking to prevent race conditions

  2. Security
    - Maintain existing RLS policies
    - Prevent balance manipulation
    - Ensure data consistency
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trg_handle_balance ON transactions;
DROP FUNCTION IF EXISTS handle_customer_balance();

-- Create new function to handle balance updates
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  customer_id uuid;
  current_balance decimal;
BEGIN
  -- Determine which customer to update
  customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  
  -- Lock the customer row for update
  SELECT balance INTO current_balance
  FROM customers 
  WHERE id = customer_id
  FOR UPDATE;

  -- For redemptions, verify balance is sufficient
  IF TG_OP IN ('INSERT', 'UPDATE') AND 
     NEW.type = 'redemption' AND 
     NEW.status = 'approved' THEN
    
    -- Calculate available balance excluding current transaction
    SELECT COALESCE(SUM(cashback_amount), 0) INTO current_balance
    FROM transactions
    WHERE customer_id = customer_id
    AND id != NEW.id
    AND status = 'approved'
    AND type = 'purchase';

    IF current_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient balance for redemption. Available: %, Requested: %', 
        current_balance, NEW.amount;
    END IF;
  END IF;

  -- Update customer balance based on approved transactions only
  UPDATE customers c
  SET balance = (
    SELECT COALESCE(SUM(cashback_amount), 0)
    FROM transactions t
    WHERE t.customer_id = c.id
    AND t.status = 'approved'
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
COMMENT ON FUNCTION handle_customer_balance() IS 'Handles customer balance updates based on transaction changes. Uses cashback_amount for all balance calculations.';