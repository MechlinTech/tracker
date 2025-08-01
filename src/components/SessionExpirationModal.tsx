import React from 'react';
import { useStore } from '../lib/store';
import { AlertTriangle, LogIn } from 'lucide-react';

export default function SessionExpirationModal() {
  const sessionExpired = useStore((state) => state.sessionExpired);
  const setSessionExpired = useStore((state) => state.setSessionExpired);

  if (!sessionExpired) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          Session Expired
        </h3>
        
        <p className="text-gray-600 text-center mb-6">
          Your session has expired for security reasons. Please log in again to continue.
        </p>
        
        <div className="flex justify-center">
          <button
            onClick={() => {
              setSessionExpired(false);
              window.location.href = '/login';
            }}
            className="btn-primary flex items-center"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
} 