'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowser();

  // Fetch user profile from profiles table
  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle instead of single — returns null if not found, no error

    if (error) {
      console.error('Error fetching profile:', error);
    }
    return data; // null if profile doesn't exist yet
  }

  // Listen to auth state changes
  useEffect(() => {
    let mounted = true;

    // Safety timeout — never hang more than 5 seconds
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth loading timeout — forcing loaded state');
        setLoading(false);
      }
    }, 5000);

    // Check initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id)
            .then(p => { if (mounted) setProfile(p); })
            .catch(err => console.error('Profile fetch error:', err))
            .finally(() => { if (mounted) setLoading(false); });
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Session check error:', err);
        if (mounted) setLoading(false);
      });

    // Subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            const p = await fetchProfile(session.user.id);
            if (mounted) setProfile(p);
          } catch (err) {
            console.error('Profile fetch error:', err);
          }
        } else {
          setProfile(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sign up with email
  async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }, // stored in raw_user_meta_data
      },
    });
    if (error) throw error;

    // After signup, create the profile row immediately
    if (data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          display_name: displayName || email.split('@')[0],
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't throw — user is created, profile can be created later in onboarding
      } else {
        // Refresh profile in state
        const p = await fetchProfile(data.user.id);
        setProfile(p);
      }
      setUser(data.user);
    }

    return data;
  }

  // Sign in with email
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  // Sign in with OAuth (Google, Apple)
  async function signInWithOAuth(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  }

  // Sign out
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }

  // Update user profile (create if doesn't exist)
  async function updateProfile(updates) {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    setProfile(data);
    return data;
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
