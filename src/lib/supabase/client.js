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
  // Build a chainable mock query builder — any method call returns itself,
  // and terminal methods (single, maybeSingle) resolve to noopResponse.
  function mockQueryBuilder() {
    const builder = {
      select: () => builder,
      eq: () => builder,
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => noopResponse,
      maybeSingle: async () => noopResponse,
      then: (resolve) => resolve(noopResponse), // makes await work on the builder itself
    };
    return builder;
  }

  return {
    auth: mockAuth,
    from: () => ({
      select: () => mockQueryBuilder(),
      insert: async () => noopResponse,
      upsert: () => mockQueryBuilder(),
      update: () => mockQueryBuilder(),
      delete: () => mockQueryBuilder(),
    }),
  };
}
