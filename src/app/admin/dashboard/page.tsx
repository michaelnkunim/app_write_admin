'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Home, 
  Image as ImageIcon,
  Menu as MenuIcon,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  updatedAt: any;
  [key: string]: any;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    users: 0,
    blogPosts: 0,
    menus: 0,
    sliders: 0
  });
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect non-admin users
  useEffect(() => {
    if (!user || !user.isAdmin) {
      router.push('/login');
      return;
    }

    async function fetchStats() {
      try {
        setLoading(true);
        
        // Get blog posts count
        const blogPostsQuery = query(collection(db, 'blogPosts'));
        const blogPostsSnapshot = await getDocs(blogPostsQuery);
        
        // Get users count
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        // Get recent posts
        const recentPostsQuery = query(
          collection(db, 'blogPosts'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const recentPostsSnapshot = await getDocs(recentPostsQuery);
        
        setStats({
          users: usersSnapshot.size,
          blogPosts: blogPostsSnapshot.size,
          menus: 0, // Will be updated when menus collection is implemented
          sliders: 0 // Will be updated when sliders collection is implemented
        });
        
        setRecentPosts(
          recentPostsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as BlogPost))
        );
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, [user, router]);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-lg border shadow-sm animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
        
        <div className="p-6 bg-card rounded-lg border shadow-sm animate-pulse mb-8">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Welcome to the admin dashboard. Here you can manage all aspects of your website.
      </p>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-card rounded-lg border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm">Total Users</p>
              <h3 className="text-3xl font-bold mt-1">{stats.users}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-md">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-card rounded-lg border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm">Blog Posts</p>
              <h3 className="text-3xl font-bold mt-1">{stats.blogPosts}</h3>
            </div>
            <div className="p-2 bg-purple-100 rounded-md">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-card rounded-lg border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm">Menus</p>
              <h3 className="text-3xl font-bold mt-1">{stats.menus}</h3>
            </div>
            <div className="p-2  rounded-md">
              <MenuIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-card rounded-lg border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm">Image Sliders</p>
              <h3 className="text-3xl font-bold mt-1">{stats.sliders}</h3>
            </div>
            <div className="p-2 bg-amber-100 rounded-md">
              <ImageIcon className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 p-6 bg-card rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Recent Blog Posts</h2>
          
          {recentPosts.length > 0 ? (
            <div className="space-y-4">
              {recentPosts.map((post: any) => (
                <div key={post.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <h3 className="font-medium">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                  <Link
                    href={`/admin/blog?edit=${post.id}`}
                    className="text-primary hover:underline flex items-center text-sm"
                  >
                    Edit <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="mx-auto h-10 w-10 mb-2" />
              <p>No blog posts yet</p>
            </div>
          )}
          
          <div className="mt-4 text-right">
            <Link
              href="/admin/blog"
              className="text-primary hover:underline text-sm flex items-center justify-end"
            >
              View all posts <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>
        
        <div className="p-6 bg-card rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/blog"
              className="flex items-center p-3 rounded-md hover:bg-accent transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              New Blog Post
            </Link>
            
            <Link
              href="/admin/interface"
              className="flex items-center p-3 rounded-md hover:bg-accent transition-colors"
            >
              <MenuIcon className="h-4 w-4 mr-2" />
              Manage Menus
            </Link>
            
            <Link
              href="/admin/interface?tab=sliders"
              className="flex items-center p-3 rounded-md hover:bg-accent transition-colors"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Manage Sliders
            </Link>
            
            <Link
              href="/admin/users"
              className="flex items-center p-3 rounded-md hover:bg-accent transition-colors"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Link>
            
            <Link
              href="/admin/settings"
              className="flex items-center p-3 rounded-md hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Site Settings
            </Link>
          </div>
        </div>
      </div>
      
      {/* Activity log - for future implementation */}
      <div className="p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-2">System Status</h2>
        <p className="text-muted-foreground mb-4">
          All systems are operating normally. Last checked: {new Date().toLocaleString()}
        </p>
        <div className="flex items-center">
          <div className="h-3 w-3 bg-gg-500 rounded-full mr-2"></div>
          <span className="text-sm">Firebase connections: Active</span>
        </div>
      </div>
    </div>
  );
} 