'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

// Define the App type
export interface AdminApp {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  logoUrl?: string;
  isLive: boolean;
  createdAt?: any;
  updatedAt?: any;
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
}

interface AdminAppContextType {
  apps: AdminApp[];
  selectedAppId: string | null;
  setSelectedAppId: (id: string | null) => void;
  selectedApp: AdminApp | null;
  loading: boolean;
  refetchApps: () => Promise<void>;
}

const AdminAppContext = createContext<AdminAppContextType>({
  apps: [],
  selectedAppId: null,
  setSelectedAppId: () => {},
  selectedApp: null,
  loading: true,
  refetchApps: async () => {}
});

export const useAdminApp = () => useContext(AdminAppContext);

export const AdminAppProvider = ({ children }: { children: ReactNode }) => {
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch apps on component mount
  useEffect(() => {
    fetchApps();
  }, []);

  // Load selected app from localStorage
  useEffect(() => {
    const savedAppId = localStorage.getItem('selectedAppId');
    if (savedAppId) {
      setSelectedAppId(savedAppId);
    }
  }, []);

  // Save selected app to localStorage when it changes
  useEffect(() => {
    if (selectedAppId) {
      localStorage.setItem('selectedAppId', selectedAppId);
    }
  }, [selectedAppId]);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const appsCollection = collection(db, 'apps');
      const appsSnapshot = await getDocs(appsCollection);
      
      const appsList = appsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminApp[];
      
      setApps(appsList);
      
      // Set the first app as selected if there are apps and none is selected
      const savedAppId = localStorage.getItem('selectedAppId');
      
      if (appsList.length > 0) {
        if (savedAppId && appsList.some(app => app.id === savedAppId)) {
          setSelectedAppId(savedAppId);
        } else if (!selectedAppId) {
          setSelectedAppId(appsList[0].id);
          localStorage.setItem('selectedAppId', appsList[0].id);
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

  return (
    <AdminAppContext.Provider
      value={{
        apps,
        selectedAppId,
        setSelectedAppId,
        selectedApp,
        loading,
        refetchApps: fetchApps
      }}
    >
      {children}
    </AdminAppContext.Provider>
  );
}; 