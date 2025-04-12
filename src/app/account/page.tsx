'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, updateUserProfile, uploadProfilePhoto, uploadBannerPhoto, IdVerificationStatus } from '@/lib/userProfile';
import { toast } from 'sonner';
import Image from 'next/image';
import { useProfile } from '@/context/ProfileContext';
import ImageCropModal from '@/components/ImageCropModal';
import RouteGuard from '@/components/RouteGuard';
import { FirebaseError } from 'firebase/app';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Shield, Info } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import AgentProfileCard from '@/components/AgentProfileCard';

interface FormData {
  username: string;
  businessName: string;
  location: string;
  phone: string;
  email: string;
  whatsapp: string;
}

interface ProfileFieldWeight {
  field: keyof FormData | 'photo';
  weight: number;
  label: string;
}

const PROFILE_WEIGHTS: ProfileFieldWeight[] = [
  { field: 'photo', weight: 20, label: 'Profile Image' },
  { field: 'username', weight: 10, label: 'Username' },
  { field: 'businessName', weight: 10, label: 'Business Name' },
  { field: 'location', weight: 10, label: 'Location' },
  { field: 'phone', weight: 20, label: 'Phone Number' },
  { field: 'email', weight: 20, label: 'Email' },
  { field: 'whatsapp', weight: 10, label: 'WhatsApp Number' }
];

