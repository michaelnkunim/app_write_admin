/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import Link from 'next/link';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Component that uses useSearchParams
function EmailVerificationContent() {
  const { user, loading: authLoading, reloadUser, resendVerificationEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(false);
  const [verificationListener, setVerificationListener] = useState<Unsubscribe | null>(null);
  const [isNotVerified, setIsNotVerified] = useState(false);

  // Check for not-verified parameter and setup verification listener
  useEffect(() => {
    const notVerified = searchParams.get('not-verified') === 'true';
    setIsNotVerified(notVerified);

    // Only setup listener if not-verified flag is present
    if (notVerified && user && !user.emailVerified) {
      // Setup an auth state listener specifically for email verification status changes
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Reload the user to get the latest emailVerified status
          await firebaseUser.reload();
          
          // If email is verified, update the UI
          if (firebaseUser.emailVerified) {
            // Force our context to reload the user data
            await reloadUser();
            toast.success('Email verified successfully!');
          }
        }
      });
      
      setVerificationListener(unsubscribe);
      
      // Cleanup listener on unmount
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [searchParams, user]);

  // Effect to check verification status on load and when user changes
  useEffect(() => {
    checkVerificationStatus();
  }, [user]);

  // Cleanup verification listener on unmount
  useEffect(() => {
    return () => {
      if (verificationListener) {
        verificationListener();
      }
    };
  }, [verificationListener]);

  // Function to check if user's email is verified
  const checkVerificationStatus = async () => {
    if (authLoading) return; // Wait for auth to initialize
    
    if (!user) {
      // User is not logged in, redirect to login
      toast.error('You need to be logged in to verify your email');
      router.push('/login');
      return;
    }

    setIsChecking(true);
    
    try {
      // Reload user to get the latest verification status
      const reloadedUser = await reloadUser();
      
      if (reloadedUser?.emailVerified && !isNotVerified) {
        // Only auto-redirect if not in not-verified mode
        toast.success('Email verified successfully!');
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500); // Small delay to show success message
      }
      
      // If we get here, email is not verified yet
      setIsChecking(false);
      
    } catch (error) {
      console.error('Error checking verification status:', error);
      setIsChecking(false);
      toast.error('Failed to check verification status');
    }
  };

  // Handle continue after verification
  const handleContinue = () => {
    router.push('/onboarding');
  };

  // Handle manual verification check
  const handleRecheckVerification = async () => {
    setIsChecking(true);
    
    try {
      // Force reload the current user and check verification status
      await reloadUser();
      checkVerificationStatus();
    } catch (error) {
      console.error('Error rechecking verification:', error);
      setIsChecking(false);
      toast.error('Failed to refresh verification status');
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    if (!user) return;
    
    setIsChecking(true);
    try {
      // Get current origin for verification link
      const origin = window.location.origin;
      // Add the not-verified flag to the verification URL
      const redirectUrl = `${origin}/email-verification?not-verified=true`;
      
      // Resend verification email
      await resendVerificationEmail(redirectUrl);
      toast.success('Verification email sent. Please check your inbox.');
    } catch (error) {
      console.error('Error resending verification email:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to send verification email');
      }
    } finally {
      setIsChecking(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-card shadow-lg rounded-lg p-8 text-center">
          <div className="h-12 w-12 mx-auto border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-card shadow-lg rounded-lg p-8 text-center">
          <h1 className="text-2xl font-semibold mb-6">Email Verification</h1>
          <p className="mb-6 text-muted-foreground">Please log in to verify your email address.</p>
          <Link 
            href="/login"
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors inline-block"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-card shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center">Email Verification</h1>
        
        <div className="text-center py-4">
          {user.emailVerified ? (
            <div className=" text-green-900 dark:text-green-300 p-4 rounded-lg mb-6">
              <svg className="h-12 w-12 mx-auto mb-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-medium text-green-900 dark:text-green-300">Your email has been verified successfully!</p>
              {isNotVerified ? (
                <p className="text-sm mt-2 text-green-900 dark:text-green-300">You can now continue to the next step.</p>
              ) : (
                <p className="text-sm mt-2text-green-900 dark:text-green-300">Redirecting to onboarding...</p>
              )}
            </div>
          ) : (
            <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-4 rounded-lg mb-6">
              <svg className="h-12 w-12 mx-auto mb-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-medium">Waiting to verify chats</p>
              <p className="text-sm mt-2">Please check your email inbox and click on the verification link.</p>
            </div>
          )}
          
          {!user.emailVerified && (
            <div className="space-y-4 mt-6">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive the email? Check your spam folder or request a new verification email.
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={isChecking}
                  className="text-primary hover:text-primary/90 transition-colors"
                >
                  {isChecking ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
              
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Already verified your email?
                </p>
                <button
                  onClick={handleRecheckVerification}
                  disabled={isChecking}
                  className="text-primary hover:text-primary/90 transition-colors"
                >
                  {isChecking ? 'Checking...' : 'Check Verification Status'}
                </button>
              </div>
            </div>
          )}
          
          {user.emailVerified && (
            <div className="mt-6">
              <button
                onClick={handleContinue}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading verification page...</div>}>
      <EmailVerificationContent />
    </Suspense>
  );
} 