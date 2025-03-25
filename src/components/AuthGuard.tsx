'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuickAuth } from '@/hooks/useQuickAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useQuickAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we're sure the user is not authenticated
    if (!isLoading && isAuthenticated === false) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show fallback while loading or if not yet determined
  if (isLoading || isAuthenticated === null) {
    return fallback || null;
  }

  // Show children only if authenticated
  return isAuthenticated ? <>{children}</> : (fallback || null);
} 