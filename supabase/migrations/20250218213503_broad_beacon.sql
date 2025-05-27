/*
  # Add Leave Management System

  1. New Tables
    - `leave_types`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `color` (text)
      - `created_at` (timestamp)
    
    - `leave_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `start_date` (date)
      - `end_date` (date)
      - `type_id` (uuid, foreign key)
      - `reason` (text)
      - `status` (enum)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `leave_approvers`
      - `id` (uuid, primary key)
      - `leave_request_id` (uuid, foreign key)
      - `approver_id` (uuid, foreign key)
      - `status` (enum)
      - `comment` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for leave management
*/

-- Create leave status enum
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create leave types table
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text,
  created_at timestamptz DEFAULT now()
);

-- Create leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type_id uuid REFERENCES leave_types(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  status leave_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create leave approvers table
CREATE TABLE IF NOT EXISTS leave_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid REFERENCES leave_requests(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status leave_status DEFAULT 'pending',
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_approvers ENABLE ROW LEVEL SECURITY;

-- Leave types policies
CREATE POLICY "Everyone can view leave types"
  ON leave_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage leave types"
  ON leave_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Leave requests policies
CREATE POLICY "Users can view their own leave requests"
  ON leave_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leave requests"
  ON leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending leave requests"
  ON leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

CREATE POLICY "Managers can view their team's leave requests"
  ON leave_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = leave_requests.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all leave requests"
  ON leave_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Leave approvers policies
CREATE POLICY "Users can view their leave request approvers"
  ON leave_approvers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leave_requests
      WHERE leave_requests.id = leave_approvers.leave_request_id
      AND leave_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can view and update their assigned requests"
  ON leave_approvers
  FOR ALL
  TO authenticated
  USING (auth.uid() = approver_id);

-- Insert default leave types
INSERT INTO leave_types (name, description, color) VALUES
  ('Annual Leave', 'Regular paid time off', '#10B981'),
  ('Sick Leave', 'Leave for medical reasons', '#EF4444'),
  ('Personal Leave', 'Leave for personal matters', '#F59E0B'),
  ('Bereavement Leave', 'Leave for family loss', '#6B7280'),
  ('Study Leave', 'Leave for educational purposes', '#8B5CF6')
ON CONFLICT DO NOTHING;