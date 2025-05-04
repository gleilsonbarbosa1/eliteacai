import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// More detailed error message for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  throw new Error(
    `Missing required Supabase environment variables: ${missingVars.join(', ')}. ` +
    'Please check your .env file and ensure all variables are properly configured.'
  );
}

// Log the URL (but not the key) to help with debugging
console.log('Initializing Supabase client with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

export async function ensureValidSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      throw new Error('Erro ao recuperar sessão: ' + error.message);
    }
    
    if (!session) {
      // Attempt to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
        throw new Error('Erro ao atualizar sessão: ' + refreshError.message);
      }
      
      if (!refreshedSession) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    throw error;
  }
}