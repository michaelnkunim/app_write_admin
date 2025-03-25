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
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {labels.auth?.LOGIN || "Log in or sign up"}
            </Dialog.Title>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={labels.shared.CLOSE}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <h2 className="text-xl font-bold mb-6">
            {labels.auth?.WELCOME || "Welcome to RentEasy"}
          </h2>
          
          {errorMessage && (
            <div className="mb-4 p-2 bg-red-100 text-red-800 rounded-md">
              {errorMessage}
            </div>
          )}
          
          <form onSubmit={handleEmailSignIn} className="mb-4">
            <div className="mb-3">
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                {labels.auth?.EMAIL || "Email"}
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
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
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                {labels.auth?.OR || "or"}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FcGoogle className="w-5 h-5" />
              <span>{labels.auth?.CONTINUE_WITH_GOOGLE || "Continue with Google"}</span>
            </button>
            
            <button
              onClick={handleFacebookSignIn}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaFacebook className="w-5 h-5 text-blue-600" />
              <span>{labels.auth?.CONTINUE_WITH_FACEBOOK || "Continue with Facebook"}</span>
            </button>
            
            <button
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaApple className="w-5 h-5" />
              <span>{labels.auth?.CONTINUE_WITH_APPLE || "Continue with Apple"}</span>
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 