'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useAppFirestore } from '@/hooks/useAppFirestore';
import { 
  UsersIcon, 
  Search, 
  Filter, 
  PlusCircle, 
  CreditCard, 
  Ban, 
  MessageSquare, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  Mail,
  MessageCircle,
  Bell,
  Phone,
  Check,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { where, orderBy, limit, startAfter } from 'firebase/firestore';

// User type definition
interface UserData {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  userType?: 'seeker' | 'provider';
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  status?: 'active' | 'inactive' | 'banned';
  photoURL?: string;
  phone?: string;
  location?: string;
  businessName?: string;
  idFrontURL?: string;
  idBackURL?: string;
  idVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
}

// Message type options
type MessageType = 'email' | 'sms' | 'chat' | 'inAppNote';

// Toast type
type ToastType = 'success' | 'error';

interface Toast {
  type: ToastType;
  message: string;
}

export default function UsersAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { queryCollection, getDocument, updateDocument, saveDocument, addDocument } = useAppFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'provider' | 'seeker'>('provider');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastVisible, setLastVisible] = useState<UserData | null>(null);
  const [firstVisible, setFirstVisible] = useState<UserData | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditUserId, setCreditUserId] = useState('');
  const [creditUserName, setCreditUserName] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);
  const [messageTypes, setMessageTypes] = useState<MessageType[]>(['email']);
  const [messageContent, setMessageContent] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showBanConfirmModal, setShowBanConfirmModal] = useState(false);
  const [banUserData, setBanUserData] = useState<{id: string, name: string, currentStatus: string} | null>(null);
  const [showIdVerificationModal, setShowIdVerificationModal] = useState(false);
  const [idVerificationData, setIdVerificationData] = useState<{user: UserData, action: 'approve' | 'revoke'} | null>(null);
  const usersPerPage = 8;

  // Redirect non-admin users
  useEffect(() => {
    if (!user || !user.isAdmin) {
      router.push('/login');
    }
  }, [user, router]);

  // Show toast notification
  const showToast = (type: ToastType, message: string) => {
    // Clear any existing toast first
    setToast(null);
    
    // Set the new toast
    setTimeout(() => {
      setToast({ type, message });
    }, 10);
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      hideToast();
    }, 3000);
  };
  
  // Hide toast with animation
  const hideToast = () => {
    const toastElement = document.getElementById('toast-notification');
    if (toastElement) {
      toastElement.classList.remove('animate-slide-up');
      toastElement.classList.add('animate-fade-out');
      
      // Remove toast after animation completes
      setTimeout(() => {
        setToast(null);
      }, 300);
    } else {
      setToast(null);
    }
  };

  // Fetch users from Firestore
  const fetchUsers = async (userType: 'provider' | 'seeker') => {
    setLoading(true);
    try {
      const queryConstraints = [
        where('userType', '==', userType),
        orderBy('createdAt', 'desc'),
        limit(usersPerPage)
      ];
      
      const userData = await queryCollection<UserData>('users', queryConstraints);
      
      if (userData.length > 0) {
        setUsers(userData);
        setLastVisible(userData[userData.length - 1]);
        setFirstVisible(userData[0]);
        
        // Get total count for pagination
        const totalUsers = await queryCollection<UserData>('users', [where('userType', '==', userType)]);
        setTotalPages(Math.ceil(totalUsers.length / usersPerPage));
      } else {
        setUsers([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle next page
  const handleNextPage = async () => {
    if (!lastVisible || currentPage >= totalPages) return;
    
    setLoading(true);
    try {
      const queryConstraints = [
        where('userType', '==', activeTab),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(usersPerPage)
      ];
      
      const userData = await queryCollection<UserData>('users', queryConstraints);
      
      if (userData.length > 0) {
        setUsers(userData);
        setLastVisible(userData[userData.length - 1]);
        setFirstVisible(userData[0]);
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
    if (!firstVisible || currentPage <= 1) return;
    
    setLoading(true);
    try {
      const queryConstraints = [
        where('userType', '==', activeTab),
        orderBy('createdAt', 'desc'),
        limit((currentPage - 1) * usersPerPage)
      ];
      
      const userData = await queryCollection<UserData>('users', queryConstraints);
      
      if (userData.length > 0) {
        const startIndex = Math.max(0, userData.length - usersPerPage);
        const relevantDocs = userData.slice(startIndex);
        
        setUsers(relevantDocs);
        setLastVisible(relevantDocs[relevantDocs.length - 1]);
        setFirstVisible(relevantDocs[0]);
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
      fetchUsers(activeTab);
      return;
    }
    
    setLoading(true);
    try {
      const queryConstraints = [
        where('userType', '==', activeTab)
      ];
      
      const allUsers = await queryCollection<UserData>('users', queryConstraints);
      
      if (allUsers.length > 0) {
        const filteredUsers = allUsers.filter(user => 
          user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.location?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        setUsers(filteredUsers.slice(0, usersPerPage));
        setTotalPages(Math.ceil(filteredUsers.length / usersPerPage));
        setCurrentPage(1);
      } else {
        setUsers([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: 'provider' | 'seeker') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
    fetchUsers(tab);
  };

  // Handle user actions
  const handleCreditAccount = (userId: string, userName: string) => {
    setCreditUserId(userId);
    setCreditUserName(userName);
    setCreditAmount('');
    setShowCreditModal(true);
  };

  const processCreditAccount = async () => {
    if (!creditUserId || !creditAmount.trim()) return;
    
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('error', 'Please enter a valid positive number');
      return;
    }
    
    setCreditLoading(true);
    try {
      // Update user's balance in Firestore
      const balanceDoc = await getDocument('balances', creditUserId);
      
      if (balanceDoc) {
        const currentBalance = balanceDoc.currentBalance || 0;
        await updateDocument('balances', creditUserId, {
          currentBalance: currentBalance + amount,
          updatedAt: new Date().toISOString()
        });
      } else {
        await saveDocument('balances', creditUserId, {
          currentBalance: amount,
          pendingBalance: 0,
          currency: 'GHS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Update the user document with updatedAt
      await updateDocument('users', creditUserId, {
        updatedAt: new Date().toISOString()
      });
      
      // Save transaction record
      await addDocument('transactions', {
        userId: creditUserId,
        amount: amount,
        type: 'credit',
        description: 'Account credited by admin',
        date: new Date().toISOString(),
        status: 'completed',
        reference: `admin_credit_${Date.now()}`
      });
      
      // Close modal and reset state
      setShowCreditModal(false);
      setCreditAmount('');
      setCreditUserId('');
      setCreditUserName('');
      
      // Show success toast
      showToast('success', `Successfully credited account with ${amount} GHS`);
    } catch (error) {
      console.error('Error crediting account:', error);
      showToast('error', 'Failed to credit account. Please try again.');
    } finally {
      setCreditLoading(false);
    }
  };

  const handleBanUser = (userId: string, userName: string, currentStatus: string) => {
    setBanUserData({
      id: userId,
      name: userName,
      currentStatus: currentStatus
    });
    setShowBanConfirmModal(true);
  };

  const confirmBanUser = async () => {
    if (!banUserData) return;
    
    try {
      const newStatus = banUserData.currentStatus === 'banned' ? 'active' : 'banned';
      
      await updateDocument('users', banUserData.id, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      // Update the user in the local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === banUserData.id ? { ...u, status: newStatus as 'active' | 'banned', updatedAt: new Date().toISOString() } : u
        )
      );
      
      // Show success toast
      showToast(
        'success', 
        `User ${banUserData.name} has been ${newStatus === 'banned' ? 'banned' : 'activated'} successfully`
      );
      
      // Close the modal
      setShowBanConfirmModal(false);
      setBanUserData(null);
    } catch (error) {
      console.error('Error updating user status:', error);
      showToast('error', 'Failed to update user status. Please try again.');
    }
  };

  const handleIdVerification = async (userData: UserData) => {
    // For approval, check if both ID documents are uploaded
    if (userData.idVerificationStatus !== 'approved' && (!userData.idFrontURL || !userData.idBackURL)) {
      showToast('error', 'ID documents are incomplete');
      return;
    }

    // Show confirmation modal with the appropriate action
    setIdVerificationData({
      user: userData,
      action: userData.idVerificationStatus === 'approved' ? 'revoke' : 'approve'
    });
    setShowIdVerificationModal(true);
  };

  const confirmIdVerification = async () => {
    if (!idVerificationData) return;
    
    const { user, action } = idVerificationData;
    const newStatus = action === 'approve' ? 'approved' : 'none';
    
    try {
      setLoading(true);
      // Update the user's ID verification status
      await updateDocument('users', user.id, {
        idVerificationStatus: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Update the local users array to reflect the change
      setUsers(users.map(u => 
        u.id === user.id 
          ? { ...u, idVerificationStatus: newStatus, updatedAt: new Date().toISOString() } 
          : u
      ));

      // If the selected user in the modal is the same user, update it too
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({
          ...selectedUser,
          idVerificationStatus: newStatus,
          updatedAt: new Date().toISOString()
        });
      }

      showToast(
        'success', 
        action === 'approve' 
          ? 'ID verification approved successfully' 
          : 'ID verification revoked successfully'
      );
    } catch (error) {
      console.error(`Error ${action === 'approve' ? 'approving' : 'revoking'} ID verification:`, error);
      showToast('error', `Failed to ${action === 'approve' ? 'approve' : 'revoke'} ID verification`);
    } finally {
      setLoading(false);
      setShowIdVerificationModal(false);
      setIdVerificationData(null);
    }
  };

  const handleSendMessage = (user: UserData) => {
    setSelectedUser(user);
    setSelectedUsers([user]);
    setShowMessageModal(true);
  };

  const handleBulkMessage = () => {
    setSelectedUser(null);
    setSelectedUsers([]);
    setShowMessageModal(true);
  };

  const toggleUserSelection = (user: UserData) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleUserSearch = (term: string) => {
    setUserSearchTerm(term);
    if (!term.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const filtered = users.filter(user => 
      user.displayName?.toLowerCase().includes(term.toLowerCase()) ||
      user.email?.toLowerCase().includes(term.toLowerCase()) ||
      user.businessName?.toLowerCase().includes(term.toLowerCase())
    );
    
    setFilteredUsers(filtered);
  };

  const handleViewDetails = async (userId: string) => {
    try {
      const userDoc = await getDocument<UserData>('users', userId);
      
      if (userDoc) {
        setSelectedUser(userDoc);
        setShowUserDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const toggleMessageType = (type: MessageType) => {
    if (messageTypes.includes(type)) {
      // Only remove if it's not the last selected type
      if (messageTypes.length > 1) {
        setMessageTypes(messageTypes.filter(t => t !== type));
      }
    } else {
      setMessageTypes([...messageTypes, type]);
    }
  };

  const sendMessage = async () => {
    if (selectedUsers.length === 0 || !messageContent.trim() || messageTypes.length === 0) return;
    
    try {
      // This is where you would implement the actual message sending logic
      // based on the selected message types
      console.log(`Sending message via ${messageTypes.join(', ')} to ${selectedUsers.length} users:`, messageContent);
      console.log('Recipients:', selectedUsers.map(u => u.email).join(', '));
      
      // In a real app, you would call your messaging service here for each type
      
      // Reset form and close modal
      setMessageContent('');
      setShowMessageModal(false);
      setSelectedUsers([]);
      setShowUserSelector(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    if (user?.isAdmin) {
      fetchUsers(activeTab);
    }
  }, [user]);

  // Initialize filtered users when users change
  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <UsersIcon size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">Users Management</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleBulkMessage}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            <MessageSquare size={18} />
            <span>Bulk Message</span>
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
            <PlusCircle size={18} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* User Type Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'provider'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleTabChange('provider')}
        >
          Property Providers
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'seeker'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleTabChange('seeker')}
        >
          Property Seekers
        </button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
          >
            <Search size={18} />
            <span>Search</span>
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
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">ID Verification</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-accent/10">
                        <td className="px-4 py-3">{user.businessName || user.username || user.displayName || 'N/A'}</td>
                        <td className="px-4 py-3">{user.email || 'N/A'}</td>
                        <td className="px-4 py-3 capitalize">{user.userType || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.status === 'banned' 
                              ? 'bg-red-100 text-red-800' 
                              : user.status === 'inactive'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gg-100 text-green-800'
                          }`}>
                            {user.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.idVerificationStatus ? (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.idVerificationStatus === 'approved'
                                ? 'bg-green-100 text-green-800' 
                                : user.idVerificationStatus === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : user.idVerificationStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.idVerificationStatus === 'none' ? 'Not Submitted' : 
                               user.idVerificationStatus.charAt(0).toUpperCase() + user.idVerificationStatus.slice(1)}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              Not Submitted
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleCreditAccount(user.id, user.displayName || user.businessName || user.email)}
                              className="text-blue-500 hover:text-blue-700 p-1"
                              title="Credit Account"
                            >
                              <CreditCard size={18} />
                            </button>
                            <button 
                              onClick={() => handleBanUser(
                                user.id, 
                                user.displayName || user.businessName || user.email, 
                                user.status || 'active'
                              )}
                              className={`p-1 ${
                                user.status === 'banned' 
                                  ? 'text-green-500 hover:text-green-700' 
                                  : 'text-red-500 hover:text-red-700'
                              }`}
                              title={user.status === 'banned' ? 'Unban User' : 'Ban User'}
                            >
                              <Ban size={18} />
                            </button>
                            <button 
                              onClick={() => handleIdVerification(user)}
                              disabled={user.idVerificationStatus !== 'approved' && (!user.idFrontURL || !user.idBackURL)}
                              className={`p-1 ${
                                user.idVerificationStatus === 'approved'
                                  ? 'text-green-500 hover:text-red-700'
                                  : (!user.idFrontURL || !user.idBackURL)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-green-500 hover:text-green-700'
                              }`}
                              title={
                                user.idVerificationStatus === 'approved'
                                  ? 'Revoke ID Verification'
                                  : (!user.idFrontURL || !user.idBackURL)
                                  ? 'ID Documents Incomplete'
                                  : 'Approve ID Verification'
                              }
                            >
                              {user.idVerificationStatus === 'approved' ? (
                                <CheckCircle2 size={18} className="text-green-500" />
                              ) : (
                                <CheckCircle2 size={18} />
                              )}
                            </button>
                            <button 
                              onClick={() => handleSendMessage(user)}
                              className="text-purple-500 hover:text-purple-700 p-1"
                              title="Send Message"
                            >
                              <MessageSquare size={18} />
                            </button>
                            <button 
                              onClick={() => handleViewDetails(user.id)}
                              className="text-gray-500 hover:text-gray-700 p-1"
                              title="View Details"
                            >
                              <Info size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {users.length} of {totalPages * usersPerPage} users
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
                  <ChevronLeft size={16} />
                  <span>Previous</span>
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
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedUser 
                ? `Send Message to ${selectedUser.displayName}` 
                : `Send Message to ${selectedUsers.length} Users`}
            </h2>
            
            {/* User Selection Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium mb-2">Recipients</label>
                <button 
                  onClick={() => setShowUserSelector(!showUserSelector)}
                  className="text-sm text-primary hover:underline"
                >
                  {showUserSelector ? 'Hide' : 'Select Users'}
                </button>
              </div>
              
              {/* Selected Users Pills */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUsers.map(user => (
                    <div 
                      key={user.id} 
                      className="flex items-center gap-1 bg-accent px-2 py-1 rounded-full text-xs"
                    >
                      <span>{user.displayName || user.email}</span>
                      <button 
                        onClick={() => toggleUserSelection(user)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* User Selector */}
              {showUserSelector && (
                <div className="border rounded-md mb-4 max-h-60 overflow-hidden flex flex-col">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearchTerm}
                        onChange={(e) => handleUserSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <div 
                          key={user.id}
                          onClick={() => toggleUserSelection(user)}
                          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.displayName || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                            selectedUsers.some(u => u.id === user.id) 
                              ? 'bg-primary border-primary' 
                              : 'border-muted-foreground'
                          }`}>
                            {selectedUsers.some(u => u.id === user.id) && (
                              <Check size={14} className="text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-center text-muted-foreground">No users found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Message Types (select multiple)</label>
              <div className="flex flex-wrap gap-1">
                <button 
                  className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                    messageTypes.includes('email') ? 'bg-primary text-primary-foreground' : 'bg-accent'
                  }`}
                  onClick={() => toggleMessageType('email')}
                >
                  <Mail size={16} />
                  <span>Email</span>
                </button>
                <button 
                  className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                    messageTypes.includes('sms') ? 'bg-primary text-primary-foreground' : 'bg-accent'
                  }`}
                  onClick={() => toggleMessageType('sms')}
                >
                  <Phone size={16} />
                  <span>SMS</span>
                </button>
                <button 
                  className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                    messageTypes.includes('chat') ? 'bg-primary text-primary-foreground' : 'bg-accent'
                  }`}
                  onClick={() => toggleMessageType('chat')}
                >
                  <MessageCircle size={16} />
                  <span>Chat</span>
                </button>
                <button 
                  className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                    messageTypes.includes('inAppNote') ? 'bg-primary text-primary-foreground' : 'bg-accent'
                  }`}
                  onClick={() => toggleMessageType('inAppNote')}
                >
                  <Bell size={16} />
                  <span>In-App Note</span>
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Message
              </label>
              <textarea
                id="message"
                rows={4}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={`Type your message here...`}
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-2">
              <button 
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                onClick={() => {
                  setShowMessageModal(false);
                  setShowUserSelector(false);
                  setUserSearchTerm('');
                }}
              >
                Cancel
              </button>
              <button 
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedUsers.length > 0 && messageContent.trim() && messageTypes.length > 0
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={sendMessage}
                disabled={selectedUsers.length === 0 || !messageContent.trim() || messageTypes.length === 0}
              >
                Send via {messageTypes.length} {messageTypes.length === 1 ? 'channel' : 'channels'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Account Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Credit User Account</h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowCreditModal(false)}
                disabled={creditLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                You are crediting the account of: <span className="font-medium">{creditUserName}</span>
              </p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="creditAmount" className="block text-sm font-medium mb-2">
                Amount to Credit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  GHS
                </span>
                <input
                  id="creditAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full pl-12 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button 
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                onClick={() => setShowCreditModal(false)}
                disabled={creditLoading}
              >
                Cancel
              </button>
              <button 
                className={`px-4 py-2 rounded-md transition-colors ${
                  creditAmount.trim() && !isNaN(parseFloat(creditAmount)) && parseFloat(creditAmount) > 0
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={processCreditAccount}
                disabled={!creditAmount.trim() || isNaN(parseFloat(creditAmount)) || parseFloat(creditAmount) <= 0 || creditLoading}
              >
                {creditLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  'Credit Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">User Details</h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowUserDetailsModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-medium">{selectedUser.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{selectedUser.displayName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{selectedUser.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{selectedUser.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User Type</p>
                <p className="font-medium capitalize">{selectedUser.userType || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{selectedUser.status || 'Active'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{selectedUser.location || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{selectedUser.businessName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Login</p>
                <p className="font-medium">{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID Verification Status</p>
                <p className={`font-medium ${
                  selectedUser.idVerificationStatus === 'approved' ? 'text-green-600' :
                  selectedUser.idVerificationStatus === 'rejected' ? 'text-red-600' :
                  selectedUser.idVerificationStatus === 'pending' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {selectedUser.idVerificationStatus === 'none' || !selectedUser.idVerificationStatus ? 'Not Submitted' : 
                   selectedUser.idVerificationStatus.charAt(0).toUpperCase() + selectedUser.idVerificationStatus.slice(1)}
                </p>
              </div>
            </div>
            
            {/* ID Images Section */}
            {(selectedUser.idFrontURL || selectedUser.idBackURL) && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">ID Verification Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.idFrontURL && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">ID Front</p>
                      <div className="border rounded-md overflow-hidden">
                        <img 
                          src={selectedUser.idFrontURL} 
                          alt="ID Front" 
                          className="w-full object-contain"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    </div>
                  )}
                  {selectedUser.idBackURL && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">ID Back</p>
                      <div className="border rounded-md overflow-hidden">
                        <img 
                          src={selectedUser.idBackURL} 
                          alt="ID Back" 
                          className="w-full object-contain"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Verification action buttons */}
                {selectedUser.idFrontURL && selectedUser.idBackURL && (
                  <div className="mt-4 flex gap-2">
                    {selectedUser.idVerificationStatus === 'approved' ? (
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        onClick={() => {
                          handleIdVerification(selectedUser);
                          setShowUserDetailsModal(false);
                        }}
                      >
                        Revoke ID Verification
                      </button>
                    ) : (
                      <button
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        onClick={() => {
                          handleIdVerification(selectedUser);
                          setShowUserDetailsModal(false);
                        }}
                      >
                        Approve ID Verification
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <button 
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                onClick={() => setShowUserDetailsModal(false)}
              >
                Close
              </button>
              <button 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                onClick={() => {
                  setShowUserDetailsModal(false);
                  handleSendMessage(selectedUser);
                }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Confirmation Modal */}
      {showBanConfirmModal && banUserData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">
                {banUserData.currentStatus === 'banned' ? 'Activate User' : 'Ban User'}
              </h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowBanConfirmModal(false);
                  setBanUserData(null);
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                {banUserData.currentStatus === 'banned' ? (
                  <CheckCircle2 size={48} className="text-green-500" />
                ) : (
                  <Ban size={48} className="text-red-500" />
                )}
              </div>
              
              <p className="text-center mb-2">
                Are you sure you want to {banUserData.currentStatus === 'banned' ? 'activate' : 'ban'} this user?
              </p>
              
              <p className="text-center font-medium">{banUserData.name}</p>
              
              {banUserData.currentStatus !== 'banned' && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Banning this user will prevent them from logging in and using the platform.
                </p>
              )}
            </div>
            
            <div className="flex justify-center gap-3">
              <button 
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                onClick={() => {
                  setShowBanConfirmModal(false);
                  setBanUserData(null);
                }}
              >
                Cancel
              </button>
              <button 
                className={`px-4 py-2 rounded-md transition-colors ${
                  banUserData.currentStatus === 'banned'
                    ? 'bg-gg-600 hover:bg-gg-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                onClick={confirmBanUser}
              >
                {banUserData.currentStatus === 'banned' ? 'Activate User' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Verification Confirmation Modal */}
      {showIdVerificationModal && idVerificationData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">
                {idVerificationData.action === 'approve' ? 'Approve ID Verification' : 'Revoke ID Verification'}
              </h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowIdVerificationModal(false);
                  setIdVerificationData(null);
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                {idVerificationData.action === 'approve' ? (
                  <CheckCircle2 size={48} className="text-green-500" />
                ) : (
                  <Ban size={48} className="text-red-500" />
                )}
              </div>
              
              <p className="text-center mb-2">
                Are you sure you want to {idVerificationData.action === 'approve' ? 'approve' : 'revoke'} this ID verification?
              </p>
              
              <p className="text-center font-medium">{idVerificationData.user.displayName}</p>
            </div>
            
            <div className="flex justify-center gap-3">
              <button 
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                onClick={() => {
                  setShowIdVerificationModal(false);
                  setIdVerificationData(null);
                }}
              >
                Cancel
              </button>
              <button 
                className={`px-4 py-2 rounded-md transition-colors ${
                  idVerificationData.action === 'approve'
                    ? 'bg-gg-600 hover:bg-gg-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                onClick={confirmIdVerification}
              >
                {idVerificationData.action === 'approve' ? 'Approve' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div 
          id="toast-notification"
          className="fixed bottom-4 right-4 z-50 animate-slide-up"
        >
          <div className={`flex items-center justify-between gap-2 px-4 py-3 rounded-md shadow-md ${
            toast.type === 'success' ? 'bg-gg-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 size={20} className="text-green-600" />
              ) : (
                <AlertCircle size={20} className="text-red-600" />
              )}
              <p>{toast.message}</p>
            </div>
            <button 
              onClick={hideToast}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 