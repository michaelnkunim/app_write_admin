'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ListingCard from '@/components/ListingCard';
import { Listing } from '@/types/listing';
import { Filter, X, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import AdDisplay from '@/components/AdDisplay';

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  const listingsPerPage = 12;

  useEffect(() => {
    fetchListings();
  }, [searchParams]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let listingsQuery = query(
        collection(db, 'listings'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(listingsPerPage)
      );

      const snapshot = await getDocs(listingsQuery);

      if (!snapshot.empty) {
        const fetchedListings = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
          const listingData = { id: docSnapshot.id, ...docSnapshot.data() } as Listing;
          
          // Fetch comment count for each listing
          listingData.commentCount = await fetchCommentCount(listingData.id);
          
          return listingData;
        }));

        setListings(fetchedListings);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setTotalPages(Math.ceil(snapshot.size / listingsPerPage));
      } else {
        setListings([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleNextPage = async () => {
    if (!lastVisible || currentPage >= totalPages) return;

    setLoading(true);
    try {
      let listingsQuery = query(
        collection(db, 'listings'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(listingsPerPage)
      );

      const snapshot = await getDocs(listingsQuery);

      if (!snapshot.empty) {
        const fetchedListings = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
          const listingData = { id: docSnapshot.id, ...docSnapshot.data() } as Listing;
          
          // Fetch comment count for each listing
          listingData.commentCount = await fetchCommentCount(listingData.id);
          
          return listingData;
        }));

        setListings(fetchedListings);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setCurrentPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching next page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = async () => {
    if (!firstVisible || currentPage <= 1) return;

    setLoading(true);
    try {
      let listingsQuery = query(
        collection(db, 'listings'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        endBefore(firstVisible),
        limit(listingsPerPage)
      );

      const snapshot = await getDocs(listingsQuery);

      if (!snapshot.empty) {
        const fetchedListings = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
          const listingData = { id: docSnapshot.id, ...docSnapshot.data() } as Listing;
          
          // Fetch comment count for each listing
          listingData.commentCount = await fetchCommentCount(listingData.id);
          
          return listingData;
        }));

        setListings(fetchedListings);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error fetching previous page:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCommentModal = async (listing: Listing, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!listing.commentCount || listing.commentCount === 0) {
      return;
    }
    
    setSelectedListing(listing);
    setCommentModalOpen(true);
    
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Leaderboard Ad above listings */}
      <div className="mb-6">
        <AdDisplay zone="listings-leaderboard" className="w-full" />
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Browse Listings</h1>
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="bg-gray-100 rounded-lg overflow-hidden shadow-md animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map(listing => (
              <div key={listing.id} className="relative">
                <ListingCard listing={listing} onCommentClick={openCommentModal} />
              </div>
            ))}
          </div>
          
          {listings.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-2">No listings found</h2>
              <p className="text-muted-foreground">Try changing your search criteria or check back later.</p>
            </div>
          )}
          
          {listings.length > 0 && (
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                  currentPage <= 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                  currentPage >= totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Comments Modal */}
      {commentModalOpen && selectedListing && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Listing Comments
              </h2>
              <button 
                onClick={() => setCommentModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
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
                onClick={() => setCommentModalOpen(false)}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 