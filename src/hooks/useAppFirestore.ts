'use client';

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc, 
  DocumentData, 
  QueryConstraint, 
  CollectionReference,
} from 'firebase/firestore';
import { useAdminApp } from '@/context/AdminAppContext';
import { db as defaultDb } from '@/lib/firebase';

/**
 * Hook for working with the active app's Firestore instance
 * Falls back to the default instance if no app is selected
 */
export function useAppFirestore() {
  const { appFirebase, appFirebaseLoading, appFirebaseError } = useAdminApp();
  
  // Use the app's Firestore or fall back to the default
  const db = appFirebase?.db || defaultDb;
  
  // Get a collection reference from the active app's Firestore
  const getCollection = (collectionPath: string): CollectionReference => {
    return collection(db, collectionPath);
  };
  
  // Query documents from a collection
  const queryCollection = async <T = DocumentData>(
    collectionPath: string,
    queryConstraints: QueryConstraint[] = [],
    mapFunction?: (doc: DocumentData) => T
  ) => {
    const collectionRef = getCollection(collectionPath);
    const q = query(collectionRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    if (mapFunction) {
      return querySnapshot.docs.map(doc => mapFunction({ id: doc.id, ...doc.data() }));
    }
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
  };
  
  // Get a single document by ID
  const getDocument = async <T = DocumentData>(
    collectionPath: string,
    docId: string,
    mapFunction?: (doc: DocumentData) => T
  ): Promise<T | null> => {
    const docRef = doc(db, collectionPath, docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = { id: docSnap.id, ...docSnap.data() };
    return mapFunction ? mapFunction(data) : data as T;
  };
  
  // Add a document to a collection
  const addDocument = async <T = DocumentData>(
    collectionPath: string,
    data: Omit<T, 'id'>
  ): Promise<string> => {
    const collectionRef = getCollection(collectionPath);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  };
  
  // Update a document
  const updateDocument = async <T = DocumentData>(
    collectionPath: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> => {
    const docRef = doc(db, collectionPath, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
  };
  
  /**
   * Save a document - creates it if it doesn't exist, updates it if it does
   */
  const saveDocument = async <T = DocumentData>(
    collectionPath: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> => {
    const docRef = doc(db, collectionPath, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Document exists, update it
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } else {
      // Document doesn't exist, create it
      await setDoc(docRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  };
  
  // Delete a document
  const deleteDocument = async (
    collectionPath: string,
    docId: string
  ): Promise<void> => {
    const docRef = doc(db, collectionPath, docId);
    await deleteDoc(docRef);
  };
  
  return {
    db,
    appFirebaseLoading,
    appFirebaseError,
    getCollection,
    queryCollection,
    getDocument,
    addDocument,
    updateDocument,
    saveDocument,
    deleteDocument,
    // Helper functions for common queries
    queryWithLimit: (collectionPath: string, limitCount: number, orderByField = 'createdAt', direction: 'asc' | 'desc' = 'desc') => 
      queryCollection(collectionPath, [orderBy(orderByField, direction), limit(limitCount)]),
    queryWhereEqual: <T = DocumentData>(collectionPath: string, field: string, value: unknown) => 
      queryCollection<T>(collectionPath, [where(field, '==', value)]),
  };
} 