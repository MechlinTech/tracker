import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Users, AlertCircle, Clock, Monitor, Download, Search, Plus, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

interface User {
  id: string;
  full_name: string;
  role: 'employee' | 'manager' | 'admin' | 'hr' | 'accountant';
  manager_id: string | null;
  team: string;
  time_entries_count: number;
  screenshots_count: number;
}

interface NewUser {
  email: string;
  password: string;
  full_name: string;
  role: 'employee' | 'manager' | 'admin' | 'hr' | 'accountant';
  manager_id: string | null;
  team: string;
  customTeam?: string;
}

const PREDEFINED_TEAMS = [
  'Software Development',
  'QA',
  'Business Development',
  'Management',
  'Other'
];

const USER_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'hr', label: 'HR' },
  { value: 'accountant', label: 'Accountant' }
];

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    manager_id: null,
    team: '',
    customTeam: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role, manager_id, team')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get time entries count
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('id, user_id');

      if (timeError) throw timeError;

      // Get screenshots count
      const { data: screenshots, error: screenshotsError } = await supabase
        .from('screenshots')
        .select('id, time_entry_id');

      if (screenshotsError) throw screenshotsError;

      // Process and combine the data
      const processedUsers = profiles?.map(user => {
        const userTimeEntries = timeEntries?.filter(entry => entry.user_id === user.id) || [];
        const userScreenshots = screenshots?.filter(screenshot => {
          const timeEntry = timeEntries?.find(entry => entry.id === screenshot.time_entry_id);
          return timeEntry?.user_id === user.id;
        }) || [];

        return {
          ...user,
          time_entries_count: userTimeEntries.length,
          screenshots_count: userScreenshots.length
        };
      }) || [];

      const managersData = processedUsers.filter(user => 
        user.role === 'manager' || user.role === 'admin'
      );
      
      setUsers(processedUsers);
      setManagers(managersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole as User['role'] } : user
      ));

      if (newRole === 'manager' || newRole === 'admin') {
        const updatedUser = users.find(u => u.id === userId);
        if (updatedUser && !managers.find(m => m.id === userId)) {
          setManagers([...managers, { ...updatedUser, role: newRole as User['role'] }]);
        }
      } else {
        setManagers(managers.filter(m => m.id !== userId));
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role. Please try again.');
    }
  };

  const handleManagerChange = async (userId: string, newManagerId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ manager_id: newManagerId === 'none' ? null : newManagerId })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user =>
        user.id === userId ? { ...user, manager_id: newManagerId === 'none' ? null : newManagerId } : user
      ));
    } catch (error) {
      console.error('Error updating manager:', error);
      setError('Failed to update manager. Please try again.');
    }
  };

  const handleTeamChange = async (userId: string, newTeam: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team: newTeam })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user =>
        user.id === userId ? { ...user, team: newTeam } : user
      ));
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team. Please try again.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!newUser.password || newUser.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Create auth user with provided password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user data returned');

      // Create profile with force_password_change flag
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: newUser.full_name,
          role: newUser.role,
          manager_id: newUser.manager_id,
          team: newUser.team === 'Other' ? newUser.customTeam : newUser.team,
          force_password_change: true
        });

      if (profileError) throw profileError;

      // Reset form and refresh users
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'employee',
        manager_id: null,
        team: '',
        customTeam: ''
      });
      setShowPassword(false);
      setShowAddUser(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const exportTimeReport = async () => {
    try {
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select('*, profiles(full_name)')
        .order('start_time', { ascending: false });

      if (error) throw error;

      const reportData = timeEntries.map(entry => ({
        'Employee Name': entry.profiles.full_name,
        'Date': format(parseISO(entry.start_time), 'yyyy-MM-dd'),
        'Start Time': format(parseISO(entry.start_time), 'HH:mm:ss'),
        'End Time': entry.end_time ? format(parseISO(entry.end_time), 'HH:mm:ss') : 'Ongoing',
        'Hours': entry.end_time 
          ? ((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60)).toFixed(2)
          : 'Ongoing'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Time Report');
      XLSX.writeFile(wb, `time_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error('Failed to export report:', error);
      setError('Failed to export time report');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // First delete all related records
      // Delete screenshots
      console.log(`Attempting to delete screenshots for user: ${userToDelete.id}`);
      const { error: screenshotsError } = await supabase
        .from('screenshots')
        .delete()
        .eq('user_id', userToDelete.id);

      if (screenshotsError) {
        console.error('Supabase screenshots deletion error:', screenshotsError);
        throw screenshotsError;
      }
      console.log(`Successfully deleted screenshots for user: ${userToDelete.id}`);

      // Delete time entries
      console.log(`Attempting to delete time entries for user: ${userToDelete.id}`);
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .delete()
        .eq('user_id', userToDelete.id);

      if (timeEntriesError) {
        console.error('Supabase time entries deletion error:', timeEntriesError);
        throw timeEntriesError;
      }
      console.log(`Successfully deleted time entries for user: ${userToDelete.id}`);

      // Delete any other user-related records (add more if needed)
      // For example, if you have a notifications table:
      console.log(`Attempting to delete notifications for user: ${userToDelete.id}`);
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userToDelete.id);

      if (notificationsError) {
        console.error('Supabase notifications deletion error:', notificationsError);
        throw notificationsError;
      }
      console.log(`Successfully deleted notifications for user: ${userToDelete.id}`);

      // Delete user's profile
      console.log(`Attempting to delete profile for user: ${userToDelete.id}`);
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) {
        console.error('Supabase profile deletion error:', profileError);
        throw profileError;
      }
      console.log(`Successfully deleted profile for user: ${userToDelete.id}`);

      // Finally, delete user's auth account
      console.log(`Attempting to delete auth user: ${userToDelete.id}`);
      const { error: authError } = await supabase.auth.admin.deleteUser(
        userToDelete.id
      );

      if (authError) {
        console.error('Supabase auth user deletion error:', authError);
        throw authError;
      }
      console.log(`Successfully deleted auth user: ${userToDelete.id}`);

      // Update local state
      setUsers(users.filter(user => user.id !== userToDelete.id));
      setManagers(managers.filter(manager => manager.id !== userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error during user deletion process:', error);
      setError('Failed to delete user and their records. Please try again.');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.team?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-indigo-600" />
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Admin Panel</h2>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={exportTimeReport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export All Reports
            </button>
            <button
              onClick={() => setShowAddUser(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              {users.length} Users
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {showAddUser && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Add New User</h3>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    User will be required to change this password on first login
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {USER_ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Manager</label>
                  <select
                    value={newUser.manager_id || 'none'}
                    onChange={(e) => setNewUser({ ...newUser, manager_id: e.target.value === 'none' ? null : e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="none">No Manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team</label>
                  <select
                    value={newUser.team}
                    onChange={(e) => setNewUser({ ...newUser, team: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select Team</option>
                    {PREDEFINED_TEAMS.map((team) => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                  {newUser.team === 'Other' && (
                    <input
                      type="text"
                      placeholder="Enter custom team name"
                      value={newUser.customTeam}
                      onChange={(e) => setNewUser({ ...newUser, customTeam: e.target.value })}
                      className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  )}
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-red-600">Confirm User Deletion</h3>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Are you sure you want to delete <span className="font-semibold">{userToDelete.full_name}</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-700">
                    This action will permanently delete:
                  </p>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                    <li>User's profile information</li>
                    <li>All time entries</li>
                    <li>All screenshots</li>
                    <li>All notifications</li>
                    <li>User's authentication account</li>
                  </ul>
                  <p className="mt-2 text-sm font-medium text-red-700">
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setUserToDelete(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete User and All Records
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users by name or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      {USER_ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.manager_id || 'none'}
                      onChange={(e) => handleManagerChange(user.id, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      disabled={user.role === 'admin'}
                    >
                      <option value="none">No Manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.team || ''}
                      onChange={(e) => handleTeamChange(user.id, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select Team</option>
                      {PREDEFINED_TEAMS.map((team) => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                    {user.team && !PREDEFINED_TEAMS.includes(user.team) && (
                      <input
                        type="text"
                        value={user.team}
                        onChange={(e) => handleTeamChange(user.id, e.target.value)}
                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-2" />
                        {user.time_entries_count} Time Entries
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Monitor className="h-4 w-4 mr-2" />
                        {user.screenshots_count} Screenshots
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => {
                        setUserToDelete(user);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Delete User"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}