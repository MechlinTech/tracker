import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Download, Search, Filter } from 'lucide-react';
import Select from 'react-select';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { Pagination } from '@mui/material';

interface DailyTimeEntry {
  date: string;
  user_id: string;
  user_name: string;
  total_hours: number;
}

interface FilterOptions {
  users: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

export default function Reports() {
  const user = useStore((state) => state.user);
  const [timeEntries, setTimeEntries] = useState<DailyTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState<FilterOptions>({
    users: [],
    dateRange: {
      start: '',
      end: '',
    },
  });
  const [displayFilters, setDisplayFilters] = useState<FilterOptions>({
    users: [],
    dateRange: {
      start: '',
      end: '',
    },
  });

  // Calculate pagination
  const totalPages = Math.ceil(timeEntries.length / itemsPerPage);
  // Ensure current page doesn't exceed total pages
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = timeEntries.slice(startIndex, endIndex);

  const validateDateRange = (start: string, end: string): boolean => {
    if (start && end && new Date(start) > new Date(end)) {
      setError('Start date cannot be greater than end date');
      return false;
    }
    setError(null);
    return true;
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  useEffect(() => {
    fetchTimeEntries();
    // Reset pagination to page 1 when filters change
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Adjust current page if it exceeds total pages after data changes
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const fetchUsers = async () => {
    try {
      let query = supabase.from('profiles').select('id, full_name');
      let usersList = [];
      if (user?.role === 'manager') {
        query = query.eq('manager_id', user.id);
        const { data, error } = await query;
        if (error) throw error;
        // Add manager's own profile to the list
        usersList = [...(data || []), { id: user.id, full_name: user.full_name }];
      } else if (!['admin', 'hr', 'accountant'].includes(user?.role || '')) {
        query = query.eq('id', user?.id);
        const { data, error } = await query;
        if (error) throw error;
        usersList = data || [];
      } else {
        const { data, error } = await query;
        if (error) throw error;
        usersList = data || [];
      }
      setUsers(usersList.map(u => ({ value: u.id, label: u.full_name })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      let managedUserIds: string[] = [];
      if (user?.role === 'manager') {
        const { data: managedUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('manager_id', user.id);
        managedUserIds = managedUsers?.map(u => u.id) || [];
        // Add manager's own id
        managedUserIds = [...managedUserIds, user.id];
      }

      let query = supabase
        .from('time_entries')
        .select(`
          start_time,
          duration,
          user_id,
          profiles:profiles(full_name)
        `);

      if (filters.dateRange.start) {
        query = query.gte('start_time', startOfDay(new Date(filters.dateRange.start)).toISOString());
      }
      if (filters.dateRange.end) {
        query = query.lte('start_time', endOfDay(new Date(filters.dateRange.end)).toISOString());
      }
      if (filters.users.length > 0) {
        query = query.in('user_id', filters.users);
      }

      if (user?.role === 'manager') {
        query = query.in('user_id', managedUserIds);
      } else if (!['admin', 'hr', 'accountant'].includes(user?.role || '')) {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group and sum by date and user
      const dailySummaries: DailyTimeEntry[] = [];
      data?.forEach(entry => {
        const date = format(parseISO(entry.start_time), 'yyyy-MM-dd');
        const existingEntry = dailySummaries.find(
          summary => summary.date === date && summary.user_id === entry.user_id
        );

        if (existingEntry) {
          existingEntry.total_hours += entry.duration || 0;
        } else {
          dailySummaries.push({
            date,
            user_id: entry.user_id,
            user_name: (entry.profiles as any)?.full_name || 'Unknown User',
            total_hours: entry.duration || 0
          });
        }
      });

      // Sort by date descending
      dailySummaries.sort((a, b) => b.date.localeCompare(a.date));
      setTimeEntries(dailySummaries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    // Determine if filters are applied
    const filtersApplied = filters.users.length > 0 || filters.dateRange.start || filters.dateRange.end;

    // 1. Get the date range for the current month if no filters are applied
    let dateStart: Date, dateEnd: Date;
    if (!filtersApplied) {
      const now = new Date();
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // up to today only
    } else {
      dateStart = filters.dateRange.start ? new Date(filters.dateRange.start) : new Date();
      dateEnd = filters.dateRange.end ? new Date(filters.dateRange.end) : new Date();
    }

    // 2. Generate all dates in the range (for current year or filtered range)
    let allDates: string[] = [];
    if (!filtersApplied) {
      let d = new Date(dateStart);
      while (d <= dateEnd) {
        allDates.push(format(d, 'yyyy-MM-dd'));
        d.setDate(d.getDate() + 1);
      }
    } else if (filters.dateRange.start && filters.dateRange.end) {
      // If a date range filter is applied, include all dates in that range
      let d = new Date(dateStart);
      while (d <= dateEnd) {
        allDates.push(format(d, 'yyyy-MM-dd'));
        d.setDate(d.getDate() + 1);
      }
    } else {
      // Use only dates present in timeEntries if no date range filter
      allDates = Array.from(new Set(timeEntries.map(e => e.date))).sort();
    }

    // 3. Get all unique users, sorted by name A-Z
    const uniqueUsers = Array.from(new Set(timeEntries.map(e => e.user_id)))
      .map(user_id => {
        const entry = timeEntries.find(e => e.user_id === user_id);
        return { user_id, user_name: entry ? entry.user_name : '' };
      })
      .sort((a, b) => a.user_name.localeCompare(b.user_name));

    // 4. Build a map: user_id -> { date -> total_hours }
    const userDateHours: Record<string, Record<string, number>> = {};
    timeEntries.forEach(entry => {
      if (!userDateHours[entry.user_id]) userDateHours[entry.user_id] = {};
      userDateHours[entry.user_id][entry.date] = entry.total_hours;
    });

    // 5. Build the 2D array for export
    const header = ['Sr. No.', 'Employee ID', 'Employee Name', 'Total Time', ...allDates.map(date => format(parseISO(date), 'EEE MMM-d-yy'))];
    const rows = uniqueUsers.map((user, idx) => {
      let monthlyTotalSeconds = 0;
      allDates.forEach(date => {
        const totalSeconds = userDateHours[user.user_id]?.[date] || 0;
        monthlyTotalSeconds += totalSeconds;
      });
      const totalHours = Math.floor(monthlyTotalSeconds / 3600);
      const totalMinutes = Math.floor((monthlyTotalSeconds % 3600) / 60);
      const row = [idx + 1, '--', user.user_name, monthlyTotalSeconds > 0 ? `${totalHours}h ${totalMinutes}m` : '--'];
      allDates.forEach(date => {
        const totalSeconds = userDateHours[user.user_id]?.[date] || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        row.push(totalSeconds > 0 ? `${hours}h ${minutes}m` : '--');
      });
      return row;
    });
    const aoa = [header, ...rows];

    // 6. Export using aoa_to_sheet (no header bold styling)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!rows'] = ws['!rows'] || [];
    ws['!rows'][0] = { hpt: 18 }; // Optionally, make header row taller
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Time Report');

    // --- Custom file naming logic ---
    const formatShort = (date: Date) => format(date, 'MMM-d-yy');
    const today = new Date();
    const usernames = filters.users
      .map(
        uid => users.find(u => u.value === uid)?.label?.toLowerCase().replace(/\s+/g, '')
      )
      .filter(Boolean);
    const hasUserFilter = usernames.length > 0;
    const hasDateFilter = !!(filters.dateRange.start && filters.dateRange.end);
    let fileName = '';
    
    if (hasUserFilter && !hasDateFilter) {
      fileName = `${usernames.join('_')}_report_${formatShort(today)}`;
    } else if (!hasUserFilter && hasDateFilter) {
      fileName = `report_${formatShort(new Date(filters.dateRange.start))}_${formatShort(new Date(filters.dateRange.end))}`;
    } else if (hasUserFilter && hasDateFilter) {
      fileName = `${usernames.join('_')}_${formatShort(new Date(filters.dateRange.start))}_${formatShort(new Date(filters.dateRange.end))}`;
    } else {
      // Monthly report format when no filters are applied
      const monthName = format(today, 'MMMM');
      const year = format(today, 'yyyy');
      fileName = `Monthly_Report_${monthName}_${year}`;
    }
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const clearFilters = () => {
    setFilters({
      users: [],
      dateRange: {
        start: '',
        end: '',
      },
    });
    setDisplayFilters({
      users: [],
      dateRange: {
        start: '',
        end: '',
      },
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Daily Time Reports</h2>
            <button
              onClick={exportReport}
              className="btn-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
        </div>

        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'hr' || user?.role === 'accountant') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Users
                </label>
                <Select
                  isMulti
                  options={users}
                  value={displayFilters.users.map(id => users.find(u => u.value === id)).filter((u): u is { value: string; label: string } => u !== undefined)}
                  onChange={(selected) => {
                    const selectedUsers = selected ? selected.map(s => s.value) : [];
                    setDisplayFilters({
                      ...displayFilters,
                      users: selectedUsers
                    });
                    setFilters({
                      ...filters,
                      users: selectedUsers
                    });
                  }}
                  className="basic-multi-select"
                  classNamePrefix="select"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={displayFilters.dateRange.start}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setDisplayFilters({
                      ...displayFilters,
                      dateRange: { ...displayFilters.dateRange, start: newStart }
                    });
                    if (validateDateRange(newStart, displayFilters.dateRange.end)) {
                      setFilters({
                        ...filters,
                        dateRange: { ...filters.dateRange, start: newStart }
                      });
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="input placeholder-gray-400 rounded-md"
                    placeholder="mm/dd/yyyy"
                    style={{ color: !displayFilters.dateRange.start ? '#9ca3af' : undefined }}
                />
                <input
                  type="date"
                  value={displayFilters.dateRange.end}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    setDisplayFilters({
                      ...displayFilters,
                      dateRange: { ...displayFilters.dateRange, end: newEnd }
                    });
                    if (validateDateRange(displayFilters.dateRange.start, newEnd)) {
                      setFilters({
                        ...filters,
                        dateRange: { ...filters.dateRange, end: newEnd }
                      });
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="input placeholder-gray-400 rounded-md"
                  placeholder="mm/dd/yyyy"
                  style={{ color: !displayFilters.dateRange.end ? '#9ca3af' : undefined }}
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm mt-1">
                  {error}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={clearFilters}
              className="btn-secondary"
            >
              Clear Filters
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchTimeEntries();
              }}
              className="btn-primary"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentEntries.map((entry, index) => (
                <tr key={`${entry.date}-${entry.user_id}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(parseISO(entry.date), 'PP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const totalSeconds = entry.total_hours;
                      const hours = Math.floor(totalSeconds / 3600);
                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                      return `${hours}h ${minutes}m`;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Replace the old pagination with MUI Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center px-4 py-3 bg-white border-t border-gray-200">
              <Pagination 
                count={totalPages}
                page={safeCurrentPage}
                onChange={(_, page) => handlePageChange(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <div className="text-gray-500">Loading...</div>
            </div>
          )}

          {!loading && timeEntries.length === 0 && (
            <div className="text-center py-4">
              <div className="text-gray-500">No time entries found</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}