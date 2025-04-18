/*
  # Fix customer balance update trigger

  1. Changes
    - Update the trigger function to handle both purchase and redemption transactions
    - Add proper balance calculation based on transaction type
    - Ensure balance is only updated for approved transactions
    - Add validation to prevent negative balances
*/

CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process approved transactions
  IF NEW.status = 'approved' THEN
    -- Update customer balance based on transaction type
    UPDATE customers
    SET 
      balance = CASE
        -- For purchases, add the cashback amount
        WHEN NEW.type = 'purchase' THEN balance + NEW.cashback_amount
        -- For redemptions, subtract the amount (which is positive in the transaction)
        WHEN NEW.type = 'redemption' THEN balance - NEW.amount
        ELSE balance
      END,
      updated_at = now()
    WHERE id = NEW.customer_id
    -- Prevent negative balances
    AND (
      (NEW.type = 'purchase') OR 
      (NEW.type = 'redemption' AND balance >= NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;