function ProfileCompletionBar({ formData, photoURL }: { readonly formData: FormData; readonly photoURL: string }) {
  const [showIncomplete, setShowIncomplete] = useState(false);
  
  const calculateProgress = () => {
    let progress = 0;
    
    // Check each field's completion
    PROFILE_WEIGHTS.forEach(({ field, weight }) => {
      if (field === 'photo') {
        if (photoURL && !photoURL.includes('default-avatar.svg')) {
          progress += weight;
        }
      } else {
        if (formData[field] && formData[field].trim() !== '') {
          progress += weight;
        }
      }
    });
    
    return progress;
  };

  const progress = calculateProgress();
  const incompleteFields = PROFILE_WEIGHTS.filter(({ field }) => {
    if (field === 'photo') {
      return photoURL.includes('default-avatar.svg');
    }
    return !formData[field] || formData[field].trim() === '';
  });

  return (
    <div className="sticky top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto p-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium">Profile Completion</h2>
            <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progress}%</span>
            {incompleteFields.length > 0 && (
              <button 
                onClick={() => setShowIncomplete(!showIncomplete)}
                className="md:hidden text-sm text-primary hover:text-primary/90"
              >
                {showIncomplete ? 'Hide' : 'Show'}
              </button>
            )}
          </div>

          {incompleteFields.length > 0 && (
            <div className={`mt-2 ${!showIncomplete ? 'hidden md:block' : ''}`}>
              <p className="text-xs text-muted-foreground mb-1">
                Complete these fields to improve your profile:
              </p>
              <ul className="text-xs flex flex-wrap gap-2">
                {incompleteFields.map(({ field, label, weight }) => (
                  <li key={field} className="flex items-center text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    <span className="w-2 h-2 mr-1.5 rounded-full border-2 border-muted-foreground/30" />
                    {label} ({weight}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Create a client component that uses useSearchParams
function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'account';
  
  const { user, changePassword, resendVerificationEmail } = useAuth();
  const { updateProfilePhoto } = useProfile();
  const [formData, setFormData] = useState<FormData>({
    username: '',
    businessName: '',
    location: '',
    phone: '',
    email: '',
    whatsapp: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState('/default-avatar.svg');
  const [bannerURL, setBannerURL] = useState('/default-banner.svg');
  const [isPhotoCropModalOpen, setIsPhotoCropModalOpen] = useState(false);
  const [isBannerCropModalOpen, setIsBannerCropModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ID verification states
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idFrontURL, setIdFrontURL] = useState<string | null>(null);
  const [idBackURL, setIdBackURL] = useState<string | null>(null);
  const [isIdFrontCropModalOpen, setIsIdFrontCropModalOpen] = useState(false);
  const [isIdBackCropModalOpen, setIsIdBackCropModalOpen] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [idVerificationStatus, setIdVerificationStatus] = useState<IdVerificationStatus>('none');

  // Add new state for password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const loadUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setFormData({
          username: profile.username || '',
          businessName: profile.businessName || '',
          location: profile.location || '',
          phone: profile.phone || '',
          email: profile.email || user.email || '',
          whatsapp: profile.whatsapp || ''
        });
        setPhotoURL(profile.photoURL || '/default-avatar.svg');
        setBannerURL(profile.bannerURL || '/default-banner.svg');
        
        // Load ID verification information if available
        if (profile.idFrontURL) setIdFrontURL(profile.idFrontURL);
        if (profile.idBackURL) setIdBackURL(profile.idBackURL);
        if (profile.idVerificationStatus) {
          setIdVerificationStatus(profile.idVerificationStatus);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user, loadUserProfile]);

  const navigateToTab = (tab: string) => {
    router.push(`/account?tab=${tab}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setIsPhotoCropModalOpen(true);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setIsBannerCropModalOpen(true);
    }
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    if (!user) return;

    try {
      setIsLoading(true);
      const file = new File([croppedImage], 'profile-photo.jpg', { type: 'image/jpeg' });
      const photoURL = await uploadProfilePhoto(user.uid, file);
      setPhotoURL(photoURL);
      updateProfilePhoto(photoURL);
      await updateUserProfile(user.uid, { photoURL });
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsLoading(false);
      setIsPhotoCropModalOpen(false);
    }
  };

  const handleBannerCropComplete = async (croppedImage: Blob) => {
    if (!user) return;

    try {
      setIsLoading(true);
      const file = new File([croppedImage], 'banner-photo.jpg', { type: 'image/jpeg' });
      const bannerURL = await uploadBannerPhoto(user.uid, file);
      setBannerURL(bannerURL);
      await updateUserProfile(user.uid, { bannerURL });
      toast.success('Banner photo updated successfully');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setIsLoading(false);
      setIsBannerCropModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsLoading(true);
      await updateUserProfile(user.uid, formData);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the form
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    
    try {
      setIsChangingPassword(true);
      
      // Call the authentication service to change the password
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      // Reset the form on success
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Password changed successfully', {
        duration: 3000,
      });
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (firebaseError.code === 'auth/weak-password') {
        toast.error('New password is too weak');
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    if (!user || !user.email) return;
    
    try {
      setIsResendingVerification(true);
      
      // Get the current origin for the verification link
      const origin = window.location.origin;
      const redirectUrl = `${origin}/email-verification`;
      
      await resendVerificationEmail(redirectUrl);
      toast.success('Verification email sent. Please check your inbox.');
    } catch (error: unknown) {
      console.error('Error resending verification email:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to send verification email');
      }
    } finally {
      setIsResendingVerification(false);
    }
  };

  // Determine if user has email/password provider
  const hasEmailProvider = user?.providerData?.some(
    provider => provider.providerId === 'password'
  );

  // Handle ID Front upload
  const handleIdFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFrontFile(file);
      setIsIdFrontCropModalOpen(true);
    }
  };

  // Handle ID Back upload
  const handleIdBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdBackFile(file);
      setIsIdBackCropModalOpen(true);
    }
  };

  // Handle ID Front crop complete
  const handleIdFrontCropComplete = async (croppedImage: Blob) => {
    if (!user) return;

    try {
      setIsUploadingId(true);
      const file = new File([croppedImage], `id-front-${user.uid}.jpg`, { type: 'image/jpeg' });
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `users/${user.uid}/verification/id-front.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Set the URL state and update user profile
      setIdFrontURL(downloadURL);
      await updateUserProfile(user.uid, { 
        idFrontURL: downloadURL,
        idVerificationStatus: 'pending'
      });
      setIdVerificationStatus('pending');
      
      toast.success('ID front uploaded successfully');
    } catch (error) {
      console.error('Error uploading ID front:', error);
      toast.error('Failed to upload ID front');
    } finally {
      setIsUploadingId(false);
      setIsIdFrontCropModalOpen(false);
    }
  };

  // Handle ID Back crop complete
  const handleIdBackCropComplete = async (croppedImage: Blob) => {
    if (!user) return;

    try {
      setIsUploadingId(true);
      const file = new File([croppedImage], `id-back-${user.uid}.jpg`, { type: 'image/jpeg' });
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `users/${user.uid}/verification/id-back.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Set the URL state and update user profile
      setIdBackURL(downloadURL);
      await updateUserProfile(user.uid, { 
        idBackURL: downloadURL,
        idVerificationStatus: 'pending'
      });
      setIdVerificationStatus('pending');
      
      toast.success('ID back uploaded successfully');
    } catch (error) {
      console.error('Error uploading ID back:', error);
      toast.error('Failed to upload ID back');
    } finally {
      setIsUploadingId(false);
      setIsIdBackCropModalOpen(false);
    }
  };

  // Render the account tab content
  const renderAccountTab = () => {
    return (
      <>
        {/* Banner Image */}
        <div className="relative w-full h-48 mb-16 rounded-xl overflow-hidden">
          <Image
            src={bannerURL}
            alt="Profile banner"
            className="object-cover"
            fill
            sizes="(max-width: 896px) 100vw, 896px"
          />
          <label className="absolute bottom-4 right-4 background text-primary px-4 py-2 rounded-lg cursor-pointer hover:bg-background/90 transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
              disabled={isLoading}
            />
            Change Banner
          </label>
        </div>

        {/* Profile Photo */}
        <div className="relative w-32 h-32 mx-auto -mt-28 mb-8 rounded-full overflow-hidden border-4 border-background">
          <Image
            src={photoURL}
            alt="Profile photo"
            className="object-cover"
            fill
            sizes="128px"
          />
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={isLoading}
            />
            <span className="text-white text-sm">Change Photo</span>
          </label>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border background"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Business Name
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border background"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border background"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border background"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border background"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                WhatsApp Number
              </label>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border background"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Agent Profile Card Preview */}
        <div className="mt-8 mb-12">
          <h2 className="text-xl font-medium mb-6">Profile Preview</h2>
          <AgentProfileCard
            host={{
              id: user?.uid || '',
              name: formData.username || user?.displayName || '',
              businessName: formData.businessName || '',
              image: photoURL,
              bannerURL: bannerURL,
              rating: 0,
              reviews: 0,
              experience: 0,
              phone: formData.phone || '',
              specialties: [],
              description: '',
              isVerified: idVerificationStatus === 'approved'
            }}
            showViewProfile={false}
            fullWidth={true}
          />
        </div>
      </>
    );
  };

  // Render the security tab content
  const renderSecurityTab = () => {
    return (
      <>
        {/* Email Verification Status */}
        {user && user.email && (
          <div className="mb-10">
            <h3 className="text-lg font-medium mb-4">Email Verification</h3>
            <div className="p-4 border rounded-lg background mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.emailVerified ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </span>
                  )}
                  <span>
                    {user.email}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${user.emailVerified ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </span>
                </div>
                
                {!user.emailVerified && (
                  <button
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="text-sm text-primary hover:text-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isResendingVerification ? 'Sending...' : 'Resend Verification'}
                  </button>
                )}
              </div>
            </div>
            
            {!user.emailVerified && (
              <p className="text-sm text-muted-foreground">
                Please verify your email address to ensure account security and receive important notifications.
              </p>
            )}
          </div>
        )}
        
        {/* Password Change Section */}
        {hasEmailProvider && (
          <div className="mb-10">
            <h3 className="text-lg font-medium mb-4">Change Password</h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 rounded-lg border background"
                  disabled={isChangingPassword}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 rounded-lg border background"
                  disabled={isChangingPassword}
                  required
                  minLength={8}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 rounded-lg border background"
                  disabled={isChangingPassword}
                  required
                />
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  };

  // Render the verification tab content
  const renderVerificationTab = () => {
    return (
      <div className="space-y-8">
        <div className="rounded-lg border p-6 background mb-6">
          <h3 className="text-lg font-medium mb-4">ID Verification</h3>
          
          {/* Verification Status */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-sm font-medium">Verification Status:</h4>
              {idVerificationStatus === 'none' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  Not Submitted
                </span>
              )}
              {idVerificationStatus === 'pending' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Pending Review
                </span>
              )}
              {idVerificationStatus === 'approved' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Verified
                </span>
              )}
              {idVerificationStatus === 'rejected' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  Rejected
                </span>
              )}
            </div>

            <div className="rounded-lg bg-muted p-4 mb-6">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="mb-1">ID verification is required to access certain features and build trust within our community.</p>
                  <p>Please upload clear images of the front and back of your government-issued ID card.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ID Front Upload */}
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3">ID Front Side</h4>
              
              {idFrontURL ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden mb-2">
                  <Image
                    src={idFrontURL}
                    alt="ID Front"
                    className="object-contain"
                    fill
                    sizes="(max-width: 896px) 100vw, 896px"
                  />
                  {idVerificationStatus !== 'approved' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                      <label className="px-4 py-2 bg-background rounded-lg cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleIdFrontChange}
                          disabled={isUploadingId}
                        />
                        <span className="text-sm font-medium">Replace</span>
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative overflow-hidden">
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Info className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or JPEG (max. 5MB)
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleIdFrontChange}
                      disabled={isUploadingId}
                    />
                  </label>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Upload a clear image of the front side of your ID card
              </p>
            </div>
            
            {/* ID Back Upload */}
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3">ID Back Side</h4>
              
              {idBackURL ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden mb-2">
                  <Image
                    src={idBackURL}
                    alt="ID Back"
                    className="object-contain"
                    fill
                    sizes="(max-width: 896px) 100vw, 896px"
                  />
                  {idVerificationStatus !== 'approved' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                      <label className="px-4 py-2 bg-background rounded-lg cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleIdBackChange}
                          disabled={isUploadingId}
                        />
                        <span className="text-sm font-medium">Replace</span>
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative overflow-hidden">
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Info className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or JPEG (max. 5MB)
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleIdBackChange}
                      disabled={isUploadingId}
                    />
                  </label>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Upload a clear image of the back side of your ID card
              </p>
            </div>
          </div>
          
          {idVerificationStatus === 'rejected' && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg text-sm">
              <p className="font-medium">Verification Rejected</p>
              <p className="mt-1">Your ID verification was rejected. Please upload clearer images of your ID and ensure all details are visible.</p>
            </div>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          <h3 className="text-base font-medium text-foreground mb-2">Privacy Notice</h3>
          <p className="mb-2">Your ID documents are securely stored and only used for verification purposes.</p>
          <p>We implement strong encryption and access controls to protect your personal information in accordance with our Privacy Policy.</p>
        </div>
      </div>
    );
  };

  return (
    <RouteGuard>
      <div className="min-h-screen">
        <ProfileCompletionBar formData={formData} photoURL={photoURL} />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="mb-8 border-b">
              <div className="flex flex-nowrap overflow-x-auto sm:overflow-x-visible pb-2">
                <button
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === 'account' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => navigateToTab('account')}
                >
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Account</span>
                  </span>
                </button>
                
                <button
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === 'security' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => navigateToTab('security')}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Security</span>
                  </span>
                </button>
                
                <button
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === 'verification' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => navigateToTab('verification')}
                >
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>ID Verification</span>
                  </span>
                </button>
              </div>
            </div>
            
            {/* Tab content */}
            <div>
              {activeTab === 'account' && renderAccountTab()}
              {activeTab === 'security' && renderSecurityTab()}
              {activeTab === 'verification' && renderVerificationTab()}
            </div>
          </div>
        </div>
        
        {isPhotoCropModalOpen && photoFile && (
          <ImageCropModal
            imageFile={photoFile}
            isOpen={isPhotoCropModalOpen}
            onClose={() => setIsPhotoCropModalOpen(false)}
            onCropComplete={handleCropComplete}
            aspectRatio={1}
          />
        )}
        
        {isBannerCropModalOpen && bannerFile && (
          <ImageCropModal
            imageFile={bannerFile}
            isOpen={isBannerCropModalOpen}
            onClose={() => setIsBannerCropModalOpen(false)}
            onCropComplete={handleBannerCropComplete}
            aspectRatio={3}
          />
        )}
        
        {isIdFrontCropModalOpen && idFrontFile && (
          <ImageCropModal
            imageFile={idFrontFile}
            isOpen={isIdFrontCropModalOpen}
            onClose={() => setIsIdFrontCropModalOpen(false)}
            onCropComplete={handleIdFrontCropComplete}
            aspectRatio={1.5}
          />
        )}
        
        {isIdBackCropModalOpen && idBackFile && (
          <ImageCropModal
            imageFile={idBackFile}
            isOpen={isIdBackCropModalOpen}
            onClose={() => setIsIdBackCropModalOpen(false)}
            onCropComplete={handleIdBackCropComplete}
            aspectRatio={1.5}
          />
        )}
      </div>
    </RouteGuard>
  );
}

// Main component with Suspense boundary
export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading account details...</div>}>
      <AccountPageContent />
    </Suspense>
  );
} 