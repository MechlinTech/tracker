/*
  # Add Team Field to Profiles

  1. Changes
    - Add team field to profiles table
    - Update existing RLS policies to include team field

  2. Security
    - Maintain existing RLS policies
    - Allow team field to be updated by users with appropriate permissions
*/

-- Add team field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS team text;

-- Update RLS policies to include team field access
CREATE POLICY "Users can update their own team"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);