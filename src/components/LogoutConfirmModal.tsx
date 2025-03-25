import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) {
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
              <Dialog.Panel className="w-[300px] transform overflow-hidden rounded-xl background backdrop-blur-xl text-center shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-foreground pt-4 px-4">
                  Sign Out
                </Dialog.Title>

                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to sign out?
                  </p>
                </div>

                <div className="border-t border-border">
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <button
                      type="button"
                      className="p-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="p-3 text-sm font-medium text-red-500 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        onConfirm();
                        onClose();
                      }}
                    >
                      Sign Out
                    </button>
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