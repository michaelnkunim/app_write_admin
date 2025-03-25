'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarIcon, ArrowRightIcon, TagIcon } from '@heroicons/react/24/outline';
import AdDisplay from '@/components/AdDisplay';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  contentType: 'article' | 'page';
  createdAt: any;
  updatedAt: any;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  
  const POSTS_PER_PAGE = 6;
  
  useEffect(() => {
    fetchPosts();
    fetchCategoriesAndTags();
  }, [activeCategory, activeTag]);
  
  const fetchCategoriesAndTags = async () => {
    try {
      const postsRef = collection(db, 'blogPosts');
      const postsSnap = await getDocs(query(
        postsRef, 
        where('contentType', '==', 'article')
      ));
      
      const allCategories = new Set<string>();
      const tagCounts: Record<string, number> = {};
      
      postsSnap.forEach(doc => {
        const data = doc.data();
        if (data.category) allCategories.add(data.category);
        
        if (data.tags && Array.isArray(data.tags)) {
          data.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      
      setCategories(Array.from(allCategories));
      
      // Get top 10 tags
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]);
        
      setPopularTags(sortedTags);
    } catch (err) {
      console.error('Error fetching categories and tags:', err);
    }
  };
  
  const fetchPosts = async (loadMore = false) => {
    try {
      setLoading(true);
      
      let postsQuery = query(
        collection(db, 'blogPosts'),
        where('contentType', '==', 'article'),
        orderBy('createdAt', 'desc'),
        limit(POSTS_PER_PAGE)
      );
      
      // Apply category filter if active
      if (activeCategory) {
        postsQuery = query(
          collection(db, 'blogPosts'),
          where('contentType', '==', 'article'),
          where('category', '==', activeCategory),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE)
        );
      }
      
      // If we're loading more, start after the last document
      if (loadMore && lastVisible) {
        postsQuery = query(
          collection(db, 'blogPosts'),
          where('contentType', '==', 'article'),
          ...(activeCategory ? [where('category', '==', activeCategory)] : []),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(POSTS_PER_PAGE)
        );
      } else if (!loadMore) {
        // Reset posts when not loading more
        setPosts([]);
      }
      
      const querySnapshot = await getDocs(postsQuery);
      
      // Update the last visible document for pagination
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc || null);
      
      // Check if there are more posts to load
      setHasMore(querySnapshot.docs.length === POSTS_PER_PAGE);
      
      const newPosts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
      
      // Filter by tag if needed (client-side filtering for tags)
      const filteredPosts = activeTag 
        ? newPosts.filter(post => post.tags && post.tags.includes(activeTag))
        : newPosts;
      
      setPosts(prev => loadMore ? [...prev, ...filteredPosts] : filteredPosts);
    } catch (err) {
      console.error('Error fetching blog posts:', err);
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = () => {
    if (hasMore && !loading) {
      fetchPosts(true);
    }
  };
  
  const clearFilters = () => {
    setActiveCategory(null);
    setActiveTag(null);
  };
  
  // Extract a short excerpt from content
  const getExcerpt = (content: string, maxLength = 150) => {
    // Remove markdown formatting
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Remove headings
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/^\- /gm, ''); // Remove list items
      
    if (plainText.length <= maxLength) return plainText;
    
    return plainText.substring(0, maxLength) + '...';
  };
  
  return (
    <div className="container mx-auto px-2 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Leaderboard Ad above blog listing */}
        <div className="mb-6">
          <AdDisplay zone="blog-listing-leaderboard" className="w-full" />
        </div>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Blog</h1>
          <p className="text-muted-foreground">
            Latest articles, insights, and updates
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar with filters */}
          <div className="w-full lg:w-1/5 order-2 lg:order-1">
            <div className="sticky top-8">
              <div className="bg-gray-50 rounded-lg p-5 mb-6">
                <h2 className="font-semibold text-lg mb-4">Categories</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`block w-full text-left px-3 py-2 rounded ${
                      activeCategory === null 
                        ? 'bg-primary text-white' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    All Categories
                  </button>
                  
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`block w-full text-left px-3 py-2 rounded ${
                        activeCategory === category 
                          ? 'bg-primary text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              
              {popularTags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-5">
                  <h2 className="font-semibold text-lg mb-4">Popular Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                        className={`text-sm px-3 py-1 rounded-full ${
                          activeTag === tag 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {(activeCategory || activeTag) && (
                <div className="mt-6">
                  <button
                    onClick={clearFilters}
                    className="text-primary hover:underline flex items-center"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Main content */}
          <div className="w-full lg:w-4/5 order-1 lg:order-2">
            {/* Active filters */}
            {(activeCategory || activeTag) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-sm font-medium mb-2">Active filters:</h2>
                <div className="flex flex-wrap gap-2">
                  {activeCategory && (
                    <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      Category: {activeCategory}
                      <button 
                        onClick={() => setActiveCategory(null)} 
                        className="ml-2 text-primary hover:text-primary/70"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  
                  {activeTag && (
                    <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      Tag: {activeTag}
                      <button 
                        onClick={() => setActiveTag(null)} 
                        className="ml-2 text-primary hover:text-primary/70"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Posts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 auto-rows-fr">
              {posts.map(post => (
                <article key={post.id} className="flex flex-col bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full">
                  <Link href={`/blog/${post.id}`} className="block">
                    {post.imageUrl ? (
                      <div className="relative w-full aspect-[16/9] flex-shrink-0 group">
                        <Image
                          src={post.imageUrl}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[16/9] bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-500">No image</span>
                      </div>
                    )}
                  </Link>
                  
                  <div className="flex flex-col flex-1 p-5 justify-between">
                    <div>
                      <div className="flex items-center mb-3 justify-between">
                        {post.category && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {post.category}
                          </span>
                        )}
                        
                        {post.createdAt && (
                          <span className="text-xs text-muted-foreground flex items-center">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {post.createdAt.toDate ? post.createdAt.toDate().toLocaleDateString() : ''}
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-xl font-semibold hover:text-primary mb-2">
                        <Link href={`/blog/${post.id}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </h2>
                    </div>
                    
                    <div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded">
                              <TagIcon className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded">
                              +{post.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <Link 
                        href={`/blog/${post.id}`}
                        className="inline-flex items-center text-primary hover:underline group"
                      >
                        Read more 
                        <ArrowRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            
            {/* Loading state */}
            {loading && !posts.length && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 auto-rows-fr">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-lg shadow-sm overflow-hidden h-full">
                    <div className="w-full aspect-[16/9] bg-gray-200 flex-shrink-0" />
                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex justify-between mb-3">
                          <div className="h-4 bg-gray-200 rounded w-1/4" />
                          <div className="h-4 bg-gray-200 rounded w-1/5" />
                        </div>
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-1" />
                        <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
                      </div>
                      <div>
                        <div className="flex gap-1 mb-3">
                          <div className="h-4 bg-gray-200 rounded w-12" />
                          <div className="h-4 bg-gray-200 rounded w-12" />
                          <div className="h-4 bg-gray-200 rounded w-12" />
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* No posts state */}
            {!loading && posts.length === 0 && (
              <div className="py-12 text-center">
                <h3 className="text-xl font-medium mb-2">No blog posts found</h3>
                <p className="text-muted-foreground mb-6">
                  {activeCategory || activeTag 
                    ? 'Try changing your filters or check back later' 
                    : 'Check back later for new content'}
                </p>
                
                {(activeCategory || activeTag) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
            
            {/* Load more button */}
            {hasMore && posts.length > 0 && (
              <div className="text-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More Posts'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 