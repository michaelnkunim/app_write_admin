'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import Link from 'next/link';
import { FaEnvelope, FaCheckCircle } from 'react-icons/fa';

interface EmailVerificationModalProps {
  isOpen: boolean;
}

export default function EmailVerificationModal({ isOpen }: EmailVerificationModalProps) {
  const { user, reloadUser, resendVerificationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Function to handle resending verification email
  const handleResendVerification = async () => {
    if (!user) return;
    
    setIsResending(true);
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
      setIsResending(false);
    }
  };

  // Function to check verification status
  const checkVerificationStatus = async () => {
    if (!user) return;
    
    setIsChecking(true);
    try {
      await reloadUser();
      toast.success('Verification status updated');
    } catch (error) {
      console.error('Error checking verification status:', error);
      toast.error('Failed to check verification status');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => {/* This is intentionally empty to make the modal non-dismissable */}}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-background p-6 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
              <FaEnvelope className="h-6 w-6 text-primary" />
            </div>
            
            <Dialog.Title className="text-xl font-semibold leading-6 mb-2">
              Email Verification Required
            </Dialog.Title>
            
            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-4">
                Please verify your email address before continuing with onboarding.
                We&apos;ve sent a verification link to <span className="font-medium">{user?.email}</span>.
              </p>
              
              <div className="bg-muted p-4 rounded-lg text-sm mb-4">
                <p className="flex items-start gap-2 font-medium mb-2">
                  <FaCheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Check your inbox (and spam folder) for an email from us</span>
                </p>
                <p className="flex items-start gap-2 font-medium">
                  <FaCheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Click the verification link in the email</span>
                </p>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={checkVerificationStatus}
                disabled={isChecking}
                className="inline-flex justify-center w-full rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {isChecking ? (
                  <span className="flex items-center">
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent border-white"></span>
                    Checking...
                  </span>
                ) : (
                  <>I&apos;ve Verified My Email</>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="inline-flex justify-center w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {isResending ? (
                  <span className="flex items-center">
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent border-primary"></span>
                    Sending...
                  </span>
                ) : (
                  'Resend Verification Email'
                )}
              </button>
              
              <div className="text-center pt-2">
                <Link 
                  href="/email-verification" 
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Go to verification page
                </Link>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 