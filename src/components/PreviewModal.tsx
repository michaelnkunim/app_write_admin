import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, TagIcon, MapPinIcon, CurrencyDollarIcon, HomeIcon, SquaresPlusIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { Listing } from '@/types/listing';
import ListingCard from './ListingCard';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
}

export default function PreviewModal({ isOpen, onClose, listing }: PreviewModalProps) {
  if (!listing) return null;

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
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6">
                    Preview Listing
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 hover:bg-accent transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Listing Card Preview - Show how it will appear in listings */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Listing Card View</h4>
                    <div className="max-w-sm mx-auto">
                      <ListingCard listing={listing} previewMode={true} galleryMode={true} />
                    </div>
                  </div>

                  {/* Detailed Information - Additional context */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Additional Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left column - General info */}
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h5 className="font-medium mb-3">General Information</h5>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="w-5 h-5 text-gray-500" />
                              <span>{listing.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TagIcon className="w-5 h-5 text-gray-500" />
                              <span>{listing.category[0]?.title || 'Uncategorized'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CurrencyDollarIcon className="w-5 h-5 text-gray-500" />
                              <span>GH₵ {listing.price.toLocaleString()}</span>
                            </div>
                            {listing.status && (
                              <div className="flex items-center gap-2">
                                <HomeIcon className="w-5 h-5 text-gray-500" />
                                <span className="capitalize">Status: {listing.status}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {listing.category[0]?.key === 'short-stay' && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h5 className="font-medium mb-3">Property Details</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-2">
                                <SquaresPlusIcon className="w-5 h-5 text-gray-500" />
                                <span>{listing.bedrooms || 'N/A'} Bedrooms</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <BeakerIcon className="w-5 h-5 text-gray-500" />
                                <span>{listing.bathrooms || 'N/A'} Bathrooms</span>
                              </div>
                              {listing.area && (
                                <div className="flex items-center gap-2 col-span-2">
                                  <span className="text-gray-500">Area:</span>
                                  <span>{listing.area} m²</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right column - Description */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium mb-3">Description</h5>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{listing.description}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors"
                    onClick={onClose}
                  >
                    Close Preview
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 