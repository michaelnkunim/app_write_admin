'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage, SupportedLanguage } from '@/context/LanguageContext';

interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' }
];

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const { language, setLanguage, labels } = useLanguage();

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    onClose();
  };

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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
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
                    aria-label={labels.shared.CLOSE}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  
                  <div className="p-6">
                    <Dialog.Title className="text-lg font-semibold mb-6">
                      {labels.shared.CHANGE_LANGUAGE}
                    </Dialog.Title>
                    
                    <div className="space-y-3 mt-4">
                      {languages.map((lang) => (
                        <button
                          key={lang.value}
                          className={`w-full text-left px-4 py-3 flex items-center space-x-3 rounded-lg transition-colors hover:bg-accent text-foreground ${
                            language === lang.value ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleLanguageChange(lang.value)}
                        >
                          <span className="text-2xl">{lang.flag}</span>
                          <span className="font-medium">{lang.label}</span>
                          {language === lang.value && (
                            <span className="ml-auto bg-primary text-white text-xs py-1 px-2 rounded-full">
                              {labels.shared.ACTIVE}
                            </span>
                          )}
                        </button>
                      ))}
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