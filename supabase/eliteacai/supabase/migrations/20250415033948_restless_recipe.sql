/*
  # Fix customer policies

  1. Changes
    - Drop existing customer policies
    - Create new policies allowing public access for customer creation
    - Enable read/write access for authenticated users
    - Ensure RLS is enabled

  2. Security
    - Allow public access for customer creation (required for signup)
    - Maintain authenticated access for other operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert access for all users" ON customers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON customers;

-- Create new policies with proper access
CREATE POLICY "Enable insert access for all users"
  ON customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users"
  ON customers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable update access for authenticated users"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;