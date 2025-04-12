'use client';

import { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useAppSettings } from '@/context/AppSettingsContext';
import { Facebook, Apple } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthError, signInAnonymously, sendEmailVerification } from 'firebase/auth';
import { auth,db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

// Firebase error message dictionary
const firebaseErrorMessages: { [key: string]: string } = {
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/user-not-found': 'No account found with this email. Please sign up.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed before completion.',
  'default': 'An error occurred. Please try again.'
};

interface LoginComponentProps {
  onSuccess: (redirectPath?: string) => void;
}

export default function LoginComponent({ onSuccess }: LoginComponentProps) {
  const { signInWithGoogle, signInWithApple, signInWithFacebook } = useAuth();
  const { appSettings } = useAppSettings();
  const authMethods = appSettings.siteSettings?.authMethods || {
    emailPassword: true,
    google: false,
    apple: false,
    facebook: false,
    phone: false,
    anonymous: false
  };
  const [selectedTab, setSelectedTab] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+233');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Clean up reCAPTCHA when tab changes
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined;
    }
  }, [selectedTab]);

  const validatePhoneNumber = (number: string) => {
    const phoneRegex = /^\d{9,10}$/; // Validates 9-10 digits
    return phoneRegex.test(number.trim());
  };

  const setupRecaptcha = async () => {
    try {
      // Clean up any existing reCAPTCHA instance
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }

      // Remove any existing container
      const existingContainer = document.getElementById('recaptcha-container');
      if (existingContainer) {
        existingContainer.remove();
      }

      // Create a new container with a unique ID
      const uniqueId = `recaptcha-container-${Date.now()}`;
      const container = document.createElement('div');
      container.id = uniqueId;
      document.body.appendChild(container);
      
      window.recaptchaVerifier = new RecaptchaVerifier(auth, uniqueId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = undefined;
          }
          // Clean up the container
          container.remove();
        }
      });

      const widgetId = await window.recaptchaVerifier.render();
      return widgetId;
    } catch (error) {
      console.error('Error setting up reCAPTCHA:', error);
      setError('Error setting up verification. Please try again.');
      return null;
    }
  };

  const handleSendVerificationCode = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await setupRecaptcha();
      
      const formattedPhoneNumber = `${countryCode}${phoneNumber.trim()}`;
      console.log('Sending code to:', formattedPhoneNumber);
      
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhoneNumber,
        window.recaptchaVerifier
      );
      
      window.confirmationResult = confirmationResult;
      setIsVerifying(true);
      setLoading(false);
    } catch (error) {
      console.error('Error sending verification code:', error);
      setError('Error sending verification code. Please try again.');
      setLoading(false);
      // Reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    }
  };

  const checkUserOnboarding = async (userId: string) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() && userDoc.data()?.userType;
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (!window.confirmationResult) {
        throw new Error('No verification code was sent');
      }

      const credential = await window.confirmationResult.confirm(verificationCode);
      if (credential.user) {
        // Clean up reCAPTCHA
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        }

        // Check if user needs onboarding
        const hasOnboarding = await checkUserOnboarding(credential.user.uid);
        const redirectPath = hasOnboarding ? '/' : '/onboarding';
        onSuccess(redirectPath);
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setError('Invalid verification code. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      onSuccess();
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      setError('Failed to sign in with Apple. Please try again.');
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithFacebook();
      onSuccess();
    } catch (error) {
      console.error('Error signing in with Facebook:', error);
      setError('Failed to sign in with Facebook. Please try again.');
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      const credential = await signInAnonymously(auth);
      if (credential.user) {
        // Anonymous users should always go through onboarding
        onSuccess('/onboarding');
      }
    } catch (error: unknown) {
      console.error('Error with anonymous auth:', error);
      if (error instanceof Error) {
        const firebaseError = error as AuthError;
        const errorCode = firebaseError.code;
        setError(firebaseErrorMessages[errorCode] || firebaseErrorMessages.default);
      } else {
        setError(firebaseErrorMessages.default);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isSignUp) {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create custom action code settings with app URL
        const origin = window.location.origin;
        const redirectUrl = `${origin}/email-verification`;
        
        // We need to send verification email with our custom URL
        try {
          await sendEmailVerification(userCredential.user, {
            url: redirectUrl,
            handleCodeInApp: false // Set to false for URL-based verification
          });
          
          // Create user document in Firestore with emailVerified status
          const userRef = doc(db, 'users', userCredential.user.uid);
          await setDoc(userRef, {
            email: userCredential.user.email,
            emailVerified: false,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          // Show success message
          setError('');
          toast.success('Verification email sent. Please check your inbox to verify your email address.');
          
          // Redirect to onboarding
          onSuccess('/onboarding');
        } catch (verificationError) {
          console.error('Error sending verification email:', verificationError);
          // Still allow the user to continue even if verification email fails
          onSuccess('/onboarding');
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
          const hasOnboarding = await checkUserOnboarding(userCredential.user.uid);
          const redirectPath = hasOnboarding ? '/' : '/onboarding';
          onSuccess(redirectPath);
        }
      }
    } catch (error: unknown) {
      console.error('Error with email auth:', error);
      if (error instanceof Error) {
        const firebaseError = error as AuthError;
        const errorCode = firebaseError.code;
        setError(firebaseErrorMessages[errorCode] || firebaseErrorMessages.default);
      } else {
        setError(firebaseErrorMessages.default);
      }
      setLoading(false);
    }
  };

  const resetForm = () => {
    setVerificationCode('');
    setIsVerifying(false);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsSignUp(false);
    
    // Clean up reCAPTCHA
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined;
    }
  };

  // Expose reset method for parent components
  useEffect(() => {
    // This effect runs once on mount
    if (typeof window !== 'undefined') {
      // Extend Window interface to include resetLoginForm
      (window as Window & { resetLoginForm?: () => void }).resetLoginForm = resetForm;
    }
    
    return () => {
      // Cleanup on unmount
      if (typeof window !== 'undefined') {
        // Cast window to include resetLoginForm property
        delete (window as Window & { resetLoginForm?: () => void }).resetLoginForm;
      }
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {error && (
        <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg">
          {error}
        </div>
      )}

      {/* Tab Switcher - Only show if either phone or email/password is enabled */}
      {(authMethods.phone || authMethods.emailPassword) && (
        <div className="flex gap-4 mb-6">
          {authMethods.phone && authMethods.emailPassword && (
            <button
              onClick={() => setSelectedTab('phone')}
              className={`flex-1 py-2 border-b-2 ${
                selectedTab === 'phone' ? 'border-primary text-primary' : 'border-transparent'
              }`}
            >
              Phone
            </button>
          )}
          {authMethods.emailPassword && authMethods.phone && (
            <button
              onClick={() => setSelectedTab('email')}
              className={`flex-1 py-2 border-b-2 ${
                selectedTab === 'email' ? 'border-primary text-primary' : 'border-transparent'
              } ${authMethods.emailPassword  && !authMethods.phone ? 'border-primary text-primary' : ''}`}
            >
              Email
            </button>
          )}
        </div>
      )}

      {/* Phone Login Form */}
      {selectedTab === 'phone' && authMethods.phone && (
        <div className="space-y-4">
          {!isVerifying ? (
            <>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="min-h-[50px] h-[50px] w-full px-3 rounded-lg border background text-foreground shadow-sm"
              >
                <option value="+233">GH (+233)</option>
                <option value="+234">NG (+234)</option>
                <option value="+27">SA (+27)</option>
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                className="min-h-[50px] w-full px-3 rounded-lg border background text-foreground shadow-sm"
              />
              <button
                onClick={handleSendVerificationCode}
                disabled={!phoneNumber || loading}
                className="w-full bg-primary text-primary-foreground rounded-lg min-h-[50px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Continue'}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                maxLength={6}
                className="min-h-[50px] w-full px-3 rounded-lg border border-input background text-foreground shadow-sm"
              />
              <button
                onClick={handleVerifyCode}
                disabled={!verificationCode || loading}
                className="w-full bg-primary text-primary-foreground rounded-lg min-h-[50px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                onClick={() => setIsVerifying(false)}
                className="w-full text-foreground hover:text-primary transition-colors"
              >
                Change phone number
              </button>
            </>
          )}
        </div>
      )}

      {/* Email Login/Signup Form */}
      {(selectedTab === 'email' || (authMethods.emailPassword && !authMethods.phone)) && authMethods.emailPassword && (
        <div className="space-y-4 w-full">
          <form onSubmit={handleEmailAuth} className="space-y-4 w-full p-0 m-0">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {isSignUp ? 'Already have an account?' : 'Create new account'}
              </button>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="min-h-[50px] w-full px-3 rounded-lg border border-input background text-foreground shadow-sm"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="min-h-[50px] w-full px-3 pr-10 rounded-lg border border-input background text-foreground shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {isSignUp && (
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="min-h-[50px] w-full px-3 pr-10 rounded-lg border border-input background text-foreground shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-primary text-white rounded-lg min-h-[50px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!email || !password || (isSignUp && !confirmPassword) || loading}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Log In')}
            </button>
          </form>
        </div>
      )}
    
      {/* Only show divider if we have both above and below login options */}
      {(authMethods.phone || authMethods.emailPassword) && 
       (authMethods.google || authMethods.facebook || authMethods.anonymous) && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>
      )}

      {/* Social Login Buttons */}
      <div className="space-y-3">
        {authMethods.google && (
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-input background text-foreground rounded-lg py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
              </g>
            </svg>
            Continue with Google
          </button>
          )} 
        {authMethods.apple && (
          <button
            onClick={handleAppleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-input background text-foreground rounded-lg py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Apple size={20} />
            Continue with Apple
          </button>
        )}
        {authMethods.facebook && (
          <button
            onClick={handleFacebookSignIn}
            className="w-full flex items-center justify-center gap-3 border border-input background text-foreground rounded-lg py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Facebook size={20} className="text-[#1877F2]" />
            Continue with Facebook
          </button>
        )}
        {authMethods.anonymous && (
          <button
            onClick={handleAnonymousLogin}
            className="w-full flex items-center justify-center gap-3 border border-input background text-foreground rounded-lg py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
            Continue as Guest
          </button>
        )}
      </div>
    </div>
  );
} 