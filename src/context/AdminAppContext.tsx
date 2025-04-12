/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { 
  initializeAppFirebase, 
  cleanupActiveFirebaseInstance, 
  parseFirebaseConfig,
  getActiveFirebaseInstance
} from '@/lib/dynamic-firebase';
import { applyAppTheme, resetAppTheme } from '@/lib/theme-utils';

// Define the App type
export interface AdminApp {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  logoUrl?: string;
  isLive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  order?: number;
  adminMenuItems?: Array<{
    id: string;
    name: string;
    path: string;
    icon: string;
    order: number;
  }>;
  theme?: {
    light: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      accent: string;
    };
    dark: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      accent: string;
    };
  };
  firebaseConfig?: string;
}

interface AdminAppContextType {
  apps: AdminApp[];
  selectedAppId: string | null;
  setSelectedAppId: (id: string | null) => void;
  selectedApp: AdminApp | null;
  loading: boolean;
  appFirebaseLoading: boolean;
  appFirebaseError: string | null;
  refetchApps: () => Promise<void>;
  appFirebase: ReturnType<typeof getActiveFirebaseInstance>;
}

const AdminAppContext = createContext<AdminAppContextType>({
  apps: [],
  selectedAppId: null,
  setSelectedAppId: () => {},
  selectedApp: null,
  loading: true,
  appFirebaseLoading: false,
  appFirebaseError: null,
  refetchApps: async () => {},
  appFirebase: null
});

export const useAdminApp = () => useContext(AdminAppContext);

export const AdminAppProvider = ({ children }: { children: ReactNode }) => {
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [appFirebaseLoading, setAppFirebaseLoading] = useState(false);
  const [appFirebaseError, setAppFirebaseError] = useState<string | null>(null);
  const { theme } = useTheme();
  
  // Effect to fetch apps on component mount
  useEffect(() => {
    fetchApps();
    
    // Clean up Firebase instance when unmounting
    return () => {
      cleanupActiveFirebaseInstance();
    };
  }, []);

  // Effect to initialize Firebase instance when selected app changes
  useEffect(() => {
    if (selectedAppId && apps.length > 0) {
      initializeAppFirebaseInstance(selectedAppId);
      localStorage.setItem('selectedAppId', selectedAppId);
    }
  }, [selectedAppId, apps]);
  
  // Effect to apply theme when selected app or theme mode changes
  useEffect(() => {
    const app = apps.find(a => a.id === selectedAppId);
    if (app?.theme) {
      // Apply the app's theme based on current theme mode
      const currentMode = theme === 'dark' ? 'dark' : 'light';
      applyAppTheme(app.theme, currentMode);
    } else if (theme) {
      // Reset to default theme if no app selected or app has no theme
      resetAppTheme(theme === 'dark' ? 'dark' : 'light');
    }
  }, [selectedAppId, apps, theme]);

  // Function to initialize the Firebase instance for the selected app
  const initializeAppFirebaseInstance = async (appId: string) => {

    const app = apps.find(a => a.id === appId);
   // console.log(app);
    if (!app || !app.firebaseConfig) {
      setAppFirebaseError('Selected app has no Firebase configuration');
      return;
    }
    
    setAppFirebaseLoading(true);
    setAppFirebaseError(null);
    
    try {
      const config = parseFirebaseConfig(app.firebaseConfig);
      console.log(config);
      if (!config) {
        throw new Error('Invalid Firebase configuration');
      }
      
      initializeAppFirebase(app.id, config);
    } catch (error) {
      console.error('Error initializing app Firebase:', error);
      setAppFirebaseError('Failed to initialize app Firebase');
    } finally {
      setAppFirebaseLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      setLoading(true);
      const appsCollection = collection(db, 'apps');
      const appsSnapshot = await getDocs(appsCollection);
      
      const appsList = appsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        order: doc.data().order || 0 // Ensure order property exists
      })) as AdminApp[];
      
      // Sort by order property
      const sortedApps = appsList.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setApps(sortedApps);
      
      // Get the saved app ID after fetching apps
      const savedAppId = localStorage.getItem('selectedAppId');
      
      // Only set selectedAppId if apps were loaded successfully
      if (sortedApps.length > 0) {
        if (savedAppId && sortedApps.some(app => app.id === savedAppId)) {
          setSelectedAppId(savedAppId);
        } else {
          // No valid saved app ID, select the first app
          setSelectedAppId(sortedApps[0].id);
          localStorage.setItem('selectedAppId', sortedApps[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching apps:", error);
      toast.error("Failed to load apps");
    } finally {
      setLoading(false);
    }
  };

  // Get the current selected app
  const selectedApp = apps.find(app => app.id === selectedAppId) || null;
  
  // Get the active Firebase instance
  const appFirebase = getActiveFirebaseInstance();

  return (
    <AdminAppContext.Provider
      value={{
        apps,
        selectedAppId,
        setSelectedAppId,
        selectedApp,
        loading,
        appFirebaseLoading,
        appFirebaseError,
        refetchApps: fetchApps,
        appFirebase
      }}
    >
      {children}
    </AdminAppContext.Provider>
  );
}; 