import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Camera, Monitor, Clock, AlertCircle, Search, Filter, User, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Pagination } from '@mui/material';
import FaceDetection from './FaceDetection';

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
  const [displayFilters, setDisplayFilters] = useState<FilterOptions>({
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const openModal = (index: number) => {
    setModalIndex(index);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalIndex(null);
  };
  const showPrev = () => {
    if (modalIndex !== null && modalIndex > 0) setModalIndex(modalIndex - 1);
  };
  const showNext = () => {
    if (modalIndex !== null && modalIndex < filteredScreenshots.length - 1) setModalIndex(modalIndex + 1);
  };

  useEffect(() => {
    fetchScreenshots();
  }, [user]);

  const fetchScreenshots = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      // First, get the time_entry_ids that match the user filter
      let timeEntryQuery = supabase
        .from('time_entries')
        .select('id, user_id');

      if (user?.role !== 'admin') {
        if (user?.role === 'manager' || user?.role === 'hr') {
          // Get managed users through the employee_managers table
          const { data: managedUsers, error: managedUsersError } = await supabase
            .from('employee_managers')
            .select('employee_id')
            .eq('manager_id', user.id);

          if (managedUsersError) throw managedUsersError;
          
          // Also get users from legacy manager_id field
          const { data: legacyManagedUsers, error: legacyError } = await supabase
            .from('profiles')
            .select('id')
            .eq('manager_id', user.id);

          if (legacyError) throw legacyError;
          
          const userIds = [
            ...(managedUsers?.map(u => u.employee_id) || []),
            ...(legacyManagedUsers?.map(u => u.id) || []),
            user.id
          ];
          
          if (userIds.length === 0) {
            setScreenshots([]);
            setLoading(false);
            return;
          }

          timeEntryQuery = timeEntryQuery.in('user_id', userIds);
        } else {
          timeEntryQuery = timeEntryQuery.eq('user_id', user.id);
        }
      }

      const { data: timeEntries, error: timeEntriesError } = await timeEntryQuery;
      if (timeEntriesError) throw timeEntriesError;

      if (!timeEntries || timeEntries.length === 0) {
        setScreenshots([]);
        setLoading(false);
        return;
      }

      const timeEntryIds = timeEntries.map(te => te.id);
      const userIdToTimeEntryMap = new Map(timeEntries.map(te => [te.id, te.user_id]));

      // Now fetch screenshots filtered by time_entry_ids with pagination
      // Limit to recent screenshots to avoid timeout (e.g., last 1000)
      const { data: screenshotsData, error: screenshotsError } = await supabase
        .from('screenshots')
        .select('*')
        .in('time_entry_id', timeEntryIds)
        .order('taken_at', { ascending: false })
        .limit(1000); // Limit to prevent timeout

      if (screenshotsError) throw screenshotsError;

      // Get unique user IDs from time entries
      const userIds = Array.from(new Set(timeEntries.map(te => te.user_id)));
      
      // Fetch user profiles in batch
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const userProfileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Create signed URLs and map user data
      const screenshotsWithUrls = await Promise.all((screenshotsData || []).map(async (screenshot) => {
        const { data: urlData } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(screenshot.storage_path, 3600);

        const userId = userIdToTimeEntryMap.get(screenshot.time_entry_id);
        const fullName = userProfileMap.get(userId) || 'Unknown User';

        return {
          ...screenshot,
          url: urlData?.signedUrl,
          user: {
            full_name: fullName
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
    if (displayFilters.dateRange.start && displayFilters.dateRange.end) {
      matchesDateRange = isWithinInterval(screenshotDate, {
        start: startOfDay(new Date(displayFilters.dateRange.start)),
        end: endOfDay(new Date(displayFilters.dateRange.end))
      });
    }

    let matchesUserName = true;
    if (displayFilters.userName) {
      matchesUserName = screenshot.user.full_name.toLowerCase().includes(displayFilters.userName.toLowerCase());
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

  const validateDateRange = (start: string, end: string): boolean => {
    if (start && end && new Date(start) > new Date(end)) {
      setError('Start date cannot be greater than end date');
      return false;
    }
    setError(null);
    return true;
  };

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
                {/* {error && (
                  <div className="text-red-500 text-sm mt-1">
                    {error}
                  </div>
                )} */}
              </div>
              {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'hr') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Filter by username..."
                    value={displayFilters.userName}
                    onChange={(e) => setDisplayFilters({
                      ...displayFilters,
                      userName: e.target.value
                    })}
                    className="input rounded-md"
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
            {currentScreenshots.map((screenshot, index) => (
              <div key={screenshot.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                {screenshot.url ? (
                  <img
                    src={screenshot.url}
                    alt={`Screenshot from ${format(parseISO(screenshot.taken_at), 'PPp')}`}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => openModal(startIndex + index)}
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
                  
                  {/* Add face detection for the first 4 webcam images */}
                  {/* {screenshot.type === 'webcam' && screenshot.url && index < 8 && (
                    <FaceDetection
                      imageUrl={screenshot.url}
                      onFaceDetected={(hasFace) => {
                        // You can handle the face detection result here if needed
                        // console.log('Face detection result for index', index, ':', hasFace);
                      }}
                    />
                  )} */}
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
          <div className="flex items-center justify-center px-4 py-3 bg-white border-t border-gray-200 mt-6">
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

      {/* Modal for high-res screenshot viewer */}
      {modalOpen && modalIndex !== null && filteredScreenshots[modalIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          onClick={closeModal}
        >
          <div
            className="relative max-w-6xl w-full flex flex-col items-center px-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-6 right-6 text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-80"
              onClick={closeModal}
              aria-label="Close"
            >
              <X className="h-7 w-7" />
            </button>
            <div className="flex items-center justify-center w-full">
              <button
                className="p-3 text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-80 disabled:opacity-30"
                onClick={showPrev}
                disabled={modalIndex === 0}
                aria-label="Previous"
              >
                <ArrowLeft className="h-10 w-10" />
              </button>
              <img
                src={filteredScreenshots[modalIndex].url}
                alt={`Screenshot from ${format(parseISO(filteredScreenshots[modalIndex].taken_at), 'PPp')}`}
                className="max-h-[90vh] max-w-6xl object-contain mx-12 rounded shadow-2xl border-4 border-white"
                style={{ background: '#fff' }}
              />
              <button
                className="p-3 text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-80 disabled:opacity-30"
                onClick={showNext}
                disabled={modalIndex === filteredScreenshots.length - 1}
                aria-label="Next"
              >
                <ArrowRight className="h-10 w-10" />
              </button>
            </div>
            <div className="mt-6 text-white text-center">
              <div className="text-xl font-semibold">
                {filteredScreenshots[modalIndex].user.full_name}
              </div>
              <div className="text-base">
                {format(parseISO(filteredScreenshots[modalIndex].taken_at), 'PPp')}
              </div>
              <div className="text-base capitalize">
                {filteredScreenshots[modalIndex].type} capture
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}