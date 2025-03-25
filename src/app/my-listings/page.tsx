'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import PromoteModal from '@/components/PromoteModal';
import ActionModal from '@/components/ActionModal';
import PreviewModal from '@/components/PreviewModal';
import AdDisplay from '@/components/AdDisplay';
import { 
  PencilIcon, 
  EllipsisHorizontalIcon,
  ChartBarIcon,
  EyeIcon,
  RocketLaunchIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid } from '@heroicons/react/24/solid';
import { Switch } from '@headlessui/react';
import RouteGuard from '@/components/RouteGuard';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Category } from '@/data/categories';

interface Listing {
  id: string;
  title: string;
  description: string;
  image: string;
  images: string[];
  price: number;
  location: string;
  category: Category[];
  status: 'active' | 'frozen' | 'taken';
  published: boolean;
  views: number;
  commentCount?: number;
  host: {
    id: string;
    name: string;
    image: string;
  };
  amenities: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function MyListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'taken'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchCommentCount = async (listingId: string) => {
    try {
      // Get the comments document for this listing
      const commentsDoc = await getDoc(doc(db, 'listingComments', listingId));
      
      if (commentsDoc.exists()) {
        const commentsData = commentsDoc.data();
        const commentsArray = commentsData.comments || [];
        return commentsArray.length;
      } else {
        return 0;
      }
    } catch (error) {
      console.error(`Error fetching comment count for listing ${listingId}:`, error);
      return 0;
    }
  };

  useEffect(() => {
    if (user) {
      loadListings();
    }
  }, [user]);

