'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { 
  HeartIcon,
  BellIcon,
  EnvelopeIcon,
  HomeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import RouteGuard from '@/components/RouteGuard';
import ListingCard from '@/components/ListingCard';
import { Loader2 } from 'lucide-react';

interface DashboardStats {
  totalFavorites: number;
  unreadMessages: number;
  recentViews: number;
  savedSearches: number;
}

export default function SeekerDashboardPage() {
  const { user } = useAuth();
  const { favorites, loading } = useFavorites();
  const [stats, setStats] = useState<DashboardStats>({
    totalFavorites: 0,
    unreadMessages: 0,
    recentViews: 0,
    savedSearches: 0,
  });
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setStats({
          totalFavorites: favorites.length,
          unreadMessages: 0, // To be implemented with real messaging system
          recentViews: 0, // To be implemented with view tracking
          savedSearches: 0, // To be implemented with search saving feature
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
  }, [user, favorites.length]);

  const notifications = [
    {
      id: 1,
      title: 'Price Drop Alert',
      message: 'A property in your favorites has reduced its price',
      time: '5m ago',
    },
    {
      id: 2,
      title: 'New Match',
      message: 'New property matching your saved search criteria',
      time: '1h ago',
    },
  ];

  const handleNext = () => {
    if (currentNotificationIndex < notifications.length - 1) {
      setCurrentNotificationIndex(currentNotificationIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentNotificationIndex > 0) {
      setCurrentNotificationIndex(currentNotificationIndex - 1);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <RouteGuard requireUserType="seeker">
      <main className="container mx-auto px-4 py-8">
        {/* Notifications */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-6 background border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <BellIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="mt-2 space-y-2">
            {notifications.length > 0 && (
              <div
                key={notifications[currentNotificationIndex].id}
                className="p-4 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={toggleExpand}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{notifications[currentNotificationIndex].title}</h3>
                    {isExpanded && (
                      <p className="text-sm text-muted-foreground">{notifications[currentNotificationIndex].message}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{notifications[currentNotificationIndex].time}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between mt-4">
            <button 
              onClick={handlePrevious} 
              disabled={currentNotificationIndex === 0} 
              className="px-3 py-2 border border-primary text-primary rounded-full disabled:opacity-50 transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={handleNext} 
              disabled={currentNotificationIndex === notifications.length - 1} 
              className="px-3 py-2 border border-primary text-primary rounded-full disabled:opacity-50 transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Favorites Overview */}
          <Link 
            href="/favorites"
            className="p-6 rounded-xl border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Favorites</h2>
              <HeartIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saved Properties</p>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <p className="text-2xl font-semibold">{stats.totalFavorites}</p>
              )}
            </div>
          </Link>

          {/* Recent Views */}
          <Link 
            href="/recent-views"
            className="p-6 rounded-xl border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Views</h2>
              <HomeIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Properties Viewed</p>
              <p className="text-2xl font-semibold">{stats.recentViews}</p>
            </div>
          </Link>

          {/* Messages Preview */}
          <Link 
            href="/messages"
            className="p-6 rounded-xl border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Messages</h2>
              <EnvelopeIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Unread Messages</p>
                <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  {stats.unreadMessages}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.unreadMessages > 0 
                  ? `You have ${stats.unreadMessages} unread messages`
                  : 'No new messages'}
              </p>
            </div>
          </Link>

          {/* Saved Searches */}
          <Link 
            href="/saved-searches"
            className="p-6 rounded-xl border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Saved Searches</h2>
              <BellIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p className="text-2xl font-semibold">{stats.savedSearches}</p>
            </div>
          </Link>
        </div>

        {/* Favorite Properties */}
        {loading ? (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-6">My Favorites</h2>
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading your favorites...</p>
            </div>
          </div>
        ) : favorites.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">My Favorites</h2>
              <Link 
                href="/favorites"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {favorites.slice(0, 4).map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing}
                  galleryMode={true}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </RouteGuard>
  );
} 