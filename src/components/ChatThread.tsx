import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChatMessage, ChatThread as ChatThreadType } from '@/types/chat';
import { getChatMessages, sendChatMessage, markThreadMessagesAsRead, subscribeToChatUpdates } from '@/lib/chat';
import { useAuth } from '@/context/AuthContext';
import { useUnreadCount } from '@/context/UnreadCountContext';
import { PaperAirplaneIcon, CheckIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import Image from 'next/image';

interface ChatThreadProps {
  thread: ChatThreadType;
}

export default function ChatThread({ thread }: ChatThreadProps) {
  const { user } = useAuth();
  const { updateUnreadCount } = useUnreadCount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const notificationSound = useRef<HTMLAudioElement | null>(null);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useEffect(() => {
    // Initialize audio element
    notificationSound.current = new Audio('/notification.mp3');
    
    // Check and request notification sound permission
    const checkAudioPermission = async () => {
      try {
        // Only proceed if we haven't requested permission before
        if (!hasRequestedPermission) {
          // Try to play a silent audio to trigger permission request
          const silentAudio = new Audio('/notification.mp3');
          silentAudio.volume = 0;
          await silentAudio.play();
          // If successful, immediately pause it
          silentAudio.pause();
          setHasRequestedPermission(true);
        }
      } catch (error) {
        // Permission denied or other error - we'll handle this gracefully by doing nothing
        console.log('Audio permission not granted or already rejected');
      }
    };

    checkAudioPermission();
  }, [hasRequestedPermission]);

  useEffect(() => {
    loadMessages();
    // Subscribe to real-time updates
    const unsubscribe = subscribeToChatUpdates(thread.id, (updatedMessages) => {
      console.log(updatedMessages)
      // Check if there's a new message from the other user
      if (!isFirstLoad && updatedMessages.length > messages.length) {
        const latestMessage = updatedMessages[updatedMessages.length - 1];
        if (latestMessage.senderId !== user?.uid) {
          // Only try to play sound if we have permission
          notificationSound.current?.play().catch(() => {
            // Silently fail if permission was denied
          });
        }
      }
      
      setMessages(updatedMessages);
      // Only auto-scroll if we're not in first load
      if (!isFirstLoad) {
        scrollToBottom();
      }
    });

    return () => unsubscribe();
  }, [thread.id, messages.length, isFirstLoad, user?.uid]);

  useEffect(() => {
    // Mark messages as read when the thread is opened
    if (user && thread.id) {
      markThreadMessagesAsRead(thread.id, user.uid).then(() => {
        // Update the total unread count in the navbar and mobile toolbar
        updateUnreadCount();
      });
    }
  }, [thread.id, user, updateUnreadCount]);

  const loadMessages = async () => {
    try {
      const chatMessages = await getChatMessages(thread.id);
      setMessages(chatMessages);
      // On first load, scroll to bottom and mark as not first load
      scrollToBottom();
      setIsFirstLoad(false);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      setSending(true);
      await sendChatMessage(thread.id, user.uid, newMessage.trim());
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatMessageDate = (timestamp: ChatMessage['createdAt']) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const otherParticipant = thread.participants.find(p => p.id !== user?.uid);

  return (
    <div className=" flex flex-col h-[calc(100vh-65px)] overflow-y-auto bg-background">
      {/* Header - Made sticky */}
      <div className="fixed sm:sticky top-0 z-80 w-full flex items-center p-4 border-b border-border bg-background/95 background">
        {/* Back Button for Mobile */}
        <button 
          onClick={() => window.history.back()} 
          className="sm:hidden p-3 rounded-full bg-muted hover:bg-muted/80"
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden">
            <Image 
              src={otherParticipant?.photoURL || '/default-avatar.svg'}
              alt={otherParticipant?.name || 'User'}
              className="object-cover"
              width={40}
              height={40}
            />
          </div>
          <div>
            <h3 className="font-medium text-foreground">
              {otherParticipant?.name}
            </h3>
          </div>
        </div>
      </div>

      {/* Messages */}
      <br/>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <br/> 
        {messages.map(message => {
          const isOwnMessage = message.senderId === user?.uid;
          const otherParticipantId = thread.participants.find(p => p.id !== user?.uid)?.id;
          const isReadByOther = otherParticipantId && message.readBy?.includes(otherParticipantId);
          
          return (
            <div
              key={`message-container-${message.id}`}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
                key={`message-content-${message.id}`}
              >
                <p className="text-sm" key={`text-${message.id}`}>{message.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1" key={`footer-${message.id}`}>
                  <p className="text-xs opacity-70" key={`timestamp-${message.id}`}>
                    {formatMessageDate(message.createdAt)}
                  </p>
                  {isOwnMessage && (
                    <div className="flex items-center ml-1" key={`read-status-${message.id}`}>
                      {isReadByOther ? (
                        <div className="text-green-500" key={`read-${message.id}`}>
                          <CheckIconSolid className="h-3 w-3" key={`check1-${message.id}`} />
                          <CheckIconSolid className="h-3 w-3 -ml-1" key={`check2-${message.id}`} />
                        </div>
                      ) : (
                        <div className="opacity-70" key={`unread-${message.id}`}>
                          <CheckIcon className="h-3 w-3 -ml-1 text-green" key={`check-${message.id}`} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <br/> <br/>
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom */}
      <form onSubmit={handleSend} className="fixed sm:sticky bottom-0 left-0 right-0 p-4 border border-border bg-background">
        <div className="flex items-center gap-2 max-w-[1600px] mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-muted rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontSize: '16px' }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
} 