/*
  # Fix Leave Approvers RLS Policies

  1. Changes
    - Drop existing leave approvers policies
    - Add new policies for leave approvers table
    - Fix insert permissions for leave requests
    - Add policies for managers and admins

  2. Security
    - Enable proper RLS for leave approvers
    - Allow users to create approvers when submitting leave requests
    - Allow managers to view and update their assigned approvals
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their leave request approvers" ON leave_approvers;
DROP POLICY IF EXISTS "Approvers can view and update their assigned requests" ON leave_approvers;

-- Create new policies for leave approvers
CREATE POLICY "Users can manage leave request approvers"
  ON leave_approvers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leave_requests
      WHERE leave_requests.id = leave_approvers.leave_request_id
      AND leave_requests.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leave_requests
      WHERE leave_requests.id = leave_approvers.leave_request_id
      AND leave_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can view and update assigned requests"
  ON leave_approvers
  FOR ALL
  TO authenticated
  USING (
    approver_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    approver_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update leave requests policies to ensure proper access
CREATE POLICY "Managers can update leave requests they approve"
  ON leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leave_approvers
      WHERE leave_approvers.leave_request_id = leave_requests.id
      AND leave_approvers.approver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leave_approvers
      WHERE leave_approvers.leave_request_id = leave_requests.id
      AND leave_approvers.approver_id = auth.uid()
    )
  );