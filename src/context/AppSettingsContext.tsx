'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, deleteDoc, setDoc, serverTimestamp, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Types for app settings data structure
export interface SliderItem {
  id: string;
  title: string;
  link: string;
  imageUrl: string;
  order: number;
}

export interface SliderContainer {
  id: string;
  title: string;
  zone: string;
}

export interface SliderItems {
  [key: string]: SliderItem[];
}

// Ad types and orientation options
export enum AdType {
  TEXT = 'text',
  IMAGE = 'image'
}

export enum AdOrientation {
  SKYSCRAPER = 'skyscraper',     // 120x600, 160x600, 300x600
  SQUARE = 'square',             // 250x250, 300x250
  PORTRAIT = 'portrait',         // 300x1050
  BANNER = 'banner',             // 468x60, 728x90
  LEADERBOARD = 'leaderboard',   // 970x90, 970x250
  MOBILE = 'mobile'              // 320x50, 320x100
}

// Dimensions for each orientation
export const OrientationDimensions = {
  [AdOrientation.SKYSCRAPER]: '160x600',
  [AdOrientation.SQUARE]: '300x250',
  [AdOrientation.PORTRAIT]: '300x1050',
  [AdOrientation.BANNER]: '728x90',
  [AdOrientation.LEADERBOARD]: '970x90',
  [AdOrientation.MOBILE]: '320x50'
};

export interface AdItem {
  id: string;
  title: string;
  link: string;
  type: AdType;
  zone: string;
  active: boolean;
  order: number;
  // Text ad properties
  content?: string;
  // Image ad properties
  imageUrl?: string;
  orientation?: AdOrientation;
}

export interface AdItems {
  [key: string]: AdItem[];
}

// Social media interface
export interface SocialMediaItem {
  id: string;
  title: string;
  link: string;
  icon: string;
  order: number;
}

export interface MenuItem {
  text: string;
  url: string;
}

export interface MenuColumn {
  title: string;
  items: MenuItem[];
}

export interface Menu {
  id: string;
  title: string;
  zone: string;
  columns: number;
}

export interface MenuItems {
  [key: string]: MenuColumn[];
}

export interface SiteSettings {
  siteName: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  maxListingsPerUser: number;
  featuredListingCost: number;
  enableUserRegistration: boolean;
  enableListingCreation: boolean;
  maintenanceMode: boolean;
  googleMapsApiKey: string;
  stripePublicKey: string;
  stripeSecretKey: string;
  authMethods: {
    emailPassword: boolean;
    google: boolean;
    apple: boolean;
    facebook: boolean;
    phone: boolean;
    anonymous: boolean;
  };
  facebookAppId: string;
  facebookAppSecret: string;
}

export interface LanguageSettings {
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  customLabels?: Record<string, Record<string, string>>;
}

export interface AppSettings {
  menus: Menu[];
  menuItems: MenuItems;
  sliders: SliderContainer[];
  sliderItems: SliderItems;
  ads: AdItem[];
  adzones: string[];
  siteSettings: SiteSettings;
  socialMedia: SocialMediaItem[];
  languages: LanguageSettings[];
  updatedAt: Timestamp | null;
}

export interface CarouselImage {
  id: string;
  url: string;
  title: string;
  alt: string;
  link?: string;
}

// Default empty state for app settings
const defaultAppSettings: AppSettings = {
  menus: [],
  menuItems: {},
  sliders: [],
  sliderItems: {},
  ads: [],
  adzones: [],
  socialMedia: [],
  languages: [
    {
      code: 'en',
      name: 'English',
      isActive: true,
      isDefault: true
    },
    {
      code: 'fr',
      name: 'French',
      isActive: true,
      isDefault: false
    }
  ],
  siteSettings: {
    siteName: 'RentEasy',
    contactEmail: 'support@renteasy.com',
    phoneNumber: '+1 (555) 123-4567',
    address: '123 Main St, San Francisco, CA 94105',
    maxListingsPerUser: 10,
    featuredListingCost: 29.99,
    enableUserRegistration: true,
    enableListingCreation: true,
    maintenanceMode: false,
    googleMapsApiKey: '',
    stripePublicKey: '',
    stripeSecretKey: '',
    authMethods: {
      emailPassword: true,
      google: false,
      apple: false,
      facebook: false,
      phone: false,
      anonymous: false,
    },
    facebookAppId: '',
    facebookAppSecret: '',
  },
  updatedAt: null
};

