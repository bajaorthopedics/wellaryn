import { createBrowserClient } from '@supabase/ssr';

let supabase = null;

/**
 * Get the Supabase browser client (singleton)
 * Used in client components ('use client')
 * Returns null during build/SSG when env vars are missing
 */
export function getSupabaseBrowser() {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build or when env vars are not set, return a mock
  if (!url || !key || url === 'your-project-url-here') {
    return createMockClient();
  }

  supabase = createBrowserClient(url, key);
  return supabase;
}

/**
 * Mock client for build-time and development without Supabase
 * All operations return safe defaults
 */
function createMockClient() {
  const noopResponse = { data: null, error: null };
  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: async () => noopResponse,
    signInWithPassword: async () => noopResponse,
    signInWithOAuth: async () => noopResponse,
    signOut: async () => ({ error: null }),
    exchangeCodeForSession: async () => noopResponse,
  };
  return {
    auth: mockAuth,
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => noopResponse, data: null, error: null }), data: null, error: null }),
      insert: async () => noopResponse,
      upsert: () => ({ select: () => ({ single: async () => noopResponse }) }),
      update: () => ({ eq: async () => noopResponse }),
    }),
  };
}
