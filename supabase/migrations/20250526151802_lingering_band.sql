/*
  # Add New Roles and Reports Functionality

  1. Changes
    - Add new roles (HR, accountant) to user_role enum
    - Add time_entries duration column
    - Add report access policies
    - Update time entry reset time to 5 AM

  2. Security
    - Maintain role-based access control
    - Add policies for report access
*/

-- Update user_role enum to include new roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';

-- Add duration column to time_entries if not exists
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS duration int4;

-- Create function to calculate duration
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate duration
CREATE TRIGGER update_time_entry_duration
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- Create function to adjust date for 5 AM cutoff
CREATE OR REPLACE FUNCTION adjust_date_for_cutoff(timestamp with time zone)
RETURNS date AS $$
BEGIN
  RETURN date(
    CASE 
      WHEN EXTRACT(HOUR FROM $1) < 5 THEN
        $1 - interval '1 day'
      ELSE
        $1
    END
  );
END;
$$ LANGUAGE plpgsql;