import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/LoginModal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createChatThread, sendChatMessage } from '@/lib/chat';

interface AgentProfileCardProps {
  host: {
    id: string;
    name: string;
    image: string;
    bannerURL?: string;
    rating: number;
    reviews: number;
    experience: number;
    phone: string;
    specialties: string[];
    description: string;
    businessName?: string;
    isVerified?: boolean;
  };
  showViewProfile?: boolean;
  fullWidth?: boolean;
  userRating?: number;
  onRatingSubmit?: (rating: number) => void;
  isDashboard?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export default function AgentProfileCard({ 
  host, 
  showViewProfile = true,
  fullWidth = false,
  userRating = 0,
  onRatingSubmit,
  isDashboard = false,
  layout = 'horizontal'
}: Readonly<AgentProfileCardProps>) {
  const [showNumber, setShowNumber] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedRating, setSelectedRating] = useState(userRating);
  const { user } = useAuth();
  const isOwnProfile = user?.id === host.id;
  const router = useRouter();

  const handleAuthRequired = (action: () => void) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (isOwnProfile) return;
    action();
  };

  const handleMessageClick = () => {
    handleAuthRequired(() => setShowMessageModal(true));
  };

  const handleShowNumber = () => {
    handleAuthRequired(() => setShowNumber(true));
  };

  const handleRatingClick = () => {
    handleAuthRequired(() => setShowRatingModal(true));
  };

  const handleSendMessage = async () => {
    if (!user) {
      handleAuthRequired(() => setShowMessageModal(true));
      return;
    }

    try {
      setIsSending(true);

      // Create participants array for the chat thread
      const participants = [
        {
          id: user.uid,
          name: user.displayName || 'Anonymous',
          photoURL: user.photoURL || '/default-avatar.svg'
        },
        {
          id: host.id,
          name: host.businessName || host.name,
          photoURL: host.image || '/default-avatar.svg'
        }
      ];

      // Create or get existing chat thread
      const threadId = await createChatThread(user.uid, host.id, participants);

      // Send the initial message
      await sendChatMessage(threadId, user.uid, message);

      toast.success('Message sent successfully!');
      setMessage('');
      setShowMessageModal(false);
      router.push('/chat');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleRatingSubmit = () => {
    if (!user || isOwnProfile) return;
    onRatingSubmit?.(selectedRating);
    setShowRatingModal(false);
  };

  const RatingStars = ({ rating }: { rating: number }) => (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>
          {star <= rating ? (
            <StarIcon className="w-4 h-4 text-yellow-400" />
          ) : (
            <StarOutlineIcon className="w-4 h-4 text-yellow-400" />
          )}
        </span>
      ))}
    </div>
  );

  const getAriaLabel = () => {
    if (isOwnProfile) return 'You cannot rate your own profile';
    if (userRating > 0) return 'You have already rated this agent';
    return 'Rate this agent';
  };

  const getButtonStyles = (isDisabled: boolean) => {
    return isDisabled 
      ? 'opacity-50 cursor-not-allowed' 
      : 'hover:bg-primary hover:text-primary-foreground';
  };

  const getRatingButtonContent = () => {
    if (userRating > 0) {
      return (
        <div className="flex flex-col items-center justify-center opacity-75">
          <span className="text-sm mb-1">Your Rating</span>
          <RatingStars rating={userRating} />
        </div>
      );
    }
    return 'Rate Agent';
  };

  return (
    <>
      <div className={`${showViewProfile ? 'border shadow-lg' : ''} rounded-xl overflow-hidden ${fullWidth ? 'w-full' : 'max-w-2xl'}`}>
        {/* Banner Image - Only show on agent page */}
        {fullWidth && (
          <div className="relative w-full h-48">
            <Image
              src={host.bannerURL || '/default-banner.svg'}
              alt={`${host.name}'s banner`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>
        )}

        <div className="p-6">
          {/* Profile Section */}
          <div className={`flex ${layout === 'vertical' ? 'flex-col items-center text-center' : 'items-center space-x-4'}`}>
            {/* Profile Image */}
            <div className={`relative ${fullWidth ? 'h-24 w-24 -mt-16 border-4 border-background' : 'h-16 w-16'} rounded-full overflow-hidden ${layout === 'vertical' ? 'mb-4' : ''}`}>
              <Image
                src={host.image}
                alt={host.businessName || host.name}
                fill
                className="object-cover"
              />
            </div>

            <div className={`flex-1 ${fullWidth ? '-mt-6' : ''}`}>
              <div className={`flex ${layout === 'vertical' ? 'flex-col items-center' : 'items-center justify-between'}`}>
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-1">
                    {host.businessName || host.name}
                    {host.isVerified && (
                      <div 
                        className="ml-0.5 inline-block" 
                        title="Verified Account"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1C5.92487 1 1 5.92487 1 12C1 18.0751 5.92487 23 12 23ZM17.8031 8.9956C18.3154 8.48334 18.3154 7.65668 17.8031 7.14442C17.2909 6.63215 16.4642 6.63215 15.952 7.14442L9.47453 13.6218L7.87369 12.021C7.36143 11.5087 6.53477 11.5087 6.0225 12.021C5.51024 12.5333 5.51024 13.3599 6.0225 13.8722L8.54893 16.3986C9.0612 16.9109 9.88786 16.9109 10.4001 16.3986L17.8031 8.9956Z" fill="#1D9BF0"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M10.4001 16.3986L17.8031 8.9956C18.3154 8.48334 18.3154 7.65668 17.8031 7.14442C17.2909 6.63215 16.4642 6.63215 15.952 7.14442L9.47453 13.6218L7.87369 12.021C7.36143 11.5087 6.53477 11.5087 6.0225 12.021C5.51024 12.5333 5.51024 13.3599 6.0225 13.8722L8.54893 16.3986C9.0612 16.9109 9.88786 16.9109 10.4001 16.3986Z" fill="white"/>
                        </svg>
                      </div>
                    )}
                  </h3>
                  {host.businessName && (
                    <p className="text-sm text-muted-foreground">
                      {host.name}
                    </p>
                  )}
                  <p className="text-muted-foreground">Professional Real Estate Agent</p>
                  <div className={`flex items-center mt-1 text-sm text-muted-foreground ${layout === 'vertical' ? 'justify-center' : 'flex-wrap'}`}>
                    <span>{host.rating}</span>
                    <span className="mx-1">•</span>
                    <span>{host.reviews} reviews</span>
                    <span className="mx-1">•</span>
                    <span>{host.experience} years experience</span>
                  </div>
                </div>
                {showViewProfile && layout === 'horizontal' && (
                  <Link
                    href={`/agent/${host.id}`}
                    className="hidden md:block text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View Profile
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className={`${layout === 'vertical' ? 'mt-6' : 'mt-4'} space-y-4`}>
            {layout === 'vertical' && (
              <div className="border-t border-border pt-4" />
            )}
            
            <p className={`text-muted-foreground ${layout === 'vertical' ? 'text-center' : ''}`}>{host.description}</p>
            
            <div className={`flex flex-wrap gap-2 ${layout === 'vertical' ? 'justify-center' : ''}`}>
              {host.specialties.map((specialty) => (
                <span 
                  key={specialty}
                  className="px-3 py-1 bg-accent rounded-full text-sm text-foreground"
                >
                  {specialty}
                </span>
              ))}
            </div>
            
            {!isDashboard && (
              <div className={`grid ${layout === 'vertical' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-3`}>
                {showNumber ? (
                  <a
                    href={`tel:${host.phone}`}
                    className={`block text-center ${
                      isOwnProfile 
                        ? 'bg-accent/50 cursor-not-allowed pointer-events-none'
                        : 'bg-primary hover:bg-primary/90'
                    } text-primary-foreground py-2.5 rounded-lg font-semibold transition-colors`}
                    onClick={(e) => isOwnProfile && e.preventDefault()}
                  >
                    {host.phone}
                  </a>
                ) : (
                  <button
                    onClick={handleShowNumber}
                    className={`background border-2 border-primary ${
                      isOwnProfile
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-primary hover:text-primary-foreground'
                    } text-primary py-2.5 rounded-lg font-semibold transition-colors w-full`}
                    disabled={isOwnProfile}
                  >
                    Show Number
                  </button>
                )}

                <button
                  onClick={handleMessageClick}
                  className={`background border-2 border-primary ${
                    getButtonStyles(isOwnProfile)
                  } text-primary py-2.5 rounded-lg font-semibold transition-colors w-full`}
                  disabled={isOwnProfile}
                >
                  Send Message
                </button>

                <button
                  onClick={handleRatingClick}
                  className={`flex-1 relative py-3 px-4 rounded-lg background border-2 border-primary ${
                    getButtonStyles(userRating > 0 || isOwnProfile)
                  } text-primary py-2.5 rounded-lg font-semibold transition-colors w-full`}
                  disabled={userRating > 0 || isOwnProfile}
                  aria-label={getAriaLabel()}
                >
                  {getRatingButtonContent()}
                </button>
              </div>
            )}

            {showViewProfile && !isDashboard && layout === 'vertical' && (
              <Link
                href={`/agent/${host.id}`}
                className="block w-full text-center bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                View Profile
              </Link>
            )}

            {showViewProfile && !isDashboard && layout === 'horizontal' && (
              <Link
                href={`/agent/${host.id}`}
                className="md:hidden block w-full text-center bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors mt-4"
              >
                View Profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="background border rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Message {host.name}
              </h3>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessage('');
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-muted-foreground mb-2">
                Your Message
              </label>
              <textarea
                id="message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary background text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessage('');
                }}
                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isSending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="background border rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl backdrop-blur-xl">
            <h3 className="text-xl font-semibold mb-4">
              {userRating > 0 ? 'Update Rating' : 'Rate'} {host.name}
            </h3>
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(rating)}
                  className="text-2xl focus:outline-none"
                >
                  {rating <= selectedRating ? (
                    <StarIcon className="w-8 h-8 text-yellow-400" />
                  ) : (
                    <StarOutlineIcon className="w-8 h-8 text-yellow-400" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedRating(userRating);
                }}
                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
              >
                {userRating > 0 ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
} 