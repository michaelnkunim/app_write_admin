/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, Fragment, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { 
  PhotoIcon,
  CurrencyDollarIcon,
  TagIcon,
  ExclamationCircleIcon,
  CheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Dialog, Transition } from '@headlessui/react';
import ListingCard from '@/components/ListingCard';
import { saveListing, getListing } from '@/lib/listings';
import { updateUserBalance, saveTransaction } from '@/lib/transactions';
import DraggableImageList from '@/components/DraggableImageList';
import type { Listing } from '@/types/listing';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { categories, Category } from '@/data/categories';
import { useLanguage } from '@/context/LanguageContext';

interface PageParams {
  id: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    currencyDisplay: 'symbol'
  }).format(amount).replace('GHS', '₵');
};

interface EditableListingData {
  id?: string;
  title: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  amenities: string[];
  category: Category[];
  coordinates: {
    lat: number;
    lng: number;
  };
  bathrooms?: number;
  bedrooms?: number;
  area?: number;
  propertyType: string;
  promotionPackage?: string;
  status?: 'active' | 'frozen' | 'pending' | 'taken';
  published?: boolean;
  views?: number;
  rating?: number;
  reviews?: number;
  host?: {
    id: string;
    name: string;
    image: string;
    rating?: number;
    reviews?: number;
    experience?: number;
    phone?: string;
    specialties?: string[];
    description?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES: Category[] = categories;

const pricingPackages = [
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

const DEFAULT_LISTING: EditableListingData = {
  title: '',
  description: '',
  price: 0,
  location: '',
  images: [],
  amenities: [],
  category: [{ title: CATEGORIES[1].title, key: CATEGORIES[1].key }],
  coordinates: {
    lat: 0,
    lng: 0
  },
  bathrooms: 1,
  bedrooms: 1,
  area: 0,
  propertyType: 'apartment',
  promotionPackage: 'Starter'
};

const AMENITY_OPTIONS = [
  'WiFi',
  'Kitchen',
  'Free Parking',
  'Pool',
  'Air Conditioning',
  'Heating',
  'Washer/Dryer',
  'TV',
  'Gym',
  'Hot Tub',
  'Mountain View',
  'Ocean View',
  'City View',
  'Garden',
  'BBQ Grill',
  'Fire Pit',
  'Beach Access',
  'Ski Access'
];

interface UploadProgress {
  file: File;
  progress: number;
  url?: string;
}

type SingleValue<T> = T | null;

const PROPERTY_TYPES = [
  { key: 'apartment', name: 'Apartment' },
  { key: 'duplex', name: 'Duplex' },
  { key: 'house', name: 'House' },
  { key: 'room-and-parlour', name: 'Room & Parlour' },
  { key: 'townhouse-terrace', name: 'Townhouse / Terrace' },
  { key: 'mansion', name: 'Mansion' },
  { key: 'mini-flat', name: 'Mini Flat' },
  { key: 'studio-apartment', name: 'Studio Apartment' },
  { key: 'office-space', name: 'Office Space' },
  { key: 'commercial-space', name: 'Commercial Space' },
  { key: 'villa', name: 'Villa' },
  { key: 'penthouse', name: 'Penthouse' },
  { key: 'bungalow', name: 'Bungalow' },
  { key: 'land', name: 'Land' },
  { key: 'farm-land', name: 'Farm Land' }
];

export default function EditListingPage({ params }: Readonly<{ params: Promise<PageParams> }>) {
  const { id } = use(params);
  const router = useRouter();
  const { user, balance } = useAuth();
  const { labels } = useLanguage();
  const Labels = labels.editListingPage;
  const isNewListing = id === 'new';
  const [listing, setListing] = useState<EditableListingData>(DEFAULT_LISTING);
  const [errors, setErrors] = useState<Partial<Record<keyof EditableListingData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSuccessfullySubmitted, setHasSuccessfullySubmitted] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedListing, setSavedListing] = useState<Listing | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [labelsLoaded, setLabelsLoaded] = useState(false);

  // Add a log to see if labels are loading properly
  useEffect(() => {
    if (labels && labels.editListingPage) {
      console.log("Edit page labels loaded:", labels.editListingPage);
      setLabelsLoaded(true);
    } else {
      console.log("Edit page labels not loaded yet");
    }
  }, [labels]);

  // Add a function to reset the form to default values
  const resetForm = () => {
    setListing(DEFAULT_LISTING);
    setSelectedAmenities(new Set());
    setErrors({});
  };

  // Function to check if a draft exists
  const checkForDraft = () => {
    const draftExists = localStorage.getItem('editListingFormData') !== null;
    setHasDraft(draftExists);
    return draftExists;
  };

  const clearSavedFormData = () => {
    localStorage.removeItem('editListingFormData');
    setHasSuccessfullySubmitted(true);
    resetForm();
    setHasDraft(false);
    toast.success(Labels.DRAFT_DELETED);
  };

  // Effect that runs on component mount to clear drafts when viewing an existing listing
  useEffect(() => {
    // If we're viewing an existing listing (not creating a new one),
    // clear any draft data to prevent it from being restored when creating a new listing later
    if (!isNewListing) {
      localStorage.removeItem('editListingFormData');
      setHasDraft(false);
    } else {
      // Check if there's a draft when loading a new listing
      checkForDraft();
    }
  }, [isNewListing]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const loadListing = async () => {
      if (!isNewListing) {
        try {
          const existingListing = await getListing(id);
          if (existingListing) {
            setListing({
              id: existingListing.id,
              title: existingListing.title,
              description: existingListing.description,
              price: existingListing.price,
              location: existingListing.location,
              images: existingListing.images,
              amenities: existingListing.amenities,
              category: existingListing.category,
              coordinates: existingListing.coordinates,
              promotionPackage: existingListing.promotionPackage,
              status: existingListing.status,
              published: existingListing.published,
              views: existingListing.views,
              rating: existingListing.rating,
              reviews: existingListing.reviews,
              host: existingListing.host,
              createdAt: existingListing.createdAt,
              updatedAt: existingListing.updatedAt,
              bathrooms: existingListing.bathrooms,
              bedrooms: existingListing.bedrooms,
              area: existingListing.area,
              propertyType: existingListing.propertyType || 'Apartment'
            });
            setSelectedAmenities(new Set(existingListing.amenities));
          }
        } catch (error) {
          console.error('Error loading listing:', error);
          toast.error('Failed to load listing');
        }
      } else {
        // Reset form when creating a new listing
        resetForm();
        setHasSuccessfullySubmitted(false); // Reset submission status for new listings
      }
    };

    loadListing();
  }, [isNewListing, id, user, router]);

