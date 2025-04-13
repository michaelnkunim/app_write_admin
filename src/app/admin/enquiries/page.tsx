'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Filter, Trash2, Eye, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  country: string | null;
  message: string;
  createdAt: Date;
  status?: 'new' | 'read' | 'replied';
}

export default function EnquiriesAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [selectedEnquiries, setSelectedEnquiries] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'read' | 'replied'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const enquiriesPerPage = 10;

  // Fetch enquiries from Firestore - Make it a useCallback so it can be used in useEffect
  const fetchEnquiries = useCallback(async (status: 'all' | 'new' | 'read' | 'replied' = 'all') => {
    setLoading(true);
    try {
      let enquiriesQuery;
      
      if (status === 'all') {
        enquiriesQuery = query(
          collection(db, 'enquiries'),
          orderBy('createdAt', 'desc'),
          limit(enquiriesPerPage)
        );
      } else {
        enquiriesQuery = query(
          collection(db, 'enquiries'),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(enquiriesPerPage)
        );
      }

      const snapshot = await getDocs(enquiriesQuery);

      if (!snapshot.empty) {
        const enquiriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          status: doc.data().status || 'new'
        })) as Enquiry[];

        setEnquiries(enquiriesData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setTotalPages(Math.ceil(snapshot.size / enquiriesPerPage));
      } else {
        setEnquiries([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    if (!user || !user.isAdmin) {
      router.push('/login');
    }
  }, [user, router]);

  // Load initial data
  useEffect(() => {
    if (user?.isAdmin) {
      fetchEnquiries('all');
    }
  }, [user, fetchEnquiries]);

  // Handle next page
  const handleNextPage = async () => {
    if (!lastVisible || currentPage >= totalPages) return;

    setLoading(true);
    try {
      let enquiriesQuery;
      
      if (statusFilter === 'all') {
        enquiriesQuery = query(
          collection(db, 'enquiries'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(enquiriesPerPage)
        );
      } else {
        enquiriesQuery = query(
          collection(db, 'enquiries'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(enquiriesPerPage)
        );
      }

      const snapshot = await getDocs(enquiriesQuery);

      if (!snapshot.empty) {
        const enquiriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          status: doc.data().status || 'new'
        })) as Enquiry[];

        setEnquiries(enquiriesData);
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
      let enquiriesQuery;
      
      if (statusFilter === 'all') {
        enquiriesQuery = query(
          collection(db, 'enquiries'),
          orderBy('createdAt', 'desc'),
          limit((currentPage - 1) * enquiriesPerPage)
        );
      } else {
        enquiriesQuery = query(
          collection(db, 'enquiries'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc'),
          limit((currentPage - 1) * enquiriesPerPage)
        );
      }

      const snapshot = await getDocs(enquiriesQuery);

      if (!snapshot.empty) {
        const enquiriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          status: doc.data().status || 'new'
        })) as Enquiry[];

        setEnquiries(enquiriesData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error fetching previous page:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchEnquiries(statusFilter);
      return;
    }

    setLoading(true);
    try {
      const enquiriesQuery = query(
        collection(db, 'enquiries'),
        orderBy('name'),
        limit(100) // Get a larger batch for client-side filtering
      );

      const snapshot = await getDocs(enquiriesQuery);
      
      if (!snapshot.empty) {
        const enquiriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          status: doc.data().status || 'new'
        })) as Enquiry[];

        // Filter by search term (case insensitive)
        const searchTermLower = searchTerm.toLowerCase();
        const filteredEnquiries = enquiriesData.filter(enquiry => 
          enquiry.name.toLowerCase().includes(searchTermLower) || 
          enquiry.email.toLowerCase().includes(searchTermLower) ||
          (enquiry.company && enquiry.company.toLowerCase().includes(searchTermLower)) ||
          (enquiry.country && enquiry.country.toLowerCase().includes(searchTermLower)) ||
          enquiry.message.toLowerCase().includes(searchTermLower)
        );

        // Apply status filter if needed
        const statusFilteredEnquiries = statusFilter === 'all' 
          ? filteredEnquiries 
          : filteredEnquiries.filter(enquiry => enquiry.status === statusFilter);

        setEnquiries(statusFilteredEnquiries);
        setTotalPages(1); // Disable pagination for search results
      } else {
        setEnquiries([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error searching enquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter toggle
  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  // Handle filter change
  const handleFilterChange = (status: 'all' | 'new' | 'read' | 'replied') => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchEnquiries(status);
    setIsFilterOpen(false); // Close filter dropdown after selection
  };

  // Toggle enquiry selection
  const toggleEnquirySelection = (enquiryId: string) => {
    setSelectedEnquiries(prev => 
      prev.includes(enquiryId) 
        ? prev.filter(id => id !== enquiryId) 
        : [...prev, enquiryId]
    );
  };

  // Handle view enquiry details
  const handleViewEnquiry = async (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setShowPreviewModal(true);

    // Mark as read if status is 'new'
    if (enquiry.status === 'new') {
      try {
        const enquiryRef = doc(db, 'enquiries', enquiry.id);
        await updateDoc(enquiryRef, { status: 'read' });
        
        // Update local state
        setEnquiries(prev => 
          prev.map(e => e.id === enquiry.id ? { ...e, status: 'read' } : e)
        );
      } catch (error) {
        console.error('Error updating enquiry status:', error);
      }
    }
  };

  // Handle delete enquiry
  const handleDeleteEnquiry = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setShowDeleteModal(true);
  };

  // Confirm delete enquiry
  const confirmDeleteEnquiry = async () => {
    if (!selectedEnquiry) return;

    try {
      const enquiryRef = doc(db, 'enquiries', selectedEnquiry.id);
      await deleteDoc(enquiryRef);
      
      // Update local state
      setEnquiries(prev => prev.filter(e => e.id !== selectedEnquiry.id));
      toast.success('Enquiry deleted successfully');
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedEnquiry(null);
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      toast.error('Error deleting enquiry');
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status color
  const getStatusColor = (status: string | undefined) => {
    switch(status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-gray-100 text-gray-800';
      case 'replied': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status text
  const getStatusText = (status: string | undefined) => {
    switch(status) {
      case 'new': return 'New';
      case 'read': return 'Read';
      case 'replied': return 'Replied';
      default: return 'New';
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Enquiries Management</h1>
      </div>

      {/* Search and filters */}
      <div className="background p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search enquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              Search
            </button>
            <div className="relative">
              <button
                onClick={toggleFilter}
                className="px-4 py-2 border rounded-md flex items-center space-x-2 text-sm"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
              {isFilterOpen && (
                <div className="absolute z-10 right-0 mt-2 w-48 background rounded-md shadow-lg overflow-hidden">
                  <div className="py-1">
                    <button
                      onClick={() => handleFilterChange('all')}
                      className={`block px-4 py-2 text-sm w-full text-left ${
                        statusFilter === 'all' ? 'bg-secondary' : ''
                      }`}
                    >
                      All Enquiries
                    </button>
                    <button
                      onClick={() => handleFilterChange('new')}
                      className={`block px-4 py-2 text-sm w-full text-left ${
                        statusFilter === 'new' ? 'bg-secondary' : ''
                      }`}
                    >
                      New
                    </button>
                    <button
                      onClick={() => handleFilterChange('read')}
                      className={`block px-4 py-2 text-sm w-full text-left ${
                        statusFilter === 'read' ? 'bg-secondary' : ''
                      }`}
                    >
                      Read
                    </button>
                    <button
                      onClick={() => handleFilterChange('replied')}
                      className={`block px-4 py-2 text-sm w-full text-left ${
                        statusFilter === 'replied' ? 'bg-secondary' : ''
                      }`}
                    >
                      Replied
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enquiries table */}
      <div className="background rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="background border-b">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedEnquiries.length === enquiries.length && enquiries.length > 0}
                    onChange={() => {
                      if (selectedEnquiries.length === enquiries.length) {
                        setSelectedEnquiries([]);
                      } else {
                        setSelectedEnquiries(enquiries.map(e => e.id));
                      }
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Company
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Country
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="background divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-t-primary border-b-primary rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No enquiries found
                  </td>
                </tr>
              ) : (
                enquiries.map(enquiry => (
                  <tr key={enquiry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedEnquiries.includes(enquiry.id)}
                        onChange={() => toggleEnquirySelection(enquiry.id)}
                        className="h-4 w-4 text-primary focus:ring-primary rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{enquiry.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-300">{enquiry.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-300">{enquiry.company || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-300">{enquiry.country || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-300">{formatDate(enquiry.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(enquiry.status)}`}>
                        {getStatusText(enquiry.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewEnquiry(enquiry)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="View enquiry"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => window.open(`mailto:${enquiry.email}`)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Send email"
                        >
                          <Mail className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEnquiry(enquiry)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete enquiry"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing <span className="font-medium">{enquiries.length}</span> results
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className={`px-4 py-2 rounded-md ${
              currentPage <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'background text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className={`px-4 py-2 rounded-md ${
              currentPage >= totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'background text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-blur/50 flex items-center justify-center z-50">
          <div className="background border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto shadow-xl transition-all transform">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Enquiry Details</h2>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedEnquiry(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</h3>
                  <p className="text-base">{selectedEnquiry.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
                  <p className="text-base">{selectedEnquiry.email}</p>
                </div>
                {selectedEnquiry.company && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</h3>
                    <p className="text-base">{selectedEnquiry.company}</p>
                  </div>
                )}
                {selectedEnquiry.country && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Country</h3>
                    <p className="text-base">{selectedEnquiry.country}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</h3>
                  <p className="text-base">{formatDate(selectedEnquiry.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                  <p className="text-base">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedEnquiry.status)}`}>
                      {getStatusText(selectedEnquiry.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Message</h3>
                  <p className="text-base whitespace-pre-wrap">{selectedEnquiry.message}</p>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => {
                    window.open(`mailto:${selectedEnquiry.email}`);
                    // Mark as replied
                    const enquiryRef = doc(db, 'enquiries', selectedEnquiry.id);
                    updateDoc(enquiryRef, { status: 'replied' });
                    // Update local state
                    setEnquiries(prev => 
                      prev.map(e => e.id === selectedEnquiry.id ? { ...e, status: 'replied' } : e)
                    );
                    // Update selected enquiry
                    setSelectedEnquiry({ ...selectedEnquiry, status: 'replied' });
                  }}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Reply via Email
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedEnquiry(null);
                  }}
                  className="flex-1 flex items-center justify-center px-4 py-2 border rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-blur/50 flex items-center justify-center z-50">
          <div className="background border rounded-lg max-w-md w-full shadow-xl transition-all transform">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold ml-3">Confirm Deletion</h2>
              </div>
              <p className="mb-6">
                Are you sure you want to delete this enquiry from <strong>{selectedEnquiry.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEnquiry(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEnquiry}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 