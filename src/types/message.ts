export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  read: boolean;
  archived: boolean;
} 