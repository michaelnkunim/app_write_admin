'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getTotalUnreadCount, subscribeToUserThreads } from '@/lib/chat';

interface UnreadCountContextType {
  totalUnreadCount: number;
  updateUnreadCount: () => Promise<void>;
}

const UnreadCountContext = createContext<UnreadCountContextType>({
  totalUnreadCount: 0,
  updateUnreadCount: async () => {},
});

export function UnreadCountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const updateUnreadCount = async () => {
    if (!user) return;
    try {
      const count = await getTotalUnreadCount(user.uid);
      setTotalUnreadCount(count);
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    // Initial load
    updateUnreadCount();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUserThreads(user.uid, async () => {
      await updateUnreadCount();
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <UnreadCountContext.Provider value={{ totalUnreadCount, updateUnreadCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount() {
  return useContext(UnreadCountContext);
} 