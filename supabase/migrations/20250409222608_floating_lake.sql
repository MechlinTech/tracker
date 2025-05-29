/*
  # Add Force Password Change Flag

  1. Changes
    - Add force_password_change boolean to profiles table
    - Default to true for new users
    - Add RLS policies for password change flag

  2. Security
    - Allow users to update their own password change flag
    - Maintain existing security policies
*/

-- Add force_password_change column
ALTER TABLE profiles
ADD COLUMN force_password_change boolean DEFAULT true;

-- Add policy for updating force_password_change
CREATE POLICY "Users can update their own force_password_change status"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);