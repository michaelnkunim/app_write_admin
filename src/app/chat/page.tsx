'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChatThread as ChatThreadType } from '@/types/chat';
import ChatThreadList from '@/components/ChatThreadList';
import ChatThread from '@/components/ChatThread';
import { getChatThread } from '@/lib/chat';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const [selectedThread, setSelectedThread] = useState<ChatThreadType | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile
    setIsMobile(window.innerWidth < 768);
    
    // Handle window resize
    // const handleResize = () => setIsMobile(window.innerWidth < 768);
    // window.addEventListener('resize', handleResize);
    // return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Load chat thread if ID is in URL
    const threadId = params?.id as string;
    if (threadId) {
      loadChatThread(threadId);
    }
  }, [params]);

  const loadChatThread = async (threadId: string) => {
    try {
      const thread = await getChatThread(threadId);
      setSelectedThread(thread);
    } catch (error) {
      console.error('Error loading chat thread:', error);
    }
  };

  const handleSelectThread = (thread: ChatThreadType) => {
    setSelectedThread(thread);
    if (isMobile) {
      router.push(`/chat/${thread.id}`);
    }
  };

  // Get thread ID as string or undefined
  const threadId = selectedThread ? selectedThread.id : undefined;

  // Mobile: Show either thread list or selected thread
  if (isMobile) {
    if (selectedThread) {
      return (
        <div className="w-full overflow-hidden">
          <ChatThread thread={selectedThread} />
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-4rem)] w-full overflow-hidden">
        <ChatThreadList
          onSelectThread={handleSelectThread}
          selectedThreadId={threadId}
        />
      </div>
    );
  }

  // Desktop: Show both thread list and selected thread
  return (
    <div className="flex h-[calc(100vh-65px)]  overflow-hidden">
      <div className="w-full max-w-sm border-r border-border overflow-hidden">
        <ChatThreadList
          onSelectThread={handleSelectThread}
          selectedThreadId={threadId}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {selectedThread ? (
          <ChatThread thread={selectedThread} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
} 