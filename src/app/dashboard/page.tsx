'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/lib/userProfile';
import { getUserListings } from '@/lib/listings';
import { getUserBalance } from '@/lib/transactions';
import { 
  HomeIcon, 
  BellIcon,
  EnvelopeIcon,
  UserCircleIcon,
  BanknotesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import RouteGuard from '@/components/RouteGuard';
import AgentProfileCard from '@/components/AgentProfileCard';

interface DashboardStats {
  totalListings: number;
  totalReviews: number;
  averageRating: number;
  balance: number;
  profileCompletion: number;
  unreadMessages: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    totalReviews: 0,
    averageRating: 0,
    balance: 0,
    profileCompletion: 0,
    unreadMessages: 0,
  });
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [agentData, setAgentData] = useState({
    id: '',
    name: '',
    image: '/default-avatar.svg',
    bannerURL: '/default-banner.svg',
    rating: 0,
    reviews: 0,
    experience: 0,
    phone: '',
    specialties: [],
    description: '',
    isVerified: false,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        // Load listings
        const listings = await getUserListings(user.uid);
        const totalReviews = listings.reduce((sum, listing) => sum + (listing.reviews || 0), 0);
        const totalRating = listings.reduce((sum, listing) => sum + (listing.rating || 0), 0);
        const averageRating = listings.length > 0 ? totalRating / listings.length : 0;

        // Load balance
        const balanceData = await getUserBalance(user.uid);

        // Load profile completion and agent profile
        const profile = await getUserProfile(user.uid);
        const totalFields = 6; // Total number of profile fields we track
        const completedFields = profile ? Object.values(profile).filter(Boolean).length : 0;
        const completionPercentage = Math.round((completedFields / totalFields) * 100);

        setStats({
          totalListings: listings.length,
          totalReviews,
          averageRating: Number(averageRating.toFixed(1)),
          balance: balanceData.currentBalance,
          profileCompletion: completionPercentage,
          unreadMessages: 0,
        });

        // Update agent data if profile exists
        if (profile) {
          setAgentData({
            id: user.uid,
            name: profile.username || user.displayName || '',
            image: profile.photoURL || '/default-avatar.svg',
            bannerURL: profile.bannerURL || '/default-banner.svg',
            rating: stats.averageRating,
            reviews: stats.totalReviews,
            experience: 0,
            phone: profile.phone || '',
            specialties: [],
            description: '',
            isVerified: profile.idVerificationStatus === 'approved',
          });
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
  }, [user, stats.averageRating, stats.totalReviews]);

  const notifications = [
    {
      id: 1,
      title: 'New Lead',
      message: 'Someone is interested in your Beach House property',
      time: '5m ago',
    },
    {
      id: 2,
      title: 'Listing Approved',
      message: 'Your new listing has been approved',
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
    <RouteGuard requireUserType="provider">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Listings Overview */}
          <Link 
            href="/my-listings"
            className="p-6 rounded-xl border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Listings Overview</h2>
              <HomeIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Listings</p>
                <p className="text-2xl font-semibold">{stats.totalListings}</p>
              </div>
              {/* Removed Reviews Section */}
              {/* <div>
                <p className="text-sm text-muted-foreground">Reviews</p>
                <p className="text-2xl font-semibold">{stats.totalReviews}</p>
              </div> */}
              {/* Removed Ratings Section */}
              {/* <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-semibold">{stats.averageRating}</p>
                  <StarIcon className="h-5 w-5 text-yellow-400" />
                </div>
              </div> */}
            </div>
          </Link>

          {/* Account Balance */}
          <Link 
            href="/account/balance"
            className="p-6 rounded-xl border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Account Balance</h2>
              <BanknotesIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-semibold">
                GH₵ {stats.balance.toLocaleString()}
              </p>
            </div>
          </Link>

          {/* Profile Completion */}
          <Link 
            href="/account"
            className="p-6 rounded-xl border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Profile Completion</h2>
              <UserCircleIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-medium">{stats.profileCompletion}%</span>
              </div>
              <div className="h-2 bg-accent rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${stats.profileCompletion}%` }}
                />
              </div>
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
        </div>

        {/* Agent Profile Card */}
        <div className="mt-8 col-span-12 md:col-span-8">
          <h2 className="text-xl font-semibold mb-6">Profile</h2>
          <AgentProfileCard 
            host={agentData}
            showViewProfile={false}
            fullWidth={true}
            isDashboard={true}
          />
        </div>
      </main>
    </RouteGuard>
  );
} 