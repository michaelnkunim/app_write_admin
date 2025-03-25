'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile } from '@/lib/userProfile';

interface ProfileContextType {
  profilePhotoURL: string | null;
  updateProfilePhoto: (url: string) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profilePhotoURL: null,
  updateProfilePhoto: () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profilePhotoURL, setProfilePhotoURL] = useState<string | null>(null);

  useEffect(() => {
    const loadProfilePhoto = async () => {
      if (!user) {
        setProfilePhotoURL(null);
        return;
      }
      
      try {
        const profile = await getUserProfile(user.uid);
        if (profile?.photoURL) {
          setProfilePhotoURL(profile.photoURL);
        } else if (user.photoURL) {
          setProfilePhotoURL(user.photoURL);
        } else {
          setProfilePhotoURL('/default-avatar.svg');
        }
      } catch (error) {
        console.error('Error loading profile photo:', error);
        setProfilePhotoURL('/default-avatar.svg');
      }
    };

    loadProfilePhoto();
  }, [user]);

  const updateProfilePhoto = (url: string) => {
    setProfilePhotoURL(url);
  };

  return (
    <ProfileContext.Provider value={{ profilePhotoURL, updateProfilePhoto }}>
      {children}
    </ProfileContext.Provider>
  );
} 