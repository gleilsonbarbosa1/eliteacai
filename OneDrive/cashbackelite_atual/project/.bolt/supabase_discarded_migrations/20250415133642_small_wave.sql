/*
  # Add store code and invoice number fields

  1. Changes
    - Add store_code and invoice_number columns to transactions table
    - Add constraints and validation
    - Add index for performance
    - Handle existing data safely

  2. Security
    - Maintain existing RLS policies
*/

-- First add columns as nullable
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS store_code text,
ADD COLUMN IF NOT EXISTS invoice_number text;

-- Clean and update existing records with valid values
UPDATE transactions 
SET 
  store_code = CASE 
    WHEN type = 'redemption' THEN 'RES'
    ELSE 'LEG'
  END,
  invoice_number = CASE 
    WHEN type = 'redemption' THEN 
      -- Ensure redemption invoice numbers are valid
      REGEXP_REPLACE('R' || EXTRACT(EPOCH FROM created_at)::text, '[^A-Za-z0-9-]', '')
    ELSE 
      -- Ensure legacy invoice numbers are valid
      REGEXP_REPLACE('M' || SUBSTRING(id::text, 1, 8), '[^A-Za-z0-9-]', '')
  END
WHERE store_code IS NULL OR invoice_number IS NULL;

-- Add check constraint for store_code format (alphanumeric, 1-3 chars)
ALTER TABLE transactions
ADD CONSTRAINT transactions_store_code_check 
CHECK (store_code ~ '^[A-Za-z0-9]{1,3}$');

-- Add check constraint for invoice_number format (alphanumeric and hyphen, max 20 chars)
ALTER TABLE transactions
ADD CONSTRAINT transactions_invoice_number_check 
CHECK (invoice_number ~ '^[A-Za-z0-9-]{1,20}$');

-- Now make columns NOT NULL after ensuring data is valid
ALTER TABLE transactions 
ALTER COLUMN store_code SET NOT NULL,
ALTER COLUMN invoice_number SET NOT NULL;

-- Create unique constraint to prevent duplicate invoices per store
ALTER TABLE transactions
ADD CONSTRAINT transactions_store_invoice_unique 
UNIQUE (store_code, invoice_number);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_store_invoice 
ON transactions(store_code, invoice_number);