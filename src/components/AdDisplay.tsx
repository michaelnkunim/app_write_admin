'use client';

import { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppSettings, AdItem, AdType } from '@/context/AppSettingsContext';

interface AdDisplayProps {
  zone: string;
  className?: string;
  limit?: number;
}

const AdDisplay = memo(function AdDisplay({ zone, className = '', limit }: AdDisplayProps) {
  const { getAdsForZone, loading: contextLoading, registerAdZone } = useAppSettings();
  const [ads, setAds] = useState<AdItem[]>([]);
  
  useEffect(() => {
    // Get ads for the specified zone
    const zoneAds = getAdsForZone(zone);
    // Apply limit if specified
    const limitedAds = limit ? zoneAds.slice(0, limit) : zoneAds;
    setAds(limitedAds);
    
    // Register this zone for admin interface
    registerAdZone(zone);
  }, [zone, getAdsForZone, limit, registerAdZone]);
  
  // Show nothing while loading or if no ads available
  if (contextLoading || ads.length === 0) {
    return null;
  }
  
  return (
    <div className={className}>
      {ads.map((ad) => (
        <div key={ad.id} className="mb-4">
          <Link 
            href={ad.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {ad.type === AdType.TEXT ? (
              <div className="border rounded p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="text-primary font-medium mb-1">{ad.title}</div>
                <div className="text-sm text-gray-700">{ad.content}</div>
                <div className="text-xs text-gray-500 mt-2">Ad</div>
              </div>
            ) : (
              <div className="relative">
                <div className="overflow-hidden rounded border">
                  {ad.imageUrl ? (
                    <Image
                      src={ad.imageUrl}
                      alt={ad.title}
                      width={500}
                      height={500}
                      className="w-full h-auto object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="bg-gray-100 p-8 flex items-center justify-center">
                      <span className="text-gray-400">Ad image not available</span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1 rounded">Ad</div>
              </div>
            )}
          </Link>
        </div>
      ))}
    </div>
  );
});

export default AdDisplay; 