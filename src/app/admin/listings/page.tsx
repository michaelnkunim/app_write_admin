'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData, doc, updateDoc, addDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HomeIcon, Search, Filter, PlusCircle, Eye, Edit, Trash2, MessageSquare, EyeOff, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

// Define a Category type that includes 'all' option
interface Category {
  key: string;
  label: string;
}

// Define available categories
const categories: Category[] = [
  { key: 'all', label: 'All' },
  { key: 'for-sale', label: 'For Sale' },
  { key: 'for-rent', label: 'For Rent' },
  { key: 'short-stays', label: 'Short Stays' }
];

interface Listing {
  id: string;
  title: string;
  location: string;
  price: string;
  status: 'active' | 'frozen' | 'pending';
  category: any; // Using any to resolve TypeScript error with array access
  ownerId?: string;
  ownerName?: string;
  commentCount?: number;
}

// Define a Comment interface
interface Comment {
  id: string;
  listingId: string;
  comment: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export default function ListingsAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Category>(categories[0]); // Default to 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'frozen' | 'pending'>('active');
  const listingsPerPage = 5; // Changed to 5 items per page
  const [listingComments, setListingComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const commentsPerPage = 5;
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [deletingComment, setDeletingComment] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!user || !user.isAdmin) {
      router.push('/login');
    }
  }, [user, router]);

  // Load initial data
  useEffect(() => {
    if (user?.isAdmin) {
      fetchListings(categories[0]);
    }
  }, [user]);

  // Fetch comment count for a listing
  const fetchCommentCount = async (listingId: string) => {
    try {
      console.log(`Fetching comment count for listing ${listingId}`);
      
      // Get the comments document for this listing
      const commentsDoc = await getDoc(doc(db, 'listingComments', listingId));
      
      if (commentsDoc.exists()) {
        const commentsData = commentsDoc.data();
        const commentsArray = commentsData.comments || [];
        console.log(`Found ${commentsArray.length} comments for listing ${listingId}`);
        return commentsArray.length;
      } else {
        console.log(`No comments document found for listing ${listingId}`);
        return 0;
      }
    } catch (error) {
      console.error(`Error fetching comment count for listing ${listingId}:`, error);
      return 0;
    }
  };

  // Fetch listings from Firestore
  const fetchListings = async (category: Category = categories[0]) => {
    setLoading(true);
    try {
      let listingsQuery = query(
        collection(db, 'listings'),
        orderBy('createdAt', 'desc'),
        limit(listingsPerPage)
      );

      if (category.key !== 'all') {
        listingsQuery = query(
          collection(db, 'listings'),
          where('category', 'array-contains', { key: category.key, label: category.label }),
          orderBy('createdAt', 'desc'),
          limit(listingsPerPage)
        );
      }

      const snapshot = await getDocs(listingsQuery);

      if (!snapshot.empty) {
        const listingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Listing[];

        // Fetch comment counts for each listing using the shared function
        await Promise.all(
          listingsData.map(async (listing) => {
            listing.commentCount = await fetchCommentCount(listing.id);
          })
        );

        setListings(listingsData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
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

  // Handle tab change
  const handleTabChange = (categoryKey: string) => {
    const category = categories.find(cat => cat.key === categoryKey) || categories[0];
    setActiveTab(category);
    setCurrentPage(1);
    fetchListings(category);
  };

  // Handle next page
  const handleNextPage = async () => {
    if (!lastVisible || currentPage >= totalPages) return;

    setLoading(true);
    try {
      let listingsQuery = query(
        collection(db, 'listings'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(listingsPerPage)
      );

      if (activeTab.key !== 'all') {
        listingsQuery = query(
          collection(db, 'listings'),
          where('category', 'array-contains', { key: activeTab.key, label: activeTab.label }),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(listingsPerPage)
        );
      }

      const snapshot = await getDocs(listingsQuery);

      if (!snapshot.empty) {
        const listingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Listing[];

        // Fetch comment counts for each listing using the shared function
        await Promise.all(
          listingsData.map(async (listing) => {
            listing.commentCount = await fetchCommentCount(listing.id);
          })
        );

        setListings(listingsData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setCurrentPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching next page:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle previous page
  const handlePrevPage = async () => {
    if (currentPage <= 1) return;

    setLoading(true);
    try {
      let listingsQuery = query(
        collection(db, 'listings'),
        orderBy('createdAt', 'desc'),
        limit((currentPage - 1) * listingsPerPage)
      );

      if (activeTab.key !== 'all') {
        listingsQuery = query(
          collection(db, 'listings'),
          where('category', 'array-contains', { key: activeTab.key, label: activeTab.label }),
          orderBy('createdAt', 'desc'),
          limit((currentPage - 1) * listingsPerPage)
        );
      }

      const snapshot = await getDocs(listingsQuery);

      if (!snapshot.empty) {
        const listingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Listing[];

        // Fetch comment counts for each listing using the shared function
        await Promise.all(
          listingsData.map(async (listing) => {
            listing.commentCount = await fetchCommentCount(listing.id);
          })
        );

        setListings(listingsData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error fetching previous page:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle listing selection
  const toggleListingSelection = (listingId: string) => {
    setSelectedListings(prev =>
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  // Handle preview listing
  const handlePreviewListing = async (listing: Listing) => {
    console.log("Opening preview modal for listing:", listing.id, "with title:", listing.title);
    
    setSelectedListing(listing);
    setShowPreviewModal(true);
    
    // Fetch comments for this listing
    setLoadingComments(true);
    try {
      // First, ensure we have the latest comment count
      const latestCount = await fetchCommentCount(listing.id);
      console.log(`Listing ${listing.id} has ${latestCount} comments according to count query`);
      
      // Update the listing's comment count if it's different
      if (listing.commentCount !== latestCount) {
        console.log(`Updating comment count for listing ${listing.id} from ${listing.commentCount} to ${latestCount}`);
        setListings(prevListings =>
          prevListings.map(item =>
            item.id === listing.id ? { ...item, commentCount: latestCount } : item
          )
        );
        // Also update the selected listing
        listing.commentCount = latestCount;
      }
      
      // Now fetch the actual comments
      console.log(`Fetching comments for listing ID: ${listing.id}`);
      const commentsDoc = await getDoc(doc(db, 'listingComments', listing.id));
      
      if (commentsDoc.exists()) {
        const commentsData = commentsDoc.data();
        const commentsArray = commentsData.comments || [];
        console.log(`Found ${commentsArray.length} comments for listing ${listing.id}`);
        
        // Sort comments by createdAt in descending order (newest first)
        const sortedComments = [...commentsArray].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setListingComments(sortedComments);
      } else {
        console.log(`No comments document found for listing ${listing.id}`);
        setListingComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setListingComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Handle add comment
  const handleAddComment = async (listing: Listing) => {
    console.log("Opening comment modal for listing:", listing.id, "with title:", listing.title);
    
    setSelectedListing(listing);
    setComment('');
    setCommentPage(1); // Reset to first page when opening modal
    setShowCommentModal(true);
    
    // Fetch comments for this listing
    setLoadingComments(true);
    try {
      // First, ensure we have the latest comment count
      const latestCount = await fetchCommentCount(listing.id);
      console.log(`Listing ${listing.id} has ${latestCount} comments according to count query`);
      
      // Update the listing's comment count if it's different
      if (listing.commentCount !== latestCount) {
        console.log(`Updating comment count for listing ${listing.id} from ${listing.commentCount} to ${latestCount}`);
        setListings(prevListings =>
          prevListings.map(item =>
            item.id === listing.id ? { ...item, commentCount: latestCount } : item
          )
        );
        // Also update the selected listing
        listing.commentCount = latestCount;
      }
      
      // Now fetch the actual comments
      console.log(`Fetching comments for listing ID: ${listing.id}`);
      const commentsDoc = await getDoc(doc(db, 'listingComments', listing.id));
      
      if (commentsDoc.exists()) {
        const commentsData = commentsDoc.data();
        const commentsArray = commentsData.comments || [];
        console.log(`Found ${commentsArray.length} comments for listing ${listing.id}`);
        
        // Sort comments by createdAt in descending order (newest first)
        const sortedComments = [...commentsArray].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setListingComments(sortedComments);
      } else {
        console.log(`No comments document found for listing ${listing.id}`);
        setListingComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setListingComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Handle change status
  const handleChangeStatus = (listing: Listing) => {
    setSelectedListing(listing);
    setNewStatus(listing.status || 'active');
    setShowStatusModal(true);
  };

  // Handle freeze listing
  const handleFreezeListing = async (listing: Listing) => {
    try {
      const newStatus = listing.status === 'frozen' ? 'active' : 'frozen';
      await updateDoc(doc(db, 'listings', listing.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setListings(prevListings =>
        prevListings.map(item =>
          item.id === listing.id ? { ...item, status: newStatus } : item
        )
      );
    } catch (error) {
      console.error('Error updating listing status:', error);
    }
  };

  // Submit comment
  const submitComment = async () => {
    if (!selectedListing || !comment.trim()) return;

    try {
      const newComment = {
        id: `comment_${Date.now()}`, // Generate a unique ID
        listingId: selectedListing.id,
        comment: comment,
        createdBy: user?.uid,
        createdAt: new Date().toISOString()
      };
      
      // Get the current comments document
      const commentsRef = doc(db, 'listingComments', selectedListing.id);
      const commentsDoc = await getDoc(commentsRef);
      
      if (commentsDoc.exists()) {
        // Document exists, update it with the new comment
        const commentsData = commentsDoc.data();
        const commentsArray = commentsData.comments || [];
        
        // Add the new comment
        await updateDoc(commentsRef, {
          comments: [newComment, ...commentsArray],
          updatedAt: new Date().toISOString()
        });
      } else {
        // Document doesn't exist, create it
        await setDoc(commentsRef, {
          comments: [newComment],
          listingId: selectedListing.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // Clear the comment input
      setComment('');
      
      // Add the new comment to the list
      setListingComments([newComment, ...listingComments]);
      
      // Reset to first page to show the new comment
      setCommentPage(1);
      
      // Update the comment count in the listings array
      setListings(prevListings =>
        prevListings.map(item =>
          item.id === selectedListing.id 
            ? { 
                ...item, 
                commentCount: (item.commentCount || 0) + 1 
              } 
            : item
        )
      );
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Update listing status
  const updateListingStatus = async () => {
    if (!selectedListing) return;

    try {
      await updateDoc(doc(db, 'listings', selectedListing.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setListings(prevListings =>
        prevListings.map(item =>
          item.id === selectedListing.id ? { ...item, status: newStatus } : item
        )
      );

      setShowStatusModal(false);
    } catch (error) {
      console.error('Error updating listing status:', error);
    }
  };

  // Handle initiating chat with property owner
  const handleInitiateChat = async (listing: Listing) => {
    // Skip if the current admin is the owner
    if (user?.uid === listing.ownerId) {
      // Show toast or alert
      toast.info('You are the owner of this property');
      return;
    }

    try {
      // Check if a chat already exists
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user?.uid),
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      
      let existingChatId = null;
      
      chatsSnapshot.forEach(doc => {
        const chatData = doc.data();
        if (chatData.participants.includes(listing.ownerId)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        // Navigate to existing chat
        router.push(`/messages/${existingChatId}`);
      } else {
        // Create a new chat
        const newChatRef = await addDoc(collection(db, 'chats'), {
          participants: [user?.uid, listing.ownerId],
          createdAt: new Date().toISOString(),
          lastMessage: null,
          lastMessageTime: null,
          propertyId: listing.id,
          propertyTitle: listing.title
        });

        // Navigate to the new chat
        router.push(`/messages/${newChatRef.id}`);
      }
    } catch (error) {
      console.error('Error initiating chat:', error);
    }
  };

  // Get current comments for pagination
  const getCurrentComments = () => {
    const indexOfLastComment = commentPage * commentsPerPage;
    const indexOfFirstComment = indexOfLastComment - commentsPerPage;
    return listingComments.slice(indexOfFirstComment, indexOfLastComment);
  };

  const getTotalCommentPages = () => {
    return Math.ceil(listingComments.length / commentsPerPage);
  };

  // Handle edit comment
  const handleEditComment = (commentId: string, currentText: string) => {
    setEditingComment(commentId);
    setEditedCommentText(currentText);
  };

  // Save edited comment
  const saveEditedComment = async (commentId: string) => {
    if (!editedCommentText.trim() || !selectedListing) return;
    
    try {
      // Get the current comments document
      const commentsRef = doc(db, 'listingComments', selectedListing.id);
      const commentsDoc = await getDoc(commentsRef);
      
      if (commentsDoc.exists()) {
        const commentsData = commentsDoc.data();
        let commentsArray = commentsData.comments || [];
        
        // Find and update the specific comment
        commentsArray = commentsArray.map((comment: Comment) => 
          comment.id === commentId 
            ? { ...comment, comment: editedCommentText, updatedAt: new Date().toISOString() } 
            : comment
        );
        
        // Update the document with the modified comments array
        await updateDoc(commentsRef, {
          comments: commentsArray,
          updatedAt: new Date().toISOString()
        });
        
        // Update the comment in the local state
        setListingComments(prevComments => 
          prevComments.map(comment => 
            comment.id === commentId 
              ? { ...comment, comment: editedCommentText, updatedAt: new Date().toISOString() } 
              : comment
          )
        );
      }
      
      // Reset editing state
      setEditingComment(null);
      setEditedCommentText('');
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  // Cancel editing comment
  const cancelEditComment = () => {
    setEditingComment(null);
    setEditedCommentText('');
  };

  // Handle delete comment
  const handleDeleteComment = (commentId: string) => {
    setDeletingComment(commentId);
  };

  // Confirm delete comment
  const confirmDeleteComment = async (commentId: string) => {
    if (!selectedListing) return;
    
    try {
      // Get the current comments document
      const commentsRef = doc(db, 'listingComments', selectedListing.id);
      const commentsDoc = await getDoc(commentsRef);
      
      if (commentsDoc.exists()) {
        const commentsData = commentsDoc.data();
        let commentsArray = commentsData.comments || [];
        
        // Filter out the comment to be deleted
        const updatedComments = commentsArray.filter((comment: Comment) => comment.id !== commentId);
        
        // Update the document with the modified comments array
        await updateDoc(commentsRef, {
          comments: updatedComments,
          updatedAt: new Date().toISOString()
        });
        
        // Remove the comment from the local state
        setListingComments(prevComments => 
          prevComments.filter(comment => comment.id !== commentId)
        );
        
        // Update the comment count in the listings array
        setListings(prevListings =>
          prevListings.map(item =>
            item.id === selectedListing.id 
              ? { 
                  ...item, 
                  commentCount: Math.max((item.commentCount || 0) - 1, 0)
                } 
              : item
          )
        );
      }
      
      // Reset deleting state
      setDeletingComment(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Cancel deleting comment
  const cancelDeleteComment = () => {
    setDeletingComment(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <HomeIcon size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">Listings Management</h1>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
          <PlusCircle size={18} />
          <span>Add Listing</span>
        </button>
      </div>

      {/* Tabs for filtering */}
      <div className="flex border-b mb-6">
        {categories.map((category) => (
          <button
            key={category.key}
            className={`px-4 py-2 font-medium ${
              activeTab.key === category.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleTabChange(category.key)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button 
            onClick={() => fetchListings(activeTab)}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
            title="Refresh listings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
            <span>Refresh</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors">
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left">Select</th>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing:any) => (
                    <tr key={listing.id} className="border-b hover:bg-accent/10">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedListings.includes(listing.id)}
                          onChange={() => toggleListingSelection(listing.id)}
                        />
                      </td>
                      <td className="px-4 py-3">{listing.title}</td>
                      <td className="px-4 py-3">
                        {listing?.category?.[0]?.title || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-3">{listing.location}</td>
                      <td className="px-4 py-3">{listing.price}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          listing.status === 'active'
                            ? 'bg-gg-100 text-green-800'
                            : listing.status === 'frozen'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {listing.status}
                        </span>
                   
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-500 hover:text-blue-700" 
                            title="Preview"
                            onClick={() => handlePreviewListing(listing)}
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            className="text-green-500 hover:text-green-700 relative" 
                            title="Add Comment"
                            onClick={() => handleAddComment(listing)}
                          >
                            <MessageSquare size={18} />
                            {listing.commentCount > 0 && (
                              <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {listing.commentCount > 9 ? '9+' : listing.commentCount}
                              </span>
                            )}
                          </button>
                          <button 
                            className="text-yellow-500 hover:text-yellow-700" 
                            title="Change Status"
                            onClick={() => handleChangeStatus(listing)}
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            className="text-red-500 hover:text-red-700" 
                            title={listing.status === 'frozen' ? 'Unfreeze Listing' : 'Freeze Listing'}
                            onClick={() => handleFreezeListing(listing)}
                          >
                            <EyeOff size={18} />
                          </button>
                          {listing.ownerId && (
                            <button 
                              className="text-indigo-500 hover:text-indigo-700" 
                              title="Chat with Owner"
                              onClick={() => handleInitiateChat(listing)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {listings.length} of {totalPages * listingsPerPage} listings
              </p>
              <div className="flex gap-2">
                <button 
                  className={`flex items-center gap-1 px-3 py-1 border rounded-md transition-colors ${
                    currentPage <= 1 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'hover:bg-accent'
                  }`}
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <button 
                  className={`flex items-center gap-1 px-3 py-1 border rounded-md transition-colors ${
                    currentPage >= totalPages 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'hover:bg-accent'
                  }`}
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && selectedListing && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Comments for: {selectedListing.title}</h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowCommentModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Existing Comments */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">
                All Comments ({listingComments.length})
                {selectedListing.commentCount !== listingComments.length && (
                  <span className="text-sm text-red-500 ml-2">
                    (Badge shows {selectedListing.commentCount})
                  </span>
                )}
              </h3>
              
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : listingComments && listingComments.length > 0 ? (
                <>
                  <div className="space-y-4 mb-4">
                    {getCurrentComments().map(comment => (
                      <div key={comment.id} className="bg-accent/30 p-3 rounded-md">
                        {editingComment === comment.id ? (
                          // Editing mode
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-medium">
                                {comment.createdBy === user?.uid ? 'You' : 'Admin'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <textarea
                              value={editedCommentText}
                              onChange={(e) => setEditedCommentText(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={cancelEditComment}
                                className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEditedComment(comment.id)}
                                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : deletingComment === comment.id ? (
                          // Delete confirmation
                          <div>
                            <p className="font-medium mb-2">Are you sure you want to delete this comment?</p>
                            <p className="text-sm text-muted-foreground mb-4">{comment.comment}</p>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={cancelDeleteComment}
                                className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => confirmDeleteComment(comment.id)}
                                className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Normal display
                          <>
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-medium">
                                {comment.createdBy === user?.uid ? 'You' : 'Admin'}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </p>
                                {comment.createdBy === user?.uid && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleEditComment(comment.id, comment.comment)}
                                      className="text-blue-500 hover:text-blue-700"
                                      title="Edit Comment"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-red-500 hover:text-red-700"
                                      title="Delete Comment"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="whitespace-pre-wrap">{comment.comment}</p>
                            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                Edited {new Date(comment.updatedAt).toLocaleString()}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination for comments */}
                  {getTotalCommentPages() > 1 && (
                    <div className="flex justify-center gap-2 mb-4">
                      <button 
                        className={`px-3 py-1 border rounded-md transition-colors ${
                          commentPage <= 1 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setCommentPage(prev => Math.max(prev - 1, 1))}
                        disabled={commentPage <= 1}
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1">
                        Page {commentPage} of {getTotalCommentPages()}
                      </span>
                      <button 
                        className={`px-3 py-1 border rounded-md transition-colors ${
                          commentPage >= getTotalCommentPages() 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setCommentPage(prev => Math.min(prev + 1, getTotalCommentPages()))}
                        disabled={commentPage >= getTotalCommentPages()}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">No comments yet</p>
              )}
            </div>
            
            {/* Add New Comment */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Add New Comment</h3>
              
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your comment here..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              ></textarea>
              
              <div className="flex justify-end gap-2">
                <button 
                  className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                  onClick={() => setShowCommentModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={`px-4 py-2 rounded-md transition-colors ${
                    comment.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    submitComment();
                    // Reset to first page after adding a comment
                    setCommentPage(1);
                  }}
                  disabled={!comment.trim()}
                >
                  Submit Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedListing && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Listing Preview</h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowPreviewModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium">{selectedListing.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{selectedListing?.category?.[0]?.title || 'Uncategorized'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{selectedListing.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-medium">{selectedListing.price}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{selectedListing.status}</p>
              </div>
              {selectedListing.ownerId && (
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedListing.ownerName || 'Unknown'}</p>
                    {selectedListing.ownerId !== user?.uid && (
                      <button 
                        className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full hover:bg-indigo-200 transition-colors"
                        onClick={() => handleInitiateChat(selectedListing)}
                      >
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Comments Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-4">
                Comments ({listingComments.length})
                {selectedListing.commentCount !== listingComments.length && (
                  <span className="text-sm text-red-500 ml-2">
                    (Badge shows {selectedListing.commentCount})
                  </span>
                )}
              </h3>
              
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : listingComments && listingComments.length > 0 ? (
                <div className="space-y-4">
                  {listingComments.map(comment => (
                    <div key={comment.id} className="bg-accent/30 p-3 rounded-md">
                      {editingComment === comment.id ? (
                        // Editing mode
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium">
                              {comment.createdBy === user?.uid ? 'You' : 'Admin'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <textarea
                            value={editedCommentText}
                            onChange={(e) => setEditedCommentText(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelEditComment}
                              className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEditedComment(comment.id)}
                              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : deletingComment === comment.id ? (
                        // Delete confirmation
                        <div>
                          <p className="font-medium mb-2">Are you sure you want to delete this comment?</p>
                          <p className="text-sm text-muted-foreground mb-4">{comment.comment}</p>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelDeleteComment}
                              className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => confirmDeleteComment(comment.id)}
                              className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Normal display
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium">
                              {comment.createdBy === user?.uid ? 'You' : 'Admin'}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </p>
                              {comment.createdBy === user?.uid && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditComment(comment.id, comment.comment)}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="Edit Comment"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Delete Comment"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="whitespace-pre-wrap">{comment.comment}</p>
                          {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Edited {new Date(comment.updatedAt).toLocaleString()}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No comments yet</p>
              )}
              
              <div className="mt-4 flex gap-2">
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                ></textarea>
                <button 
                  className={`px-4 py-2 rounded-md transition-colors ${
                    comment.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    submitComment();
                    // Add the new comment to the list immediately
                    if (comment.trim()) {
                      const newComment = {
                        id: 'temp-' + Date.now(),
                        listingId: selectedListing.id,
                        comment: comment,
                        createdBy: user?.uid,
                        createdAt: new Date().toISOString()
                      };
                      setListingComments([newComment, ...listingComments]);
                      setComment('');
                    }
                  }}
                  disabled={!comment.trim()}
                >
                  Add
                </button>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                onClick={() => setShowPreviewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && selectedListing && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Change Listing Status</h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowStatusModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-4">
                Changing status for: <span className="font-medium">{selectedListing.title}</span>
              </p>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={newStatus === 'active'}
                    onChange={() => setNewStatus('active')}
                    className="h-4 w-4 text-primary"
                  />
                  <span>Active</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={newStatus === 'frozen'}
                    onChange={() => setNewStatus('frozen')}
                    className="h-4 w-4 text-primary"
                  />
                  <span>Frozen</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={newStatus === 'pending'}
                    onChange={() => setNewStatus('pending')}
                    className="h-4 w-4 text-primary"
                  />
                  <span>Pending</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button 
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                onClick={updateListingStatus}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 