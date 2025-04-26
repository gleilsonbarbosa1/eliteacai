import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Add retry logic for better connection handling
const maxRetries = 3;
const retryDelay = 1000; // 1 second

const createClientWithRetry = async (retries = 0) => {
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'supabase.auth.token',
        storage: localStorage,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public'
      }
    });

    // Test the connection
    await client.from('customers').select('id').limit(1);
    return client;
  } catch (error) {
    if (retries < maxRetries) {
      console.warn(`Supabase connection attempt ${retries + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return createClientWithRetry(retries + 1);
    }
    throw error;
  }
};

export const supabase = await createClientWithRetry();

// Initialize session on app load
supabase.auth.getSession().catch(console.error);

// Set up auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('supabase.auth.token');
  } else if (event === 'SIGNED_IN' && session) {
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }
});