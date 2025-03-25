'use client';

import { memo, useState, Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useLanguage } from '@/context/LanguageContext';
import LoginModal from './LoginModal';
import LogoutConfirmModal from './LogoutConfirmModal';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  HeartIcon,
  UserCircleIcon,
  ChatBubbleBottomCenterIcon
} from '@heroicons/react/24/outline';
import SearchResultsPopup from './SearchResultsPopup';
import UserMenu from './UserMenu';
import { useUnreadCount } from "@/context/UnreadCountContext";
import LanguageModal from './LanguageModal';

// Define nav item types with string literals
type NavItemKey = 'HOME' | 'FAVORITES' | 'MESSAGE';

interface NavItem {
  href: string;
  labelKey: NavItemKey;
  icon: typeof HomeIcon;
}

const MobileToolbar = memo(function MobileToolbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { profilePhotoURL } = useProfile();
  const { totalUnreadCount } = useUnreadCount();
  const { labels } = useLanguage();
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  // Get translated labels for nav items
  const getNavLabel = (key: string): string => {
    switch (key) {
      case 'HOME':
        return labels.shared.HOME || 'Home';
      case 'FAVORITES':
        return labels.shared.FAVORITES || 'Favorites';
      case 'MESSAGE':
        return labels.shared.MESSAGE || 'Message';
      case 'SEARCH':
        return labels.shared.SEARCH || 'Search';
      case 'ADD':
        return labels.shared.ADD || 'Add';
      case 'PROFILE':
        return labels.shared.PROFILE || 'Profile';
      case 'LANGUAGE':
        return labels.shared.LANGUAGE || 'Language';
      default:
        return key;
    }
  };

  // Define navItems
  const navItems: NavItem[] = [
    {
      href: '/',
      labelKey: 'HOME',
      icon: HomeIcon
    },
    {
      href: '/favorites',
      labelKey: 'FAVORITES',
      icon: HeartIcon
    },
    {
      href: '/chat',
      labelKey: 'MESSAGE',
      icon: ChatBubbleBottomCenterIcon
    }
  ];

  // Hide toolbar if we're on a chat thread page
  if (pathname?.startsWith('/chat/')) {
    return null;
  }

  const handleProfileClick = () => {
    if (user) {
      setIsMenuModalOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleSearchClick = () => {
    setIsSearchPopupOpen(true);
  };

  const handleButtonClick = (buttonName: string) => {
    setActiveButton(buttonName);
  };

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 background border-t backdrop-blur-lg z-50 mobile-menu"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around relative">
          {navItems.slice(0, 1).map(({ href, labelKey, icon: Icon }) => {
            const translatedLabel = getNavLabel(labelKey);
            const isActive = activeButton === translatedLabel;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => handleButtonClick(translatedLabel)}
                className={`flex flex-col items-center p-2 py-3 transition-colors ${
                  isActive ? 'text-primary' : 'text-foreground hover:text-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1">{translatedLabel}</span>
              </Link>
            );
          })}

          <button
            onClick={() => {
              handleSearchClick();
              handleButtonClick(getNavLabel('SEARCH'));
            }}
            className={`flex flex-col items-center p-2 py-3 transition-colors ${
              activeButton === getNavLabel('SEARCH') ? 'text-primary' : 'text-foreground hover:text-primary'
            }`}
            aria-label="Search"
          >
            <MagnifyingGlassIcon className="h-6 w-6" />
            <span className="text-xs mt-1">{getNavLabel('SEARCH')}</span>
          </button>

          <Link
            href="/edit/new"
            onClick={() => handleButtonClick(getNavLabel('ADD'))}
            className={`flex flex-col items-center p-2 py-3 transition-colors ${
              activeButton === getNavLabel('ADD') ? 'text-primary' : 'text-foreground hover:text-primary'
            }`}
            aria-label="Add new listing"
          >
            <PlusCircleIcon className="h-6 w-6" />
            <span className="text-xs mt-1">{getNavLabel('ADD')}</span>
          </Link>

          {navItems.slice(2).map(({ href, labelKey, icon: Icon }) => {
            const translatedLabel = getNavLabel(labelKey);
            const isActive = activeButton === translatedLabel;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => handleButtonClick(translatedLabel)}
                className={`flex flex-col items-center p-2 py-3 transition-colors relative ${
                  isActive ? 'text-primary' : 'text-foreground hover:text-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1">{translatedLabel}</span>
                {labelKey === 'MESSAGE' && totalUnreadCount > 0 && (
                  <span className="absolute top-2 right-0 -ml-2 bg-red-500 text-white text-xs rounded-full px-2" style={{marginLeft: "-3px"}}>
                    {totalUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}

          <button
            onClick={() => {
              handleProfileClick();
              handleButtonClick(getNavLabel('PROFILE'));
            }}
            className={`flex flex-col items-center p-2 py-3 transition-colors ${
              activeButton === getNavLabel('PROFILE') ? 'text-primary' : 'text-foreground hover:text-primary'
            }`}
            aria-label="Profile"
          >
            {user && profilePhotoURL ? (
              <Image
                src={profilePhotoURL}
                alt={user.displayName || 'User'}
                width={24}
                height={24}
                className="rounded-full h-6 w-6 object-cover"
              />
            ) : (
              <UserCircleIcon className="h-6 w-6" />
            )}
            <span className="text-xs mt-1">{getNavLabel('PROFILE')}</span>
          </button>
        </div>
      </nav>

      {/* User Menu Modal */}
      {isMenuModalOpen && (
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
      )}

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
      
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />

      {/* Search Popup */}
      {isSearchPopupOpen && (
        <SearchResultsPopup 
          onClose={() => setIsSearchPopupOpen(false)}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
      )}

      {/* Language Modal */}
      <LanguageModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />
    </>
  );
});

export default MobileToolbar; 