import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Camera, Monitor, Clock, AlertCircle, Search, Filter, User } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface Screenshot {
  id: string;
  time_entry_id: string;
  storage_path: string;
  taken_at: string;
  type: 'screen' | 'webcam';
  url?: string;
  user: {
    full_name: string;
  };
}

interface FilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  timeRange: {
    start: string;
    end: string;
  };
  userName: string;
}

export default function Screenshots() {
  const user = useStore((state) => state.user);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 grid
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: '',
      end: '',
    },
    timeRange: {
      start: '',
      end: '',
    },
    userName: '',
  });

  useEffect(() => {
    fetchScreenshots();
  }, [user]);

  const fetchScreenshots = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('screenshots')
        .select(`
          *,
          time_entries!inner(
            user_id,
            profiles!inner(full_name)
          )
        `)
        .order('taken_at', { ascending: false });

      if (user?.role !== 'admin') {
        if (user?.role === 'manager') {
          // First get the managed users
          const { data: managedUsers, error: managedUsersError } = await supabase
            .from('profiles')
            .select('id')
            .eq('manager_id', user.id);

          if (managedUsersError) throw managedUsersError;
          
          const userIds = managedUsers?.map(u => u.id) || [];
          if (userIds.length === 0) {
            setScreenshots([]);
            setLoading(false);
            return;
          }

          // Then filter screenshots by those user IDs
          query = query.in('time_entries.user_id', userIds);
        } else {
          query = query.eq('time_entries.user_id', user.id);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const screenshotsWithUrls = await Promise.all((data || []).map(async (screenshot) => {
        const { data: urlData } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(screenshot.storage_path, 3600);

        return {
          ...screenshot,
          url: urlData?.signedUrl,
          user: {
            full_name: screenshot.time_entries.profiles.full_name
          }
        };
      }));

      setScreenshots(screenshotsWithUrls);
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      setError('Failed to load screenshots');
    } finally {
      setLoading(false);
    }
  };

  const filteredScreenshots = screenshots.filter(screenshot => {
    const screenshotDate = new Date(screenshot.taken_at);
    const matchesSearch = screenshot.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         screenshot.user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDateRange = true;
    if (filters.dateRange.start && filters.dateRange.end) {
      matchesDateRange = isWithinInterval(screenshotDate, {
        start: startOfDay(new Date(filters.dateRange.start)),
        end: endOfDay(new Date(filters.dateRange.end))
      });
    }

    let matchesUserName = true;
    if (filters.userName) {
      matchesUserName = screenshot.user.full_name.toLowerCase().includes(filters.userName.toLowerCase());
    }

    return matchesSearch && matchesDateRange && matchesUserName;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredScreenshots.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentScreenshots = filteredScreenshots.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  function getPaginationRange(current: number, total: number, delta = 2) {
    const range = [];
    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < total - 1) range.push('...');
    if (total > 1) range.push(total);

    return range;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Camera className="h-8 w-8 text-indigo-600" />
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Screenshots</h2>
          </div>
          <div className="flex space-x-4">
            {/* <div className="relative">
              <input
                type="text"
                placeholder="Search screenshots..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div> */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center p-4 text-red-800 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, start: e.target.value }
                    })}
                    max={new Date().toISOString().split('T')[0]}
                    className="input"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, end: e.target.value }
                    })}
                    max={new Date().toISOString().split('T')[0]}
                    className="input"
                  />
                </div>
              </div>
              {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'hr') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
                  <input
                    type="text"
                    placeholder="Filter by user name..."
                    value={filters.userName}
                    onChange={(e) => setFilters({
                      ...filters,
                      userName: e.target.value
                    })}
                    className="input"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading screenshots...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentScreenshots.map((screenshot) => (
              <div key={screenshot.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                {screenshot.url ? (
                  <img
                    src={screenshot.url}
                    alt={`Screenshot from ${format(parseISO(screenshot.taken_at), 'PPp')}`}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">Image not available</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {screenshot.type === 'webcam' ? (
                        <Camera className="h-4 w-4 text-indigo-600 mr-1" />
                      ) : (
                        <Monitor className="h-4 w-4 text-indigo-600 mr-1" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {screenshot.type === 'webcam' ? 'Webcam' : 'Screen'} Capture
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mb-1 flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {screenshot.user.full_name}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {format(parseISO(screenshot.taken_at), 'PPp')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredScreenshots.length === 0 && !loading && (
          <div className="text-center py-12">
            <Camera className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No screenshots found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {screenshots.length === 0 ? 'No screenshots have been captured yet.' : 'No screenshots match your search criteria.'}
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-6">
            <div className="flex justify-between flex-1 sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredScreenshots.length)}</span> of{' '}
                  <span className="font-medium">{filteredScreenshots.length}</span> results
                </p>
              </div>
              <div>
                <nav className="inline-flex -space-x-px rounded-md shadow-sm isolate" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-l-md border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {getPaginationRange(currentPage, totalPages).map((page, idx) =>
                    page === '...'
                      ? <span key={idx} className="px-2 py-2 text-gray-400">...</span>
                      : <button
                          key={page}
                          onClick={() => handlePageChange(page as number)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-indigo-600 text-white'
                              : 'text-gray-900 bg-white hover:bg-gray-50'
                          } border border-gray-300`}
                        >
                          {page}
                        </button>
                  )}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-r-md border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}