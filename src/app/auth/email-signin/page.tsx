'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function EmailSignInPage() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect if user is already signed in
    if (user) {
      router.push('/');
      return;
    }

    async function completeSignIn() {
      try {
        setIsProcessing(true);
        
        // Confirm the link is a sign-in with email link
        if (isSignInWithEmailLink(auth, window.location.href)) {
          // Get the email from localStorage (previously saved when sending the link)
          let email = window.localStorage.getItem('emailForSignIn');
          
          // If no email found in localStorage, prompt the user for it
          if (!email) {
            email = window.prompt('Please provide your email for confirmation');
          }
          
          if (!email) {
            setError('Email is required to complete sign-in');
            setIsProcessing(false);
            return;
          }
          
          // Complete the sign-in process
          await signInWithEmailLink(auth, email, window.location.href);
          
          // Clear email from storage
          window.localStorage.removeItem('emailForSignIn');
          
          // Redirect to home page or dashboard after successful sign-in
          router.push('/');
        } else {
          setError('Invalid sign-in link');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Error signing in with email link:', error);
        setError('Failed to sign in. Please try again.');
        setIsProcessing(false);
      }
    }

    completeSignIn();
  }, [router, user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Email Sign-In</h1>
        
        {isProcessing ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Processing your sign-in...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
            <p>{error}</p>
            <button 
              onClick={() => router.push('/login')}
              className="mt-4 w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p>Successfully signed in!</p>
            <p className="text-sm text-gray-500 mt-2">
              You will be redirected automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 