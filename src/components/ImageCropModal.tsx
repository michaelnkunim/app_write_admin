'use client';

import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: Blob) => void;
  imageFile: File;
  aspectRatio?: number;
  circularCrop?: boolean;
}

export default function ImageCropModal({
  isOpen,
  onClose,
  onCropComplete,
  imageFile,
  aspectRatio,
  circularCrop = false,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: aspectRatio ? 90 / aspectRatio : 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSrc, setImgSrc] = useState<string>('');

  // Load image when file changes
  useEffect(() => {
    if (!imageFile) return;
    
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() || '');
    });
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    if (circularCrop) {
      ctx.beginPath();
      ctx.arc(
        completedCrop.width / 2,
        completedCrop.height / 2,
        Math.min(completedCrop.width, completedCrop.height) / 2,
        0,
        2 * Math.PI
      );
      ctx.clip();
    }

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      onCropComplete(blob);
      onClose();
    }, 'image/jpeg', 0.95);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
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

        <div className="fixed inset-0 overflow-y-auto z-[101]">
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl background border shadow-xl transition-all backdrop-blur-xl flex flex-col">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 p-6 pb-0">
                  Crop Image
                </Dialog.Title>

                <div className="flex-1 overflow-y-auto p-6">
                  {imgSrc && (
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={aspectRatio}
                      circularCrop={circularCrop}
                    >
                      <img
                        ref={imgRef}
                        src={imgSrc}
                        alt="Crop preview"
                        className="max-h-[calc(100vh-16rem)] w-auto mx-auto"
                      />
                    </ReactCrop>
                  )}
                </div>

                <div className="p-6 pt-0 flex justify-end space-x-3 border-t background border shadow-xl backdrop-blur-xl">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    onClick={handleCropComplete}
                  >
                    Apply
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