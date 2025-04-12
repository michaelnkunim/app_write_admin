'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAdminApp } from '@/context/AdminAppContext';
import { ArrowsRightLeftIcon, XMarkIcon, CheckIcon, Cog6ToothIcon, SwatchIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';

interface AppSwitcherProps {
  onClose?: () => void;
}

export default function AppSwitcher({ onClose }: AppSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { apps, selectedAppId, setSelectedAppId, loading } = useAdminApp();
  const { theme } = useTheme();
  const currentMode = theme === 'dark' ? 'dark' : 'light';

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleAppSelect = (appId: string) => {
    setSelectedAppId(appId);
    handleCloseModal();
  };

  const selectedApp = apps.find(app => app.id === selectedAppId);

  return (
    <>
      <button 
        onClick={handleOpenModal}
        className="flex items-center w-full px-2 py-3 rounded-md hover:bg-accent/50 transition-colors"
        aria-label="Switch app"
      >
        <div className="flex items-center w-full">
          {selectedApp?.logoUrl ? (
            <div className="w-8 h-8 rounded-md overflow-hidden mr-3 border flex-shrink-0">
              <Image 
                src={selectedApp.logoUrl} 
                alt={selectedApp.name} 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center bg-accent rounded-md mr-3 flex-shrink-0">
              <ArrowsRightLeftIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {selectedApp?.name || 'Select App'}
            </div>
            {/* {selectedApp?.domain && (
              <div className="text-xs text-muted-foreground truncate">
                {selectedApp.domain}
              </div>
            )} */}
          </div>
          <div className="ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleCloseModal}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-background border shadow-xl transition-all">
                  <div className="relative">
                    <button
                      onClick={handleCloseModal}
                      className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                    
                    <div className="p-6">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold mb-6"
                      >
                        Switch App
                      </Dialog.Title>

                      {loading ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-accent animate-pulse rounded-lg"></div>
                          ))}
                        </div>
                      ) : apps.length > 0 ? (
                        <div className="space-y-2">
                          {apps.map((app) => (
                            <button
                              key={app.id}
                              onClick={() => handleAppSelect(app.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors ${
                                selectedAppId === app.id ? 'bg-accent/50 border-primary' : ''
                              }`}
                            >
                              <div className="flex items-center">
                                {app.logoUrl ? (
                                  <div className="w-10 h-10 rounded-md overflow-hidden mr-3 bg-white flex items-center justify-center">
                                    <Image 
                                      src={app.logoUrl} 
                                      alt={app.name} 
                                      width={40} 
                                      height={40} 
                                      className="object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center mr-3">
                                    <ArrowsRightLeftIcon className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="text-left">
                                  <div className="font-medium">{app.name}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {app.domain || 'No domain set'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {app.theme && (
                                  <div 
                                    className="w-5 h-5 rounded-full mr-2" 
                                    style={{ backgroundColor: app.theme[currentMode].primary }}
                                    title="App theme will be applied"
                                  >
                                    <SwatchIcon className="w-3 h-3 text-white m-1" />
                                  </div>
                                )}
                                {selectedAppId === app.id && (
                                  <CheckIcon className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No apps available.</p>
                          <Link
                            href="/admin/apps"
                            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md"
                            onClick={handleCloseModal}
                          >
                            <Cog6ToothIcon className="h-5 w-5 mr-2" />
                            Manage Apps
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
} 