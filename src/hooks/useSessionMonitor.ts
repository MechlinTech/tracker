import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

export function useSessionMonitor() {
  const user = useStore((state) => state.user);
  const handleSessionExpiration = useStore((state) => state.handleSessionExpiration);
  const setSessionExpired = useStore((state) => state.setSessionExpired);
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
    }

    if (!user) {
      return;
    }

    // Check session validity every 30 seconds
    sessionCheckInterval.current = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.log('Session expired, redirecting to login...');
          handleSessionExpiration();
          return;
        }

        // Check if session is expired
        if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
          console.log('Session expired, redirecting to login...');
          handleSessionExpiration();
          return;
        }

        // Verify user profile still exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.log('User profile not found, redirecting to login...');
          handleSessionExpiration();
          return;
        }

        setSessionExpired(false);
      } catch (error) {
        console.error('Session check error:', error);
        handleSessionExpiration();
      }
    }, 30000); // Check every 30 seconds

    // Cleanup interval on unmount
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, [user, handleSessionExpiration, setSessionExpired]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!session) {
          console.log('User signed out, redirecting to login...');
          handleSessionExpiration();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [handleSessionExpiration]);

  return null;
} 