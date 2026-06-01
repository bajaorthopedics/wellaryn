'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth/login');
      return;
    }

    if (profile && !profile.onboarding_completed) {
      router.replace('/onboarding');
      return;
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-base)',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid var(--border-default)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'rotate 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (!user) return null;

  return children;
}