// Context type
interface AppSettingsContextType {
  appSettings: AppSettings;
  loading: boolean;
  error: string | null;
  getCarouselImagesForZone: (zone: string) => CarouselImage[];
  getMenusForZone: (zone: string) => { menu: Menu, items: MenuColumn[] }[];
  getAdsForZone: (zone: string) => AdItem[];
  getSocialMedia: () => SocialMediaItem[];
  registerAdZone: (zone: string) => Promise<void>;
  refreshAppSettings: () => Promise<void>;
  resetAppSettings: (deleteFromFirestore?: boolean) => Promise<void>;
  clearContextOnly: () => void;
  createDemoMenusIfEmpty: () => Promise<void>;
}

// Create context
const AppSettingsContext = createContext<AppSettingsContextType>({
  appSettings: defaultAppSettings,
  loading: true,
  error: null,
  getCarouselImagesForZone: () => [],
  getMenusForZone: () => [],
  getAdsForZone: () => [],
  getSocialMedia: () => [],
  registerAdZone: async () => {},
  refreshAppSettings: async () => {},
  resetAppSettings: async () => {},
  clearContextOnly: () => {},
  createDemoMenusIfEmpty: async () => {}
});

// Hook for using the context
export const useAppSettings = () => useContext(AppSettingsContext);

