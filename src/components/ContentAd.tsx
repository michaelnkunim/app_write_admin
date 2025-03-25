'use client';

import { memo } from 'react';
import AdDisplay from './AdDisplay';

interface ContentAdProps {
  className?: string;
}

/**
 * ContentAd - A component for displaying ads within article or blog content
 * 
 * This component wraps the AdDisplay component with appropriate styling
 * for in-content ad placements. It shows ads from the "content" zone
 * and limits to 1 ad by default to avoid cluttering the content.
 */
const ContentAd = memo(function ContentAd({ className = '' }: ContentAdProps) {
  return (
    <div className={`my-8 ${className}`}>
      <div className="max-w-2xl mx-auto">
        <div className="border-t border-b py-4">
          <AdDisplay zone="content" limit={1} />
        </div>
      </div>
    </div>
  );
});

export default ContentAd; 