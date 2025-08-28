import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function SessionWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const user = useStore((state) => state.user);
  const handleSessionExpiration = useStore((state) => state.handleSessionExpiration);

  useEffect(() => {
    if (!user) return;

    const checkSessionExpiry = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        const now = new Date();
        const expiryTime = new Date(session.expires_at! * 1000);
        const timeUntilExpiry = expiryTime.getTime() - now.getTime();
        
        // Show warning 5 minutes before expiry
        if (timeUntilExpiry > 0 && timeUntilExpiry <= 5 * 60 * 1000) {
          setShowWarning(true);
          setTimeLeft(Math.ceil(timeUntilExpiry / 1000));
        } else {
          setShowWarning(false);
        }
      } catch (error) {
        console.error('Error checking session expiry:', error);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSessionExpiry, 30000);
    checkSessionExpiry(); // Initial check

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!showWarning) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowWarning(false);
          handleSessionExpiration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning, handleSessionExpiration]);

  const handleExtendSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (data.session) {
        setShowWarning(false);
        setTimeLeft(0);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      handleSessionExpiration();
    }
  };

  if (!showWarning) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-yellow-800">
            Session Expiring Soon
          </h4>
          <p className="text-sm text-yellow-700 mt-1">
            Your session will expire in {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleExtendSession}
              className="btn-primary btn-sm flex items-center"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Extend Session
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="btn-secondary btn-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 