// Provider component
export const AppSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch app settings
  const fetchAppSettings = async () => {
    try {
      setLoading(true);
      
      // Get the app settings document
      const appSettingsRef = doc(db, 'appSettings', 'interface');
      const appSettingsSnap = await getDoc(appSettingsRef);
      
      if (appSettingsSnap.exists()) {
        const data = appSettingsSnap.data();
        
        // Create a complete AppSettings object with default values for missing fields
        const completeData: AppSettings = {
          menus: data.menus || [],
          menuItems: data.menuItems || {},
          sliders: data.sliders || [],
          sliderItems: data.sliderItems || {},
          ads: data.ads || [],
          adzones: data.adzones || [],
          socialMedia: data.socialMedia || [],
          languages: data.languages || defaultAppSettings.languages,
          siteSettings: data.siteSettings || defaultAppSettings.siteSettings,
          updatedAt: data.updatedAt || null
        };
        
        // Set the complete data
        setAppSettings(completeData);
      } else {
        console.log('No app settings found, using defaults');
        setAppSettings(defaultAppSettings);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching app settings:', error);
      setError('Failed to load app settings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on initial load
  useEffect(() => {
    fetchAppSettings();
  }, []);

  // Add refresh function
  const refreshAppSettings = async () => {
    await fetchAppSettings();
  };

  // Function to just clear the context data without affecting Firestore
  const clearContextOnly = () => {
    console.log('Clearing app settings context data only...');
    setAppSettings(defaultAppSettings);
  };

  // Add reset function that optionally deletes from Firestore
  const resetAppSettings = async (deleteFromFirestore: boolean = false) => {
    try {
      setLoading(true);
      console.log('Resetting app settings...');
      
      // Reset the state to default
      setAppSettings(defaultAppSettings);
      
      if (deleteFromFirestore) {
        console.log('Deleting app settings from Firestore...');
        const appSettingsRef = doc(db, 'appSettings', 'interface');
        try {
          await deleteDoc(appSettingsRef);
          console.log('App settings deleted from Firestore');
        } catch (error) {
          console.error('Error deleting app settings from Firestore:', error);
          
          // If we can't delete, try to reset fields or create a new document
          try {
            // Check if document exists first
            const docSnap = await getDoc(appSettingsRef);
            
            if (docSnap.exists()) {
              // Document exists, update with empty values for fields we manage
              // Use a complete set of fields to ensure all are properly reset
              await updateDoc(appSettingsRef, {
                menus: [],
                menuItems: {},
                sliders: [],
                sliderItems: {},
                ads: [],
                adzones: [],
                siteSettings: defaultAppSettings.siteSettings,
                updatedAt: serverTimestamp()
              });
            } else {
              // Document doesn't exist, create it with all required fields
              await setDoc(appSettingsRef, {
                ...defaultAppSettings,
                updatedAt: serverTimestamp()
              });
            }
            console.log('App settings reset to empty in Firestore');
          } catch (setDocError) {
            console.error('Error resetting app settings in Firestore:', setDocError);
          }
        }
      }
      
      setError(null);
    } catch (error) {
      console.error('Error resetting app settings:', error);
      setError('Failed to reset app settings');
    } finally {
      setLoading(false);
    }
  };

  // Utility to get carousel images for a specific zone
  const getCarouselImagesForZone = (zone: string): CarouselImage[] => {
    if (!zone || !appSettings.sliders) {
      return [];
    }
    
    // Find slider container for the specified zone
    const zoneSlider = appSettings.sliders.find(slider => slider.zone === zone);
    
    if (!zoneSlider) {
      return [];
    }
    
    // Check if sliderItems exists and has the required slider ID
    if (!appSettings.sliderItems || !appSettings.sliderItems[zoneSlider.id]) {
      return [];
    }
    
    // Get slider items for this slider
    const sliderItems = appSettings.sliderItems[zoneSlider.id];
    
    // Sort by order
    const sortedItems = [...sliderItems].sort((a, b) => a.order - b.order);
    
    // Convert to carousel format
    const carouselImages = sortedItems.map(item => ({
      id: item.id,
      url: item.imageUrl || '',
      title: item.title || '',
      alt: item.title || '',
      link: item.link || ''
    }));
    
    return carouselImages;
  };

  // Function to create demo menus if none exist
  const createDemoMenusIfEmpty = async () => {
    try {
      // Check if menus exist and have length
      if (!appSettings.menus || appSettings.menus.length === 0) {
        console.log('Creating demo menus...');
        
        // Create example menus
        const footerMenu1 = { id: 'menu_footer_company', title: 'Company', zone: 'footer', columns: 1 };
        const footerMenu2 = { id: 'menu_footer_support', title: 'Support', zone: 'footer', columns: 1 };
        const footerMenu3 = { id: 'menu_footer_legal', title: 'Legal', zone: 'footer', columns: 1 };
        const footerMenu4 = { id: 'menu_footer_discover', title: 'Discover', zone: 'footer', columns: 1 };
        
        // Create example menu items
        const companyItems = [
          { title: 'Company', items: [
            { text: 'About Us', url: '/about' },
            { text: 'Careers', url: '/careers' },
            { text: 'Press', url: '/press' },
            { text: 'Contact', url: '/contact' }
          ]}
        ];
        
        const supportItems = [
          { title: 'Support', items: [
            { text: 'Help Center', url: '/help' },
            { text: 'Safety Center', url: '/safety' },
            { text: 'Community Guidelines', url: '/guidelines' },
            { text: 'Contact Support', url: '/support' }
          ]}
        ];
        
        const legalItems = [
          { title: 'Legal', items: [
            { text: 'Terms of Service', url: '/terms' },
            { text: 'Privacy Policy', url: '/privacy' },
            { text: 'Cookie Policy', url: '/cookies' },
            { text: 'Accessibility', url: '/accessibility' }
          ]}
        ];
        
        const discoverItems = [
          { title: 'Discover', items: [
            { text: 'Trust & Safety', url: '/trust' },
            { text: 'Travel Credit', url: '/credit' },
            { text: 'Gift Cards', url: '/gift-cards' },
            { text: 'Sitemap', url: '/sitemap' }
          ]}
        ];
        
        // Create new app settings with demo data
        const menuItems = {
          [footerMenu1.id]: companyItems,
          [footerMenu2.id]: supportItems,
          [footerMenu3.id]: legalItems,
          [footerMenu4.id]: discoverItems
        };
        
        const newMenus = [footerMenu1, footerMenu2, footerMenu3, footerMenu4];
        
        // Update state, preserving other fields
        setAppSettings(prevSettings => ({
          ...prevSettings,
          menus: newMenus,
          menuItems: menuItems
        }));
        
        // Get reference to app settings document
        const appSettingsRef = doc(db, 'appSettings', 'interface');
        
        // Check if document exists
        const docSnap = await getDoc(appSettingsRef);
        
        if (docSnap.exists()) {
          // Update only the menu fields
          await updateDoc(appSettingsRef, {
            menus: newMenus,
            menuItems: menuItems,
            updatedAt: serverTimestamp()
          });
        } else {
          // Create a new document with full structure if it doesn't exist
          await setDoc(appSettingsRef, {
            menus: newMenus,
            menuItems: menuItems,
            sliders: [],
            sliderItems: {},
            ads: [],
            adzones: [],
            updatedAt: serverTimestamp()
          });
        }
        
        console.log('Demo menus created successfully');
      }
    } catch (error) {
      console.error('Error creating demo menus:', error);
    }
  };

  // Utility to get menus for a specific zone
  const getMenusForZone = (zone: string) => {
    if (!zone || !appSettings.menus) {
      return [];
    }
    
    const zoneMenus = appSettings.menus.filter(menu => menu.zone === zone);
    
    return zoneMenus.map(menu => ({
      menu,
      items: (appSettings.menuItems && appSettings.menuItems[menu.id]) || []
    }));
  };

  // Utility to get ads for a specific zone
  const getAdsForZone = (zone: string): AdItem[] => {
    if (!zone || !appSettings.ads || !Array.isArray(appSettings.ads)) {
      return [];
    }
    
    try {
      return appSettings.ads
        .filter(ad => ad && ad.zone === zone && ad.active === true)
        .sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
    } catch (error) {
      console.error('Error filtering ads:', error);
      return [];
    }
  };

  // Function to register a new ad zone if it doesn't exist already
  const registerAdZone = async (zone: string) => {
    if (!zone) return;
    
    try {
      // Fetch the latest data from Firestore to ensure we have the most up-to-date list
      const appSettingsRef = doc(db, 'appSettings', 'interface');
      const appSettingsSnap = await getDoc(appSettingsRef);
      
      if (appSettingsSnap.exists()) {
        const data = appSettingsSnap.data();
        const existingZones = data.adzones || [];
        
        // Only proceed if the zone is not already in Firestore
        if (!existingZones.includes(zone)) {
          console.log(`Registering new ad zone: ${zone}`);
          
          // Add a small delay to prevent race conditions
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Use arrayUnion to safely add the zone without duplicates
          await updateDoc(appSettingsRef, {
            adzones: arrayUnion(zone)
          });
          
          // Update local state to include the new zone
          setAppSettings(prevSettings => ({
            ...prevSettings,
            adzones: [...(prevSettings.adzones || []), zone]
          }));
          
          console.log(`Successfully registered ad zone: ${zone}`);
        } else {
         // console.log(`Zone "${zone}" already exists, no need to register`);
        }
      } else {
        // Document doesn't exist yet, create it with the zone and initialize all required fields
        const initialSettings = {
          menus: [],
          menuItems: {},
          sliders: [],
          sliderItems: {},
          ads: [],
          adzones: [zone],
          updatedAt: serverTimestamp()
        };
        
        // Create the document with initial settings
        await setDoc(appSettingsRef, initialSettings);
        
        // Update local state
        setAppSettings(prevState => ({
          ...prevState,
          adzones: [zone]
        }));
        
        console.log(`Created new settings document with ad zone: ${zone}`);
      }
    } catch (error) {
      console.error('Error registering ad zone:', error);
    }
  };

  // Add getSocialMedia utility function
  const getSocialMedia = () => {
    // Return sorted social media items
    return [...(appSettings.socialMedia || [])].sort((a, b) => a.order - b.order);
  };

  const contextValue = {
    appSettings,
    loading,
    error,
    getCarouselImagesForZone,
    getMenusForZone,
    getAdsForZone,
    getSocialMedia,
    registerAdZone,
    refreshAppSettings,
    resetAppSettings,
    clearContextOnly,
    createDemoMenusIfEmpty
  };

  return (
    <AppSettingsContext.Provider value={contextValue}>
      {children}
    </AppSettingsContext.Provider>
  );
}; 