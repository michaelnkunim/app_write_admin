'use client';

import { memo, useEffect, useState } from 'react';
import { useAppSettings, AdItem, AdType } from '@/context/AppSettingsContext';
import Link from 'next/link';
import Image from 'next/image';

/**
 * HeaderAd - A component for displaying banner-style ads in the header section
 * 
 * This component is designed specifically for header ads, which are typically
 * banner-style ads that span the full width of the page. It selects one random
 * active ad from the "header" zone for display.
 */
const HeaderAd = memo(function HeaderAd() {
  const { getAdsForZone, loading: contextLoading } = useAppSettings();
  const [headerAd, setHeaderAd] = useState<AdItem | null>(null);
  
  useEffect(() => {
    // Get ads for the header zone
    const headerAds = getAdsForZone('header');
    
    // If there are active ads, select one at random
    if (headerAds.length > 0) {
      const randomIndex = Math.floor(Math.random() * headerAds.length);
      setHeaderAd(headerAds[randomIndex]);
    } else {
      setHeaderAd(null);
    }
  }, [getAdsForZone]);
  
  // Show nothing while loading or if no ads available
  if (contextLoading || !headerAd) {
    return null;
  }
  
  return (
    <div className="w-full bg-gray-50 py-2 border-b">
      <div className="container mx-auto px-4">
        <Link 
          href={headerAd.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {headerAd.type === AdType.TEXT ? (
            <div className="flex items-center justify-center py-2 text-center">
              <div className="text-primary font-medium mr-2">{headerAd.title}:</div>
              <div className="text-sm text-gray-700">{headerAd.content}</div>
              <div className="text-xs text-gray-500 ml-4 px-1 border rounded">Ad</div>
            </div>
          ) : (
            <div className="flex justify-center items-center relative py-1">
              {headerAd.imageUrl ? (
                <div className="relative">
                  <Image
                    src={headerAd.imageUrl}
                    alt={headerAd.title}
                    width={728}
                    height={90}
                    className="h-auto object-contain"
                    unoptimized
                  />
                  <div className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1 rounded">Ad</div>
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded flex items-center justify-center w-full max-w-screen-md">
                  <span className="text-gray-400">Ad banner</span>
                  <div className="absolute right-2 text-xs bg-black/60 text-white px-1 rounded">Ad</div>
                </div>
              )}
            </div>
          )}
        </Link>
      </div>
    </div>
  );
});

export default HeaderAd; 