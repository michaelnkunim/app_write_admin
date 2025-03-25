'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarIcon, ArrowRightIcon, TagIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

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

export default function TagPage() {
  const params = useParams();
  const router = useRouter();
  const tagName = params.tag as string;
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (tagName) {
      fetchPostsByTag(tagName);
    }
  }, [tagName]);
  
  const fetchPostsByTag = async (tag: string) => {
    try {
      setLoading(true);
      
      // First, we need to get all blog posts
      const postsRef = collection(db, 'blogPosts');
      const postsQuery = query(
        postsRef,
        where('contentType', '==', 'article'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(postsQuery);
      
      // Then, we filter by tag on the client side
      // (Firestore doesn't support array-contains with OR conditions for multiple values)
      const filteredPosts = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as BlogPost)
        .filter(post => post.tags && post.tags.includes(tag));
      
      setPosts(filteredPosts);
    } catch (err) {
      console.error('Error fetching posts by tag:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header & navigation */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/blog')}
            className="flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to all posts
          </button>
          
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <TagIcon className="w-6 h-6 mr-2" />
            Posts tagged: <span className="ml-2 text-primary">{decodeURIComponent(tagName)}</span>
          </h1>
          
          <p className="text-muted-foreground">
            Showing all articles with the tag &quot;{decodeURIComponent(tagName)}&quot;
          </p>
        </div>
        
        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="h-48 bg-gray-200" />
                <div className="p-5">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* No posts state */}
        {!loading && posts.length === 0 && (
          <div className="py-12 text-center">
            <h3 className="text-xl font-medium mb-2">No posts found with this tag</h3>
            <p className="text-muted-foreground mb-6">
              Try checking other tags or browse all our blog posts
            </p>
            
            <Link
              href="/blog"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              View All Posts
            </Link>
          </div>
        )}
        
        {/* Posts grid */}
        {!loading && posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <article key={post.id} className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
                {post.imageUrl ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No image</span>
                  </div>
                )}
                
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-3">
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
                  
                  <h2 className="text-xl font-semibold mb-2 hover:text-primary">
                    <Link href={`/blog/${post.id}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  
                  <p className="text-muted-foreground mb-4">
                    {getExcerpt(post.content)}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t">
                    <div className="flex mb-3 flex-wrap gap-1">
                      {post.tags
                        .filter(tag => tag !== tagName)
                        .slice(0, 3)
                        .map(tag => (
                          <Link
                            key={tag}
                            href={`/blog/tag/${tag}`}
                            className="text-xs bg-gray-100 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            {tag}
                          </Link>
                        ))}
                        
                      {post.tags.length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{post.tags.length - 4} more
                        </span>
                      )}
                    </div>
                    
                    <Link 
                      href={`/blog/${post.id}`}
                      className="inline-flex items-center text-primary hover:underline"
                    >
                      Read more 
                      <ArrowRightIcon className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 