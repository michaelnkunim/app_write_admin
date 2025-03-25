import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export type IdVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  username: string;
  businessName: string;
  location: string;
  phone: string;
  email: string;
  whatsapp: string;
  photoURL: string;
  bannerURL: string;
  phoneNumber: string;
  whatsappNumber: string;
  userType: string;
  idFrontURL?: string;
  idBackURL?: string;
  idVerificationStatus?: IdVerificationStatus;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, profile, { merge: true });
    return;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  try {
    const storageRef = ref(storage, `profile-photos/${userId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
}

export async function uploadBannerPhoto(userId: string, file: File): Promise<string> {
  try {
    const storageRef = ref(storage, `banner-photos/${userId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading banner photo:', error);
    throw error;
  }
} 