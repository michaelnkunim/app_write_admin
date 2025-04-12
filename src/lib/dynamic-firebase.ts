import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  Auth
} from 'firebase/auth';
import { 
  getStorage, 
  FirebaseStorage
} from 'firebase/storage';

interface DynamicFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface DynamicFirebaseInstance {
  app: FirebaseApp;
  db: Firestore;
  // auth: Auth;
  storage: FirebaseStorage;
}

// Keep track of the active app's Firebase instance
let activeInstance: DynamicFirebaseInstance | null = null;

/**
 * Initialize a Firebase instance for a specific app
 */
export function initializeAppFirebase(
  appId: string, 
  config: DynamicFirebaseConfig
): DynamicFirebaseInstance {
  // Clean up previous instance if it exists
  cleanupActiveFirebaseInstance();
  
  // Initialize new Firebase app with a unique name based on the app ID
  const appName = `app-${appId}`;
  const app = initializeApp(config, appName);
  
  // Initialize services
  const db = getFirestore(app);
 // const auth = getAuth(app);
  const storage = getStorage(app);
  
  // Store as active instance
  activeInstance = { app, db,  storage };
  console.log(activeInstance);
  
  return activeInstance;
}

/**
 * Clean up the active Firebase instance
 */
export function cleanupActiveFirebaseInstance(): void {
  if (activeInstance) {
    try {
      deleteApp(activeInstance.app);
    } catch {
      console.error('Error deleting Firebase app');
    }
    activeInstance = null;
  }
}

/**
 * Get the active Firebase instance
 */
export function getActiveFirebaseInstance(): DynamicFirebaseInstance | null {
  return activeInstance;
}

/**
 * Parse a Firebase config string into a proper config object
 */
export function parseFirebaseConfig(configStr: string): DynamicFirebaseConfig | null {
  try {
    // Try to parse the string as JSON
    const config = JSON.parse(configStr);
    
    // Validate required fields
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const hasRequiredFields = requiredFields.every(field => !!config[field]);
    
    if (!hasRequiredFields) {
      console.error('Firebase config missing required fields');
      return null;
    }
    
    return config as DynamicFirebaseConfig;
  } catch {
    console.error('Invalid Firebase config');
    return null;
  }
} 