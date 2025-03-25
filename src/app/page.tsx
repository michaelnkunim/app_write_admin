'use client';

import { useEffect, useState } from 'react';
import ListingCard from '@/components/ListingCard';
import HeroCarousel from '@/components/HeroCarousel';
import SearchTabs from '@/components/SearchTabs';
import LoginModal from '@/components/LoginModal';
import Link from 'next/link';
import AdDisplay from '@/components/AdDisplay';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Listing } from '@/types/listing';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useLanguage } from '@/context/LanguageContext';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80';

export default function Home() {
  const { 
    loading: settingsLoading, 
    appSettings, 
    refreshAppSettings, 
    resetAppSettings,
    clearContextOnly 
  } = useAppSettings();
  const { labels } = useLanguage();
  
  const [visibleListings, setVisibleListings] = useState(8);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Debug function to check app settings directly from Firestore
  const checkAppSettingsDirectly = async () => {
    try {
      setDebugInfo('Checking app settings directly from Firestore...');
      const appSettingsRef = doc(db, 'appSettings', 'interface');
      const appSettingsSnap = await getDoc(appSettingsRef);
      
      if (appSettingsSnap.exists()) {
        const data = appSettingsSnap.data();
        console.log('Direct Firestore data:', data);
        setDebugInfo(`Found data directly. Sliders: ${data.sliders?.length || 0}, SliderItems keys: ${Object.keys(data.sliderItems || {}).join(', ')}`);
        
        // Try to refresh the context
        await refreshAppSettings();
      } else {
        setDebugInfo('No app settings document found in Firestore');
      }
    } catch (error) {
      console.error('Error checking app settings:', error);
      setDebugInfo(`Error: ${error}`);
    }
  };

  // Debug function to reset context data only
  const handleResetContext = () => {
    try {
      setDebugInfo('Clearing app settings context data...');
      clearContextOnly();
      setDebugInfo('App settings context cleared. Data in Firestore remains unchanged.');
    } catch (error) {
      console.error('Error clearing app settings context:', error);
      setDebugInfo(`Error: ${error}`);
    }
  };

  // Debug function to delete app settings from Firestore
  const handleDeleteFromFirestore = async () => {
    if (confirm('Are you sure you want to delete app settings from Firestore? This cannot be undone.')) {
      try {
        setDebugInfo('Deleting app settings from Firestore...');
        await resetAppSettings(true);
        setDebugInfo('App settings deleted from Firestore and context reset.');
      } catch (error) {
        console.error('Error deleting app settings from Firestore:', error);
        setDebugInfo(`Error: ${error}`);
      }
    }
  };

  useEffect(() => {
    const fetchListings = async () => {
      try {
        console.log('Fetching listings...');
        const listingsRef = collection(db, 'listings');
        const q = query(
          listingsRef,
          orderBy('updatedAt', 'desc'),
          limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        
        const fetchedListings = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Property',
            description: data.description || 'No description available',
            image: data.image || DEFAULT_IMAGE,
            images: Array.isArray(data.images) ? data.images : [DEFAULT_IMAGE],
            price: data.price || 0,
            location: data.location || 'Location not specified',
            category: data.category || 'For Sale',
            status: data.status || 'active',
            published: data.published || true,
            views: data.views || 0,
            host: {
              id: data.host?.id || '',
              name: data.host?.name || 'Anonymous',
              image: data.host?.image || DEFAULT_IMAGE
            },
            amenities: Array.isArray(data.amenities) ? data.amenities : [],
            coordinates: data.coordinates || { lat: 0, lng: 0 },
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
          } as Listing;
        });
        
        setListings(fetchedListings);
        setFilteredListings(fetchedListings);
        setError(null);
      } catch (error) {
        console.error('Error fetching listings:', error);
        setError('Failed to load listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  // Add effect to log app settings when they change
  useEffect(() => {
    //console.log('AppSettings in context:', appSettings);
  }, [appSettings]);

  const handleCategoryChange = (category: string) => {
    if (category === 'all') {
      setFilteredListings(listings);
    } else {
      const filtered = listings.filter(listing => 
        listing.category[0]?.key === category
      );
      setFilteredListings(filtered);
    }
    setVisibleListings(8); // Reset visible listings when category changes
  };

  const showMore = () => {
    setVisibleListings((prev) => Math.min(prev + 8, filteredListings.length));
  };

  // Combined loading state for both app settings and listings
  const isLoading = loading || settingsLoading;
  
  return (
    <main>
      {/* Debug buttons - Only visible in development */}
      {/* {process.env.NODE_ENV !== 'production' && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          <Link href="/menus-demo">
            <div className="bg-indigo-500 text-white px-4 py-2 rounded-md text-sm shadow-md hover:bg-indigo-600 cursor-pointer">
              Menus Demo
            </div>
          </Link>
          
          <button 
            onClick={checkAppSettingsDirectly}
            className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm shadow-md hover:bg-blue-600"
          >
            Check App Settings
          </button>

          <button 
            onClick={refreshAppSettings}
            className="bg-green-500 text-white px-4 py-2 rounded-md text-sm shadow-md hover:bg-green-600"
          >
            Refresh App Settings
          </button>

          <button 
            onClick={handleResetContext}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md text-sm shadow-md hover:bg-yellow-600"
          >
            Clear Context Only
          </button>

          <button 
            onClick={handleDeleteFromFirestore}
            className="bg-red-500 text-white px-4 py-2 rounded-md text-sm shadow-md hover:bg-red-600"
          >
            Delete From Firestore
          </button>
          
          {debugInfo && (
            <div className="p-3 bg-white shadow-lg rounded-md max-w-md text-xs">
              {debugInfo}
            </div>
          )}
        </div>
      )}
       */}
      <SearchTabs onCategoryChange={handleCategoryChange} />
      
      {/* Use HeroCarousel with just the zone prop */}
      <HeroCarousel zone="homepage" />
      
      {/* Homepage Leaderboard Ad */}
      <div className="container mx-auto my-6">
        <AdDisplay zone="homepage_leaderboard" className="flex justify-center" />
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={`loading-${i + 1}`} className="h-72 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main content area - 3/4 width on large screens */}
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-semibold mb-6">{labels.homePage.FEATURED_PROPERTIES}</h2>
              {filteredListings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{labels.homePage.NO_PROPERTIES}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredListings.slice(0, visibleListings).map((listing) => (
                      <ListingCard 
                        key={listing.id} 
                        listing={{
                          ...listing,
                          image: listing.image || DEFAULT_IMAGE,
                          images: listing.images?.length > 0 ? listing.images : [DEFAULT_IMAGE]
                        }} 
                        galleryMode={true}
                        onLoginRequired={() => setIsLoginModalOpen(true)}
                      />
                    ))}
                  </div>
                  
                  {visibleListings < filteredListings.length && (
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={showMore}
                        className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                      >
                        {labels.editListingPage.SHOW_MORE}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Sidebar - 1/4 width on large screens */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                {/* Sidebar ads */}
                <div className="mb-2">
                  <br/><br/><br/>
                  <h3 className="text-lg font-semibold mb-4 z-[2px]">Sponsored</h3>
                  <AdDisplay zone="homepage_sidebar_square" className="space-y-4" />
                </div>
                
                {/* Additional sidebar content */}
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <h3 className="font-medium mb-2">Looking to rent or sell?</h3>
                  <p className="text-sm text-gray-600 mb-4">List your property with us and reach thousands of potential buyers.</p>
                  <Link 
                    href="/listings/create" 
                    className="block text-center bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Create Listing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </main>
  );
}
