/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useProfile } from '@/context/ProfileContext';
import { useUnreadCount } from "@/context/UnreadCountContext";
import { useLanguage } from '@/context/LanguageContext';
import { 
  MagnifyingGlassIcon, 
  UserCircleIcon,
  HeartIcon,
  PlusIcon,
  ChatBubbleLeftIcon as MessageSquare,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import LoginModal from './LoginModal';
import LogoutConfirmModal from './LogoutConfirmModal';
import SearchResultsPopup from './SearchResultsPopup';
import UserMenu from './UserMenu';
import LanguageModal from './LanguageModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { favorites, loading } = useFavorites();
  const { profilePhotoURL } = useProfile();
  const { labels } = useLanguage();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { totalUnreadCount } = useUnreadCount();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
      setCurrentDate(now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));
    };

    // Initial update
    updateTime();

    // Set up interval
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchPopupOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header 
      className={`sticky fixed top-0 transition-all duration-300 navbar background z-50`}
    >
      <div className="containe mx-auto px-4 py-2">

        {/* Mobile Layout: 2 columns */}
        <div className="grid md:hidden grid-cols-2 items-center">
          <Link href="/" className="flex ml-10 justify-start text-[#FF385C]">
            <Logo />
          </Link>
          
          <div className="flex items-center justify-end space-x-2">
            {/* <Link
              href="/favorites"
              className="relative p-2 hover:bg-accent rounded-full transition-colors"
              onClick={() => setIsSearchPopupOpen(true)}
            >
              <HeartIcon className="h-6 w-6 text-foreground" />
              {user && !loading && favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link> */}
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              aria-label={labels.shared.CHANGE_LANGUAGE}
            >
              <GlobeAltIcon className="h-6 w-6" />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Desktop Layout: 4 columns */}
        <div className="hidden md:grid grid-cols-4 items-center">
          <Link href="/" className="flex ml-14 justify-start text-[#FF385C]">
            <Logo />
          </Link>

          <div className="col-span-2 flex items-center justify-center">
            <div className="flex items-center gap-2 mr-4">
              <div className="text-sm font-bold bg-accent/10 px-3 py-1 rounded-md">
                {currentDate}
              </div>
              <div className="text-sm font-bold bg-accent/10 px-3 py-1 rounded-md">
                {currentTime}
              </div>
            </div>
            {/* <div className={`w-full max-w-xl flex items-center rounded-full hover:shadow-md transition cursor-pointer background/60 backdrop-blur-lg border-gray-500 search-input`}>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={labels.homePage.SEARCH_PLACEHOLDER}
                className="flex-1 h-[50px] px-4 outline-none bg-transparent text-sm rounded-l-full text-foreground placeholder:text-muted-foreground"
                onFocus={() => setIsSearchPopupOpen(true)}
              />
              <div className="pr-1">
                <button 
                  className="bg-[#FF385C] rounded-full p-3 hover:bg-[#FF385C]/90 transition-colors"
                  onClick={() => setIsSearchPopupOpen(true)}
                >
                  <MagnifyingGlassIcon className="h-5 w-5 text-white" />
                </button>
              </div>
            </div> */}
          </div>

          <div className="flex items-center justify-end space-x-4">

          {user && (
              <Link
                href="/edit/new"
                className="hidden md:flex items-center justify-center p-2 
                hover:bg-accent rounded-full transition-colors"
                aria-label="Add new listing"
              >
                <PlusIcon className="h-6 w-6 text-foreground" />
              </Link>
            )}

            {/* <Link
              href="/favorites"
              className="relative p-2 hover:bg-accent rounded-full transition-colors"
            >
              <HeartIcon className="h-6 w-6" />
              {user && !loading && favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link> */}

            <Link 
              href="/chat"
              className="relative p-2 hover:bg-accent rounded-full transition-colors hidden md:block"
            >
              <MessageSquare className="h-6 w-6" />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {totalUnreadCount}
                </span>
              )}
            </Link>

            {/* <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              aria-label={labels.shared.CHANGE_LANGUAGE}
            >
              <GlobeAltIcon className="h-6 w-6" />
            </button> */}

            <ThemeToggle />

            <button
              onClick={() => user ? setIsMenuModalOpen(true) : setIsLoginModalOpen(true)}
              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-full transition-colors"
            >
              {user && profilePhotoURL ? (
                <Image
                  src={profilePhotoURL}
                  alt={user.displayName || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <UserCircleIcon className="h-8 w-8" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search Results Popup */}
      {isSearchPopupOpen && (
        <SearchResultsPopup
          onClose={() => setIsSearchPopupOpen(false)}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
      )}

      {/* User Menu */}
      <UserMenu 
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        onLogoutClick={() => {
          setIsLogoutModalOpen(true);
          setIsMenuModalOpen(false);
        }}
        onLanguageClick={() => {
          setIsMenuModalOpen(false);
          setIsLanguageModalOpen(true);
        }}
      />

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
      
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />

      <LanguageModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />
    </header>
  );
} 