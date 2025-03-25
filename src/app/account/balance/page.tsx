'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserBalance, getUserTransactions, Transaction } from '@/lib/transactions';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import TopUpModal from '@/components/TopUpModal';
import { toast } from 'sonner';
import RouteGuard from '@/components/RouteGuard';

interface Balance {
  currentBalance: number;
  pendingBalance: number;
  currency: string;
}

export default function AccountBalancePage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPerPage, setTransactionsPerPage] = useState(6);
  const [showPerPageDropdown, setShowPerPageDropdown] = useState(false);
  
  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Reset to page 1 when transactions per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [transactionsPerPage]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPerPageDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle scroll for sticky effect
  useEffect(() => {
    const handleScroll = () => {
      if (stickyRef.current) {
        const scrollPosition = window.scrollY;
        const threshold = 100; // Adjust this value as needed
        setIsSticky(scrollPosition > threshold);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load balance
      const userBalance = await getUserBalance(user.uid);
      setBalance(userBalance);

      // Load transactions
      const userTransactions = await getUserTransactions(user.uid);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load account data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopUp = () => {
    setIsTopUpModalOpen(true);
  };

  const handleTopUpSuccess = async (amount: number) => {
    if (!user) return;

    try {
      // Reload user data after successful top-up
      await loadUserData();
      toast.success(`Successfully added ₵${amount} to your account`);
    } catch (error) {
      console.error('Error reloading user data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (transaction: Transaction) => {
    return transaction.type === 'credit' ? (
      <ArrowUpIcon className="w-6 h-6 text-green-500" />
    ) : (
      <ArrowDownIcon className="w-6 h-6 text-red-500" />
    );
  };

  const getTransactionDetails = (transaction: Transaction) => {
    const amount = formatCurrency(transaction.amount);
    const formattedDate = formatDate(transaction.date);
    const isCredit = transaction.type === 'credit';
    const amountClass = isCredit ? 'text-green-500' : 'text-red-500';

    return {
      amount,
      formattedDate,
      amountClass
    };
  };

  const renderTransaction = (transaction: Transaction) => {
    const { amount, formattedDate, amountClass } = getTransactionDetails(transaction);
    
    // Extract just the amount number for mobile display
    const amountValue = amount.replace(/[^\d.,]/g, '');
    const currencySymbol = amount.replace(/[\d.,]/g, '').trim();

    return (
      <div
        className="flex items-center justify-between p-4 gap-2"
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
          <div className="flex-shrink-0 p-2 rounded-full bg-accent">
            {getTransactionIcon(transaction)}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="font-medium text-foreground truncate">{transaction.description}</p>
            <p className="text-sm text-muted-foreground truncate">{formattedDate}</p>
          </div>
        </div>
        <div className={`flex-shrink-0 text-right ${amountClass}`}>
          {/* Desktop view */}
          <p className="font-semibold whitespace-nowrap hidden sm:block">
            {transaction.type === 'credit' ? '+' : '-'}{amount}
          </p>
          
          {/* Mobile view - more compact */}
          <p className="font-semibold whitespace-nowrap sm:hidden">
            <span className="inline-block min-w-[20px] text-center">{transaction.type === 'credit' ? '+' : '-'}</span>
            <span className="text-xs mr-1">{currencySymbol}</span>
            <span>{amountValue}</span>
          </p>
          
          <p className="text-xs text-muted-foreground whitespace-nowrap hidden xs:block">
            {transaction.type === 'credit' ? 'Credit' : 'Debit'}
          </p>
        </div>
      </div>
    );
  };

  // Get current transactions for pagination
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalPages = Math.ceil(transactions.length / transactionsPerPage);

  // Change page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePerPageChange = (perPage: number) => {
    setTransactionsPerPage(perPage);
    setShowPerPageDropdown(false);
  };

  const renderTransactionsList = (transactions: Transaction[]) => {
    if (isLoading) {
      return (
        <div className="py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
      );
    }
    
    if (transactions.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No transactions yet
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {transactions.map(transaction => (
          <div key={transaction.id}>
            {renderTransaction(transaction)}
          </div>
        ))}
      </div>
    );
  };

  // Pagination controls
  const renderPagination = () => {
    if (totalPages <= 1 && transactions.length <= 6) return null;

    // Generate page numbers
    const pageNumbers = [];
    const maxPageButtons = 5; // Maximum number of page buttons to show
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-border p-4">
        <div className="flex items-center space-x-2 mb-4 sm:mb-0">
          <span className="text-sm text-muted-foreground">Show</span>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowPerPageDropdown(!showPerPageDropdown)}
              className="px-3 py-1 border border-border rounded-md text-sm flex items-center"
            >
              {transactionsPerPage}
              <ChevronDownIcon className="w-4 h-4 ml-1" />
            </button>
            {showPerPageDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10">
                {[6, 12, 24, 48].map(number => (
                  <button
                    key={number}
                    onClick={() => handlePerPageChange(number)}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                      transactionsPerPage === number ? 'bg-accent/50' : ''
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="text-sm text-muted-foreground">
            Showing {indexOfFirstTransaction + 1}-{Math.min(indexOfLastTransaction, transactions.length)} of {transactions.length} transactions
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-md ${currentPage === 1 ? 'text-muted-foreground cursor-not-allowed' : 'text-foreground hover:bg-accent'}`}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            
            {/* Page numbers */}
            <div className="hidden sm:flex space-x-1">
              {startPage > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentPage(1)} 
                    className={`px-3 py-1 rounded-md text-sm ${currentPage === 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  >
                    1
                  </button>
                  {startPage > 2 && <span className="px-1">...</span>}
                </>
              )}
              
              {pageNumbers.map(number => (
                <button
                  key={number}
                  onClick={() => setCurrentPage(number)}
                  className={`px-3 py-1 rounded-md text-sm ${currentPage === number ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {number}
                </button>
              ))}
              
              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && <span className="px-1">...</span>}
                  <button 
                    onClick={() => setCurrentPage(totalPages)} 
                    className={`px-3 py-1 rounded-md text-sm ${currentPage === totalPages ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            {/* Mobile view - just show current/total */}
            <span className="sm:hidden text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-md ${currentPage === totalPages ? 'text-muted-foreground cursor-not-allowed' : 'text-foreground hover:bg-accent'}`}
              aria-label="Next page"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleRefresh = async () => {
    await loadUserData();
    toast.success('Transactions refreshed');
  };

  return (
    <RouteGuard requireUserType="provider">
      <div className="container mx-auto px-4 py-3">
        <div className="max-w-4xl mx-auto">
          {/* Title - Hidden when sticky on mobile */}
          <h1 className={`text-2xl font-semibold mb-6 transition-opacity duration-300 ${
            isSticky ? 'md:block hidden' : 'block'
          }`}>Account Balance</h1>

          {/* Balance Card - Now sticky with improved styling and scroll effect */}
          <div 
            ref={stickyRef}
            className={`sticky top-0 z-10 pt-4 pb-2 bg-background transition-all duration-300 ${
              isSticky ? 'shadow-md' : ''
            }`}
          >
            <div 
              className={`bg-primary text-primary-foreground rounded-xl p-6 mb-1 shadow-lg transition-all duration-300 ${
                isSticky ? 'transform-gpu -translate-y-1 scale-[0.98] md:mb-3' : 'mb-3'
              }`}
            >
              {/* Show title in the sticky header on mobile */}
              {isSticky && (
                <div className="md:hidden mb-2 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-primary-foreground">Account Balance</h2>
                </div>
              )}
              
              {/* Balance and Top-up button - always horizontal on all screen sizes */}
              <div className="flex flex-row justify-between items-end gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm opacity-90 whitespace-nowrap mb-1">Current Balance</p>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <p className="text-lg sm:text-2xl md:text-3xl font-bold truncate">Loading...</p>
                    </div>
                  ) : (
                    <p className="text-lg sm:text-2xl md:text-3xl font-bold truncate">
                      {balance ? formatCurrency(balance.currentBalance) : '₵0.00'}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleTopUp}
                  className={`whitespace-nowrap px-3 sm:px-6 py-1.5 sm:py-2 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition-all duration-300 shadow-sm hover:shadow text-sm sm:text-base ${
                    isSticky ? 'scale-95 sm:scale-100' : ''
                  }`}
                  disabled={isLoading}
                >
                  Top Up
                </button>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className={`bg-card rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
            isSticky ? 'mt-2' : 'mt-4'
          }`}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <button 
                onClick={handleRefresh} 
                disabled={isLoading}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="Refresh transactions"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {renderTransactionsList(currentTransactions)}
            {!isLoading && renderPagination()}
          </div>
        </div>

        <TopUpModal
          isOpen={isTopUpModalOpen}
          onClose={() => setIsTopUpModalOpen(false)}
          onSuccess={handleTopUpSuccess}
        />
        <br/>
        <br/>
        <br/>
      </div>
    </RouteGuard>
  );
} 