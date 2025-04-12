'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, ChevronLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchIndex } from '@/lib/algolia';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';

interface SearchResultsPopupProps {
  onClose: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

interface SearchResult {
  objectID: string;
  title: string;
  description: string;
  price: number;
  image: string;
  location: string;
  category: Array<{title: string}>;
}

export default function SearchResultsPopup({ 
  onClose, 
  searchValue, 
  onSearchChange 
}: SearchResultsPopupProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { labels } = useLanguage();

  useEffect(() => {
    // Focus the input when the component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Only search if there's an actual search term
    if (searchValue.trim().length === 0) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      setLoading(true);
      searchIndex.search(searchValue).then(({ hits }) => {
        setResults(hits as SearchResult[]);
        setLoading(false);
      }).catch(error => {
        console.error('Search error:', error);
        setLoading(false);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-x-0 top-0 z-50 background border-b shadow-md">
        <div className="relative container mx-auto p-4">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 md:left-6 p-2 rounded-full hover:bg-accent"
            aria-label={labels.shared.CLOSE}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          {/* Search input */}
          <div className="flex flex-col px-4 md:px-0">
            <div className="flex items-center mx-auto w-full max-w-3xl">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={labels.homePage.SEARCH_PLACEHOLDER}
                  className="w-full pl-14 pr-4 py-3 text-lg border outline-none rounded-lg background"
                />
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-500" />
                {searchValue && (
                  <button 
                    onClick={() => {
                      onSearchChange('');
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-accent"
                    aria-label={labels.shared.CLOSE}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Recent searches */}
            {!searchValue && (
              <div className="mt-6 max-w-3xl mx-auto w-full">
                <h3 className="text-lg font-medium mb-4">{labels.shared.RECENT_SEARCHES}</h3>
                {/* Recent searches content would go here */}
              </div>
            )}
            
            {/* Search results */}
            {searchValue && (
              <div className="mt-6 max-w-3xl mx-auto w-full pb-6">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    {labels.shared.NO_RESULTS}
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-4">{labels.shared.SEARCH_RESULTS}</h3>
                    <ul className="space-y-2">
                      {results.map((hit) => (
                        <li
                          key={hit.objectID}
                          onClick={() => {
                            router.push(`/listing/${hit.objectID}`);
                            onClose();
                          }}
                          className="flex items-center space-x-4 p-2 rounded-lg cursor-pointer hover:bg-accent/80"
                        >
                          <Image
                            src={hit.image}
                            alt={hit.title}
                            className="object-cover rounded-lg"
                            width={48}
                            height={48}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {hit.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">{hit.location}</p>
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="font-medium text-primary">
                                ₵{hit.price.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{hit.category[0]?.title || ''}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 