/* eslint-disable @typescript-eslint/no-explicit-any */
import { doc, collection, addDoc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  timestamp?: any;
}

export interface UserBalance {
  currentBalance: number;
  pendingBalance: number;
  currency: string;
}

const DEFAULT_BALANCE: UserBalance = {
  currentBalance: 0,
  pendingBalance: 0,
  currency: 'GHS'
};

export async function saveTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<string> {
  const transactionx = {
    ...transaction,
    userId,
    timestamp: serverTimestamp()
  }
  try {
    const transactionsRef = collection(db, 'transactions');
    const docRef = await addDoc(transactionsRef, transactionx);
    return docRef.id;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving transaction:', errorMessage);
    throw error;
  }
}

export async function getUserBalance(userId: string): Promise<UserBalance> {
  try {
    const balanceRef = doc(db, 'balances', userId);
    const balanceSnap = await getDoc(balanceRef);

    if (balanceSnap.exists()) {
      return balanceSnap.data() as UserBalance;
    }

    return DEFAULT_BALANCE;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting user balance:', errorMessage);
    return DEFAULT_BALANCE;
  }
}

export async function updateUserBalance(userId: string, newBalance: Partial<UserBalance>): Promise<void> {
  try {
    const balanceRef = doc(db, 'balances', userId);
    const balanceSnap = await getDoc(balanceRef);
    
    if (balanceSnap.exists()) {
      const currentBalance = balanceSnap.data() as UserBalance;
      await setDoc(balanceRef, {
        ...currentBalance,
        currentBalance: currentBalance.currentBalance + (newBalance.currentBalance ?? 0),
        pendingBalance: newBalance.pendingBalance ?? currentBalance.pendingBalance,
        currency: newBalance.currency ?? currentBalance.currency
      });
    } else {
      await setDoc(balanceRef, {
        ...DEFAULT_BALANCE,
        currentBalance: newBalance.currentBalance ?? 0,
        pendingBalance: newBalance.pendingBalance ?? 0,
        currency: newBalance.currency ?? 'GHS'
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating user balance:', errorMessage);
    throw error;
  }
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
  
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date || new Date().toISOString()
    } as Transaction))
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting user transactions:', errorMessage);
    return [];
  }
} 