/*
  # Add Desktop App Storage Bucket

  1. Changes
    - Create storage bucket for desktop application binaries
    - Add policies for downloading and uploading

  2. Security
    - Allow public download access
    - Restrict upload to admin users only
*/

-- Create storage bucket for desktop app
INSERT INTO storage.buckets (id, name, public)
VALUES ('desktop-app', 'desktop-app', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public download access
CREATE POLICY "Public download access"
ON storage.objects FOR SELECT
USING (bucket_id = 'desktop-app');

-- Allow admin upload access
CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'desktop-app'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);