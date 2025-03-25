'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';

interface RouteGuardProps {
  children: React.ReactNode;
  requireUserType?: 'seeker' | 'provider';
}

const publicRoutes = ['/login', '/signup', '/about', '/agent', '/listing']; // Add your public routes here

export default function RouteGuard({ children, requireUserType }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { userType, isOnboardingComplete } = useOnboarding();

  useEffect(() => {
    if (!loading) {
      if (!user && !publicRoutes.some(route => pathname?.startsWith(route))) {
        router.push('/login');
        return;
      }

      if (!isOnboardingComplete) {
        router.push('/onboarding');
        return;
      }

      if (requireUserType && userType !== requireUserType) {
        if (userType === 'seeker') {
          router.push('/dashboard/seeker');
        } else if (userType === 'provider') {
          router.push('/account');
        }
        return;
      }
    }
  }, [user, loading, isOnboardingComplete, userType, requireUserType, router, pathname]);

  // Show nothing while loading or if no user
  if (loading || !user || !isOnboardingComplete) {
    return null;
  }

  // If requireUserType is specified and doesn't match, show nothing
  if (requireUserType && userType !== requireUserType) {
    return null;
  }

  return <>{children}</>;
} 