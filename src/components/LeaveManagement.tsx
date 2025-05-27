import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, AlertCircle, Check, X } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import Select from 'react-select';

interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  leave_type: {
    name: string;
    color: string;
  };
  user: {
    full_name: string;
  };
  approvers: Array<{
    id: string;
    approver_id: string;
    status: 'pending' | 'approved' | 'rejected';
    approver: {
      full_name: string;
    };
  }>;
}

export default function LeaveManagement() {
  const user = useStore((state) => state.user);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [managers, setManagers] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

  useEffect(() => {
    fetchLeaveTypes();
    fetchManagers();
    fetchLeaveRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('leave_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
        },
        () => {
          fetchLeaveRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_approvers',
        },
        () => {
          fetchLeaveRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchLeaveTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*');

      if (error) throw error;
      setLeaveTypes(data || []);
    } catch (error) {
      console.error('Error fetching leave types:', error);
      setError('Failed to load leave types');
    }
  };

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['manager', 'admin']);

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
      setError('Failed to load managers');
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          leave_type:leave_types(*),
          user:profiles(full_name),
          approvers:leave_approvers(
            id,
            approver_id,
            status,
            approver:profiles(full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (user?.role === 'employee') {
        query = query.eq('user_id', user.id);
      } else if (user?.role === 'manager') {
        query = query.or(`user_id.eq.${user.id},approvers.approver_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!selectedApprovers.length) {
        throw new Error('Please select at least one approver');
      }

      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('End date must be after start date');
      }

      // Create leave request
      const { data: leaveRequest, error: leaveError } = await supabase
        .from('leave_requests')
        .insert({
          user_id: user?.id,
          type_id: selectedType,
          start_date: startDate,
          end_date: endDate,
          reason,
          status: 'pending'
        })
        .select()
        .single();

      if (leaveError) throw leaveError;

      // Create approver records
      const approverRecords = selectedApprovers.map(approverId => ({
        leave_request_id: leaveRequest.id,
        approver_id: approverId,
        status: 'pending'
      }));

      const { error: approverError } = await supabase
        .from('leave_approvers')
        .insert(approverRecords);

      if (approverError) throw approverError;

      // Reset form
      setSelectedType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setSelectedApprovers([]);

      // Show success notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Leave Request Submitted', {
          body: 'Your leave request has been submitted successfully.'
        });
      }

      // Refresh leave requests
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit leave request');
    }
  };

  const handleApproveReject = async (leaveId: string, approverId: string, status: 'approved' | 'rejected') => {
    try {
      const { error: approverError } = await supabase
        .from('leave_approvers')
        .update({ status })
        .eq('leave_request_id', leaveId)
        .eq('approver_id', approverId);

      if (approverError) throw approverError;

      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Leave Request Updated', {
          body: `Leave request has been ${status}`
        });
      }
    } catch (error) {
      console.error('Error updating leave request:', error);
      setError('Failed to update leave request');
    }
  };

  // Rest of the component (JSX) remains the same...
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-indigo-600" />
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Leave Management</h2>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Leave Request Form */}
        <form onSubmit={handleSubmitLeave} className="mb-8 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">New Leave Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Leave Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Select a type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Approvers</label>
              <Select
                isMulti
                options={managers.map(m => ({ value: m.id, label: m.full_name }))}
                onChange={(selected) => setSelectedApprovers(selected.map(s => s.value))}
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Submit Leave Request
            </button>
          </div>
        </form>

        {/* Leave Requests List */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Requests</h3>
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : leaveRequests.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No leave requests found</div>
            ) : (
              leaveRequests.map((request) => (
                <div key={request.id} className="bg-white border rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {request.user.full_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(request.start_date), 'PPP')} - {format(parseISO(request.end_date), 'PPP')}
                        {' '}({differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1} days)
                      </p>
                      <div className="mt-2">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: request.leave_type.color + '20', color: request.leave_type.color }}
                        >
                          {request.leave_type.name}
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Submitted {format(parseISO(request.created_at), 'PPp')}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-900">Reason:</h5>
                    <p className="mt-1 text-sm text-gray-500">{request.reason}</p>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Approvers:</h5>
                    <div className="space-y-2">
                      {request.approvers.map((approver) => (
                        <div key={approver.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900">{approver.approver.full_name}</span>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              approver.status === 'approved' ? 'bg-green-100 text-green-800' :
                              approver.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {approver.status}
                            </span>
                          </div>
                          
                          {approver.approver_id === user?.id && request.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveReject(request.id, approver.approver_id, 'approved')}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveReject(request.id, approver.approver_id, 'rejected')}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}