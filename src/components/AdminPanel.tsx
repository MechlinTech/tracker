import React, { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Settings, Users, AlertCircle, Clock, Monitor, Download, Search, Plus, X, Eye, EyeOff, Trash2, Key, Copy, CheckCircle, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { Pagination } from '@mui/material';
import { adminService } from '../services/adminService';

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    manager_id: null,
    team: '',
    customTeam: ''
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isManualPassword, setIsManualPassword] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [userToEditName, setUserToEditName] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editNameError, setEditNameError] = useState<string | null>(null);

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
      await adminService.updateUserRole(userId, newRole);
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
      await adminService.updateUserManager(userId, newManagerId === 'none' ? null : newManagerId);
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
      await adminService.updateUserTeam(userId, newTeam);
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

      // Create auth user with admin API
      const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true
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
      setSuccessMessage(`User ${newUser.full_name} has been successfully created`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
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

      const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h:${minutes}m`;
      };

      const reportData = timeEntries.map(entry => ({
        'Employee Name': entry.profiles.full_name,
        'Date': format(parseISO(entry.start_time), 'yyyy-MM-dd'),
        'Start Time': format(parseISO(entry.start_time), 'HH:mm:ss'),
        'Duration': formatDuration(entry.duration || 0)
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
      const result = await adminService.deleteUser(userToDelete.id);
      
      if (!result.success) {
        setError(result.error || 'Failed to delete user. Please try again.');
        return;
      }

      setUsers(users.filter(user => user.id !== userToDelete.id));
      setManagers(managers.filter(manager => manager.id !== userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setError(null);
      setSuccessMessage(`User ${userToDelete.full_name} has been successfully deleted`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      console.error('Error during user deletion process:', error);
      setError('Failed to delete user and their records. Please try again.');
    }
  };

  const generateRandomPassword = () => {
    const length = 6;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    setGeneratedPassword(password);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      // You could add a toast notification here if you have one
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedUser || !generatedPassword) return;

    try {
      const result = await adminService.resetUserPassword(selectedUser.id, generatedPassword);
      
      if (!result.success) {
        setPasswordChangeError(result.error || 'Failed to change password. Please try again.');
        return;
      }

      setShowPasswordChange(false);
      setSelectedUser(null);
      setGeneratedPassword('');
      setShowGeneratedPassword(false);
      setPasswordChangeError(null);
      setIsManualPassword(false);
      setSuccessMessage(`Password successfully changed for ${selectedUser.full_name}`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error: unknown) {
      console.error('Error in handlePasswordChange:', error);
      setPasswordChangeError('Failed to change password. Please try again.');
    }
  };

  const handleEditName = (user: User) => {
    setUserToEditName(user);
    setEditFullName(user.full_name);
    setEditNameError(null);
    setShowEditNameModal(true);
  };

  const handleSaveEditName = async () => {
    if (!userToEditName) return;
    if (!editFullName.trim()) {
      setEditNameError('Full name cannot be empty.');
      return;
    }
    try {
      setEditNameError(null);
      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editFullName.trim() })
        .eq('id', userToEditName.id);
      if (error) throw error;
      // Update in local state
      setUsers(users.map(user =>
        user.id === userToEditName.id ? { ...user, full_name: editFullName.trim() } : user
      ));
      setShowEditNameModal(false);
      setUserToEditName(null);
      setEditFullName('');
      setSuccessMessage('Username updated successfully.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setEditNameError('Failed to update username. Please try again.');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.team?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
            <span className="text-green-700">{successMessage}</span>
          </div>
        )}

        {showAddUser && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl transform transition-all sm:align-middle">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Initial Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10 px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    User will be required to change this password on first login.
                  </p>
                </div>
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    id="full_name"
                    required
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pl-3 pr-10 py-2"
                  >
                    {USER_ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="manager" className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                  <select
                    id="manager"
                    value={newUser.manager_id || 'none'}
                    onChange={(e) => setNewUser({ ...newUser, manager_id: e.target.value === 'none' ? null : e.target.value })}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pl-3 pr-10 py-2"
                    disabled={newUser.role === 'admin'}
                  >
                    <option value="none">No Manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                  <select
                    id="team"
                    value={newUser.team}
                    onChange={(e) => setNewUser({ ...newUser, team: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pl-3 pr-10 py-2"
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
                      className="mt-2 block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
                    />
                  )}
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {error}
                  </div>
                )}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
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
              {currentUsers.map((user) => (
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
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select Team</option>
                      {PREDEFINED_TEAMS.map((team) => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                    {/* {user.team && !PREDEFINED_TEAMS.includes(user.team) && (
                      <input
                        type="text"
                        value={user.team}
                        onChange={(e) => handleTeamChange(user.id, e.target.value)}
                        className="mt-2 block w-full rounded-md border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                      />
                    )} */}
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
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => handleEditName(user)}
                        className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 relative group transition-colors"
                        title="Edit Username"
                      >
                        <Pencil className="h-5 w-5" />
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          Edit Username
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPasswordChange(true);
                          generateRandomPassword();
                        }}
                        className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-900 relative group transition-colors"
                        title="Change Password"
                      >
                        <Key className="h-5 w-5" />
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          Change Password
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete(user);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-900 relative group transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="h-5 w-5" />
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          Delete User
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center px-4 py-3 bg-white border-t border-gray-200">
            <Pagination 
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => handlePageChange(page)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              <button
                onClick={() => {
                  setShowPasswordChange(false);
                  setSelectedUser(null);
                  setGeneratedPassword('');
                  setShowGeneratedPassword(false);
                  setPasswordChangeError(null);
                  setIsManualPassword(false);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-700">
                Changing password for <span className="font-semibold">{selectedUser.full_name}</span>
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id="manualPassword"
                    checked={isManualPassword}
                    onChange={(e) => {
                      setIsManualPassword(e.target.checked);
                      if (!e.target.checked) {
                        generateRandomPassword();
                      }
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="manualPassword" className="text-sm text-gray-700">
                    Enter password manually
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showGeneratedPassword ? 'text' : 'password'}
                    value={generatedPassword}
                    onChange={(e) => setGeneratedPassword(e.target.value)}
                    readOnly={!isManualPassword}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 pr-20"
                    placeholder={isManualPassword ? "Enter new password" : "Generated password"}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-2">
                    <button
                      onClick={() => setShowGeneratedPassword(!showGeneratedPassword)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showGeneratedPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                    {!isManualPassword && (
                      <button
                        onClick={copyToClipboard}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy Password"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex space-x-3">
                  {!isManualPassword && (
                    <button
                      onClick={generateRandomPassword}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Generate New Password
                    </button>
                  )}
                  <button
                    onClick={handlePasswordChange}
                    disabled={!generatedPassword}
                    className={`flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      !generatedPassword
                        ? 'bg-indigo-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    Reset Password
                  </button>
                </div>
                {passwordChangeError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {passwordChangeError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Username Modal */}
      {showEditNameModal && userToEditName && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Username</h3>
              <button
                onClick={() => {
                  setShowEditNameModal(false);
                  setUserToEditName(null);
                  setEditFullName('');
                  setEditNameError(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <label htmlFor="editFullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                id="editFullName"
                type="text"
                value={editFullName}
                onChange={e => setEditFullName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
              />
              {editNameError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {editNameError}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditNameModal(false);
                    setUserToEditName(null);
                    setEditFullName('');
                    setEditNameError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditName}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}