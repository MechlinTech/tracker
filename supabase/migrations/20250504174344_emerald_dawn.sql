/*
  # Add Activity Tracking

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `screenshot_id` (uuid, foreign key)
      - `mouse_movements` (integer)
      - `keystrokes` (integer)
      - `urls` (text array)
      - `productivity_score` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on activity_logs table
    - Add policies for different user roles
*/

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenshot_id uuid REFERENCES screenshots(id) ON DELETE CASCADE NOT NULL,
  mouse_movements integer NOT NULL DEFAULT 0,
  keystrokes integer NOT NULL DEFAULT 0,
  urls text[] DEFAULT ARRAY[]::text[],
  productivity_score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_logs
CREATE POLICY "Users can view their own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screenshots
      JOIN time_entries ON screenshots.time_entry_id = time_entries.id
      WHERE screenshots.id = activity_logs.screenshot_id
      AND time_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view their team's activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screenshots
      JOIN time_entries ON screenshots.time_entry_id = time_entries.id
      JOIN profiles ON time_entries.user_id = profiles.id
      WHERE screenshots.id = activity_logs.screenshot_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all activity logs"
  ON activity_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add index for performance
CREATE INDEX activity_logs_screenshot_id_idx ON activity_logs(screenshot_id);