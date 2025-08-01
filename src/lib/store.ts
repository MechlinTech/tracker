import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from './supabase';
import { Profile } from './database.types';

interface CacheState {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

interface AuthState {
  user: Profile | null;
  notifications: any[];
  isInitialized: boolean;
  cache: CacheState;
  sessionExpired: boolean;
  setUser: (user: Profile | null) => void;
  setNotifications: (notifications: any[]) => void;
  addNotification: (notification: any) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  logout: () => Promise<void>;
  setCacheItem: (key: string, data: any, ttl?: number) => void;
  getCacheItem: (key: string, ttl?: number) => any | null;
  clearCache: () => void;
  initialize: () => Promise<void>;
  setSessionExpired: (expired: boolean) => void;
  handleSessionExpiration: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      notifications: [],
      isInitialized: false,
      cache: {},
      sessionExpired: false,

      initialize: async () => {
        if (get().isInitialized) return;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profile) {
              set({ user: profile });
            }
          }
        } catch (error) {
          console.error('Initialization error:', error);
        } finally {
          set({ isInitialized: true });
        }
      },
      
      setUser: (user) => set({ user }),
      
      setNotifications: (notifications) => set({ notifications }),
      
      addNotification: (notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications]
        }));
      },

      markNotificationAsRead: async (id) => {
        try {
          const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            )
          }));
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      },

      markAllNotificationsAsRead: async () => {
        try {
          const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', get().user?.id)
            .eq('read', false);

          if (error) throw error;

          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true }))
          }));
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
        }
      },

      logout: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          set({ user: null, notifications: [], cache: {} });
          localStorage.removeItem('supabase.auth.token');
        } catch (error) {
          console.error('Error during logout:', error);
        }
      },

      setCacheItem: (key: string, data: any, ttl = CACHE_TTL) => {
        set((state) => ({
          cache: {
            ...state.cache,
            [key]: {
              data,
              timestamp: Date.now() + ttl
            }
          }
        }));
      },

      getCacheItem: (key: string, ttl = CACHE_TTL) => {
        const item = get().cache[key];
        if (!item) return null;
        if (Date.now() > item.timestamp + ttl) {
          const { cache } = get();
          delete cache[key];
          set({ cache });
          return null;
        }
        return item.data;
      },

      clearCache: () => set({ cache: {} }),

      setSessionExpired: (expired) => set({ sessionExpired: expired }),

      handleSessionExpiration: () => {
        set({ 
          user: null, 
          notifications: [], 
          cache: {}, 
          sessionExpired: true 
        });
        
        // Clear any stored auth tokens
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        
        // Redirect to login page
        window.location.href = '/login';
      }
    }),
    {
      name: 'time-tracker-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        cache: state.cache
      }),
      version: 2,
      migrate: (persistedState: any, version) => {
        if (version === 1) {
          return {
            ...persistedState,
            cache: {},
            isInitialized: false
          };
        }
        return persistedState;
      }
    }
  )
);

// Initialize the store
useStore.getState().initialize();