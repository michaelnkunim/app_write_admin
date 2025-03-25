'use client';

import { useState } from 'react';
import { useFavorites } from '@/context/FavoritesContext';
import ListingCard from '@/components/ListingCard';
import LoginModal from '@/components/LoginModal';
import RouteGuard from '@/components/RouteGuard';
import { Loader2 } from 'lucide-react';

export default function FavoritesPage() {
  const { favorites, loading } = useFavorites();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <RouteGuard>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">My Favorites</h1>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl text-muted-foreground">No favorites yet</h2>
            <p className="text-muted-foreground mt-2">
              Start adding properties to your favorites list!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {favorites.map((listing) => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                galleryMode={true}
                onLoginRequired={() => setIsLoginModalOpen(true)}
              />
            ))}
          </div>
        )}

        <LoginModal 
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </main>
    </RouteGuard>
  );
} 