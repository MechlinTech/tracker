import { supabase } from './supabase';
import { useStore } from './store';

export async function handleApiCall<T>(
  apiCall: () => Promise<{ data: T | null; error: any }>,
  onError?: (error: any) => void
): Promise<T | null> {
  try {
    const { data, error } = await apiCall();
    
    if (error) {
      // Check if it's an authentication error
      if (error.code === 'PGRST116' || error.message?.includes('JWT')) {
        console.log('Authentication error detected, redirecting to login...');
        useStore.getState().handleSessionExpiration();
        return null;
      }
      
      if (onError) {
        onError(error);
      }
      return null;
    }
    
    return data;
  } catch (error: any) {
    console.error('API call error:', error);
    
    // Check if it's an authentication error
    if (error?.message?.includes('JWT') || error?.code === 'PGRST116') {
      console.log('Authentication error detected, redirecting to login...');
      useStore.getState().handleSessionExpiration();
      return null;
    }
    
    if (onError) {
      onError(error);
    }
    return null;
  }
}

export async function withAuthCheck<T>(
  apiCall: () => Promise<T>
): Promise<T | null> {
  try {
    // First check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('No valid session found, redirecting to login...');
      useStore.getState().handleSessionExpiration();
      return null;
    }
    
    // Check if session is expired
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      console.log('Session expired, redirecting to login...');
      useStore.getState().handleSessionExpiration();
      return null;
    }
    
    return await apiCall();
  } catch (error: any) {
    console.error('Auth check error:', error);
    
    if (error?.message?.includes('JWT') || error?.code === 'PGRST116') {
      console.log('Authentication error detected, redirecting to login...');
      useStore.getState().handleSessionExpiration();
      return null;
    }
    
    throw error;
  }
} 