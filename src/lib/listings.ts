import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Listing } from '@/types/listing';
import { categories } from '@/data/categories';

export async function saveListing(listing: Listing): Promise<string> {
  try {
    // If no ID is provided, let Firestore generate one
    const listingRef = listing.id 
      ? doc(db, 'listings', listing.id)
      : doc(collection(db, 'listings'));
    
    // If this is a new listing, use the generated ID
    const listingToSave = listing.id ? listing : { ...listing, id: listingRef.id };
    
    await setDoc(listingRef, listingToSave);
    return listingRef.id;
  } catch (error) {
    console.error('Error saving listing:', error);
    throw error;
  }
}

export async function getListing(id: string): Promise<Listing | null> {
  try {
    const listingRef = doc(db, 'listings', id);
    const listingDoc = await getDoc(listingRef);
    
    if (listingDoc.exists()) {
      const data = listingDoc.data();
      return {
        id: listingDoc.id,
        title: data.title || '',
        description: data.description || '',
        image: data.image || '',
        images: data.images || [],
        price: data.price || 0,
        location: data.location || '',
        category: data.category || categories[0],
        status: data.status || 'active',
        published: data.published || false,
        views: data.views || 0,
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        bathrooms: data.bathrooms || 1,
        bedrooms: data.bedrooms || 1,
        area: data.area || 0,
        propertyType: data.propertyType || 'apartment',
        host: {
          id: data.host?.id || '',
          name: data.host?.name || '',
          image: data.host?.image || '',
          rating: data.host?.rating || 0,
          reviews: data.host?.reviews || 0,
          experience: data.host?.experience || 0,
          phone: data.host?.phone || '',
          specialties: data.host?.specialties || [],
          description: data.host?.description || ''
        },
        amenities: data.amenities || [],
        coordinates: data.coordinates || { lat: 0, lng: 0 },
        promotionPackage: data.promotionPackage,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Listing;
    }
    return null;
  } catch (error) {
    console.error('Error getting listing:', error);
    throw error;
  }
}

export async function getUserListings(userId: string): Promise<Listing[]> {
  try {
    const listingsRef = collection(db, 'listings');
    const q = query(listingsRef, where('host.id', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        image: data.image || '',
        images: data.images || [],
        price: data.price || 0,
        location: data.location || '',
        category: data.category || 'For Sale',
        status: data.status || 'active',
        published: data.published || false,
        views: data.views || 0,
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        bathrooms: data.bathrooms || 1,
        bedrooms: data.bedrooms || 1,
        area: data.area || 0,
        propertyType: data.propertyType || 'apartment',
        host: {
          id: data.host?.id || '',
          name: data.host?.name || '',
          image: data.host?.image || '',
          rating: data.host?.rating || 0,
          reviews: data.host?.reviews || 0,
          experience: data.host?.experience || 0,
          phone: data.host?.phone || '',
          specialties: data.host?.specialties || [],
          description: data.host?.description || ''
        },
        amenities: data.amenities || [],
        coordinates: data.coordinates || { lat: 0, lng: 0 },
        promotionPackage: data.promotionPackage,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Listing;
    });
  } catch (error) {
    console.error('Error getting user listings:', error);
    throw error;
  }
} 