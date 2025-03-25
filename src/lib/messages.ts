import { 
  doc, 
  addDoc,
  collection as firestoreCollection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types/message';

const MESSAGES_PER_PAGE = 20;

type MessageInput = {
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  listingId?: string;
};

export async function sendMessage(message: MessageInput): Promise<string> {
  try {
    const messagesRef = firestoreCollection(db, 'messages');
    const docRef = await addDoc(messagesRef, {
      ...message,
      read: false,
      archived: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function getUserMessages(userId: string, page: number = 1, pageSize: number = MESSAGES_PER_PAGE): Promise<{
  messages: Message[];
  hasMore: boolean;
}> {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const messagesRef = firestoreCollection(db, 'messages');
    
    // Query for received messages
    const receivedQuery = query(
      messagesRef,
      where('recipientId', '==', userId),
      //where('archived', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    // Query for sent messages
    const sentQuery = query(
      messagesRef,
      where('senderId', '==', userId),
      //where('archived', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    // Get both received and sent messages
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQuery),
      getDocs(sentQuery)
    ]);

    // Convert received messages
    const receivedMessages = receivedSnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt as Timestamp;
      return {
        id: doc.id,
        senderId: data.senderId,
        senderName: data.senderName,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        subject: data.message,
        content: data.message,
        createdAt: {
          seconds: createdAt.seconds,
          nanoseconds: createdAt.nanoseconds
        },
        read: data.read,
        archived: data.archived
      } as Message;
    });

    // Convert sent messages
    const sentMessages = sentSnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt as Timestamp;
      return {
        id: doc.id,
        senderId: data.senderId,
        senderName: data.senderName,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        subject: data.message,
        content: data.message,
        createdAt: {
          seconds: createdAt.seconds,
          nanoseconds: createdAt.nanoseconds
        },
        read: data.read,
        archived: data.archived
      } as Message;
    });

    // Combine and sort all messages by date
    const allMessages = [...receivedMessages, ...sentMessages].sort((a, b) => 
      b.createdAt.seconds - a.createdAt.seconds
    );

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedMessages = allMessages.slice(startIndex, startIndex + pageSize);

    return {
      messages: paginatedMessages,
      hasMore: allMessages.length > startIndex + pageSize
    };
  } catch (error) {
    console.error('Error getting messages:', error);
    return {
      messages: [],
      hasMore: false
    };
  }
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

export async function archiveMessage(messageId: string): Promise<void> {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      archived: true
    });
  } catch (error) {
    console.error('Error archiving message:', error);
    throw error;
  }
} 