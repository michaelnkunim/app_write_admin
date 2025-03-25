import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasValidLocalSession } from '@/lib/auth-utils';

/**
 * A hook that provides a quick auth check using localStorage first,
 * then falls back to the full Firebase auth check.
 * 
 * This helps prevent unnecessary redirects while Firebase auth is loading.
 */
export function useQuickAuth() {
  const { user, loading } = useAuth();
  const [quickAuthState, setQuickAuthState] = useState<{
    isAuthenticated: boolean | null;
    isLoading: boolean;
  }>({
    isAuthenticated: null,
    isLoading: true,
  });

  useEffect(() => {
    // First check localStorage for a quick response
    const localAuth = hasValidLocalSession();
    
    if (localAuth) {
      // User is authenticated according to localStorage
      setQuickAuthState({
        isAuthenticated: true,
        isLoading: false,
      });
    } else if (!loading) {
      // Firebase auth has completed loading
      setQuickAuthState({
        isAuthenticated: !!user,
        isLoading: false,
      });
    }
  }, [user, loading]);

  return quickAuthState;
} 