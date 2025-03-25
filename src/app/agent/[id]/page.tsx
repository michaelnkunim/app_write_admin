'use client';

import AgentProfileCard from '@/components/AgentProfileCard';
import ListingCard from '@/components/ListingCard';
import LoginModal from '@/components/LoginModal';
import { useState, use, useEffect } from 'react';
import { getUserProfile } from '@/lib/userProfile';
import { getUserListings } from '@/lib/listings';
import { Listing } from '@/types/listing';
import { UserProfile } from '@/lib/userProfile';

interface PageParams {
  id: string;
}

export default function AgentPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        // Fetch agent profile
        const agentProfile = await getUserProfile(id);
        if (!agentProfile) {
          setLoading(false);
          return;
        }
        setAgent(agentProfile);

        // Fetch agent's listings
        const agentListings = await getUserListings(id);
        setListings(agentListings);
      } catch (error) {
        console.error('Error fetching agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-xl mb-8"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Agent not found</h1>
          <p className="text-muted-foreground mt-2">The agent profile you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Format agent data for AgentProfileCard
  const hostData = {
    id: id,
    name: agent.businessName || agent.username,
    businessName: agent.businessName,
    image: agent.photoURL || '/default-avatar.svg',
    bannerURL: agent.bannerURL || '/default-banner.svg',
    rating: 0, // Add these fields to UserProfile if needed
    reviews: 0,
    experience: 0,
    phone: agent.phone || '',
    specialties: [],
    description: '',
    isVerified: agent.idVerificationStatus === 'approved'
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Agent Profile */}
      <AgentProfileCard 
        host={hostData} 
        showViewProfile={false}
        fullWidth={true}
      />

      {/* Agent's Listings */}
      {listings.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Properties Listed by {hostData.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
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

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
} 