/*
  # Add Dual Manager Support

  1. Changes
    - Create employee_managers table to support multiple managers per employee
    - Add support for HR as a manager type
    - Update policies to support dual manager access
    - Maintain backward compatibility with existing manager_id field

  2. Security
    - Maintain role-based access control
    - Support both single and dual manager scenarios
    - Allow HR to have manager-like access
*/

-- Create employee_managers table to support multiple managers per employee
CREATE TABLE IF NOT EXISTS employee_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_type text NOT NULL DEFAULT 'primary', -- 'primary', 'secondary', 'hr'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, manager_id)
);

-- Enable RLS on employee_managers table
ALTER TABLE employee_managers ENABLE ROW LEVEL SECURITY;

-- Create policies for employee_managers table
CREATE POLICY "Users can view their own manager relationships"
  ON employee_managers
  FOR SELECT
  USING (
    employee_id = auth.uid() OR manager_id = auth.uid()
  );

CREATE POLICY "Admins can manage all manager relationships"
  ON employee_managers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "HR can view all manager relationships"
  ON employee_managers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'hr'
    )
  );

-- Create indexes for performance
CREATE INDEX employee_managers_employee_id_idx ON employee_managers(employee_id);
CREATE INDEX employee_managers_manager_id_idx ON employee_managers(manager_id);
CREATE INDEX employee_managers_type_idx ON employee_managers(manager_type);

-- Create function to get all managers for an employee
CREATE OR REPLACE FUNCTION get_employee_managers(emp_id uuid)
RETURNS TABLE(manager_id uuid, manager_type text) AS $$
BEGIN
  RETURN QUERY
  SELECT em.manager_id, em.manager_type
  FROM employee_managers em
  WHERE em.employee_id = emp_id
  UNION
  SELECT p.manager_id, 'legacy'::text
  FROM profiles p
  WHERE p.id = emp_id AND p.manager_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is a manager of employee
CREATE OR REPLACE FUNCTION is_manager_of_employee(manager_uuid uuid, employee_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employee_managers em
    WHERE em.manager_id = manager_uuid AND em.employee_id = employee_uuid
    UNION
    SELECT 1 FROM profiles p
    WHERE p.id = employee_uuid AND p.manager_id = manager_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update screenshots policies to support dual managers
DROP POLICY IF EXISTS "Managers can view their team's screenshots" ON screenshots;

CREATE POLICY "Managers can view their team's screenshots"
  ON screenshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM time_entries
      JOIN profiles ON time_entries.user_id = profiles.id
      WHERE time_entries.id = screenshots.time_entry_id
      AND (
        -- Check if current user is a manager of the employee
        is_manager_of_employee(auth.uid(), profiles.id)
        OR
        -- Legacy support for manager_id field
        profiles.manager_id = auth.uid()
      )
    )
  );

-- Update time entries policies to support dual managers
DROP POLICY IF EXISTS "Managers can view their team's time entries" ON time_entries;

CREATE POLICY "Managers can view their team's time entries"
  ON time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = time_entries.user_id
      AND (
        -- Check if current user is a manager of the employee
        is_manager_of_employee(auth.uid(), profiles.id)
        OR
        -- Legacy support for manager_id field
        profiles.manager_id = auth.uid()
      )
    )
  );

-- Update profiles policies to support dual managers
DROP POLICY IF EXISTS "Managers can view their team's profiles" ON profiles;

CREATE POLICY "Managers can view their team's profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS viewer
      WHERE viewer.id = auth.uid()
      AND (
        -- Check if current user is a manager of the employee
        is_manager_of_employee(auth.uid(), profiles.id)
        OR
        -- Legacy support for manager_id field
        profiles.manager_id = auth.uid()
      )
    )
  );

-- Create trigger to handle updated_at
CREATE TRIGGER set_timestamp_employee_managers
  BEFORE UPDATE ON employee_managers
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at(); 