import Link from 'next/link';
import Menus from './Menus';
import { useAppSettings } from '@/context/AppSettingsContext';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube,
  Share2
} from 'lucide-react';

export default function Footer() {
  const { getSocialMedia } = useAppSettings();
  const socialMedia = getSocialMedia();

  // Function to render the appropriate icon based on social media type
  const renderSocialIcon = (icon: string) => {
    switch (icon) {
      case 'facebook':
        return <Facebook className="h-6 w-6" />;
      case 'twitter':
        return <Twitter className="h-6 w-6" />;
      case 'instagram':
        return <Instagram className="h-6 w-6" />;
      case 'linkedin':
        return <Linkedin className="h-6 w-6" />;
      case 'youtube':
        return <Youtube className="h-6 w-6" />;
      case 'tiktok':
        return <span className="font-bold text-sm">TikTok</span>;
      case 'pinterest':
        return <span className="font-bold text-sm">PIN</span>;
      case 'snapchat':
        return <span className="font-bold text-sm">SC</span>;
      case 'whatsapp':
        return <span className="font-bold text-sm">WA</span>;
      case 'telegram':
        return <span className="font-bold text-sm">TG</span>;
      default:
        return <Share2 className="h-6 w-6" />;
    }
  };

  return (
    <footer className="bg-muted box-shadow hidden md:block mt-4">
      <Menus zone="footer" />
      
      {/* Bottom Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="mt-6 pt-6 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              {socialMedia.length > 0 ? (
                socialMedia.map((item) => (
                  <Link 
                    key={item.id}
                    href={item.link} 
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={item.title}
                    title={item.title}
                  >
                    {renderSocialIcon(item.icon)}
                  </Link>
                ))
              ) : (
                // Fallback if no social media is configured
                <>
                  <Link 
                    href="https://twitter.com" 
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-6 w-6" />
                  </Link>
                  <Link 
                    href="https://facebook.com" 
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-6 w-6" />
                  </Link>
                  <Link 
                    href="https://instagram.com" 
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-6 w-6" />
                  </Link>
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Airbnb Clone. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 