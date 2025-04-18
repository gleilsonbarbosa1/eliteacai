/*
  # Remove email field from customers table

  1. Changes
    - Drop email column from customers table
    - Remove any email-related constraints and indexes
*/

-- Drop email-related constraints and indexes
ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_email_format_check;
DROP INDEX IF EXISTS idx_customers_email;

-- Drop email column
ALTER TABLE customers
DROP COLUMN IF EXISTS email;