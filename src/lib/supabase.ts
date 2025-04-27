import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with configuration
const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
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
};

// Initialize client with retry logic
let supabase;
const maxRetries = 3;
const retryDelay = 1000; // 1 second

(async () => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      supabase = createSupabaseClient();
      // Test the connection
      await supabase.from('customers').select('id').limit(1);
      break;
    } catch (error) {
      if (i < maxRetries) {
        console.warn(`Supabase connection attempt ${i + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        throw error;
      }
    }
  }

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
})();

export { supabase };