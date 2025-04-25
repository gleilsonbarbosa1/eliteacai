/*
  # Fix balance calculation trigger

  1. Changes
    - Drop existing triggers and functions
    - Create new robust balance handling function
    - Add proper validation and error handling
    - Ensure atomic updates
    - Prevent negative balances
    - Add proper logging for debugging

  2. Security
    - Maintain existing RLS policies
    - Prevent balance manipulation
    - Ensure data consistency
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trg_update_balance ON transactions;
DROP TRIGGER IF EXISTS update_customer_balance_on_transaction ON transactions;
DROP TRIGGER IF EXISTS trg_calculate_balance ON transactions;
DROP TRIGGER IF EXISTS trg_handle_balance ON transactions;
DROP FUNCTION IF EXISTS update_customer_balance();
DROP FUNCTION IF EXISTS calculate_customer_balance();
DROP FUNCTION IF EXISTS handle_customer_balance();

-- Create new function to handle balance updates
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance decimal;
  new_balance decimal;
  debug_info text;
BEGIN
  -- Log operation type for debugging
  debug_info := 'Operation: ' || TG_OP;
  RAISE NOTICE '%', debug_info;

  -- Get current balance
  SELECT balance INTO current_balance
  FROM customers
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

  -- Calculate new balance
  WITH transaction_summary AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN type = 'purchase' AND status = 'approved' THEN cashback_amount
          WHEN type = 'redemption' AND status = 'approved' THEN -amount
          ELSE 0
        END
      ), 0) as total_balance
    FROM transactions
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND (
      CASE 
        WHEN TG_OP = 'DELETE' THEN id != OLD.id
        WHEN TG_OP = 'UPDATE' THEN (id != NEW.id OR id = NEW.id)
        ELSE true
      END
    )
  )
  SELECT total_balance INTO new_balance
  FROM transaction_summary;

  -- Add the new transaction's impact if it's an INSERT or UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' THEN
      IF NEW.type = 'purchase' THEN
        new_balance := new_balance + NEW.cashback_amount;
      ELSIF NEW.type = 'redemption' THEN
        new_balance := new_balance - NEW.amount;
      END IF;
    END IF;
  END IF;

  -- Log balance calculation for debugging
  debug_info := 'Customer ID: ' || COALESCE(NEW.customer_id, OLD.customer_id) || 
                ', Current Balance: ' || current_balance || 
                ', New Balance: ' || new_balance;
  RAISE NOTICE '%', debug_info;

  -- Validate balance for redemptions
  IF TG_OP IN ('INSERT', 'UPDATE') AND 
     NEW.type = 'redemption' AND 
     NEW.status = 'approved' AND 
     new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance for redemption. Available: %, Requested: %', 
      current_balance, NEW.amount;
  END IF;

  -- Update customer balance
  UPDATE customers
  SET 
    balance = GREATEST(new_balance, 0), -- Ensure balance never goes below 0
    updated_at = NOW()
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

  -- Return appropriate record
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
COMMENT ON FUNCTION handle_customer_balance() IS 'Handles customer balance updates based on transaction changes. Validates redemptions and prevents negative balances.';