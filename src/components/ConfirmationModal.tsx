'use client';

import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

/**
 * A reusable confirmation modal component that can be used throughout the application
 * to replace JavaScript alerts and confirms with a more styled and consistent UI
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className="mt-2">
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`inline-flex justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md focus:outline-none ${confirmButtonClass}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 