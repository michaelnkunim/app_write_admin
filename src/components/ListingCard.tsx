'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon, HeartIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useFavorites } from '@/context/FavoritesContext';
import { useAuth } from '@/context/AuthContext';
import { Listing } from '@/types/listing';
import styles from './ListingCard.module.css';

interface ListingCardProps {
  listing: Listing;
  galleryMode?: boolean;
  previewMode?: boolean;
  onLoginRequired?: () => void;
  onCommentClick?: (listing: Listing, e: React.MouseEvent) => void;
}

const ListingCard = memo(function ListingCard({ 
  listing, 
  galleryMode = false,
  previewMode = false,
  onLoginRequired,
  onCommentClick
}: ListingCardProps) {
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const images = listing.images || [listing.image];
  const isListingFavorite = user ? isFavorite(listing.id) : false;

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      onLoginRequired?.();
      return;
    }
    
    if (isListingFavorite) {
      removeFromFavorites(listing.id);
    } else {
      const { host, ...rest } = listing;
      const safeHost = {
        ...host,
        rating: host.rating || 0,
        reviews: host.reviews || 0,
        experience: host.experience || 0,
        phone: host.phone || '',
        specialties: host.specialties || [],
        description: host.description || ''
      };
      addToFavorites({ ...rest, host: safeHost });
    }
  }, [user, isListingFavorite, listing, addToFavorites, removeFromFavorites, onLoginRequired]);

  const nextImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const previousImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToImage = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setCurrentImageIndex(index);
  }, []);

  const handleCommentClick = (e: React.MouseEvent) => {
    if (onCommentClick && listing.commentCount && listing.commentCount > 0) {
      e.preventDefault();
      e.stopPropagation();
      onCommentClick(listing, e);
    }
  };

  return (
    <Link href={`/listing/${listing.id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          {galleryMode && images.length > 1 ? (
            <>
              <Image
                src={images[currentImageIndex]}
                alt={listing.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={styles.image}
                priority={false}
                loading="lazy"
              />
              <div className={styles.navigationContainer}>
                <button
                  onClick={previousImage}
                  className={styles.navigationButton}
                  aria-label="Previous image"
                >
                  <ChevronLeftIcon className={styles.navigationIcon} />
                </button>
                <button
                  onClick={nextImage}
                  className={styles.navigationButton}
                  aria-label="Next image"
                >
                  <ChevronRightIcon className={styles.navigationIcon} />
                </button>
              </div>
              <div className={styles.paginationContainer}>
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => goToImage(e, index)}
                    className={`${styles.paginationDot} ${
                      index === currentImageIndex ? styles.paginationDotActive : ''
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <Image
              src={listing.image}
              alt={listing.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={styles.image}
              priority={false}
              loading="lazy"
            />
          )}
          
          {!previewMode && (
            <button
              onClick={handleFavoriteClick}
              className={styles.favoriteButton}
              aria-label={isListingFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isListingFavorite ? (
                <HeartIconSolid className={styles.favoriteIconActive} />
              ) : (
                <HeartIcon className={styles.favoriteIcon} />
              )}
            </button>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.title}>
              {listing.title}
            </h3>
            <p className={styles.price}>
              ₵{listing.price.toLocaleString()}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              {listing.category[0]?.title}
            </span>
            
            {listing.commentCount && listing.commentCount > 0 && (
              <button 
                onClick={handleCommentClick}
                className="text-sm flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="h-3 w-3" />
                {listing.commentCount > 99 ? '99+' : listing.commentCount}
              </button>
            )}
          </div>
          
          <p className={styles.location}>
            {listing.location}
          </p>
          
          {listing.category[0]?.key === 'short-stay' && listing.rating !== undefined && listing.reviews !== undefined && (
            <div className={styles.footer}>
              <span className={styles.rating}>
                ★ {listing.rating.toFixed(1)}
              </span>
              <span className={styles.separator}>•</span>
              <span className={styles.reviews}>{listing.reviews.toLocaleString()} reviews</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});

export default ListingCard; 