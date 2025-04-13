'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaFacebook } from 'react-icons/fa';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithFacebook, signInWithEmail } = useAuth();
  const { labels } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      await signInWithGoogle();
      onClose();
    } catch (error) {
      console.error('Google sign in error:', error);
      setErrorMessage(labels.shared.ERROR);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      setIsLoggingIn(true);
      await signInWithFacebook();
      onClose();
    } catch (error) {
      console.error('Facebook sign in error:', error);
      setErrorMessage(labels.shared.ERROR);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      setIsLoggingIn(true);
      await signInWithEmail(email);
      onClose();
    } catch (error) {
      console.error('Email sign in error:', error);
      setErrorMessage(labels.shared.ERROR);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-2xl background border shadow-xl transition-all transform">
          <div className="flex justify-between items-center p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">
              {labels.auth?.LOGIN || "Log in or sign up"}
            </Dialog.Title>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              aria-label={labels.shared.CLOSE}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">
              {labels.auth?.WELCOME || "Welcome to RentEasy"}
            </h2>
            
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md border border-red-200">
                {errorMessage}
              </div>
            )}
            
            <form onSubmit={handleEmailSignIn} className="mb-6">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  {labels.auth?.EMAIL || "Email"}
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn || !email}
                className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? labels.shared.LOADING : labels.auth?.CONTINUE_WITH_EMAIL || "Continue with email"}
              </button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 background text-light">
                  {labels.auth?.OR || "or"}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FcGoogle className="w-5 h-5" />
                <span>{labels.auth?.CONTINUE_WITH_GOOGLE || "Continue with Google"}</span>
              </button>
              
              <button
                onClick={handleFacebookSignIn}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaFacebook className="w-5 h-5 text-blue-600" />
                <span>{labels.auth?.CONTINUE_WITH_FACEBOOK || "Continue with Facebook"}</span>
              </button>
              
              <button
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaApple className="w-5 h-5" />
                <span>{labels.auth?.CONTINUE_WITH_APPLE || "Continue with Apple"}</span>
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 