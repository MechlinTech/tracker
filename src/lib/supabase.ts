import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Create admin client with service role key
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Prefetch common data
export const prefetchData = async () => {
  const promises = [
    supabase.from('leave_types').select('*').order('name'),
    supabase.from('profiles').select('*').eq('role', 'manager')
  ];

  try {
    const [leaveTypes, managers] = await Promise.all(promises);
    return {
      leaveTypes: leaveTypes.data || [],
      managers: managers.data || []
    };
  } catch (error) {
    console.error('Error prefetching data:', error);
    return { leaveTypes: [], managers: [] };
  }
};

// Cache helper
const cache = new Map();

export const cachedQuery = async (key: string, queryFn: () => Promise<any>, ttl = 300000) => {
  const cached = cache.get(key);
  if (cached && cached.timestamp > Date.now() - ttl) {
    return cached.data;
  }

  const data = await queryFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};

// Batch request helper
export const batchRequest = async <T>(
  ids: string[],
  fetchFn: (batchIds: string[]) => Promise<T[]>,
  batchSize = 100
): Promise<T[]> => {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await fetchFn(batch);
    results.push(...batchResults);
  }
  return results;
};