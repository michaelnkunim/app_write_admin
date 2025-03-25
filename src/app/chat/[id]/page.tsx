'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatPage from '../page';

export default function ChatThreadPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if we're on desktop, redirect to main chat page
    if (window.innerWidth >= 768) {
      router.push('/chat');
    }
  }, [router]);

  return <ChatPage />;
} 