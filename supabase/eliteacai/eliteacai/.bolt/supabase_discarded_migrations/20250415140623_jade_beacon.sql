/*
  # Fix storage bucket configuration

  1. Changes
    - Ensure receipts bucket exists
    - Set proper permissions
    - Add policies for public access
*/

-- Create storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public to read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to delete receipts" ON storage.objects;

-- Create new policies with proper permissions
CREATE POLICY "Allow public to read receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

CREATE POLICY "Allow public to upload receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'receipts' AND
  octet_length(content) <= 5242880 -- Limit to 5MB
);

CREATE POLICY "Allow public to update receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'receipts')
WITH CHECK (octet_length(content) <= 5242880);

CREATE POLICY "Allow public to delete receipts"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'receipts');