  useEffect(() => {
    let result = [...listings];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(listing => 
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(listing => listing.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === 'views') {
        return sortOrder === 'desc' ? b.views - a.views : a.views - b.views;
      }
      // Sort by title
      return sortOrder === 'desc' 
        ? b.title.localeCompare(a.title)
        : a.title.localeCompare(b.title);
    });

    setFilteredListings(result);
  }, [listings, searchQuery, statusFilter, sortBy, sortOrder]);

  const loadListings = async () => {
    try {
      if (!user) return;
      setIsLoading(true);

      const listingsRef = collection(db, 'listings');
      const q = query(listingsRef, where('host.id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const userListings = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const listing = {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          image: data.image || data.images?.[0] || '/default-listing.jpg',
          images: data.images || [],
          price: data.price || 0,
          location: data.location || '',
          category: data.category || 'For Sale',
          status: data.status || 'active',
          published: data.published ?? false,
          views: data.views || 0,
          host: {
            id: data.host?.id || user.uid,
            name: data.host?.name || user.displayName || '',
            image: data.host?.image || user.photoURL || '/default-avatar.svg'
          },
          amenities: data.amenities || [],
          coordinates: data.coordinates || { lat: 0, lng: 0 },
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        } as Listing;
        
        // Fetch comment count for each listing
        listing.commentCount = await fetchCommentCount(doc.id);
        
        return listing;
      }));

      setListings(userListings);
    } catch (error) {
      console.error('Error loading listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishToggle = async (id: string, currentState: boolean) => {
    try {
      await updateDoc(doc(db, 'listings', id), {
        published: !currentState,
        updatedAt: new Date().toISOString()
      });

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === id
            ? { ...listing, published: !currentState }
            : listing
        )
      );
      toast.success(currentState ? 'Listing unpublished' : 'Listing published');
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error('Failed to update listing status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'listings', id));
      setListings(prevListings => prevListings.filter(listing => listing.id !== id));
      toast.success('Listing deleted successfully');
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const handleFreeze = async (id: string) => {
    try {
      const listing = listings.find(l => l.id === id);
      if (!listing) return;

      const newStatus = listing.status === 'frozen' ? 'active' : 'frozen';
      await updateDoc(doc(db, 'listings', id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === id
            ? { ...listing, status: newStatus }
            : listing
        )
      );
      toast.success('Listing status updated');
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error('Failed to update listing status');
    }
  };

  const handleMarkAsTaken = async (id: string) => {
    try {
      const listing = listings.find(l => l.id === id);
      if (!listing) return;

      const newStatus = listing.status === 'taken' ? 'active' : 'taken';
      await updateDoc(doc(db, 'listings', id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === id
            ? { ...listing, status: newStatus }
            : listing
        )
      );
      toast.success('Listing status updated');
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error('Failed to update listing status');
    }
  };

  const openActionModal = (listing: Listing) => {
    setSelectedListing(listing);
    setIsActionModalOpen(true);
  };

  const openCommentModal = async (listing: Listing) => {
    if (!listing.commentCount || listing.commentCount === 0) {
      toast.info('No comments available for this listing');
      return;
    }
    
    setSelectedListing(listing);
    setIsCommentModalOpen(true);
    
    // Fetch comments for this listing
    setLoadingComments(true);
    try {
      const commentsDoc = await getDoc(doc(db, 'listingComments', listing.id));
      
      if (commentsDoc.exists()) {
        const commentsData = commentsDoc.data();
        const commentsArray = commentsData.comments || [];
        
        // Sort comments by createdAt in descending order (newest first)
        const sortedComments = [...commentsArray].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setComments(sortedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading listings...</p>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard requireUserType="provider">
      <div className="container mx-auto p-4">
        {/* Leaderboard Ad above my listings */}
        <div className="mb-6">
          <AdDisplay zone="my-listings-leaderboard" className="w-full" />
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">My Listings</h1>
          <p className="text-gray-600">Manage your real estate listings</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <Link
            href="/edit/new"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add New Listing
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-card rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search listings..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'frozen' | 'taken')}
                className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="taken">Taken</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'views' | 'title')}
                className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="date">Sort by Date</option>
                <option value="views">Sort by Views</option>
                <option value="title">Sort by Title</option>
              </select>
              <button
                onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <ArrowsUpDownIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4">Image</th>
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4">Published</th>
                  <th className="text-left p-4">Views</th>
                  <th className="text-left p-4">Comments</th>
                  <th className="text-left p-4">Promote</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedListings.map(listing => (
                  <tr key={listing.id} className="border-b border-border">
                    <td className="p-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <Image
                          src={listing.image}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <h3 className="font-medium">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground">{listing.location}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={listing.published}
                          onChange={() => handlePublishToggle(listing.id, listing.published)}
                          className={`${
                            listing.published ? 'bg-gg-500' : 'bg-gray-200'
                          } relative inline-flex h-6 w-14 items-center rounded-full transition-colors focus:outline-none`}
                        >
                          <span className="sr-only">Toggle published</span>
                          <span
                            className={`${
                              listing.published ? 'translate-x-8' : 'translate-x-1'
                            } inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform`}
                          >
                            {listing.published ? (
                              <CheckIcon className="h-3 w-3 text-green-500" />
                            ) : (
                              <XMarkIcon className="h-3 w-3 text-gray-400" />
                            )}
                          </span>
                          <span className={`absolute text-xs font-medium ${
                            listing.published ? 'left-2 text-white' : 'right-2 text-gray-500'
                          }`}>
                            {listing.published ? 'ON' : 'OFF'}
                          </span>
                        </Switch>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <ChartBarIcon className="w-4 h-4" />
                        <span>{listing.views}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => openCommentModal(listing)}
                        className={`flex items-center gap-1 transition-colors ${
                          listing.commentCount && listing.commentCount > 0 
                            ? 'text-purple-600 hover:text-purple-800'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        disabled={!listing.commentCount || listing.commentCount === 0}
                      >
                        <div className="relative">
                          {listing.commentCount && listing.commentCount > 0 ? (
                            <>
                              <ChatBubbleLeftRightIconSolid className="w-5 h-5" />
                              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {listing.commentCount > 9 ? '9+' : listing.commentCount}
                              </span>
                            </>
                          ) : (
                            <ChatBubbleLeftRightIcon className="w-5 h-5" />
                          )}
                        </div>
                        <span className="ml-1">Comments</span>
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => {
                          setSelectedListing(listing);
                          setIsPromoteModalOpen(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-background text-foreground border border-border rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <RocketLaunchIcon className="w-4 h-4 mr-1" />
                        Promote
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedListing(listing);
                            setIsPreviewModalOpen(true);
                          }}
                          className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
                          title="Preview listing"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <Link
                          href={`/edit/${listing.id}`}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => openActionModal(listing)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                        >
                          <EllipsisHorizontalIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6 sticky h-[45px] top-0 background z-10 shadow-md">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-background border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-background border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {paginatedListings.map(listing => (
            <div key={listing.id} className="bg-card rounded-xl shadow-sm overflow-hidden">
              <div className="flex gap-4 p-4">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={listing.image}
                    alt={listing.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{listing.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{listing.location}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <ChartBarIcon className="w-4 h-4" />
                      <span>{listing.views}</span>
                    </div>
                    
                    <div className={`flex items-center gap-1 ${
                      listing.commentCount && listing.commentCount > 0 
                        ? 'text-purple-600'
                        : ''
                    }`}>
                      <div className="relative">
                        {listing.commentCount && listing.commentCount > 0 ? (
                          <>
                            <ChatBubbleLeftRightIconSolid className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              {listing.commentCount > 9 ? '9+' : listing.commentCount}
                            </span>
                          </>
                        ) : (
                          <ChatBubbleLeftRightIcon className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={listing.published}
                        onChange={() => handlePublishToggle(listing.id, listing.published)}
                        className={`${
                          listing.published ? 'bg-gg-500' : 'bg-gray-200'
                        } relative inline-flex h-6 w-14 items-center rounded-full transition-colors focus:outline-none`}
                      >
                        <span className="sr-only">Toggle published</span>
                        <span
                          className={`${
                            listing.published ? 'translate-x-8' : 'translate-x-1'
                          } inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform`}
                        >
                          {listing.published ? (
                            <CheckIcon className="h-3 w-3 text-green-500" />
                          ) : (
                            <XMarkIcon className="h-3 w-3 text-gray-400" />
                          )}
                        </span>
                        <span className={`absolute text-xs font-medium ${
                          listing.published ? 'left-2 text-white' : 'right-2 text-gray-500'
                        }`}>
                          {listing.published ? 'ON' : 'OFF'}
                        </span>
                      </Switch>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-b border-border px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedListing(listing);
                      setIsPromoteModalOpen(true);
                    }}
                    className="w-[48%] inline-flex items-center justify-center px-3 py-2 bg-background text-foreground border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <RocketLaunchIcon className="w-4 h-4 mr-2" />
                    Promote
                  </button>
                  <button
                    onClick={() => {
                      setSelectedListing(listing);
                      setIsPreviewModalOpen(true);
                    }}
                    className="w-[48%] inline-flex items-center justify-center px-3 py-2 bg-background text-foreground border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Preview
                  </button>
                  <button
                    onClick={() => openCommentModal(listing)}
                    disabled={!listing.commentCount || listing.commentCount === 0}
                    className={`w-[48%] inline-flex items-center justify-center px-3 py-2 border rounded-lg text-sm ${
                      !listing.commentCount || listing.commentCount === 0
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 transition-colors'
                    }`}
                  >
                    <div className="relative">
                      {listing.commentCount && listing.commentCount > 0 ? (
                        <>
                          <ChatBubbleLeftRightIconSolid className="w-5 h-5 mr-2" />
                          <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {listing.commentCount > 9 ? '9+' : listing.commentCount}
                          </span>
                        </>
                      ) : (
                        <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                      )}
                    </div>
                    Comments
                  </button>
                  <Link
                    href={`/edit/${listing.id}`}
                    className="w-[48%] inline-flex items-center justify-center px-3 py-2 bg-background text-foreground border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Edit
                  </Link>
                  <button
                    onClick={() => openActionModal(listing)}
                    className="w-[48%] inline-flex items-center justify-center px-3 py-2 bg-background text-foreground border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <EllipsisHorizontalIcon className="w-4 h-4 mr-2" />
                    More
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {listings.length === 0 && (
          <div className="text-center py-12">
            <h2 className="text-xl text-muted-foreground">No listings yet</h2>
            <p className="text-muted-foreground mt-2">
              Start by creating your first listing
            </p>
            <Link
              href="/edit/new"
              className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Listing
            </Link>
          </div>
        )}

        {selectedListing && (
          <>
            <PromoteModal
              isOpen={isPromoteModalOpen}
              onClose={() => setIsPromoteModalOpen(false)}
              onPackageSelect={(packageName) => {
                toast.success(`Selected ${packageName} package for ${selectedListing.title}`);
                setIsPromoteModalOpen(false);
              }}
            />
            <ActionModal
              isOpen={isActionModalOpen}
              onClose={() => setIsActionModalOpen(false)}
              onFreeze={() => handleFreeze(selectedListing.id)}
              onMarkAsTaken={() => handleMarkAsTaken(selectedListing.id)}
              onDelete={() => handleDelete(selectedListing.id)}
              status={selectedListing.status}
            />
            <PreviewModal
              isOpen={isPreviewModalOpen}
              onClose={() => setIsPreviewModalOpen(false)}
              listing={selectedListing}
            />
          </>
        )}

        {isCommentModalOpen && selectedListing && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center border-b p-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ChatBubbleLeftRightIconSolid className="h-5 w-5 text-purple-600" />
                  Admin Comments
                </h2>
                <button 
                  onClick={() => setIsCommentModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg mb-1">{selectedListing.title}</h3>
                <p className="text-muted-foreground text-sm">{selectedListing.location}</p>
              </div>
              
              <div className="flex-grow overflow-y-auto p-4">
                {loadingComments ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Admin Note</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p>No comments available.</p>
                  </div>
                )}
              </div>
              
              <div className="border-t p-4">
                <button
                  onClick={() => setIsCommentModalOpen(false)}
                  className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  );
} 