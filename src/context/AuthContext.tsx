/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  GoogleAuthProvider, 
  OAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  applyActionCode,
  sendSignInLinkToEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { setAuthCookie, clearAuthCookie, hasValidLocalSession } from '@/lib/auth-utils';

// Extended User type that includes both Firebase Auth and Firestore data
export interface User extends FirebaseUser {
  role?: 'propertySeeker' | 'propertyProvider';
  userType?: 'seeker' | 'provider';
  id: string;
  businessName?: string;
  location?: string;
  phone?: string;
  whatsapp?: string;
  isAdmin?: boolean;
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  balance: { currentBalance: number } | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendVerificationEmail: (redirectUrl?: string) => Promise<void>;
  resendVerificationEmail: (redirectUrl?: string) => Promise<void>;
  verifyEmail: (actionCode: string) => Promise<void>;
  reloadUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  balance: null,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithFacebook: async () => {},
  signInWithEmail: async () => {},
  logout: async () => {},
  changePassword: async () => {},
  sendVerificationEmail: async () => {},
  resendVerificationEmail: async () => {},
  verifyEmail: async () => {},
  reloadUser: async () => null
});

interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastAuthenticated?: number;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<{ currentBalance: number } | null>(null);

  // Function to merge Firebase Auth user with Firestore user data
  const mergeUserData = async (firebaseUser: FirebaseUser): Promise<User> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    return {
      ...firebaseUser,
      id: firebaseUser.uid,
      role: userData?.userType,
      userType: userData?.userType,
      businessName: userData?.businessName,
      location: userData?.location,
      phone: userData?.phone,
      whatsapp: userData?.whatsapp,
      isAdmin: userData?.isAdmin || false,
      emailVerified: firebaseUser.emailVerified || userData?.emailVerified || false,
      createdAt: userData?.createdAt,
      updatedAt: userData?.updatedAt,
    } as User;
  };

  const saveSession = async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const mergedUser = await mergeUserData(firebaseUser);
      setUser(mergedUser);
      
      // Store user data in localStorage for quick client-side checks
      localStorage.setItem('user', JSON.stringify({
        uid: mergedUser.uid,
        email: mergedUser.email,
        displayName: mergedUser.displayName,
        photoURL: mergedUser.photoURL,
        // Add a timestamp for session expiry checks
        lastAuthenticated: Date.now()
      }));
      
      // Set the auth cookie
      await setAuthCookie(firebaseUser);
    } else {
      setUser(null);
      localStorage.removeItem('user');
      // Clear the token cookie
      clearAuthCookie();
    }
  };

  const getSession = (): SessionUser | null => {
    try {
      const user = localStorage.getItem('user');
      if (!user) return null;
      
      const userData = JSON.parse(user);
      
      // Check if the session is still valid (less than 1 hour old)
      const SESSION_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
      if (userData.lastAuthenticated && 
          Date.now() - userData.lastAuthenticated < SESSION_EXPIRY) {
        return userData;
      } else {
        // Session expired, clear it
        localStorage.removeItem('user');
        return null;
      }
    } catch (error) {
      console.error('Error parsing session:', error);
      localStorage.removeItem('user');
      return null;
    }
  };

  const loadUserBalance = async (userId: string) => {
    try {
      const balanceRef = doc(db, 'balances', userId);
      const balanceSnap = await getDoc(balanceRef);
      if (balanceSnap.exists()) {
        setBalance(balanceSnap.data() as { currentBalance: number });
      }
    } catch (error) {
      console.error('Error loading user balance:', error);
    }
  };

  useEffect(() => {
    // First, check if we have a session in localStorage
    if (hasValidLocalSession()) {
      const session = getSession();
      if (session) {
        // Set user from localStorage immediately to prevent flicker
        setUser(session as unknown as User);
      }
    }

    // Set up a timer to refresh the token periodically
    let tokenRefreshInterval: NodeJS.Timeout | null = null;
    
    // Then set up the Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const mergedUser = await mergeUserData(firebaseUser);
        setUser(mergedUser);
        await saveSession(firebaseUser);
        await loadUserBalance(mergedUser.uid);
        
        // Set up token refresh every 50 minutes (tokens expire after 1 hour)
        tokenRefreshInterval = setInterval(async () => {
          try {
            await setAuthCookie(firebaseUser);
          } catch (error) {
            console.error('Error refreshing token:', error);
          }
        }, 50 * 60 * 1000); // 50 minutes
      } else {
        // User is signed out
        setUser(null);
        setBalance(null);
        await saveSession(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, []);

  const handlePostLogin = async (firebaseUser: FirebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // New user - create user document with createdAt
      await setDoc(userRef, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      // Existing user - update lastLogin and updatedAt
      await updateDoc(userRef, {
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    const mergedUser = await mergeUserData(firebaseUser);
    await saveSession(firebaseUser);
    await loadUserBalance(mergedUser.uid);
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handlePostLogin(result.user);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      await handlePostLogin(result.user);
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      throw error;
    }
  };

  const signInWithFacebook = async () => {
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handlePostLogin(result.user);
    } catch (error) {
      console.error('Error signing in with Facebook:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string) => {
    try {
      setLoading(true);
      // Use Firebase's sendSignInLinkToEmail
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/email-signin`,
        handleCodeInApp: true
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save the email to localStorage to remember it for when user clicks the link in email
      window.localStorage.setItem('emailForSignIn', email);
      
      return;
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setBalance(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('User not authenticated or missing email');
    }

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser!, newPassword);
      
      return;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  // Add the sendVerificationEmail function
  const sendVerificationEmail = async (redirectUrl?: string) => {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Configure actionCodeSettings with our app's URL
      const actionCodeSettings = redirectUrl ? {
        url: redirectUrl,
        handleCodeInApp: false // Set to false for URL-based verification
      } : undefined;

      await sendEmailVerification(auth.currentUser, actionCodeSettings);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  };

  // Update the verifyEmail function
  const verifyEmail = async (actionCode: string) => {
    try {
      // Apply the verification code from the email
      await applyActionCode(auth, actionCode);
      
      // After successful verification, we need to get the current user again
      // as emailVerified status may have been updated in Firebase Auth
      if (auth.currentUser) {
        // Reload the user to get the updated emailVerified status
        await auth.currentUser.reload();
        
        // Update emailVerified in Firestore
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          emailVerified: auth.currentUser.emailVerified,
          updatedAt: new Date().toISOString()
        });
        
        // Refresh user data in our state
        if (auth.currentUser) {
          const mergedUser = await mergeUserData(auth.currentUser);
          setUser(mergedUser);
        }
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  };

  // Function to resend verification email
  const resendVerificationEmail = async (redirectUrl?: string) => {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    
    if (auth.currentUser.emailVerified) {
      throw new Error('Email is already verified');
    }
    
    try {
      await sendVerificationEmail(redirectUrl);
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  };

  // Function to reload user data
  const reloadUser = async (): Promise<User | null> => {
    if (!auth.currentUser) {
      return null;
    }
    
    try {
      await auth.currentUser.reload();
      const mergedUser = await mergeUserData(auth.currentUser);
      setUser(mergedUser);
      return mergedUser;
    } catch (error) {
      console.error('Error reloading user:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        balance,
        signInWithGoogle,
        signInWithApple,
        signInWithFacebook,
        signInWithEmail,
        logout,
        changePassword,
        sendVerificationEmail,
        resendVerificationEmail,
        verifyEmail,
        reloadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 