import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Users, Clock, Calendar, X, CheckCircle, XCircle, Clock3, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { Pagination } from '@mui/material';

interface TeamMember {
  id: string;
  full_name: string;
  current_status: 'online' | 'offline';
  latest_activity?: string;
}

interface TimeEntry {
  start_time: string;
  end_time: string | null;
  duration: number;
  description: string | null;
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  leave_type: {
    name: string;
    color: string;
  };
}

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: TeamMember;
}

function EmployeeDetailsModal({ isOpen, onClose, employee }: EmployeeDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen && employee) {
      fetchEmployeeDetails();
    }
  }, [isOpen, employee]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch time entries
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', employee.id)
        .order('start_time', { ascending: false })
        .limit(10);

      if (timeError) throw timeError;

      // Fetch leave requests
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_type:leave_types(*)
        `)
        .eq('user_id', employee.id)
        .order('start_date', { ascending: false });

      if (leaveError) throw leaveError;

      setTimeEntries(timeData || []);
      setLeaveRequests(leaveData || []);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      setError('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(timeEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = timeEntries.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!isOpen) return null;

  const calculateWorkHours = (entry: TimeEntry) => {
    if (entry.duration) {
      // Convert seconds to hours and minutes
      const totalSeconds = entry.duration;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    // Fallback for entries without duration (should not happen with the new schema)
    const start = new Date(entry.start_time).getTime();
    const end = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
    const hours = (end - start) / (1000 * 60 * 60);
    return hours.toFixed(2);
  };

  const getPendingLeaves = () => 
    leaveRequests.filter(leave => leave.status === 'pending');

  const getApprovedFutureLeaves = () => 
    leaveRequests.filter(leave => 
      leave.status === 'approved' && 
      isAfter(new Date(leave.start_date), new Date())
    );

  const getTotalLeavesTaken = () =>
    leaveRequests.filter(leave => 
      leave.status === 'approved' &&
      !isAfter(new Date(leave.end_date), new Date())
    ).length;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{employee.full_name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-6">
            <div className="flex items-center text-red-800 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          </div>
        ) : loading ? (
          <div className="p-6 text-center">
            <div className="text-gray-500">Loading employee details...</div>
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Current Status */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Status</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock3 className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">
                      {employee.current_status === 'online' ? 'Currently Working' : 'Offline'}
                    </span>
                  </div>
                  {employee.latest_activity && (
                    <span className="text-sm text-gray-500">
                      Last active: {format(parseISO(employee.latest_activity), 'PPp')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Time Entries */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Time Entries</h3>
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentEntries.map((entry) => (
                      <tr key={entry.start_time}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(parseISO(entry.start_time), 'PP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(parseISO(entry.start_time), 'p')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calculateWorkHours(entry)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

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
            </div>

            {/* Leave Summary */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="text-yellow-900 font-medium">Pending Leaves</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                      {getPendingLeaves().length}
                    </span>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-900 font-medium">Upcoming Leaves</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {getApprovedFutureLeaves().length}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-blue-900 font-medium">Total Leaves Taken</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {getTotalLeavesTaken()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Requests */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Requests</h3>
              <div className="space-y-4">
                {leaveRequests.map((leave) => (
                  <div
                    key={leave.id}
                    className="bg-white border rounded-lg shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${leave.leave_type.color}20`,
                            color: leave.leave_type.color
                          }}
                        >
                          {leave.leave_type.name}
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                          leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1} days
                      </span>
                    </div>
                    <div className="text-sm text-gray-900">
                      {format(parseISO(leave.start_date), 'PP')} - {format(parseISO(leave.end_date), 'PP')}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{leave.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamView() {
  const user = useStore((state) => state.user);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null);

  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('manager_id', user?.id);

        if (membersError) throw membersError;

        const membersWithStatus = await Promise.all(
          (members || []).map(async (member) => {
            const { data: latestEntry } = await supabase
              .from('time_entries')
              .select('*')
              .eq('user_id', member.id)
              .order('start_time', { ascending: false })
              .limit(1)
              .single();

            return {
              ...member,
              current_status: latestEntry?.description === 'Tracking started' ? 'online' : 'offline',
              latest_activity: latestEntry?.start_time,
            };
          })
        );

        // Sort members: online first, then offline
        const sortedMembers = membersWithStatus.sort((a, b) => {
          if (a.current_status === 'online' && b.current_status === 'offline') return -1;
          if (a.current_status === 'offline' && b.current_status === 'online') return 1;
          return 0;
        });

        setTeamMembers(sortedMembers);
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTeamMembers();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-indigo-600" />
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Team Overview</h2>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
            {teamMembers.length} Team Members
          </span>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">Loading team data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedEmployee(member)}
                className="bg-white border rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{member.full_name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.current_status === 'online' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.current_status === 'online' ? 'Currently Working' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" />
                  {member.latest_activity ? (
                    <span>Start time: {format(parseISO(member.latest_activity), 'PPp')}</span>
                  ) : (
                    <span>No recent activity</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEmployee && (
        <EmployeeDetailsModal
          isOpen={true}
          onClose={() => setSelectedEmployee(null)}
          employee={selectedEmployee}
        />
      )}
    </div>
  );
}