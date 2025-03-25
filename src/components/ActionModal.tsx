import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  PauseIcon, 
  PlayIcon, 
  CheckCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFreeze: () => void;
  onMarkAsTaken: () => void;
  onDelete: () => void;
  status: 'active' | 'frozen' | 'taken';
}

export default function ActionModal({ 
  isOpen, 
  onClose, 
  onFreeze, 
  onMarkAsTaken, 
  onDelete,
  status 
}: ActionModalProps) {
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
          <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full sm:max-w-md transform overflow-hidden rounded-t-2xl sm:rounded-2xl background p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-foreground mb-4 px-2"
                >
                  Listing Actions
                </Dialog.Title>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      onFreeze();
                      onClose();
                    }}
                    className="w-full flex items-center px-4 py-4 sm:py-3 text-base sm:text-sm hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors"
                  >
                    {status === 'frozen' ? (
                      <>
                        <PlayIcon className="w-6 h-6 sm:w-5 sm:h-5 mr-4 sm:mr-3" />
                        <span>Unfreeze Listing</span>
                      </>
                    ) : (
                      <>
                        <PauseIcon className="w-6 h-6 sm:w-5 sm:h-5 mr-4 sm:mr-3" />
                        <span>Freeze Listing</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onMarkAsTaken();
                      onClose();
                    }}
                    className="w-full flex items-center px-4 py-4 sm:py-3 text-base sm:text-sm hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors"
                  >
                    <CheckCircleIcon className="w-6 h-6 sm:w-5 sm:h-5 mr-4 sm:mr-3" />
                    <span>
                      {status === 'taken' ? 'Mark as Available' : 'Mark as Taken'}
                    </span>
                  </button>

                  <div className="h-px bg-border my-2" />

                  <button
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                    className="w-full flex items-center px-4 py-4 sm:py-3 text-base sm:text-sm text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                  >
                    <TrashIcon className="w-6 h-6 sm:w-5 sm:h-5 mr-4 sm:mr-3" />
                    <span>Delete Listing</span>
                  </button>
                </div>

                <div className="mt-6 sm:mt-4">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center px-4 py-4 sm:py-2 text-base sm:text-sm font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors"
                    onClick={onClose}
                  >
                    Cancel
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