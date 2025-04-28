import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase não encontradas. ' +
    'Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

// Create Supabase client with improved session handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  }
});

// Initialize session on app load with retry mechanism
const initSession = async (retryCount = 3) => {
  for (let i = 0; i < retryCount; i++) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session) {
        // Store session and refresh token
        localStorage.setItem('supabase.auth.token', JSON.stringify(session));
        return session;
      }
      
      // If no session found but no error, continue to next retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error initializing session:', error);
      if (i === retryCount - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// Set up auth state change listener with improved error handling
supabase.auth.onAuthStateChange(async (event, session) => {
  try {
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      localStorage.removeItem('supabase.auth.token');
    } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      
      // Proactively refresh session
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
    }
  } catch (error) {
    console.error('Auth state change error:', error);
    localStorage.removeItem('supabase.auth.token');
  }
});

// Initialize session on load
initSession().catch(console.error);

// Enhanced session validation with automatic refresh
export async function ensureValidSession() {
  try {
    // First try to get current session
    const { data: { session: currentSession }, error: sessionError } = 
      await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    
    if (currentSession?.user) {
      // Verify session validity
      const { data: { user }, error: userError } = 
        await supabase.auth.getUser(currentSession.access_token);
      
      if (userError) throw userError;
      
      if (user) {
        // Proactively refresh session to extend its lifetime
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
          
        if (refreshError) throw refreshError;
        
        if (refreshedSession) {
          // Store refreshed session
          localStorage.setItem('supabase.auth.token', JSON.stringify(refreshedSession));
          return refreshedSession;
        }
      }
    }

    // If session is invalid or missing, try refreshing
    const { data: { session: newSession }, error: refreshError } = 
      await supabase.auth.refreshSession();
    
    if (refreshError) throw refreshError;
    
    if (newSession?.user) {
      // Store new session
      localStorage.setItem('supabase.auth.token', JSON.stringify(newSession));
      return newSession;
    }

    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  } catch (error: any) {
    console.error('Session validation error:', error);
    
    // Clear any invalid session data
    localStorage.removeItem('supabase.auth.token');
    
    // Attempt one final refresh before giving up
    try {
      const { data: { session: finalSession }, error: finalError } = 
        await supabase.auth.refreshSession();
      
      if (!finalError && finalSession?.user) {
        localStorage.setItem('supabase.auth.token', JSON.stringify(finalSession));
        return finalSession;
      }
    } catch (finalError) {
      console.error('Final refresh attempt failed:', finalError);
    }
    
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }
}

// Setup periodic session refresh (every 10 minutes)
setInterval(async () => {
  try {
    await supabase.auth.refreshSession();
  } catch (error) {
    console.error('Periodic session refresh failed:', error);
  }
}, 10 * 60 * 1000);