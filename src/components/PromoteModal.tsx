'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PricingPackage {
  name: string;
  price: number;
  features: string[];
  description: string;
  recommended?: boolean;
}

const pricingPackages: PricingPackage[] = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for getting started',
    features: [
      'Featured for 7 days',
      'Priority in search results',
      'Basic analytics',
      'Email support'
    ]
  },
  {
    name: 'Pro',
    price: 79,
    description: 'Most popular choice',
    features: [
      'Featured for 30 days',
      'Top of search results',
      'Advanced analytics',
      'Priority support',
      'Social media promotion',
      'Professional photography'
    ],
    recommended: true
  },
  {
    name: 'Business',
    price: 149,
    description: 'For serious sellers',
    features: [
      'Featured for 60 days',
      'Premium placement',
      'Real-time analytics',
      '24/7 dedicated support',
      'Marketing consultation',
      'Professional photography',
      'Virtual tours',
      'Custom promotion strategy'
    ]
  }
];

interface PromoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPackageSelect: (packageName: string) => void;
}

export default function PromoteModal({ isOpen, onClose, onPackageSelect }: PromoteModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={onClose}
      >
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl background border backdrop-blur-xl text-foreground p-6 shadow-xl transition-all">
                <div className="relative">
                  <Dialog.Title className="text-2xl font-semibold mb-2">
                    Promote Your Listing
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="absolute right-0 top-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  <p className="text-muted-foreground mb-6">
                    Choose a promotion package to increase your listing&apos;s visibility
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {pricingPackages.map((pkg) => (
                      <div 
                        key={pkg.name}
                        className={`relative border rounded-xl p-6 ${
                          pkg.recommended ? 'border-primary shadow-lg' : ''
                        }`}
                      >
                        {pkg.recommended && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-3 py-1 rounded-full">
                            Recommended
                          </span>
                        )}
                        <h3 className="text-xl font-semibold mb-2">{pkg.name}</h3>
                        <p className="text-muted-foreground text-sm mb-4">{pkg.description}</p>
                        <div className="text-2xl font-bold mb-6">
                          ₵{pkg.price}
                          <span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                        <ul className="space-y-3 mb-6">
                          {pkg.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-sm">
                              <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => onPackageSelect(pkg.name)}
                          className={`w-full py-2 rounded-lg font-medium transition-colors ${
                            pkg.recommended
                              ? 'bg-primary text-white hover:bg-primary/90'
                              : 'border border-primary text-primary hover:bg-primary/10'
                          }`}
                        >
                          Select {pkg.name}
                        </button>
                      </div>
                    ))}
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