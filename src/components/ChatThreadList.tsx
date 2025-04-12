import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChatThread } from '@/types/chat';
import { subscribeToUserThreads } from '@/lib/chat';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

interface ChatThreadListProps {
  onSelectThread: (thread: ChatThread) => void;
  selectedThreadId?: string;
}

export default function ChatThreadList({ onSelectThread, selectedThreadId }: ChatThreadListProps) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUserThreads(user.uid, (updatedThreads: ChatThread[]) => {
      setThreads(updatedThreads);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatLastMessageDate = (timestamp?: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide">
        {threads.map(thread => {
          const otherParticipant = thread.participants.find(p => p.id !== user?.uid);
          const userId = user?.uid || '';
          const unreadCount = thread.unreadCount?.[userId] || 0;
          
          return (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-b ${
                selectedThreadId === thread.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={otherParticipant?.photoURL || '/default-avatar.svg'}
                    alt={otherParticipant?.name}
                    className="object-cover"
                    width={48}
                    height={48}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <div className="flex-1 min-w-0 relative">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground truncate">
                      {otherParticipant?.name}
                    </h3>
                  </div>
                  {thread.lastMessage && (
                    <>
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {thread.lastMessage.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatLastMessageDate(thread.lastMessage.createdAt)}
                      </p>
                    </>
                  )}
                                    {unreadCount > 0 && (
                    <span className="absolute z-[10] top-7 right-0 bg-primary text-primary-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
} 