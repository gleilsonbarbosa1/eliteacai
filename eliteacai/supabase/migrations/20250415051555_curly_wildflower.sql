/*
  # Remove store code and invoice number fields

  1. Changes
    - Drop store code and invoice number columns from transactions table
    - Remove associated constraints and indexes
*/

-- Drop constraints first
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_store_code_check,
DROP CONSTRAINT IF EXISTS transactions_store_invoice_unique,
DROP CONSTRAINT IF EXISTS transactions_invoice_number_check;

-- Drop index
DROP INDEX IF EXISTS idx_transactions_store_invoice;

-- Drop columns
ALTER TABLE transactions
DROP COLUMN IF EXISTS store_code,
DROP COLUMN IF EXISTS invoice_number;