/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type UserType = 'seeker' | 'provider' | null;
export type ProviderType = 'agent' | 'agency' | 'landlord' | 'broker' | null;

interface OnboardingContextType {
  userType: UserType;
  providerType: ProviderType;
  isOnboardingComplete: boolean;
  setUserType: (type: UserType, providerType?: string) => Promise<void>;
  checkOnboardingStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType>({
  userType: null,
  providerType: null,
  isOnboardingComplete: false,
  setUserType: async () => {},
  checkOnboardingStatus: async () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [userType, setUserTypeState] = useState<UserType>(null);
  const [providerType, setProviderType] = useState<ProviderType>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const checkOnboardingStatus = async () => {
    if (!user) {
      setUserTypeState(null);
      setProviderType(null);
      setIsOnboardingComplete(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserTypeState(userData.userType as UserType);
        setProviderType(userData.providerType as ProviderType);
        setIsOnboardingComplete(!!userData.userType);
        
        // If user type is set and we're on the onboarding page, redirect
        if (userData.userType && window.location.pathname === '/onboarding') {
          if (userData.userType === 'seeker') {
            router.push('/dashboard/seeker');
          } else if (userData.userType === 'provider') {
            router.push('/account');
          }
        }
      } else {
        setUserTypeState(null);
        setProviderType(null);
        setIsOnboardingComplete(false);
        
        // If no user data and not on onboarding, redirect to onboarding
        if (window.location.pathname !== '/onboarding' && 
            window.location.pathname !== '/login' && 
            window.location.pathname !== '/signup') {
          router.push('/onboarding');
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const setUserType = async (type: UserType, providerType?: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userData: { userType: UserType; providerType?: string } = { userType: type };
      
      if (type === 'provider' && providerType) {
        userData.providerType = providerType;
      }

      await setDoc(userRef, userData, { merge: true });
      setUserTypeState(type);
      setProviderType(providerType as ProviderType);
      setIsOnboardingComplete(true);

      // Redirect based on user type
      if (type === 'seeker') {
        router.push('/dashboard/seeker');
      } else if (type === 'provider') {
        router.push('/account');
      }
    } catch (error) {
      console.error('Error setting user type:', error);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  // Memoize the context value
  const contextValue = useMemo(() => ({ 
    userType, 
    providerType,
    isOnboardingComplete, 
    setUserType, 
    checkOnboardingStatus 
  }), [userType, providerType, isOnboardingComplete, setUserType, checkOnboardingStatus]);

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
} 