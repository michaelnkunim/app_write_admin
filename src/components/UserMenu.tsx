'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useProfile } from '@/context/ProfileContext';
import { useRouter } from 'next/navigation';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import {
  UserIcon,
  Cog6ToothIcon,
  RectangleGroupIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  WalletIcon,
  HeartIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
  onLanguageClick?: () => void;
}


export default function UserMenu({ isOpen, onClose, onLogoutClick, onLanguageClick }: UserMenuProps) {
  const { user } = useAuth();
  const { profilePhotoURL } = useProfile();
  const { labels } = useLanguage();
  const router = useRouter();
  const userType = user?.userType;
  const isAdmin = user?.isAdmin === true;
 

  const menuItems = userType === 'seeker' || userType == undefined
? [
    { label: 'Dashboard', href: '/dashboard', icon: RectangleGroupIcon },
    { label: 'Favorites', href: '/favorites', icon: HeartIcon },
  ]
: [
    { label: 'Dashboard', href: '/dashboard', icon: RectangleGroupIcon },
    { label: 'My Listings', href: '/my-listings', icon: 
    ClipboardDocumentListIcon },
    { label: 'Favorites', href: '/favorites', icon: HeartIcon },
    // { label: 'Profile', href: '/profile', icon: UserIcon },
    { label: 'Account', href: '/account', icon: Cog6ToothIcon },
    { label: 'Account Balance', href: '/account/balance', icon: 
    WalletIcon },
  ];

  // Add admin link if user is an admin
  if (isAdmin) {
    menuItems.unshift({ label: 'Admin Dashboard', href: '/admin', icon: ShieldCheckIcon });
  }

  async function resetUserTypeInDB(user: any) {
    const db = getFirestore();
    const userRef = doc(db, 'users', user.id);

    try {
      await updateDoc(userRef, {
        role: 'propertyProvider'
      });
    } catch (error) {
      console.error("Error updating user type: ", error);
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl background border shadow-xl transition-all backdrop-blur-xl">
                <div className="relative">
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  
                  <div className="p-6">
                    <div className="flex items-center space-x-4 mb-6">
                      {profilePhotoURL ? (
                        <Image
                          src={profilePhotoURL}
                          alt={user?.displayName || 'User'}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <UserCircleIcon className="h-12 w-12 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <h2 className="font-medium">{user?.displayName || 'User'}</h2>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {menuItems.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center w-full px-4 py-3 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                          onClick={onClose}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </Link>
                      ))}

                      {onLanguageClick && (
                        <button
                          className="flex items-center w-full px-4 py-3 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                          onClick={onLanguageClick}
                        >
                          <GlobeAltIcon className="h-5 w-5 mr-3" />
                          {labels.shared.CHANGE_LANGUAGE}
                        </button>
                      )}

                      {(userType === 'seeker' || !userType) && (
                        <button
                          className="mt-4 w-full px-4 py-2 text-sm text-gray-900 border border-gray-900 rounded-lg bg-transparent hover:bg-gray-900 hover:text-white transition-colors"
                          onClick={async () => {
                            if (user && user.id) {
                              await resetUserTypeInDB(user);
                              router.push('/onboarding');
                              onClose();
                            }
                          }}
                        >
                          Switch to Property Provider
                        </button>
                      )}
                    </div>

                    <div className="mt-6 pt-6 border-t ">
                      <button
                        onClick={() => {
                          onLogoutClick();
                          onClose();
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 