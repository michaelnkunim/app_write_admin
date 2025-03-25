import { 
  doc, 
  addDoc,
  collection as firestoreCollection, 
  query, 
  where, 
  getDocs,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  Timestamp,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChatMessage, ChatThread } from '@/types/chat';
import { randomUUID } from 'crypto';

export async function createChatThread(userId: string, otherUserId: string, participants: ChatThread['participants']): Promise<string> {
  try {
    const threadsRef = firestoreCollection(db, 'chats');
    
    // Check if thread already exists
    const q = query(
      threadsRef,
      where('participantIds', 'array-contains', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const existingThread = querySnapshot.docs.find(doc => {
      const threadData = doc.data();
      return threadData.participantIds.includes(otherUserId);
    });

    if (existingThread) {
      return existingThread.id;
    }

    // Create new thread
    const docRef = await addDoc(threadsRef, {
      participantIds: [userId, otherUserId],
      participantObjects: participants,
      thread: [], // Array to store messages
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastMessage: null
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating chat thread:', error);
    throw error;
  }
}

export async function sendChatMessage(threadId: string, senderId: string, content: string): Promise<string> {
  try {
    const threadRef = doc(db, 'chats', threadId);
    const messageData: Omit<ChatMessage, 'id'> = {
      threadId,
      senderId,
      content,
      createdAt: Timestamp.now(),
      unread: true,
      readBy: [senderId],
    };

    // Update thread's last message and unreadCount
    const threadDoc = await getDoc(threadRef);
    const threadData = threadDoc.data();
    if (threadData?.participantIds) {
      const participants = threadData.participantIds;
      const unreadCount = threadData.unreadCount || {};

      // Increment unread count for all participants except sender
      participants.forEach((participantId: string) => {
        if (participantId !== senderId) {
          unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
        }
      });

      await updateDoc(threadRef, {
        lastMessage: {
          content,
          createdAt: serverTimestamp()
        },
        thread: arrayUnion(messageData),
        unreadCount,
        updatedAt: serverTimestamp()
      });
    }

    return threadId;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function getChatThread(threadId: string): Promise<ChatThread | null> {
  try {
    const threadRef = doc(db, 'chats', threadId);
    const threadSnap = await getDoc(threadRef);
    
    if (!threadSnap.exists()) {
      return null;
    }

    const data = threadSnap.data();
    return {
      id: threadSnap.id,
      participants: data.participantObjects,
      lastMessage: data.lastMessage,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as ChatThread;
  } catch (error) {
    console.error('Error getting chat thread:', error);
    throw error;
  }
}

export async function getChatMessages(threadId: string): Promise<ChatMessage[]> {
  try {
    const threadRef = doc(db, 'chats', threadId);
    const threadSnap = await getDoc(threadRef);
    
    if (!threadSnap.exists()) {
      return [];
    }

    const data = threadSnap.data();
    return data.thread || [];
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
}

export function subscribeToUserChatThreads(userId: string, callback: (threads: ChatThread[]) => void): () => void {
  const threadsRef = firestoreCollection(db, 'chats');
  const q = query(
    threadsRef,
    where('participantIds', 'array-contains', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const threads = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        participants: data.participantObjects,
        lastMessage: data.lastMessage,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as ChatThread;
    });
    callback(threads);
  });
}

export async function markThreadMessagesAsRead(threadId: string, userId: string): Promise<void> {
  try {
    const threadRef = doc(db, 'chats', threadId);
    const messagesRef = firestoreCollection(db, 'messages');
    const q = query(messagesRef, where('threadId', '==', threadId));
    const messagesSnap = await getDocs(q);

    // Update readBy array for each unread message
    const batch = writeBatch(db);
    messagesSnap.docs.forEach(doc => {
      const messageData = doc.data();
      if (!messageData.readBy?.includes(userId)) {
        batch.update(doc.ref, {
          readBy: arrayUnion(userId),
          unread: false
        });
      }
    });

    // Reset unread count for this user in the thread
    await updateDoc(threadRef, {
      [`unreadCount.${userId}`]: 0
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  try {
    const threadsRef = firestoreCollection(db, 'chats');
    const q = query(
      threadsRef,
      where('participantIds', 'array-contains', userId)
    );
    
    const querySnapshot = await getDocs(q);
    let totalUnread = 0;
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalUnread += (data.unreadCount?.[userId] || 0);
    });
    
    return totalUnread;
  } catch (error) {
    console.error('Error getting total unread count:', error);
    return 0;
  }
}

export function subscribeToUserThreads(userId: string, callback: (threads: ChatThread[]) => void): () => void {
  const threadsRef = firestoreCollection(db, 'chats');
  const q = query(
    threadsRef,
    where('participantIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const threads = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        participants: data.participantObjects,
        lastMessage: data.lastMessage,
        unreadCount: data.unreadCount || {},
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as ChatThread;
    });
    callback(threads);
  });
}

export function subscribeToChatUpdates(threadId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const threadRef = doc(db, 'chats', threadId);

  return onSnapshot(threadRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.data();
    const messages = data.thread || [];
    callback(messages);
  });
} 