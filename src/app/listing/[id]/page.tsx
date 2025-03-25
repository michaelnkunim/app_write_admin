'use client';

import Image from 'next/image';
import { useState, useCallback, use, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import AgentProfileCard from '@/components/AgentProfileCard';
import { getListing, getUserListings } from '@/lib/listings';
import { getUserProfile, UserProfile } from '@/lib/userProfile';
import { Listing } from '@/types/listing';
import ListingCard from '@/components/ListingCard';
import LoginModal from '@/components/LoginModal';
import AdDisplay from '@/components/AdDisplay';
import Link from 'next/link';

interface PageParams {
  id: string;
}

export default function ListingPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [agentProfile, setAgentProfile] = useState<UserProfile | null>(null);
  const [agentListings, setAgentListings] = useState<Listing[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const data = await getListing(id);
        setListing(data);
        
        if (data?.host?.id) {
          const profile = await getUserProfile(data.host.id);
          setAgentProfile(profile);

          // Fetch agent's other listings
          const listings = await getUserListings(data.host.id);
          setAgentListings(listings || []);
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const nextImage = useCallback(() => {
    if (!listing) return;
    setCurrentImageIndex((prev) => 
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  }, [listing]);

  const previousImage = useCallback(() => {
    if (!listing) return;
    setCurrentImageIndex((prev) => 
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  }, [listing]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: nextImage,
    onSwipedRight: previousImage,
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  const handleRequestCallback = () => {
    // Implementation of handleRequestCallback
  };

  // Handle touch events for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEndX(e.changedTouches[0].clientX);
    
    // Calculate swipe direction
    const diffX = touchStartX - touchEndX;
    
    if (diffX > 50) {
      // Swiped left, show next image
      nextImage();
    } else if (diffX < -50) {
      // Swiped right, show previous image
      previousImage();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="aspect-[4/3] bg-gray-200 rounded-xl mb-8"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Listing not found</h1>
          <p className="text-muted-foreground mt-2">The listing you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const hostData = {
    id: listing.host.id,
    name: agentProfile?.businessName || agentProfile?.username || listing.host.name,
    businessName: agentProfile?.businessName,
    image: agentProfile?.photoURL || listing.host.image,
    rating: listing.host.rating || 0,
    reviews: listing.host.reviews || 0,
    experience: listing.host.experience || 0,
    phone: agentProfile?.phone || listing.host.phone || '',
    specialties: listing.host.specialties || [],
    description: listing.host.description || '',
    isVerified: agentProfile?.idVerificationStatus === 'approved'
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb navigation */}
        <div className="mb-4 text-sm">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/listings" className="hover:underline">Listings</Link>
          <span className="mx-2">/</span>
          <span>{listing.title}</span>
        </div>

        {/* Leaderboard Ad before listing title */}
        <div className="mb-6">
          <AdDisplay zone="listing-detail-leaderboard" className="w-full" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3">
            {/* Main image display with navigation */}
            <div className="relative mb-4 rounded-xl overflow-hidden touch-manipulation"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                {...swipeHandlers}
                className="relative aspect-[4/3] rounded-xl overflow-hidden"
              >
                <Image
                  src={listing.images[currentImageIndex]}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1}/{listing.images.length}
                </div>
                <button 
                  onClick={previousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </button>
                {/* Pagination Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {listing.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentImageIndex === index 
                          ? 'bg-white scale-125' 
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
              {listing.images.slice(0, 6).map((image, index) => (
                <button
                  key={image}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden ${
                    currentImageIndex === index ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${listing.title} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Property Details */}
            <div className="mt-8">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  {/* <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg> */}
                  <span>Apartment</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg> */}
                  <span>2 Bedrooms</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg> */}
                  <span>2 Bathrooms</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{listing.location}</span>
              </div>
              <p className="text-gray-600">{listing.description}</p>
            </div>

            {/* Amenities */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">What this place offers</h2>
              <div className="grid grid-cols-2 gap-4">
                {listing.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Price and Contact */}
          <div className="lg:w-1/3 background">
            <div className="sticky top-50 -z[20] max-h-[calc(100vh-6rem)] overflow-y-auto">
              {/* Price Card */}
              <div className="border rounded-xl p-6 mb-6 background">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">GH₵ {listing.price.toLocaleString()}</span>
                    {listing.category[0]?.key !== 'for-sale' && (
                      <span className="text-gray-500 ml-2">{listing.category[0]?.key === 'short-stays' ? 'per night' : 'per month'}</span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    listing.category[0]?.key === 'for-sale' 
                      ? 'bg-blue-100 text-blue-700' 
                      : listing.category[0]?.key === 'for-rent'
                      ? 'bg-gg-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {listing.category[0]?.title || 'Uncategorized'}
                  </span>
                </div>
                <button className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors mb-4 z-[0]">
                  Request call back
                </button>
              </div>

              {/* Agent Profile */}
              <div className="mb-6 background">
                <h2 className="text-xl font-semibold mb-4">About the Agent</h2>
                <AgentProfileCard 
                  host={hostData} 
                  layout="vertical"
                  showViewProfile={true}
                />
              </div>

              {/* Safety Tips */}
              <div className="border rounded-xl p-6 background">
                <h3 className="text-lg font-semibold mb-4">Safety tips</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    It&apos;s safer not to pay ahead for inspections
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Ask friends or somebody you trust to accompany you for viewing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Look around the apartment to ensure it meets your expectations
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Don&apos;t pay beforehand if they won&apos;t let you move in immediately
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Verify that the account details belong to the right property owner before initiating payment
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Other Properties by Agent - Moved to bottom */}
        {agentListings?.length > 1 && (
          <div className="mt-16">
            <h2 className="text-2xl font-semibold mb-6">More Properties by {hostData.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {agentListings?.filter(l => l.id !== id).slice(0, 4).map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  galleryMode={true}
                  onLoginRequired={() => setIsLoginModalOpen(true)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Request Callback Button */}
        <button
          onClick={handleRequestCallback}
          className="fixed bottom-4 right-4 z-50 bg-primary text-white px-6 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors md:hidden"
        >
          Request Callback
        </button>

        {/* Login Modal */}
        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
      </div>
    </div>
  );
} 