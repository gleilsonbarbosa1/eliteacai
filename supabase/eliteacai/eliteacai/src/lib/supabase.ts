import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence
    storageKey: 'supabase.auth.token', // Key used for storing the session
    storage: localStorage, // Use localStorage for session persistence
    autoRefreshToken: true, // Enable automatic token refresh
  },
});

// Initialize session on app load
supabase.auth.getSession().catch(console.error);

// Set up auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear any auth-related storage
    localStorage.removeItem('supabase.auth.token');
  } else if (event === 'SIGNED_IN' && session) {
    // Ensure the session is properly stored
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }
});