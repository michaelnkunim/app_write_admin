export interface ChatMessage {
  id?: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  unread: boolean;
  readBy: string[]; // Array of user IDs who have read the message
}

export interface ChatThread {
  id: string;
  participants: {
    id: string;
    name: string;
    photoURL: string;
  }[];
  lastMessage?: {
    content: string;
    createdAt: {
      seconds: number;
      nanoseconds: number;
    };
  };
  unreadCount: {
    [userId: string]: number;
  };
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  };
} 