'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth/login');
      return;
    }

    if (!profile || !profile.onboarding_completed) {
      router.replace('/onboarding');
      return;
    }

    // Role-based access control (admin bypasses all)
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = profile.role || 'athlete';
      if (userRole !== 'admin' && !allowedRoles.includes(userRole)) {
        router.replace('/dashboard');
        return;
      }
    }
  }, [user, profile, loading, router, allowedRoles]);

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

  // Block render if role not allowed (admin bypasses all)
  if (allowedRoles && allowedRoles.length > 0 && profile) {
    const userRole = profile.role || 'athlete';
    if (userRole !== 'admin' && !allowedRoles.includes(userRole)) return null;
  }

  return children;
}
