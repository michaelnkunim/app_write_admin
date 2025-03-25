import { User as FirebaseUser } from 'firebase/auth';

/**
 * Gets the Firebase ID token and sets it as a cookie
 */
export const setAuthCookie = async (firebaseUser: FirebaseUser): Promise<void> => {
  try {
    const idToken = await firebaseUser.getIdToken();
    document.cookie = `token=${idToken}; path=/; max-age=3600; SameSite=Strict`;
  } catch (error) {
    console.error('Error setting auth cookie:', error);
  }
};

/**
 * Clears the auth cookie
 */
export const clearAuthCookie = (): void => {
  document.cookie = 'token=; path=/; max-age=0; SameSite=Strict';
};

/**
 * Checks if the user has a valid session in localStorage
 */
export const hasValidLocalSession = (): boolean => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) return false;
    
    const parsedUser = JSON.parse(userData);
    const SESSION_EXPIRY = 60 * 60 * 1000; // 1 hour
    
    return !!(parsedUser.lastAuthenticated && 
      Date.now() - parsedUser.lastAuthenticated < SESSION_EXPIRY);
  } catch (error) {
    console.error('Error checking local session:', error);
    return false;
  }
};

/**
 * Gets the current auth token from cookies
 */
export const getAuthToken = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token') {
      return value;
    }
  }
  return null;
}; 