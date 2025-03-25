'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Listing } from '@/types/listing';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FavoritesContextType {
  favorites: Listing[];
  addToFavorites: (listing: Listing) => void;
  removeFromFavorites: (listingId: string) => void;
  isFavorite: (listingId: string) => boolean;
  clearFavorites: () => void;
  loading: boolean;
}

const STORAGE_KEY_PREFIX = 'favorites_';

const defaultContext: FavoritesContextType = {
  favorites: [],
  addToFavorites: () => {
    console.warn('FavoritesContext not initialized');
  },
  removeFromFavorites: () => {
    console.warn('FavoritesContext not initialized');
  },
  isFavorite: () => false,
  clearFavorites: () => {
    console.warn('FavoritesContext not initialized');
  },
  loading: false,
};

const FavoritesContext = createContext<FavoritesContextType>(defaultContext);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load favorites when user changes
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) {
        setFavorites([]);
        return;
      }

      setLoading(true);
      try {
        // Get user document to check for favorite IDs
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && Array.isArray(userDoc.data().favoriteIds) && userDoc.data().favoriteIds.length > 0) {
          const favoriteIds = userDoc.data().favoriteIds;
          
          // Fetch listings by IDs
          const listingsRef = collection(db, 'listings');
          const q = query(listingsRef, where('id', 'in', favoriteIds));
          const querySnapshot = await getDocs(q);
          
          const fetchedListings: Listing[] = [];
          querySnapshot.forEach((doc) => {
            fetchedListings.push({ id: doc.id, ...doc.data() } as Listing);
          });
          
          setFavorites(fetchedListings);
          
          // Update localStorage for offline access
          localStorage.setItem(
            `${STORAGE_KEY_PREFIX}${user.uid}`,
            JSON.stringify(fetchedListings)
          );
        } else {
          // Check localStorage as fallback
          const storedFavorites = localStorage.getItem(`${STORAGE_KEY_PREFIX}${user.uid}`);
          if (storedFavorites) {
            const parsedFavorites = JSON.parse(storedFavorites);
            if (Array.isArray(parsedFavorites) && parsedFavorites.length > 0) {
              setFavorites(parsedFavorites);
              
              // Save IDs to Firestore
              const favoriteIds = parsedFavorites.map(fav => fav.id);
              await setDoc(userRef, { favoriteIds }, { merge: true });
            } else {
              setFavorites([]);
            }
          } else {
            setFavorites([]);
          }
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [user]);

  // Add to favorites
  const addToFavorites = useCallback(async (listing: Listing) => {
    if (!user) return;
    
    // Check if already in favorites
    if (favorites.some(fav => fav.id === listing.id)) return;
    
    // Update local state
    const newFavorites = [...favorites, listing];
    setFavorites(newFavorites);
    
    try {
      // Save to Firestore (just the IDs)
      const favoriteIds = newFavorites.map(fav => fav.id);
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { favoriteIds }, { merge: true });
      
      // Save to localStorage (full listings)
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${user.uid}`,
        JSON.stringify(newFavorites)
      );
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  }, [favorites, user]);

  // Remove from favorites
  const removeFromFavorites = useCallback(async (listingId: string) => {
    if (!user) return;
    
    // Update local state
    const newFavorites = favorites.filter(listing => listing.id !== listingId);
    setFavorites(newFavorites);
    
    try {
      // Save to Firestore (just the IDs)
      const favoriteIds = newFavorites.map(fav => fav.id);
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { favoriteIds }, { merge: true });
      
      // Save to localStorage (full listings)
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${user.uid}`,
        JSON.stringify(newFavorites)
      );
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  }, [favorites, user]);

  // Check if a listing is in favorites
  const isFavorite = useCallback((listingId: string) => {
    return favorites.some(listing => listing.id === listingId);
  }, [favorites]);

  // Clear all favorites
  const clearFavorites = useCallback(async () => {
    if (!user) return;
    
    // Update local state
    setFavorites([]);
    
    try {
      // Clear from Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { favoriteIds: [] }, { merge: true });
      
      // Clear from localStorage
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${user.uid}`);
    } catch (error) {
      console.error('Error clearing favorites:', error);
    }
  }, [user]);

  const contextValue = useMemo(() => ({
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearFavorites,
    loading,
  }), [favorites, addToFavorites, removeFromFavorites, isFavorite, clearFavorites, loading]);

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  
  return context;
} 