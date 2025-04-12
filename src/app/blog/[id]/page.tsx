'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarIcon, TagIcon, ClockIcon } from '@heroicons/react/24/outline';
import AdDisplay from '@/components/AdDisplay';

// Simple markdown renderer helper functions
const renderMarkdown = (text: string) => {
  // Convert headings
  text = text.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-4 mt-6">$1</h1>');
  text = text.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mb-3 mt-5">$1</h2>');
  text = text.replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mb-2 mt-4">$1</h3>');
  
  // Convert bold and italic
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert lists
  text = text.replace(/^\- (.*$)/gm, '<li class="ml-4">$1</li>');
  text = text.replace(/(<li.*<\/li>)\n(?!<li)/g, '<ul class="list-disc mb-4">$1</ul>');
  
  // Convert paragraphs (must be after lists)
  text = text.replace(/^(?!<[hou])(.+)$/gm, '<p class="mb-4">$1</p>');
  
  // Handle line breaks
  text = text.replace(/\n/g, '');
  
  return text;
};

interface BlogPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  contentType: 'article' | 'page';
  createdAt: { toDate?: () => Date } | string;
  updatedAt: { toDate?: () => Date } | string;
}

// Related post card component
const RelatedPostCard = ({ post }: { post: BlogPost }) => {
  return (
    <div className="flex gap-3 mb-4 group">
      {post.imageUrl ? (
        <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="w-20 h-20 bg-gray-200 flex-shrink-0 rounded-md flex items-center justify-center">
          <span className="text-gray-500 text-xs">No image</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium line-clamp-2 text-sm group-hover:text-primary">
          <Link href={`/blog/${post.id}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        {post.createdAt && (
          <div className="mt-1 flex items-center text-xs text-muted-foreground">
            <ClockIcon className="w-3 h-3 mr-1" />
            <span>
              {typeof post.createdAt !== 'string' && post.createdAt.toDate ? post.createdAt.toDate().toLocaleDateString() : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogPostPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [otherPosts, setOtherPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherPostsLoading, setOtherPostsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (id) {
      fetchBlogPost(id);
    }
  }, [id]);
  
  useEffect(() => {
    if (post) {
      fetchOtherArticles(post.id);
    }
  }, [post]);
  
  const fetchBlogPost = async (postId: string) => {
    try {
      const postRef = doc(db, 'blogPosts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        setPost({
          id: postSnap.id,
          ...postSnap.data()
        } as BlogPost);
      } else {
        setError('Blog post not found');
      }
    } catch (err) {
      console.error('Error fetching blog post:', err);
      setError('Failed to load blog post');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchOtherArticles = async (currentPostId: string) => {
    setOtherPostsLoading(true);
    try {
      // Get recent articles, making sure to exclude the current post
      const postsQuery = query(
        collection(db, 'blogPosts'),
        where('contentType', '==', 'article'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(postsQuery);
      const otherArticles = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as BlogPost)
        .filter(post => post.id !== currentPostId); // Filter out current post
      
      setOtherPosts(otherArticles.slice(0, 4)); // Show up to 4 other articles
    } catch (err) {
      console.error('Error fetching other articles:', err);
      // Just silently fail for other posts
    } finally {
      setOtherPostsLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="h-64 bg-gray-200 rounded mb-6"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
            </div>
            <div className="lg:w-1/3 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 mb-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-md"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-2xl font-semibold mb-4">
            {error || 'Blog post not found'}
          </h1>
          <Link 
            href="/blog" 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/blog" className="hover:text-foreground">
              Blog
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">
              {post.title}
            </span>
          </nav>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="lg:w-2/3">
            {/* Leaderboard Ad above blog title */}
            <div className="mb-6">
              <AdDisplay zone="blog-leaderboard" className="w-full" />
            </div>
            
            {/* Post header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                {post.category && (
                  <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {post.category}
                  </span>
                )}
                
                {post.createdAt && (
                  <span className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {typeof post.createdAt !== 'string' && post.createdAt.toDate ? post.createdAt.toDate().toLocaleDateString() : ''}
                  </span>
                )}
                
                {post.contentType && (
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    post.contentType === 'article' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {post.contentType}
                  </span>
                )}
              </div>
            </div>
            
            {/* Featured image */}
            {post.imageUrl && (
              <div className="mb-8 rounded-xl overflow-hidden">
                <div className="relative w-full aspect-video">
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            )}
            
            {/* Content */}
            <div 
              className="prose max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />
            
            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-2 mt-8 pt-4 border-t">
                <TagIcon className="w-5 h-5 text-muted-foreground" />
                {post.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${tag}`}
                    className="text-sm bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Sidebar with Other Articles */}
          <div className="lg:w-1/3">
            <div className="bg-gray-50 rounded-lg p-5 sticky top-8">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">
                Other Articles
              </h2>
              
              {otherPostsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 mb-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-md"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {otherPosts.length > 0 ? (
                    <div className="space-y-4">
                      {otherPosts.map(otherPost => (
                        <RelatedPostCard key={otherPost.id} post={otherPost} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No other articles found.
                    </p>
                  )}
                  
                  <div className="mt-6 pt-4 border-t">
                    <Link
                      href="/blog"
                      className="text-primary hover:underline inline-flex items-center text-sm"
                    >
                      View all articles
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 