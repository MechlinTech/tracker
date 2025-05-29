import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Clock, Download, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TimeTracker() {
  const user = useStore((state) => state.user);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadApp = () => {
    const os = window.navigator.platform.toLowerCase();
    let downloadUrl = '';
    
    if (os.includes('win')) {
      downloadUrl = 'https://yxkniwzsinqyjdqqzyjs.supabase.co/storage/v1/object/public/tracker-application//Tracker%20Application.exe';
    } else if (os.includes('mac')) {
      downloadUrl = '/downloads/TimeTracker.dmg';
    } else if (os.includes('linux')) {
      downloadUrl = '/downloads/TimeTracker.AppImage';
    }

    if (downloadUrl) {
      window.location.href = downloadUrl;
    }
  };

  const handleUploadApp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { error } = await supabase.storage
        .from('tracker-application')
        .upload(`Tracker Application.exe`, file);

      if (error) throw error;
      alert('Application uploaded successfully');
    } catch (error) {
      console.error('Error uploading app:', error);
      setError('Failed to upload application');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-indigo-600" />
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Time Tracker</h2>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleDownloadApp}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Desktop App
            </button>
            {user?.role === 'admin' && (
              <div className="relative">
                <input
                  type="file"
                  onChange={handleUploadApp}
                  className="hidden"
                  id="app-upload"
                  accept=".exe,.dmg,.AppImage"
                />
                <label
                  htmlFor="app-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Version
                </label>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="mt-8">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Desktop Application Required
            </h3>
            <p className="text-gray-500 mb-6">
              Time tracking and screenshot capture are now handled through our desktop application. 
              Please download and install the appropriate version for your operating system to start tracking your time.
            </p>
            <div className="bg-indigo-50 p-6 rounded-lg">
              <h4 className="text-sm font-medium text-indigo-900 mb-2">Key Features:</h4>
              <ul className="text-sm text-indigo-700 space-y-2">
                <li>• Automatic time tracking</li>
                <li>• Screen capture</li>
                <li>• Activity monitoring</li>
                <li>• Offline support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}