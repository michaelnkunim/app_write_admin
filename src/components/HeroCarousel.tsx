'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ImageIcon } from 'lucide-react';
import { useAppSettings, CarouselImage } from '@/context/AppSettingsContext';

const AUTOPLAY_INTERVAL = 5000;

interface HeroCarouselProps {
  zone?: string;
  images?: CarouselImage[];
}

const HeroCarousel = memo(function HeroCarousel({ zone = 'homepage', images }: HeroCarouselProps) {
  const { getCarouselImagesForZone, loading: contextLoading } = useAppSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slides, setSlides] = useState<CarouselImage[]>(images || []);
  
  // Use images from context or props
  useEffect(() => {
    if (images && images.length > 0) {
      // If images are provided as props, use them
      setSlides(images);
    } else if (zone) {
      // Otherwise, get images from context based on zone
      const zoneImages = getCarouselImagesForZone(zone);
      setSlides(zoneImages);
    }
  }, [zone, images, getCarouselImagesForZone]);

  useEffect(() => {
    if (!isAutoPlaying || slides.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [isAutoPlaying, slides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  }, []);

  const previousSlide = useCallback(() => {
    if (slides.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  }, [slides.length]);

  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  }, [slides.length]);

  const handleMouseEnter = useCallback(() => {
    setIsAutoPlaying(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsAutoPlaying(true);
  }, []);

  // Show loading state if context is still loading
  if (contextLoading && !images) {
    return (
      <div className="container mx-auto px-4 mt-8">
        <div className="h-[400px] w-full rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-300 mb-4 animate-pulse"></div>
            <div className="h-8 w-64 bg-gray-300 mb-4 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show minimal placeholder if no slides are available
  if (slides.length === 0) {
    return (
      <div className="container mx-auto px-4 mt-8">
        <div className="relative h-[400px] w-full overflow-hidden rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-500 mb-2">Find Your Dream Home</h2>
            <p className="text-xl text-gray-400">Discover your perfect place</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 mt-8">
      <div 
        className="relative h-[400px] w-full overflow-hidden rounded-xl"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="region"
        aria-label="Image carousel"
      >
        {/* Images */}
        {slides.map((image, index) => (
          <div
            key={image.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              currentIndex === index ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={currentIndex !== index}
          >
            <Image
              src={image.url}
              alt={image.alt || image.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1400px"
              className="object-cover"
              priority={index === 0}
              loading={index === 0 ? 'eager' : 'lazy'}
              quality={90}
            />
            <div className="absolute inset-0 bg-black/30" />
            
            {/* Add link if available */}
            {image.link && (
              <a 
                href={image.link} 
                className="absolute inset-0 z-10"
                aria-label={`Go to ${image.title}`}
              />
            )}
          </div>
        ))}

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 pointer-events-none">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-center px-4">
            {slides[currentIndex]?.title}
          </h1>
          <p className="text-xl md:text-2xl text-center px-4">
            Discover your perfect place
          </p>
        </div>

        {/* Navigation Arrows - Only show if there are multiple slides */}
        {slides.length > 1 && (
          <>
            <button
              onClick={previousSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-lg z-30"
              aria-label="Previous slide"
            >
              <ChevronLeftIcon className="h-6 w-6 text-gray-800" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-lg z-30"
              aria-label="Next slide"
            >
              <ChevronRightIcon className="h-6 w-6 text-gray-800" />
            </button>

            {/* Pagination Dots */}
            <div 
              className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30"
              role="tablist"
              aria-label="Carousel navigation"
            >
              {slides.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default HeroCarousel; 