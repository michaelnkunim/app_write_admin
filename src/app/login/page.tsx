'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import LoginComponent from '@/components/LoginComponent';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect to home
    if (user) {
      router.push('/');
    }
    
    // Clean up reCAPTCHA when component unmounts
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, [user, router]);

  const handleLoginSuccess = (redirectPath?: string) => {
    router.push(redirectPath || '/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md  -mt-25">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold mt-2 mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Log in or sign up to continue</p>
        </div>

        <div className="bg-card rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <LoginComponent onSuccess={handleLoginSuccess} />
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>By continuing, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
        </div>
      </div>
    </div>
  );
} 