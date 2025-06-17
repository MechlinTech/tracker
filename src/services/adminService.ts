import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Create a new Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

interface User {
  id: string;
  full_name: string;
  role: 'employee' | 'manager' | 'admin' | 'hr' | 'accountant';
  manager_id: string | null;
  team: string;
}

interface AdminResponse {
  success: boolean;
  error?: string;
}

export const adminService = {
  async deleteUser(userId: string): Promise<AdminResponse> {
    try {
      // First check if the current user is an admin
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!currentUser) throw new Error('No authenticated user');

      // Get the current user's profile to check if they're an admin
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;
      if (!currentUserProfile) throw new Error('No profile found');
      if (currentUserProfile.role !== 'admin') {
        throw new Error('Only administrators can delete users');
      }

      // Get time entry IDs for the user
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('id')
        .eq('user_id', userId);

      if (timeEntriesError) throw timeEntriesError;
      const timeEntryIds = timeEntries?.map(entry => entry.id) || [];

      // Get screenshot IDs related to user's time entries
      let screenshotIds: string[] = [];
      if (timeEntryIds.length > 0) {
        const { data: screenshots, error: screenshotsError } = await supabase
          .from('screenshots')
          .select('id')
          .in('time_entry_id', timeEntryIds);

        if (screenshotsError) throw screenshotsError;
        screenshotIds = screenshots?.map(screenshot => screenshot.id) || [];
      }

      // Delete activity logs related to user's screenshots
      if (screenshotIds.length > 0) {
        const { error: activityLogsError } = await supabase
          .from('activity_logs')
          .delete()
          .in('screenshot_id', screenshotIds);

        if (activityLogsError) throw activityLogsError;
      }

      // Delete screenshots related to user's time entries
      if (timeEntryIds.length > 0) {
        const { error: screenshotsError } = await supabase
          .from('screenshots')
          .delete()
          .in('time_entry_id', timeEntryIds);

        if (screenshotsError) throw screenshotsError;
      }

      // Get leave request IDs for the user
      const { data: leaveRequests, error: leaveRequestsError } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('user_id', userId);

      if (leaveRequestsError) throw leaveRequestsError;
      const leaveRequestIds = leaveRequests?.map(request => request.id) || [];

      // Delete leave approvers related to user's leave requests
      if (leaveRequestIds.length > 0) {
        const { error: leaveApproversError } = await supabase
          .from('leave_approvers')
          .delete()
          .in('leave_request_id', leaveRequestIds);

        if (leaveApproversError) throw leaveApproversError;
      }

      // Delete leave requests for the user
      if (leaveRequestIds.length > 0) {
        const { error: leaveRequestsDeleteError } = await supabase
          .from('leave_requests')
          .delete()
          .eq('user_id', userId);

        if (leaveRequestsDeleteError) throw leaveRequestsDeleteError;
      }

      // Delete time entries for the user
      if (timeEntryIds.length > 0) {
        const { error: timeEntriesDeleteError } = await supabase
          .from('time_entries')
          .delete()
          .eq('user_id', userId);

        if (timeEntriesDeleteError) throw timeEntriesDeleteError;
      }

      // Delete notifications for the user
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (notificationsError) throw notificationsError;

      // Delete user's profile
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileDeleteError) throw profileDeleteError;

      // Use the admin client to delete the user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      return { success: true };
    } catch (error) {
      console.error('Error in deleteUser:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred while deleting the user'
      };
    }
  },

  async updateUserRole(userId: string, newRole: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      throw error;
    }
  },

  async updateUserManager(userId: string, newManagerId: string | null): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ manager_id: newManagerId })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in updateUserManager:', error);
      throw error;
    }
  },

  async updateUserTeam(userId: string, newTeam: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team: newTeam })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in updateUserTeam:', error);
      throw error;
    }
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<AdminResponse> {
    try {
      // First check if the current user is an admin
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!currentUser) throw new Error('No authenticated user');

      // Get the current user's profile to check if they're an admin
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;
      if (!currentUserProfile) throw new Error('No profile found');
      if (currentUserProfile.role !== 'admin') {
        throw new Error('Only administrators can reset user passwords');
      }

      // Use the admin client to update the password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) throw updateError;

      // Update the force_password_change flag in the profiles table
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ force_password_change: true })
        .eq('id', userId);

      if (updateProfileError) throw updateProfileError;

      return { success: true };
    } catch (error) {
      console.error('Error in resetUserPassword:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred while resetting the password'
      };
    }
  }
}; 