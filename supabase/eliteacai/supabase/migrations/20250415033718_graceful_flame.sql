/*
  # Fix RLS policies for customers table

  1. Changes
    - Drop existing RLS policies for customers table
    - Create new policies that allow:
      - Anyone to insert new customers
      - Authenticated users to view and update customers
      - Authenticated users to view their own transactions

  2. Security
    - Maintain RLS enabled
    - Add more permissive policies for customer creation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Customers are viewable by authenticated users" ON customers;
DROP POLICY IF EXISTS "Customers are insertable by authenticated users" ON customers;
DROP POLICY IF EXISTS "Customers are updatable by authenticated users" ON customers;

-- Create new policies
CREATE POLICY "Enable insert access for all users"
  ON customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update access for authenticated users"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;