  useEffect(() => {
    if (isNewListing && !hasSuccessfullySubmitted) {
      const savedData = localStorage.getItem('editListingFormData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setListing(prevListing => ({
            ...prevListing,
            ...parsedData
          }));
          
          // Restore amenities if they exist
          if (parsedData.amenities && Array.isArray(parsedData.amenities)) {
            setSelectedAmenities(new Set(parsedData.amenities));
          }
          
          setHasDraft(true);
          toast.info('Restored your previous draft');
        } catch (error) {
          console.error('Error parsing saved listing data:', error);
        }
      }
    }
  }, [isNewListing, hasSuccessfullySubmitted]);

  useEffect(() => {
    // Only save if there's actual data entered (not just the default) and we haven't just submitted successfully
    if (hasSuccessfullySubmitted) return;
    
    const hasUserEnteredData = 
      listing.title !== DEFAULT_LISTING.title || 
      listing.description !== DEFAULT_LISTING.description ||
      listing.price !== DEFAULT_LISTING.price ||
      listing.location !== DEFAULT_LISTING.location ||
      listing.images.length > 0 ||
      selectedAmenities.size > 0;
    
    if (hasUserEnteredData) {
      const dataToSave = {
        ...listing,
        amenities: Array.from(selectedAmenities)
      };
      localStorage.setItem('editListingFormData', JSON.stringify(dataToSave));
      setHasDraft(true);
    }
  }, [listing, selectedAmenities, hasSuccessfullySubmitted]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof EditableListingData, string>> = {};
    
    if (!listing.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!listing.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!listing.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (listing.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (listing.images.length === 0) {
      newErrors.images = 'At least one image is required';
    }
    if (selectedAmenities.size === 0) {
      newErrors.amenities = 'Select at least one amenity';
    }
    if (!listing.propertyType) {
      newErrors.propertyType = 'Property type is required';
    }

    // Only validate promotion package for new listings or listings without an existing package
    if ((isNewListing || (!isNewListing && !listing.id)) && !listing.promotionPackage) {
      newErrors.promotionPackage = 'Please select a promotion package';
    } else if (listing.promotionPackage) {
      const selectedPackage = pricingPackages.find(pkg => pkg.name === listing.promotionPackage);
      if (selectedPackage && (balance?.currentBalance || 0) < selectedPackage.price) {
        newErrors.promotionPackage = 'Insufficient balance for the selected promotion package';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImage = async (file: File, onProgress: (progress: number) => void): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const fileName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `listings/${user.uid}/${fileName}`);
    
    try {
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Error uploading image:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 6 - listing.images.length;
    if (remainingSlots <= 0) {
      toast.error('Maximum 6 images allowed');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    
    // Initialize upload queue
    setUploadQueue(filesToUpload.map(file => ({
      file,
      progress: 0
    })));

    // Upload files sequentially
    for (const file of filesToUpload) {
      try {
        const url = await uploadImage(file, (progress) => {
          setUploadQueue(prev => prev.map(item => 
            item.file === file ? { ...item, progress } : item
          ));
        });

        setListing(prev => ({
          ...prev,
          images: [...prev.images, url]
        }));

        // Remove from queue when complete
        setUploadQueue(prev => prev.filter(item => item.file !== file));
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (droppedFiles.length === 0) {
      toast.error('Please drop only image files');
      return;
    }

    const remainingSlots = 6 - listing.images.length;
    if (remainingSlots <= 0) {
      toast.error('Maximum 6 images allowed');
      return;
    }

    const filesToUpload = droppedFiles.slice(0, remainingSlots);
    setIsUploading(true);
    
    // Initialize upload queue
    setUploadQueue(filesToUpload.map(file => ({
      file,
      progress: 0
    })));

    // Upload files sequentially
    for (const file of filesToUpload) {
      try {
        const url = await uploadImage(file, (progress) => {
          setUploadQueue(prev => prev.map(item => 
            item.file === file ? { ...item, progress } : item
          ));
        });

        setListing(prev => ({
          ...prev,
          images: [...prev.images, url]
        }));

        // Remove from queue when complete
        setUploadQueue(prev => prev.filter(item => item.file !== file));
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check if we need to process a promotion package payment
      const shouldProcessPromotion = isNewListing || (!isNewListing && !listing.id);
      const selectedPackage = pricingPackages.find(pkg => pkg.name === listing.promotionPackage);
      
      // Check if user has sufficient balance for the selected package
      const packagePrice = selectedPackage?.price || 0;
      const userBalance = balance?.currentBalance || 0;
      
      if (shouldProcessPromotion && selectedPackage && userBalance < packagePrice) {
        toast.error(`Insufficient balance. You need ₵${packagePrice} for the ${selectedPackage.name} package.`);
        setInsufficientBalance(true);
        setRequiredAmount(packagePrice);
        setIsSubmitting(false);
        return;
      } else {
        setInsufficientBalance(false);
      }
      
      if (shouldProcessPromotion && selectedPackage) {
        // Update user balance
        await updateUserBalance(user.uid, {
          currentBalance: -packagePrice // Deduct the package price
        });

        // Save transaction record
        await saveTransaction(user.uid, {
          userId: user.uid,
          amount: packagePrice,
          type: 'debit',
          description: `Promotion package: ${selectedPackage.name} for listing`,
          date: new Date().toISOString(),
          status: 'completed',
          reference: `promo_${Date.now()}`
        });
      }

      const now = new Date().toISOString();
      const listingData = {
        ...listing,
        id: listing.id || '', // Will be replaced by Firestore for new listings
        amenities: Array.from(selectedAmenities),
        rating: 0,
        reviews: 0,
        image: listing.images[0] || '',
        status: 'active' as const,
        published: true,
        views: 0,
        createdAt: listing.createdAt || now,
        updatedAt: now,
        host: {
          id: user.uid,
          name: user.displayName ?? 'Anonymous',
          image: user.photoURL ?? 'https://via.placeholder.com/150',
          rating: 0,
          reviews: 0,
          experience: 0,
          phone: '',
          specialties: [],
          description: ''
        }
      } satisfies Listing;
      
      // Save to Firebase - let Firestore generate ID for new listings
      const savedId = await saveListing(isNewListing ? { ...listingData, id: '' } : listingData);
      
      // Update the listing data with the new ID for new listings
      const finalListingData: Listing = {
        ...listingData,
        id: savedId
      };

      // Always immediately clear the localStorage data to prevent drafts persisting
      localStorage.removeItem('editListingFormData');

      // Show success toast
      toast.success(isNewListing ? Labels.CREATED_SUCCESS : Labels.UPDATED_SUCCESS);
      
      // Set saved listing and show modal
      setSavedListing(finalListingData);
      setShowSuccessModal(true);
      setHasSuccessfullySubmitted(true);
      setHasDraft(false);

      // Redirect to edit page with the saved ID
      router.push(`/edit/${savedId}`);
    } catch (error) {
      console.error('Error saving listing:', error);
      toast.error('Failed to save listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeImage = (index: number) => {
    setListing(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = new Set(selectedAmenities);
    if (newAmenities.has(amenity)) {
      newAmenities.delete(amenity);
    } else {
      newAmenities.add(amenity);
    }
    setSelectedAmenities(newAmenities);
  };

  const handlePromotionSelect = (pkg: typeof pricingPackages[number]) => {
    setListing(prev => ({ ...prev, promotionPackage: pkg.name }));
    
    // Check if user has sufficient balance for the selected package
    const packagePrice = pkg.price || 0;
    const userBalance = balance?.currentBalance || 0;
    
    if (userBalance < packagePrice) {
      toast.warning(`Your balance (₵${userBalance}) is less than the package price (₵${packagePrice})`);
      setInsufficientBalance(true);
      setRequiredAmount(packagePrice);
    } else {
      setInsufficientBalance(false);
    }
  };

  const handleImageReorder = (newImages: string[]) => {
    setListing(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const addCustomAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAmenity.trim()) {
      const amenity = newAmenity.trim();
      setSelectedAmenities(prev => new Set([...prev, amenity]));
      if (!AMENITY_OPTIONS.includes(amenity)) {
        AMENITY_OPTIONS.unshift(amenity);
      }
      setNewAmenity('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomAmenity(e as any);
    }
  };

  // Function to get the appropriate price label based on the category
  const getPriceLabel = () => {
    const categoryKey = listing.category[0]?.key;
    switch (categoryKey) {
      case 'sale':
        return Labels.PRICE;
      case 'rent':
        return Labels.PRICE_PER_MONTH;
      case 'short-stays':
      case 'short-stay':
        return Labels.PRICE_PER_NIGHT;
      default:
        return Labels.PRICE;
    }
  };

  // Add a debug effect to log balance and package prices
  useEffect(() => {
    if (listing.promotionPackage) {
      const selectedPackage = pricingPackages.find(pkg => pkg.name === listing.promotionPackage);
      if (selectedPackage) {
        console.log('Debug - Selected package:', selectedPackage.name);
        console.log('Debug - Package price:', selectedPackage.price);
        console.log('Debug - User balance:', balance?.currentBalance);
        
        // Log the comparison result
        const hasEnoughBalance = (balance?.currentBalance || 0) >= selectedPackage.price;
        console.log('Debug - Has enough balance:', hasEnoughBalance);
      }
    }
  }, [listing.promotionPackage, balance]);

  if (!user) {
    return null;
  }

  // Add conditional rendering based on labels loading
  if (!labelsLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
        </div>
        <p className="mt-4 text-muted-foreground">Loading listing data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end items-center mb-6">
          <h1 className="text-2xl font-semibold mr-auto">
            {isNewListing ? Labels.CREATE_LISTING : Labels.EDIT_LISTING}
          </h1>

          {isNewListing && hasDraft && (
            <button
              onClick={() => clearSavedFormData()}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors mr-2"
              type="button"
            >
              {Labels.DELETE_DRAFT}
            </button>
          )}

          <button
            onClick={() => router.push('/my-listings')}
            className="border-border text-dark px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            {Labels.LISTINGS}
          </button>

          {!isNewListing && (
            <button
              onClick={() => {
                clearSavedFormData();
                router.push('/edit/new');
              }}
              className="border-border text-dark px-4 py-2 ml-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              {Labels.ADD_NEW_LISTING}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div>
            <label htmlFor='category' className="block text-sm font-medium mb-2">
              {Labels.CATEGORY}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.slice(1).map(category => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setListing(prev => ({ 
                    ...prev, 
                    category: [{ title: category.title, key: category.key }] 
                  }))}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    listing.category[0]?.key === category.key
                      ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/50'
                      : 'border-gray-200 hover:border-primary hover:bg-accent/50'
                  }`}
                >
                  {category.title}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                {Labels.TITLE}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="title"
                  value={listing.title}
                  onChange={e => setListing(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.title ? 'border-red-500' : 'border-input'
                  }`}
                  placeholder={Labels.TITLE_PLACEHOLDER}
                />
                {errors.title && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{Labels.REQUIRED_TITLE}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                {Labels.DESCRIPTION}
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  value={listing.description}
                  onChange={e => setListing(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.description ? 'border-red-500' : 'border-input'
                  }`}
                  placeholder={Labels.DESCRIPTION_PLACEHOLDER}
                />
                {errors.description && (
                  <div className="absolute top-2 right-2">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{Labels.REQUIRED_DESCRIPTION}</p>
              )}
            </div>
          </div>

          {/* Location and Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">
                {Labels.LOCATION}
              </label>
              <div className="relative">
                {/* <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" /> */}
                <GooglePlacesAutocomplete
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                  autocompletionRequest={{
                    componentRestrictions: {
                      country: "gh"
                     }
                  }}
                  selectProps={{
                    value: listing.location ? { label: listing.location, value: listing } : null,
                    onChange: (newValue: SingleValue<any>) => {
                      console.log(newValue)
                      if (newValue) {
                        setListing(prev => ({ 
                          ...prev, 
                          location: newValue.label,
                          location_object: newValue.value.terms,
                          location_formated: {main_text: newValue.value.structured_formatting.main_text, secondary_text: newValue.value.structured_formatting.secondary_text}
                        }));
                      }
                    },
                    placeholder: Labels.LOCATION_PLACEHOLDER,
                    className: "pl-0",
                    classNames: {
                      control: () => 
                        `w-full pl-2 py-[3px] border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                          errors.location ? 'border-red-500' : 'border-input'
                        }`,
                      input: () => "pl-8",
                      option: () => "p-2 hover:bg-gray-100 cursor-pointer"
                    },             
                  }}
                />
                {errors.location && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{Labels.REQUIRED_LOCATION}</p>
              )}
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1">
                {getPriceLabel()}
              </label>
              <div className="relative">
                <CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  id="price"
                  value={listing.price}
                  onChange={e => setListing(prev => ({ ...prev, price: Number(e.target.value) }))}
                  min="0"
                  step="1"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.price ? 'border-red-500' : 'border-input'
                  }`}
                  placeholder={Labels.PRICE_PLACEHOLDER}
                />
                {errors.price && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{Labels.PRICE_GREATER}</p>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label htmlFor="propertyType" className="block text-sm font-medium mb-1">
                {Labels.PROPERTY_TYPE}
              </label>
              <div className="relative">
                <select
                  id="propertyType"
                  value={listing.propertyType}
                  onChange={e => setListing(prev => ({ ...prev, propertyType: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.propertyType ? 'border-red-500' : 'border-input'
                  }`}
                >
                  {PROPERTY_TYPES.map(type => (
                    <option key={type.key} value={type.key}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {errors.propertyType && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.propertyType && (
                <p className="text-red-500 text-sm mt-1">{Labels.REQUIRED_PROPERTY_TYPE}</p>
              )}
            </div>

            <div>
              <label htmlFor="bedrooms" className="block text-sm font-medium mb-1">
                {Labels.BEDROOMS}
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="bedrooms"
                  value={listing.bedrooms}
                  onChange={e => setListing(prev => ({ ...prev, bedrooms: Math.max(1, Number(e.target.value)) }))}
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-input"
                  placeholder={Labels.BEDROOMS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="bathrooms" className="block text-sm font-medium mb-1">
                {Labels.BATHROOMS}
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="bathrooms"
                  value={listing.bathrooms}
                  onChange={e => setListing(prev => ({ ...prev, bathrooms: Math.max(1, Number(e.target.value)) }))}
                  min="1"
                  step="0.5"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-input"
                  placeholder={Labels.BATHROOMS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="area" className="block text-sm font-medium mb-1">
                {Labels.AREA}
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="area"
                  value={listing.area}
                  onChange={e => setListing(prev => ({ ...prev, area: Math.max(0, Number(e.target.value)) }))}
                  min="0"
                  step="1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-input"
                  placeholder={Labels.AREA}
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              {Labels.IMAGES}
              {errors.images && (
                <span className="text-red-500 ml-2">{Labels.REQUIRED_IMAGE}</span>
              )}
            </label>
            <div className="space-y-4">
              <DraggableImageList
                images={listing.images}
                onReorder={handleImageReorder}
                onRemove={removeImage}
              />
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="image-upload"
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isUploading 
                      ? 'bg-gray-50 border-gray-300' 
                      : isDragging
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-gray-50 border-border'
                  }`}
                >
                  <PhotoIcon className={`w-8 h-8 mb-2 transition-colors ${
                    isDragging ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <span className={`text-sm transition-colors ${
                    isDragging ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {isUploading 
                      ? Labels.UPLOADING
                      : isDragging
                        ? Labels.DROP_IMAGES
                        : Labels.DRAG_IMAGES}
                  </span>
                  <input
                    id="image-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
              {uploadQueue.length > 0 && (
                <div className="space-y-2">
                  {uploadQueue.map((upload, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {upload.file.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium">
                Amenities
              </label>
              <span className="text-sm text-muted-foreground">
                {selectedAmenities.size} selected
              </span>
            </div>

            {/* Custom Amenity Input */}
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAmenity}
                  onChange={e => setNewAmenity(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add custom amenity"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-input"
                />
                <button
                  type="button"
                  onClick={addCustomAmenity}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AMENITY_OPTIONS.slice(0, showAllAmenities ? undefined : 18).map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`flex items-center px-4 py-2 rounded-lg border transition-all ${
                    selectedAmenities.has(amenity)
                      ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/50'
                      : 'border-gray-200 hover:border-primary hover:bg-accent/50'
                  }`}
                >
                  {selectedAmenities.has(amenity) ? (
                    <CheckIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                  ) : (
                    <TagIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">{amenity}</span>
                </button>
              ))}
            </div>

            {AMENITY_OPTIONS.length > 18 && (
              <button
                type="button"
                onClick={() => setShowAllAmenities(prev => !prev)}
                className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {showAllAmenities ? 'Show less' : `Show ${AMENITY_OPTIONS.length - 18} more`}
              </button>
            )}

            {errors.amenities && (
              <p className="text-red-500 text-sm mt-1">{errors.amenities}</p>
            )}
          </div>

          {/* Promotion Package */}
          {(isNewListing || (!isNewListing && !listing.promotionPackage)) && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium">Promotion Package</label>
                <div className="text-sm">
                  Your Balance: <span className="font-semibold text-primary">{formatCurrency(balance?.currentBalance ?? 0)}</span>
                </div>
              </div>
              <div className="space-y-2">
                {pricingPackages.map(pkg => {
                  const isSelected = listing.promotionPackage === pkg.name;
                  
                  return (
                    <div 
                      key={pkg.name}
                      className={`border rounded-lg transition-all ${
                        isSelected 
                          ? 'border-primary ring-1 ring-primary/50' 
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => handlePromotionSelect(pkg)}
                        className={`w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors`}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            isSelected 
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <CheckIcon className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <span className="font-medium">{pkg.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">₵{pkg.price}</span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isSelected && (
                        <div className="px-4 pb-4 pt-2 border-t">
                          <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                          <ul className="space-y-2">
                            {pkg.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2 text-sm">
                                <SparklesIcon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {!listing.promotionPackage && (
                <p className="mt-2 text-sm text-red-500">
                  Please select a promotion package to continue
                </p>
              )}
            </div>
          )}

          {/* Show existing promotion package if one exists */}
          {!isNewListing && listing.promotionPackage && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium">Current Promotion Package</label>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/10">
                      <CheckIcon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{listing.promotionPackage}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Active promotion package
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {Labels.CANCEL}
            </button>
            {insufficientBalance && (
              <button
                type="button"
                onClick={() => router.push('/account/balance')}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                {Labels.ADD_FUNDS} (₵{requiredAmount} {Labels.NEEDED})
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !listing.promotionPackage}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-[100px]"
            >
              {isSubmitting ? Labels.SAVING : isNewListing ? Labels.SAVE_LISTING : Labels.UPDATE_LISTING}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <Transition show={showSuccessModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowSuccessModal(false)}
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl background border shadow-xl transition-all backdrop-blur-xl">
                  <div className="p-6">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold leading-6 mb-4"
                    >
                      {isNewListing ? Labels.LISTING_CREATED : Labels.LISTING_UPDATED}
                    </Dialog.Title>
                    
                    {savedListing && (
                      <div className="mt-4">
                        <ListingCard listing={savedListing} />
                      </div>
                    )}
                    
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50 rounded-lg transition-colors"
                        onClick={() => setShowSuccessModal(false)}
                      >
                        {Labels.CANCEL}
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        onClick={() => router.push('/my-listings')}
                      >
                        {Labels.VIEW_MY_LISTINGS}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 