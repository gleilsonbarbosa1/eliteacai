-- Add expiration column to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Create index for expiration date
CREATE INDEX IF NOT EXISTS idx_transactions_expires_at 
ON transactions (expires_at) 
WHERE (type = 'purchase' AND status = 'approved');

-- Create function to set transaction expiration
CREATE OR REPLACE FUNCTION set_transaction_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'purchase' THEN
    -- Set expiration to end of next month
    NEW.expires_at := date_trunc('month', NEW.created_at) + interval '2 month' - interval '1 second';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting expiration
CREATE TRIGGER set_transaction_expiration_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_transaction_expiration();

-- Update balance calculation function to consider expiration
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
    
    -- Calculate available balance from non-expired approved purchases
    SELECT COALESCE(SUM(cashback_amount), 0) INTO available_balance
    FROM transactions
    WHERE customer_id = customer_id
    AND type = 'purchase'
    AND status = 'approved'
    AND expires_at > now()
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

  -- Update customer balance based on non-expired transactions
  UPDATE customers c
  SET balance = (
    SELECT COALESCE(
      -- Sum of non-expired approved purchase cashbacks
      (SELECT COALESCE(SUM(cashback_amount), 0)
       FROM transactions
       WHERE customer_id = c.id
       AND type = 'purchase'
       AND status = 'approved'
       AND expires_at > now())
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

-- Add comment to function
COMMENT ON FUNCTION handle_customer_balance() IS 'Handles customer balance updates considering transaction expiration dates';