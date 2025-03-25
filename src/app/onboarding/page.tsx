'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';
import OnboardingWizard from '@/components/OnboardingWizard';
import AuthGuard from '@/components/AuthGuard';
import LoadingFallback from '@/components/LoadingFallback';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnboardingComplete, userType } = useOnboarding();

  useEffect(() => {
    // Only handle redirects based on onboarding status
    // Auth check is now handled by AuthGuard
    if (user && isOnboardingComplete && userType) {
      if (userType === 'seeker') {
        router.push('/dashboard/seeker');
      } else if (userType === 'provider') {
        router.push('/account');
      }
    }
  }, [user, isOnboardingComplete, userType, router]);

  // If onboarding is complete, don't show the wizard
  if (isOnboardingComplete) {
    return <LoadingFallback />;
  }

  // Wrap the onboarding wizard with AuthGuard
  return (
    <AuthGuard fallback={<LoadingFallback />}>
      <OnboardingWizard />
    </AuthGuard>
  );
} 