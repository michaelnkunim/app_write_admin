'use client';

import { useState, useCallback, memo } from 'react';
import { categories, CategoryKey } from '@/data/categories';

interface SearchTabsProps {
  defaultCategory?: CategoryKey;
  onCategoryChange?: (category: CategoryKey) => void;
}

const SearchTabs = memo(function SearchTabs({ 
  defaultCategory = categories[0].key,
  onCategoryChange 
}: SearchTabsProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>(defaultCategory);

  const handleCategoryChange = useCallback((category: CategoryKey) => {
    setSelectedCategory(category);
    onCategoryChange?.(category);
  }, [onCategoryChange]);

  return (
    <div 
      className="w-full tabs-container"
      role="tablist"
      aria-label="Search categories"
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => handleCategoryChange(category.key)}
              className={`relative px-4 py-4 text-sm font-medium transition-all ${
                selectedCategory === category.key
                  ? 'text-primary bg-primary/10 rounded-lg'
                  : 'text-foreground/60 hover:text-foreground hover:bg-accent/50 rounded-lg'
              }`}
              role="tab"
              aria-selected={selectedCategory === category.key}
              aria-controls={`${category.key}-panel`}
              id={`${category.key}-tab`}
            >
              {category.title}
              {selectedCategory === category.key && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default SearchTabs; 