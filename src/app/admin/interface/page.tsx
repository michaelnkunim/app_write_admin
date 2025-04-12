'use client';

import { useState, ChangeEvent, useEffect, useRef, useCallback } from 'react';
import { storage } from '@/lib/firebase';
import { serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAdminApp } from '@/context/AdminAppContext';
import { useAppFirestore } from '@/hooks/useAppFirestore';
import { FaFacebook, FaInstagram, FaLinkedin, FaTwitter, FaYoutube } from 'react-icons/fa';
import { MenuColumn } from '@/context/AppSettingsContext';
import { 
  MenuIcon, 
  ImageIcon, 
  Plus, 
  Trash2, 
  Save, 
  Link as LinkIcon,
  Columns,
  PlusCircle,
  Edit,
  XCircle,
  X,
  Check,
  AlertTriangle,
  Info,
  Layout,
  Image as ImageLucide,
  Share2,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';


interface Menu {
  id: string;
  title: string;
  zone: string;
  columns: number;
}

interface MenuItem {
  text: string;
  url: string;
}

interface MenuItems {
  [key: string]: MenuColumn[];
}

interface SliderContainer {
  id: string;
  title: string;
  zone: string;
}

interface SliderItem {
  id: string;
  title: string;
  link: string;
  imageUrl: string;
  order: number;
}

interface SliderItems {
  [key: string]: SliderItem[];
}

// Define an AppSettings interface
interface AppSettings {
  menus: Menu[];
  menuItems: MenuItems;
  sliders: SliderContainer[];
  sliderItems: SliderItems;
  ads: AdItem[];
  socialMedia: SocialMediaItem[]; // Add this line
  updatedAt: Date;
  adzones?: string[];
}

// Define modal types
type ModalType = 'success' | 'error' | 'warning' | 'confirm' | 'info';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// Add a toast interface
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// Ad related interfaces
enum AdType {
  TEXT = 'text',
  IMAGE = 'image'
}

enum AdOrientation {
  SKYSCRAPER = 'skyscraper',
  SQUARE = 'square',
  PORTRAIT = 'portrait',
  BANNER = 'banner',
  LEADERBOARD = 'leaderboard',
  MOBILE = 'mobile'
}

const OrientationDimensions = {
  [AdOrientation.SKYSCRAPER]: '160x600',
  [AdOrientation.SQUARE]: '300x250',
  [AdOrientation.PORTRAIT]: '300x1050',
  [AdOrientation.BANNER]: '728x90',
  [AdOrientation.LEADERBOARD]: '970x90',
  [AdOrientation.MOBILE]: '320x50'
};

interface AdItem {
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

// Add social media interface after the AdItem interface
interface SocialMediaItem {
  id: string;
  title: string;
  link: string;
  icon: string;
  order: number;
}

export default function AdminInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get('tab') || 'menus';
  // const { user } = useAuth();
  // const { appId, appSettings: contextAppSettings, saveAppSettings: saveContextAppSettings } = useAdminApp();
  const { appSettings: contextAppSettings, appFirebase } = useAdminApp();
  const { appFirebaseError, appFirebaseLoading, getDocument, saveDocument, db } = useAppFirestore();
  
  // State for app settings
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItems>({});
  const [sliders, setSliders] = useState<SliderContainer[]>([]);
  const [sliderItems, setSliderItems] = useState<SliderItems>({});
  const [ads, setAds] = useState<AdItem[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMediaItem[]>([]);
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [selectedSlider, setSelectedSlider] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState<{[key: string]: {[key: number]: boolean}}>({});
  const [expandedMenuItems, setExpandedMenuItems] = useState<{[key: string]: {[key: number]: {[key: number]: boolean}}}>({});
  
  // State for new menu
  const [newMenu, setNewMenu] = useState<Omit<Menu, 'id'>>({
    title: '',
    zone: 'footer',
    columns: 1
  });
  
  // State for new slider
  const [newSlider, setNewSlider] = useState<Omit<SliderContainer, 'id'>>({
    title: '',
    zone: 'home'
  });
  
  // State for new slider item
  const [newSliderItem, setNewSliderItem] = useState<Omit<SliderItem, 'id' | 'order'>>({
    title: '',
    link: '',
    imageUrl: ''
  });
  
  // State for modals
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Editing states
  const [editingSliderItem, setEditingSliderItem] = useState<{ sliderId: string, itemId: string } | null>(null);
  const [editSliderItem, setEditSliderItem] = useState<Omit<SliderItem, 'id' | 'order'>>({
    title: '',
    link: '',
    imageUrl: ''
  });
  
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editAdFileInputRef = useRef<HTMLInputElement>(null);
  
  // Add file state variables
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string | null>(null);
  const [editAdImagePreview, setEditAdImagePreview] = useState<string | null>(null);
  const [editAdImageFile, setEditAdImageFile] = useState<File | null>(null);
  const [creatingAd, setCreatingAd] = useState<boolean>(false);
  
  // States for ad creation and editing
  const [newAd, setNewAd] = useState<Omit<AdItem, 'id' | 'order'>>({
    title: '',
    link: '',
    type: AdType.IMAGE,
    zone: '',
    active: true,
    content: '',
    imageUrl: '',
    orientation: AdOrientation.BANNER
  });
  
  const [editingAd, setEditingAd] = useState<string | null>(null);
  const [editAd, setEditAd] = useState<Omit<AdItem, 'id' | 'order'>>({
    title: '',
    link: '',
    type: AdType.IMAGE,
    zone: '',
    active: true,
    content: '',
    imageUrl: '',
    orientation: AdOrientation.BANNER
  });
  
  // States for social media
  const [newSocialMedia, setNewSocialMedia] = useState<Omit<SocialMediaItem, 'id' | 'order'>>({
    title: '',
    link: '',
    icon: 'facebook'
  });
  
  const [editingSocialMedia, setEditingSocialMedia] = useState<string | null>(null);
  const [editSocialMedia, setEditSocialMedia] = useState<Omit<SocialMediaItem, 'id' | 'order'>>({
    title: '',
    link: '',
    icon: ''
  });
  
  // Add these missing states for slider functionality
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [savingSliderItem, setSavingSliderItem] = useState<boolean>(false);
  
  // Replace all fetch app settings function to use modals
  // Helper to open a modal
  const openModal = (type: ModalType, title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      onCancel
    });
  };

  // Helper to close the modal
  const closeModal = () => {
    setModal(prev => ({
      ...prev,
      isOpen: false
    }));
  };
  
  const fetchAppSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if we have a valid Firebase instance for the selected app
      if (appFirebaseError) {
        openModal('error', 'Firebase Error', `Error loading app Firebase instance: ${appFirebaseError}`);
        setLoading(false);
        return;
      }
      
      if (appFirebaseLoading) {
        // Wait for Firebase to initialize
        return;
      }
      
      // Get the app settings document using the app's Firestore instance
      const appSettingsDoc = await getDocument('appSettings', 'interface');
      
      if (appSettingsDoc) {
        const data = appSettingsDoc;
        
        // Convert old format to new format if needed
        const convertedMenuItems = { ...data.menuItems } as MenuItems;
        
        // Check if we need to convert from old MenuItem[][] to MenuColumn[]
        Object.keys(convertedMenuItems).forEach(menuId => {
          if (Array.isArray(convertedMenuItems[menuId]) && convertedMenuItems[menuId].length > 0) {
            // Check if the first item is an array (old format) or has a title property (new format)
            if (Array.isArray(convertedMenuItems[menuId][0]) && !('title' in convertedMenuItems[menuId][0])) {
              // Convert from old format to new format
              convertedMenuItems[menuId] = (convertedMenuItems[menuId] as unknown as MenuItem[][]).map((column, index) => ({
                title: `Column ${index + 1}`,
                items: column
              }));
            }
          }
        });
        
        setMenus(data.menus ?? []);
        setMenuItems(convertedMenuItems ?? {});
        setSliders(data.sliders ?? []);
        setSliderItems(data.sliderItems ?? {});
        setAds(data.ads ?? []);
        setSocialMedia(data.socialMedia ?? []);
        
        // Select the first menu if available
        if (data.menus && data.menus.length > 0 && !selectedMenu) {
          setSelectedMenu(data.menus[0].id);
        }
        
        // Select the first slider if available
        if (data.sliders && data.sliders.length > 0 && !selectedSlider) {
          setSelectedSlider(data.sliders[0].id);
        }
        
        // Select the first ad if available
        if (data.ads && data.ads.length > 0 && !selectedAd) {
          setSelectedAd(data.ads[0].id);
        }
        
        setLoading(false);
      } else {
        // Initialize with empty data
        setMenus([]);
        setMenuItems({});
        setSliders([]);
        setSliderItems({});
        setAds([]);
        setSocialMedia([]);
        
        // Create a new empty document if it doesn't exist
        try {
          await saveDocument('appSettings', 'interface', {
            menus: [],
            menuItems: {},
            sliders: [],
            sliderItems: {},
            ads: [],
            socialMedia: [],
            adzones: [],
            updatedAt: new Date()
          });
          console.log('Created new app settings document');
        } catch (createError) {
          console.error('Error creating new app settings document:', createError);
        }
        
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Error fetching app settings:', error);
      openModal('error', 'Error', 'Failed to load app settings. Please try again.');
      setLoading(false);
    }
  }, [appFirebaseError, appFirebaseLoading, selectedMenu, selectedSlider, selectedAd, getDocument, saveDocument]);

  useEffect(() => {
    fetchAppSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save all app settings with toasters instead of modals
  const saveAppSettings = async () => {
    try {
      setLoading(true);
      
      // Check if we have a valid Firebase instance for the selected app
      if (appFirebaseError) {
        showToast('error', `Firebase error: ${appFirebaseError}`);
        setLoading(false);
        return;
      }
      
      if (appFirebaseLoading) {
        // Wait for Firebase to initialize
        return;
      }
      
      // Prepare the data
      const settings: AppSettings = {
        menus,
        menuItems,
        sliders,
        sliderItems,
        ads,
        socialMedia,
        updatedAt: new Date(),
        adzones: contextAppSettings.adzones ?? []
      };
      
      // Save to Firestore using the app's Firestore instance
      await saveDocument('appSettings', 'interface', settings);
      
      setHasUnsavedChanges(false);
      showToast('success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('error', 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewMenu((prev) => ({ 
      ...prev, 
      [name]: name === 'columns' ? parseInt(value) : value 
    }));
  };

  const addMenu = async () => {
    try {
      if (!newMenu.title.trim()) {
        openModal('warning', 'Missing Information', 'Please enter a menu title');
        return;
      }
      
      // Generate a unique ID
      const menuId = `menu_${Date.now()}`;
      
      // Create new menu with ID
      const newMenuWithId = { id: menuId, ...newMenu };
      
      // Update state
      const updatedMenus = [...menus, newMenuWithId];
      setMenus(updatedMenus);
      setSelectedMenu(menuId);
      setNewMenu({ title: '', zone: 'footer', columns: 1 });
      
      // Initialize empty columns for the new menu with titles
      const updatedMenuItems = {
        ...menuItems,
        [menuId]: Array(newMenu.columns).fill(0).map((_, index) => ({
          title: `Column ${index + 1}`,
          items: []
        }))
      };
      setMenuItems(updatedMenuItems);
      
      // Mark that we have unsaved changes
      setHasUnsavedChanges(true);
      
    } catch (error) {
      console.error('Error adding menu:', error);
      openModal('error', 'Error', 'Failed to add menu. Please try again.');
    }
  };

  // Add a function to update column titles
  const handleColumnTitleChange = (menuId: string, columnIndex: number, title: string) => {
    setMenuItems(prev => {
      const menu = [...(prev[menuId] ?? [])];
      if (!menu[columnIndex]) {
        menu[columnIndex] = { title: `Column ${columnIndex + 1}`, items: [] };
      }
      
      menu[columnIndex] = {
        ...menu[columnIndex],
        title
      };
      
      setHasUnsavedChanges(true);
      return { ...prev, [menuId]: menu };
    });
  };

  const handleMenuItemChange = (
    menuId: string, 
    columnIndex: number, 
    itemIndex: number, 
    field: 'text' | 'url', 
    value: string
  ) => {
    setMenuItems(prev => {
      const menu = [...(prev[menuId] ?? [])];
      if (!menu[columnIndex]) {
        menu[columnIndex] = { title: `Column ${columnIndex + 1}`, items: [] };
      }
      
      if (!menu[columnIndex].items[itemIndex]) {
        menu[columnIndex].items[itemIndex] = { text: '', url: '' };
      }
      
      menu[columnIndex].items[itemIndex] = {
        ...menu[columnIndex].items[itemIndex],
        [field]: value
      };
      
      setHasUnsavedChanges(true);
      return { ...prev, [menuId]: menu };
    });
  };

  const addMenuItem = (menuId: string, columnIndex: number) => {
    setMenuItems(prev => {
      const menu = [...(prev[menuId] ?? [])];
      if (!menu[columnIndex]) {
        menu[columnIndex] = { title: `Column ${columnIndex + 1}`, items: [] };
      }
      
      const newItemIndex = menu[columnIndex].items.length;
      menu[columnIndex].items.push({ text: '', url: '' });
      
      // Auto-expand the newly added item
      const itemKey = `${menuId}_${columnIndex}_${newItemIndex}`;
      setExpandedMenuItems(prev => ({
        ...prev,
        [itemKey]: true
      }));
      
      setHasUnsavedChanges(true);
      return { ...prev, [menuId]: menu };
    });
  };

  const removeMenuItem = (menuId: string, columnIndex: number, itemIndex: number) => {
    setMenuItems(prev => {
      const menu = [...(prev[menuId] ?? [])];
      if (menu[columnIndex]) {
        menu[columnIndex].items = menu[columnIndex].items.filter((_, idx) => idx !== itemIndex);
      }
      
      setHasUnsavedChanges(true);
      return { ...prev, [menuId]: menu };
    });
  };

  // Replace delete menu with toaster for feedback
  const deleteMenu = async (menuId: string) => {
    openModal(
      'confirm',
      'Confirm Deletion',
      'Are you sure you want to delete this menu?',
      async () => {
        try {
          // Update state
          const updatedMenus = menus.filter(menu => menu.id !== menuId);
          setMenus(updatedMenus);
          
          const updatedMenuItems = { ...menuItems };
          delete updatedMenuItems[menuId];
          setMenuItems(updatedMenuItems);
          
          if (selectedMenu === menuId) {
            setSelectedMenu(updatedMenus.length > 0 ? updatedMenus[0].id : null);
          }
          
          setHasUnsavedChanges(true);
          
          // Show toast notification after deletion
          showToast('success', 'Menu deleted successfully');
          
        } catch (error) {
          console.error('Error deleting menu:', error);
          showToast('error', 'Failed to delete menu. Please try again.');
        }
      }
    );
  };

  // Slider container functions
  const handleSliderChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewSlider(prev => ({ ...prev, [name]: value }));
  };

  const handleSliderItemChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewSliderItem(prev => ({ ...prev, [name]: value }));
  };

  // Add a function to save only slider-related data
  const saveSliders = async () => {
    try {
      setLoading(true);
      
      // Get the app settings document reference
      const appSettingsRef = doc(db, 'appSettings', 'interface');
      
      // Use updateDoc to only update slider-related fields
      await updateDoc(appSettingsRef, {
        sliders,
        sliderItems,
        updatedAt: serverTimestamp()
      });
      
      setHasUnsavedChanges(false);
      
      showToast('success', 'Slider settings saved successfully!');
    } catch (error) {
      console.error('Error saving slider settings:', error);
      showToast('error', 'Failed to save slider settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Replace deleteSlider with confirmation modal
  const deleteSlider = async (sliderId: string) => {
    openModal(
      'confirm',
      'Confirm Deletion',
      'Are you sure you want to delete this slider? All slider items will be lost.',
      async () => {
        try {
          // Delete all slider item images from storage
          const items = sliderItems[sliderId] ?? [];
          for (const item of items) {
            if (item.imageUrl) {
              try {
                const imageRef = ref(storage, item.imageUrl);
                await deleteObject(imageRef);
              } catch (error) {
                console.error('Error deleting image:', error);
              }
            }
          }
          
          // Update state
          const updatedSliders = sliders.filter(slider => slider.id !== sliderId);
          setSliders(updatedSliders);
          
          const updatedSliderItems = { ...sliderItems };
          delete updatedSliderItems[sliderId];
          setSliderItems(updatedSliderItems);
          
          if (selectedSlider === sliderId) {
            // If we just deleted the selected slider, select the first available slider
            // or set to null if none remain
            setSelectedSlider(updatedSliders.length > 0 ? updatedSliders[0].id : null);
          }
          
          setHasUnsavedChanges(true);
          
          // Auto-save when deleting a slider
          await saveSliders();
          
          showToast('success', 'Slider deleted successfully');
        } catch (error) {
          console.error('Error deleting slider:', error);
          showToast('error', 'Failed to delete slider. Please try again.');
        }
      }
    );
  };

  // Also update addSlider to use more unique IDs
  const addSlider = async () => {
    if (!newSlider.title.trim()) {
      showToast('warning', 'Please enter a slider title');
      return;
    }

    try {
      setLoading(true);
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const sliderId = `slider_${timestamp}_${random}`;
      
      // Create new slider with ID
      const newSliderWithId: SliderContainer = { 
        id: sliderId, 
        title: newSlider.title,
        zone: newSlider.zone
      };
      
      // Update state
      const updatedSliders = [...sliders, newSliderWithId];
      setSliders(updatedSliders);
      setSelectedSlider(sliderId);
      setNewSlider({ title: '', zone: 'homepage' });
      
      // Initialize empty slider items
      const updatedSliderItems = {
        ...sliderItems,
        [sliderId]: []
      };
      setSliderItems(updatedSliderItems);
      
      setHasUnsavedChanges(true);
      
      // Auto-save when adding a new slider
      await saveSliders();
      
      showToast('success', 'Slider added successfully!');
    } catch (error) {
      console.error('Error adding slider:', error);
      showToast('error', 'Failed to add slider. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Slider item functions
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Updated addSliderItem function to use app's storage
  const addSliderItem = async () => {
    if (!selectedSlider) {
      showToast('warning', 'Please select a slider first');
      return;
    }
    
    if (!newSliderItem.title.trim()) {
      showToast('warning', 'Please enter a slider item title');
      return;
    }
    
    if (!imageFile) {
      showToast('warning', 'Please select an image');
      return;
    }

    // Check if Firebase is ready
    if (appFirebaseLoading) {
      showToast('warning', 'Firebase is still initializing. Please try again in a moment.');
      return;
    }

    if (appFirebaseError) {
      showToast('error', `Firebase error: ${appFirebaseError}`);
      return;
    }
    
    try {
      setSavingSliderItem(true);
      
      // Upload image to the selected app's storage
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const storageRef = ref(appFirebase?.storage ?? storage, `sliders/${timestamp}_${random}_${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);
      
      // Generate a unique ID with timestamp and random component
      const itemId = `item_${timestamp}_${random}`;
      
      // Get current slider items
      const currentItems = sliderItems[selectedSlider] ?? [];
      
      // Create slider item data
      const sliderItemData: SliderItem = {
        id: itemId,
        title: newSliderItem.title,
        link: newSliderItem.link,
        imageUrl,
        order: currentItems.length // Use the length as the order
      };
      
      // Update state
      const updatedSliderItems = {
        ...sliderItems,
        [selectedSlider]: [...currentItems, sliderItemData]
      };
      
      setSliderItems(updatedSliderItems);
      setNewSliderItem({ title: '', link: '' });
      setImageFile(null);
      setImagePreview(null);
      
      setHasUnsavedChanges(true);
      
      // Auto-save when adding a slider item
      await saveSliders();
      
      // Show toast notification instead of modal
      showToast('success', 'Slide added successfully!');
    } catch (error) {
      console.error('Error adding slider item:', error);
      showToast('error', 'Failed to add slide. Please try again.');
    } finally {
      setSavingSliderItem(false);
    }
  };

  // Updated deleteSliderItem function to use app's storage
  const deleteSliderItem = async (sliderId: string, itemId: string, imageUrl: string) => {
    openModal(
      'confirm',
      'Confirm Deletion',
      'Are you sure you want to delete this slider item?',
      async () => {
        try {
          // Delete image from the selected app's storage
          try {
            const imageRef = ref(appFirebase?.storage ?? storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Error deleting image:', error);
          }
          
          // Update state
          const currentItems = sliderItems[sliderId] ?? [];
          const updatedItems = currentItems.filter(item => item.id !== itemId);
          
          // Reorder items after deletion
          const reorderedItems = updatedItems.map((item, index) => ({
            ...item,
            order: index
          }));
          
          const updatedSliderItems = {
            ...sliderItems,
            [sliderId]: reorderedItems
          };
          
          setSliderItems(updatedSliderItems);
          setHasUnsavedChanges(true);
          
          // Auto-save when deleting a slider item
          await saveSliders();
          
          // Show toast notification
          showToast('success', 'Slider item deleted successfully!');
        } catch (error) {
          console.error('Error deleting slider item:', error);
          showToast('error', 'Failed to delete slider item. Please try again.');
        }
      }
    );
  };

  const moveSliderItem = (sliderId: string, itemId: string, direction: 'up' | 'down') => {
    const currentItems = sliderItems[sliderId] ?? [];
    const itemIndex = currentItems.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) return;
    
    // Can't move up if already at the top
    if (direction === 'up' && itemIndex === 0) return;
    
    // Can't move down if already at the bottom
    if (direction === 'down' && itemIndex === currentItems.length - 1) return;
    
    const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    
    // Create a new array with the item moved
    const newItems = [...currentItems];
    const item = newItems[itemIndex];
    newItems.splice(itemIndex, 1);
    newItems.splice(newIndex, 0, item);
    
    // Update the order property for all items
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }));
    
    const updatedSliderItems = {
      ...sliderItems,
      [sliderId]: reorderedItems
    };
    
    setSliderItems(updatedSliderItems);
    setHasUnsavedChanges(true);
  };

  // Update tab navigation to use toaster instead of modal for save confirmation
  const navigateToTab = (tab: string) => {
    // Check for unsaved changes before navigating
    if (hasUnsavedChanges) {
      openModal(
        'confirm',
        'Unsaved Changes',
        'You have unsaved changes. Save before switching tabs?',
        () => {
          saveAppSettings().then(() => {
            showToast('success', 'Changes saved before switching tabs');
            router.push(`/admin/interface?tab=${tab}`);
          });
        },
        () => {
          router.push(`/admin/interface?tab=${tab}`);
        }
      );
    } else {
      router.push(`/admin/interface?tab=${tab}`);
    }
  };

  // Function to trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Add function to start editing a slider item
  const startEditingSliderItem = (sliderId: string, itemId: string) => {
    // Find the item in the slider items
    const item = sliderItems[sliderId]?.find(item => item.id === itemId);
    if (!item) return;
    
    // Set the editing state
    setEditingSliderItem({ sliderId, itemId });
    setEditSliderItem({
      title: item.title,
      link: item.link,
      imageUrl: item.imageUrl
    });
    setEditImagePreview(item.imageUrl);
  };

  // Add function to cancel editing
  const cancelEditingSliderItem = () => {
    setEditingSliderItem(null);
    setEditSliderItem({
      title: '',
      link: '',
      imageUrl: ''
    });
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  // Add function to handle edit image change
  const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setEditImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add function to handle edit slider item change
  const handleEditSliderItemChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditSliderItem(prev => ({ ...prev, [name]: value }));
  };

  // Add function to trigger edit file input click
  const triggerEditFileInput = () => {
    if (editFileInputRef.current) {
      editFileInputRef.current.click();
    }
  };

  // Update the updateSliderItem function
  const updateSliderItem = async (sliderId: string, itemId: string) => {
    if (!editingSliderItem) return;
    
    if (!editSliderItem.title.trim()) {
      showToast('warning', 'Please enter a slider item title');
      return;
    }

    // Check if Firebase is ready
    if (appFirebaseLoading) {
      showToast('warning', 'Firebase is still initializing. Please try again in a moment.');
      return;
    }

    if (appFirebaseError) {
      showToast('error', `Firebase error: ${appFirebaseError}`);
      return;
    }
    
    try {
      setUpdatingSliderItem(true);
      
      // Find current item to get its order
      const currentItems = sliderItems[sliderId] ?? [];
      const currentItem = currentItems.find(item => item.id === itemId);
      
      if (!currentItem) {
        showToast('error', 'Slider item not found');
        return;
      }
      
      let imageUrl = editSliderItem.imageUrl;
      
      // If a new image was uploaded, update the storage
      if (editImageFile) {
        try {
          // First upload the new image to the selected app's storage
          const storageRef = ref(appFirebase?.storage ?? storage, `sliders/${Date.now()}_${editImageFile.name}`);
          await uploadBytes(storageRef, editImageFile);
          imageUrl = await getDownloadURL(storageRef);
          
          // Then delete old image if it exists and is different
          if (currentItem.imageUrl && currentItem.imageUrl !== editSliderItem.imageUrl) {
            try {
              const oldImageRef = ref(appFirebase?.storage ?? storage, currentItem.imageUrl);
              await deleteObject(oldImageRef);
            } catch (deleteError) {
              console.error('Error deleting old image:', deleteError);
              // Continue even if delete fails
            }
          }
        } catch (error) {
          console.error('Error uploading new image:', error);
          showToast('error', 'Failed to upload new image. Please try again.');
          setUpdatingSliderItem(false);
          return;
        }
      }
      
      // Create updated slider item
      const updatedItem: SliderItem = {
        id: itemId,
        title: editSliderItem.title,
        link: editSliderItem.link,
        imageUrl: imageUrl,
        order: currentItem.order
      };
      
      // Update the state
      const updatedItems = currentItems.map(item => 
        item.id === itemId ? updatedItem : item
      );
      
      const updatedSliderItems = {
        ...sliderItems,
        [sliderId]: updatedItems
      };
      
      setSliderItems(updatedSliderItems);
      setHasUnsavedChanges(true);
      
      // Auto-save when updating a slider item
      await saveSliders();
      
      // Reset edit state
      cancelEditingSliderItem();
      
      // Show toast instead of modal
      showToast('success', 'Slider item updated successfully!');
    } catch (error) {
      console.error('Error updating slider item:', error);
      showToast('error', 'Failed to update slider item. Please try again.');
    } finally {
      setUpdatingSliderItem(false);
    }
  };

  // Add a function to show toast notifications
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };
  
  // Add a function to remove toast
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Add toggle function for expanding/collapsing menu columns
  const toggleColumnExpand = (menuId: string, columnIndex: number) => {
    setExpandedColumns(prev => ({
      ...prev,
      [`${menuId}_${columnIndex}`]: !prev[`${menuId}_${columnIndex}`]
    }));
  };

  // Add toggle function for expanding/collapsing menu items
  const toggleMenuItemExpand = (menuId: string, columnIndex: number, itemIndex: number) => {
    const itemKey = `${menuId}_${columnIndex}_${itemIndex}`;
    setExpandedMenuItems(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  // Add functions to expand or collapse all items in a column
  const expandAllMenuItems = (menuId: string, columnIndex: number) => {
    const columnItems = menuItems[menuId][columnIndex].items ?? [];
    const newExpandedState = { ...expandedMenuItems };
    
    columnItems.forEach((_, itemIndex) => {
      newExpandedState[`${menuId}_${columnIndex}_${itemIndex}`] = true;
    });
    
    setExpandedMenuItems(newExpandedState);
  };

  const collapseAllMenuItems = (menuId: string, columnIndex: number) => {
    const columnItems = menuItems[menuId][columnIndex].items ?? [];
    const newExpandedState = { ...expandedMenuItems };
    
    columnItems.forEach((_, itemIndex) => {
      newExpandedState[`${menuId}_${columnIndex}_${itemIndex}`] = false;
    });
    
    setExpandedMenuItems(newExpandedState);
  };

  // Ad-related functions
  const handleAdChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setNewAd(prev => {
      // For select fields that should be treated as booleans
      if (name === 'active') {
        return {
          ...prev,
          [name]: value === 'true'
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });
  };
  
  const handleAdTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as AdType;
    
    setNewAd(prev => ({
      ...prev,
      type,
      // Reset fields based on type
      ...(type === AdType.TEXT ? { orientation: undefined, imageUrl: undefined } : {}),
      ...(type === AdType.IMAGE ? { content: undefined } : {})
    }));
    
    // Clear image preview if changing to text ad
    if (type === AdType.TEXT) {
      setAdImagePreview(null);
      setAdImageFile(null);
    }
  };
  
  const handleAdImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAdImageFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAdImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Updated addAd function to use the selected app's storage
  const addAd = async () => {
    try {
      if (!newAd.title.trim()) {
        showToast('warning', 'Please enter an ad title');
        return;
      }
      
      if (newAd.type === AdType.TEXT && !newAd.content?.trim()) {
        showToast('warning', 'Please enter ad content for text ads');
        return;
      }
      
      if (newAd.type === AdType.IMAGE && !adImageFile) {
        showToast('warning', 'Please select an image for image ads');
        return;
      }

      // Check if Firebase is ready
      if (appFirebaseLoading) {
        showToast('warning', 'Firebase is still initializing. Please try again in a moment.');
        return;
      }

      if (appFirebaseError) {
        showToast('error', `Firebase error: ${appFirebaseError}`);
        return;
      }
      
      setCreatingAd(true);
      
      // Generate a unique ID
      const adId = `ad_${Date.now()}`;
      
      let imageUrl = '';
      
      // If it's an image ad, upload the image to the selected app's storage
      if (newAd.type === AdType.IMAGE && adImageFile) {
        const storageRef = ref(appFirebase?.storage ?? storage, `ads/${adId}`);
        await uploadBytes(storageRef, adImageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // Create new ad with ID, making sure content is handled correctly
      const newAdWithId: AdItem = {
        id: adId,
        title: newAd.title,
        link: newAd.link,
        type: newAd.type,
        zone: newAd.zone,
        active: newAd.active,
        order: ads.length,
        // Only add content for TEXT type ads
        ...(newAd.type === AdType.TEXT ? { content: newAd.content ?? '' } : {}),
        // Only add imageUrl and orientation for IMAGE type
        ...(newAd.type === AdType.IMAGE ? { 
          imageUrl,
          orientation: newAd.orientation
        } : {})
      };
      
      // Update state
      const updatedAds = [...ads, newAdWithId];
      setAds(updatedAds);
      setSelectedAd(adId);
      
      // Reset form
      setNewAd({
        title: '',
        link: '',
        type: AdType.TEXT,
        zone: '',
        active: true,
        order: 0,
        content: '',
      });
      setAdImageFile(null);
      setAdImagePreview(null);
      
      // Mark that we have unsaved changes
      setHasUnsavedChanges(true);
      
      showToast('success', 'Ad created successfully');
    } catch (error) {
      console.error('Error adding ad:', error);
      showToast('error', 'Failed to create ad');
    } finally {
      setCreatingAd(false);
    }
  };
  
  // Updated deleteAd function to use the selected app's storage
  const deleteAd = async (adId: string) => {
    openModal(
      'confirm',
      'Delete Ad',
      'Are you sure you want to delete this ad? This action cannot be undone.',
      async () => {
        try {
          // Find the ad to delete
          const adToDelete = ads.find(ad => ad.id === adId);
          
          if (!adToDelete) {
            showToast('error', 'Ad not found');
            return;
          }
          
          // If it's an image ad, delete the image from the selected app's storage
          if (adToDelete.type === AdType.IMAGE && adToDelete.imageUrl) {
            try {
              const imageRef = ref(appFirebase?.storage ?? storage, adToDelete.imageUrl);
              await deleteObject(imageRef);
            } catch (error) {
              console.error('Error deleting ad image:', error);
              // Continue even if image deletion fails
            }
          }
          
          // Update state
          const updatedAds = ads.filter(ad => ad.id !== adId);
          setAds(updatedAds);
          
          if (selectedAd === adId) {
            setSelectedAd(updatedAds.length > 0 ? updatedAds[0].id : null);
          }
          
          // Mark that we have unsaved changes
          setHasUnsavedChanges(true);
          
          showToast('success', 'Ad deleted successfully');
        } catch (error) {
          console.error('Error deleting ad:', error);
          showToast('error', 'Failed to delete ad');
        }
      }
    );
  };

  // Add social media item
  const addSocialMedia = () => {
    if (!newSocialMedia.title) {
      showToast('error', 'Please enter a title for the social media');
      return;
    }
    
    if (!newSocialMedia.link) {
      showToast('error', 'Please enter a link for the social media');
      return;
    }
    
    // Create new social media item
    const newItem: SocialMediaItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      title: newSocialMedia.title,
      link: newSocialMedia.link,
      icon: newSocialMedia.icon,
      order: socialMedia.length
    };
    
    // Add to state
    setSocialMedia([...socialMedia, newItem]);
    
    // Reset form
    setNewSocialMedia({
      title: '',
      link: '',
      icon: 'facebook'
    });
    
    // Mark as unsaved
    setHasUnsavedChanges(true);
    
    // Show success message
    showToast('success', 'Social media added! Remember to save changes.');
  };
  
  // Delete social media item
  const deleteSocialMedia = (id: string) => {
    openModal(
      'confirm',
      'Delete Social Media',
      'Are you sure you want to delete this social media? This cannot be undone.',
      () => {
        const updatedSocialMedia = socialMedia.filter(item => item.id !== id);
        
        // Reorder remaining items
        const reorderedSocialMedia = updatedSocialMedia.map((item, index) => ({
          ...item,
          order: index
        }));
        
        setSocialMedia(reorderedSocialMedia);
        setHasUnsavedChanges(true);
        showToast('success', 'Social media deleted!');
      }
    );
  };
  
  // Start editing social media item
  const startEditingSocialMedia = (id: string) => {
    const itemToEdit = socialMedia.find(item => item.id === id);
    if (itemToEdit) {
      setEditSocialMedia({
        title: itemToEdit.title,
        link: itemToEdit.link,
        icon: itemToEdit.icon
      });
      setEditingSocialMedia(id);
    }
  };
  
  // Save edited social media item
  const updateSocialMedia = () => {
    if (!editingSocialMedia) return;
    
    if (!editSocialMedia.title) {
      showToast('error', 'Please enter a title for the social media');
      return;
    }
    
    if (!editSocialMedia.link) {
      showToast('error', 'Please enter a link for the social media');
      return;
    }
    
    const updatedSocialMedia = socialMedia.map(item => {
      if (item.id === editingSocialMedia) {
        return {
          ...item,
          title: editSocialMedia.title,
          link: editSocialMedia.link,
          icon: editSocialMedia.icon
        };
      }
      return item;
    });
    
    setSocialMedia(updatedSocialMedia);
    setEditingSocialMedia(null);
    setHasUnsavedChanges(true);
    showToast('success', 'Social media updated!');
  };
  
  // Cancel editing
  const cancelEditingSocialMedia = () => {
    setEditingSocialMedia(null);
  };
  
  // Handle input change for new social media
  const handleSocialMediaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewSocialMedia({
      ...newSocialMedia,
      [name]: value
    });
  };
  
  // Handle input change for editing social media
  const handleEditSocialMediaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditSocialMedia({
      ...editSocialMedia,
      [name]: value
    });
  };

  // Function to save social media
  const saveSocialMedia = async () => {
    try {
      setLoading(true);
      
      // Check if we have a valid Firebase instance for the selected app
      if (appFirebaseError) {
        showToast('error', `Firebase error: ${appFirebaseError}`);
        setLoading(false);
        return;
      }
      
      if (appFirebaseLoading) {
        // Wait for Firebase to initialize
        return;
      }
      
      // Prepare the data
      const settings: AppSettings = {
        menus,
        menuItems,
        sliders,
        sliderItems,
        ads,
        socialMedia,
        updatedAt: new Date(),
        adzones: contextAppSettings.adzones ?? []
      };
      
      // Save to Firestore using the app's Firestore instance
      await saveDocument('appSettings', 'interface', settings);
      
      setHasUnsavedChanges(false);
      showToast('success', 'Social media settings saved successfully!');
    } catch (error) {
      console.error('Error saving social media:', error);
      showToast('error', 'Failed to save social media settings');
    } finally {
      setLoading(false);
    }
  };

  // Add function to start editing an ad
  const startEditingAd = (adId: string) => {
    const ad = ads.find(a => a.id === adId);
    if (!ad) return;
    
    setEditingAd(true);
    setEditAd({
      title: ad.title,
      link: ad.link,
      type: ad.type,
      zone: ad.zone,
      active: ad.active,
      content: ad.content ?? '',
      imageUrl: ad.imageUrl,
      orientation: ad.orientation
    });
    setEditAdImagePreview(ad.imageUrl ?? null);
  };

  // Add function to cancel editing
  const cancelEditingAd = () => {
    setEditingAd(false);
    setEditAd({
      title: '',
      link: '',
      type: AdType.TEXT,
      zone: '',
      active: true,
      content: '',
    });
    setEditAdImageFile(null);
    setEditAdImagePreview(null);
  };

  // Add function to handle edit ad change
  const handleEditAdChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setEditAd(prev => {
      if (name === 'active') {
        return {
          ...prev,
          [name]: value === 'true'
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });
  };

  // Add function to handle edit ad type change
  const handleEditAdTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as AdType;
    
    setEditAd(prev => ({
      ...prev,
      type,
      // Reset fields based on type
      ...(type === AdType.TEXT ? { orientation: undefined, imageUrl: undefined } : {}),
      ...(type === AdType.IMAGE ? { content: undefined } : {})
    }));
    
    // Clear image preview if changing to text ad
    if (type === AdType.TEXT) {
      setEditAdImagePreview(null);
      setEditAdImageFile(null);
    }
  };

  // Add function to handle edit ad image change
  const handleEditAdImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setEditAdImageFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditAdImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add function to trigger edit file input click
  const triggerEditAdFileInput = () => {
    if (editAdFileInputRef.current) {
      editAdFileInputRef.current.click();
    }
  };

  // Add function to update ad
  const updateAd = async (adId: string) => {
    try {
      if (!editAd.title.trim()) {
        showToast('warning', 'Please enter an ad title');
        return;
      }
      
      if (editAd.type === AdType.TEXT && !editAd.content?.trim()) {
        showToast('warning', 'Please enter ad content for text ads');
        return;
      }
      
      if (editAd.type === AdType.IMAGE && !editAdImageFile && !editAd.imageUrl) {
        showToast('warning', 'Please select an image for image ads');
        return;
      }

      // Check if Firebase is ready
      if (appFirebaseLoading) {
        showToast('warning', 'Firebase is still initializing. Please try again in a moment.');
        return;
      }

      if (appFirebaseError) {
        showToast('error', `Firebase error: ${appFirebaseError}`);
        return;
      }
      
      setUpdatingAd(true);
      
      let imageUrl = editAd.imageUrl;
      
      // If a new image was uploaded, update the storage
      if (editAdImageFile) {
        try {
          // First upload the new image to the selected app's storage
          const storageRef = ref(appFirebase?.storage ?? storage, `ads/${adId}`);
          await uploadBytes(storageRef, editAdImageFile);
          imageUrl = await getDownloadURL(storageRef);
          
          // Then delete old image if it exists and is different
          if (editAd.imageUrl && editAd.imageUrl !== imageUrl) {
            try {
              const oldImageRef = ref(appFirebase?.storage ?? storage, editAd.imageUrl);
              await deleteObject(oldImageRef);
            } catch (deleteError) {
              console.error('Error deleting old image:', deleteError);
              // Continue even if delete fails
            }
          }
        } catch (error) {
          console.error('Error uploading new image:', error);
          showToast('error', 'Failed to upload new image. Please try again.');
          setUpdatingAd(false);
          return;
        }
      }
      
      // Create updated ad
      const updatedAd: AdItem = {
        id: adId,
        title: editAd.title,
        link: editAd.link,
        type: editAd.type,
        zone: editAd.zone,
        active: editAd.active,
        order: ads.find(a => a.id === adId)?.order ?? 0,
        // Only add content for TEXT type ads
        ...(editAd.type === AdType.TEXT ? { content: editAd.content ?? '' } : {}),
        // Only add imageUrl and orientation for IMAGE type
        ...(editAd.type === AdType.IMAGE ? { 
          imageUrl,
          orientation: editAd.orientation
        } : {})
      };
      
      // Update state
      const updatedAds = ads.map(ad => 
        ad.id === adId ? updatedAd : ad
      );
      
      setAds(updatedAds);
      setHasUnsavedChanges(true);
      
      // Reset edit state
      cancelEditingAd();
      
      showToast('success', 'Ad updated successfully');
    } catch (error) {
      console.error('Error updating ad:', error);
      showToast('error', 'Failed to update ad');
    } finally {
      setUpdatingAd(false);
    }
  };

  return (
    <div className="pb-12">
      {/* Toast container with enhanced animation */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map(toast => (
          <div 
            key={toast.id+Math.random()} 
            className={`flex items-center p-3 rounded-md shadow-lg text-white overflow-hidden
              transition-all duration-300 ease-in-out max-w-md transform translate-y-0 opacity-100
              ${
                toast.type === 'success' ? 'bg-gg-600' :
                toast.type === 'error' ? 'bg-red-600' :
                toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-600'
              }
              animate-in slide-in-from-right-10 duration-300
            `}
          >
            <div className="mr-3 flex-shrink-0">
              {toast.type === 'success' && <Check className="w-5 h-5" />}
              {toast.type === 'error' && <X className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1 font-medium">{toast.message}</div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      {/* Modal component */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden relative z-10">
            <div className={`p-4 text-white ${
              modal.type === 'success' ? 'bg-gg-600' :
              modal.type === 'error' ? 'bg-red-600' :
              modal.type === 'warning' ? 'bg-amber-500' :
              modal.type === 'confirm' ? 'bg-blue-600' : 'bg-primary'
            }`}>
              <div className="flex items-center">
                {modal.type === 'success' && <Check className="w-5 h-5 mr-2" />}
                {modal.type === 'error' && <X className="w-5 h-5 mr-2" />}
                {modal.type === 'warning' && <AlertTriangle className="w-5 h-5 mr-2" />}
                {modal.type === 'info' && <Info className="w-5 h-5 mr-2" />}
                {modal.type === 'confirm' && <AlertTriangle className="w-5 h-5 mr-2" />}
                <h3 className="text-lg font-medium">{modal.title}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700">{modal.message}</p>
              
              <div className="mt-6 flex justify-end space-x-3">
                {modal.type === 'confirm' && (
                  <button
                    onClick={() => {
                      closeModal();
                      modal.onCancel?.();
                    }}
                    className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    closeModal();
                    modal.onConfirm?.();
                  }}
                  className={`px-4 py-2 text-white rounded-md ${
                    modal.type === 'confirm'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : modal.type === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {modal.type === 'confirm' ? 'Confirm' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">App Interface Management</h1>
        {hasUnsavedChanges && (
          <button
            onClick={saveAppSettings}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-gg-700 inline-flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </button>
        )}
      </div>
      
      {/* Tabs */}
      <div className="mb-8 border-b">
        <div className="flex space-x-2">
          <button
            onClick={() => navigateToTab('menus')}
            className={`px-4 py-3 font-medium text-sm inline-flex items-center ${
              selectedTab === 'menus' 
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MenuIcon className="w-4 h-4 mr-2" /> 
            Menus
          </button>
          <button
            onClick={() => navigateToTab('sliders')}
            className={`px-4 py-3 font-medium text-sm inline-flex items-center ${
              selectedTab === 'sliders' 
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ImageIcon className="w-4 h-4 mr-2" /> 
            Sliders & Galleries
          </button>
          <button
            onClick={() => navigateToTab('ads')}
            className={`px-4 py-3 font-medium text-sm inline-flex items-center ${
              selectedTab === 'ads' 
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layout className="w-4 h-4 mr-2" /> 
            Ads
          </button>
          <button
            onClick={() => navigateToTab('social')}
            className={`px-4 py-3 font-medium text-sm inline-flex items-center ${
              selectedTab === 'social' 
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Share2 className="w-4 h-4 mr-2" /> 
            Social Media
          </button>
        </div>
      </div>
      
      {/* Menu Management */}
      {selectedTab === 'menus' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Creation Form */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Create New Menu</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Menu Title</label>
                  <input
                    type="text"
                    name="title"
                    value={newMenu.title}
                    onChange={handleMenuChange}
                    placeholder="Enter menu title"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Zone</label>
                  <select
                    name="zone"
                    value={newMenu.zone}
                    onChange={handleMenuChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  >
                    <option value="footer">Footer</option>
                    <option value="megamenu">Mega Menu</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="header">Header</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Columns</label>
                  <select
                    name="columns"
                    value={newMenu.columns}
                    onChange={handleMenuChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  >
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={addMenu}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Menu
                </button>
              </div>
              
              {/* List of existing menus */}
              <div className="mt-8">
                <h3 className="font-medium text-sm text-gray-500 mb-3">Available Menus</h3>
                <div className="space-y-2">
                  {menus.map(menu => (
                    <div 
                      key={menu.id}
                      className={`p-3 border rounded-md cursor-pointer flex justify-between items-center ${
                        selectedMenu === menu.id ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedMenu(menu.id)}
                    >
                      <div>
                        <h4 className="font-medium">{menu.title}</h4>
                        <p className="text-xs text-gray-500">
                          Zone: {menu.zone} • {menu.columns} {menu.columns === 1 ? 'column' : 'columns'}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMenu(menu.id);
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {menus.length === 0 && !loading && (
                    <div className="text-center py-4 text-gray-500">
                      No menus created yet
                    </div>
                  )}
                  
                  {loading && (
                    <div className="text-center py-4 text-gray-500">
                      Loading menus...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Menu Items Management */}
          <div className="lg:col-span-2">
            {selectedMenu ? (
              <div className="bg-card rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    {menus.find(m => m.id === selectedMenu)?.title} Items
                  </h2>
                  <button
                    onClick={saveAppSettings}
                    className={`px-4 py-2 rounded-md inline-flex items-center ${
                      hasUnsavedChanges
                        ? 'bg-gg-600 text-white hover:bg-gg-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                    disabled={!hasUnsavedChanges}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {menus.find(m => m.id === selectedMenu)?.columns && 
                    [...Array(menus.find(m => m.id === selectedMenu)?.columns)].map((_, columnIndex) => (
                      <div key={columnIndex} className="border rounded-md overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-3 bg-muted/50 border-b cursor-pointer group hover:bg-muted"
                          onClick={() => toggleColumnExpand(selectedMenu, columnIndex)}
                        >
                          <div className="flex items-center flex-1">
                            <Columns className="w-4 h-4 mr-2 text-gray-500" />
                            <input
                              type="text"
                              value={menuItems[selectedMenu][columnIndex].title}
                              onChange={(e) => handleColumnTitleChange(selectedMenu, columnIndex, e.target.value)}
                              placeholder="Enter column title"
                              className="w-full py-1 px-2 font-medium border-0 border-b border-dashed focus:border-solid focus:border-primary focus:outline-none bg-transparent"
                              aria-label="Edit column title"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {menuItems[selectedMenu][columnIndex].items.length > 0 && (
                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    expandAllMenuItems(selectedMenu, columnIndex);
                                  }}
                                  className="text-gray-500 hover:text-primary p-1 rounded hover:bg-muted"
                                  title="Expand all items"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="7 11 12 6 17 11"></polyline>
                                    <polyline points="7 17 12 12 17 17"></polyline>
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    collapseAllMenuItems(selectedMenu, columnIndex);
                                  }}
                                  className="text-gray-500 hover:text-primary p-1 rounded hover:bg-muted"
                                  title="Collapse all items"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="7 13 12 18 17 13"></polyline>
                                    <polyline points="7 6 12 11 17 6"></polyline>
                                  </svg>
                                </button>
                              </div>
                            )}
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {menuItems[selectedMenu][columnIndex].items.length} items
                            </span>
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              className={`transition-transform ${expandedColumns[`${selectedMenu}_${columnIndex}`] ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </div>
                        
                        {expandedColumns[`${selectedMenu}_${columnIndex}`] !== false && (
                          <div className="p-3 space-y-2">
                            {(menuItems[selectedMenu][columnIndex].items ?? []).map((item, itemIndex) => {
                              // Determine if this item has content
                              const hasContent = (item.text && item.text.trim() !== '') ?? (item.url && item.url.trim() !== '');
                              
                              return (
                                <div key={itemIndex} className="border rounded-md overflow-hidden">
                                  <div 
                                    className={`flex justify-between items-center p-2 border-b cursor-pointer hover:bg-muted ${
                                      hasContent && !expandedMenuItems[`${selectedMenu}_${columnIndex}_${itemIndex}`] 
                                        ? 'bg-primary/5' 
                                        : 'bg-muted/50'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMenuItemExpand(selectedMenu, columnIndex, itemIndex);
                                    }}
                                  >
                                    <div className="flex items-center gap-1 truncate max-w-[80%]">
                                      {hasContent && !expandedMenuItems[`${selectedMenu}_${columnIndex}_${itemIndex}`] && (
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></div>
                                      )}
                                      <span className={`text-xs ${hasContent ? 'text-gray-700 font-medium' : 'text-gray-500'} truncate`}>
                                        {item.text ?? 'Untitled item'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMenuItem(selectedMenu, columnIndex, itemIndex);
                                        }}
                                        className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                      <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        width="14" 
                                        height="14" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        className={`transition-transform ${expandedMenuItems[`${selectedMenu}_${columnIndex}_${itemIndex}`] ? 'rotate-180' : ''}`}
                                      >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                      </svg>
                                    </div>
                                  </div>
                                  
                                  {expandedMenuItems[`${selectedMenu}_${columnIndex}_${itemIndex}`] && (
                                    <div className="p-2 space-y-1.5">
                                      <input
                                        type="text"
                                        value={item.text ?? ''}
                                        onChange={(e) => handleMenuItemChange(
                                          selectedMenu, 
                                          columnIndex, 
                                          itemIndex, 
                                          'text', 
                                          e.target.value
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Menu text"
                                        className="w-full p-1.5 border rounded text-sm bg-card"
                                      />
                                      
                                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                        <LinkIcon className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                        <input
                                          type="text"
                                          value={item.url ?? ''}
                                          onChange={(e) => handleMenuItemChange(
                                            selectedMenu, 
                                            columnIndex, 
                                            itemIndex, 
                                            'url', 
                                            e.target.value
                                          )}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="Link URL"
                                          className="w-full p-1.5 border rounded text-sm bg-card"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addMenuItem(selectedMenu, columnIndex);
                              }}
                              className="w-full py-1.5 border border-dashed rounded-md text-primary hover:bg-primary/5 inline-flex items-center justify-center text-sm"
                            >
                              <PlusCircle className="w-3.5 h-3.5 mr-1" />
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-lg border border-dashed p-8 flex flex-col items-center justify-center text-center">
                <MenuIcon className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium mb-1">No Menu Selected</h3>
                <p className="text-gray-500 mb-4">
                  Please select a menu from the list or create a new one
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Sliders Management */}
      {selectedTab === 'sliders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Slider Creation Form */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Create New Slider</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Slider Title</label>
                  <input
                    type="text"
                    name="title"
                    value={newSlider.title}
                    onChange={handleSliderChange}
                    placeholder="Enter slider title"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Zone</label>
                  <select
                    name="zone"
                    value={newSlider.zone}
                    onChange={handleSliderChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  >
                    <option value="homepage">Homepage</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="footer">Footer</option>
                  </select>
                </div>
                
                <button
                  onClick={addSlider}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Slider
                </button>
              </div>
              
              {/* List of existing sliders */}
              <div className="mt-8">
                <h3 className="font-medium text-sm text-gray-500 mb-3">Available Sliders</h3>
                <div className="space-y-2">
                  {sliders.map(slider => (
                    <div 
                      key={slider.id}
                      className={`p-3 border rounded-md cursor-pointer flex justify-between items-center ${
                        selectedSlider === slider.id ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSlider(slider.id)}
                    >
                      <div>
                        <h4 className="font-medium">{slider.title}</h4>
                        <p className="text-xs text-gray-500">
                          Zone: {slider.zone} • {(sliderItems[slider.id] ?? []).length} items
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlider(slider.id);
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {sliders.length === 0 && !loading && (
                    <div className="text-center py-4 text-gray-500">
                      No sliders created yet
                    </div>
                  )}
                  
                  {loading && (
                    <div className="text-center py-4 text-gray-500">
                      Loading sliders...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Slider Items Management */}
          <div className="lg:col-span-2">
            {selectedSlider ? (
              <div className="bg-card rounded-lg shadow">
                <div className="flex justify-between items-center p-6 border-b">
                  <h2 className="text-xl font-semibold">
                    {sliders.find(s => s.id === selectedSlider)?.title} Items
                  </h2>
                  <button
                    onClick={saveAppSettings}
                    className={`px-4 py-2 rounded-md inline-flex items-center ${
                      hasUnsavedChanges
                        ? 'bg-gg-600 text-white hover:bg-gg-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                    disabled={!hasUnsavedChanges}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                </div>
                
                {/* Add new slider item form */}
                <div className="p-6 border-b">
                  <h3 className="font-medium text-lg mb-4">Add New Slide</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Slide Title</label>
                        <input
                          type="text"
                          name="title"
                          value={newSliderItem.title}
                          onChange={handleSliderItemChange}
                          placeholder="Enter slide title"
                          className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Link URL</label>
                        <input
                          type="text"
                          name="link"
                          value={newSliderItem.link}
                          onChange={handleSliderItemChange}
                          placeholder="https://example.com"
                          className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Image</label>
                      <div className="border-2 border-dashed rounded-lg p-4 text-center h-full flex flex-col justify-center">
                        {imagePreview ? (
                          <div className="relative aspect-[16/9] mb-3">
                            <Image
                              src={imagePreview}
                              alt="Preview"
                              fill
                              className="object-cover rounded"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageFile(null);
                                setImagePreview(null);
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={triggerFileInput}
                            className="w-full py-4 flex flex-col items-center justify-center focus:outline-none"
                          >
                            <ImageLucide className="w-10 h-10 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">
                              Click to select an image
                            </p>
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button
                      onClick={addSliderItem}
                      disabled={savingSliderItem}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center disabled:opacity-50"
                    >
                      {savingSliderItem ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Slide
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* List of existing slider items */}
                <div className="p-6">
                  <h3 className="font-medium mb-4">Existing Slides</h3>
                  
                  {sliderItems[selectedSlider] && sliderItems[selectedSlider].length > 0 ? (
                    <div className="space-y-4">
                      {sliderItems[selectedSlider]
                        .sort((a, b) => a.order - b.order)
                        .map((item) => (
                        <div key={item.id} className="border rounded-md overflow-hidden">
                          {editingSliderItem?.itemId === item.id ? (
                            // Edit mode
                            <div className="p-6">
                              <h3 className="font-medium text-lg mb-4">Edit Slide</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Slide Title</label>
                                    <input
                                      type="text"
                                      name="title"
                                      value={editSliderItem.title}
                                      onChange={handleEditSliderItemChange}
                                      placeholder="Enter slide title"
                                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Link URL</label>
                                    <input
                                      type="text"
                                      name="link"
                                      value={editSliderItem.link}
                                      onChange={handleEditSliderItemChange}
                                      placeholder="https://example.com"
                                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium mb-1">Image</label>
                                  <div className="border-2 border-dashed rounded-lg p-4 text-center h-full flex flex-col justify-center">
                                    {editImagePreview ? (
                                      <div className="relative aspect-[16/9] mb-3">
                                        <Image
                                          src={editImagePreview}
                                          alt="Preview"
                                          fill
                                          className="object-cover rounded"
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (editImageFile) {
                                              // If there's a new file upload, just clear that
                                              setEditImageFile(null);
                                              // Restore the original image preview
                                              setEditImagePreview(editSliderItem.imageUrl);
                                            } else {
                                              // If we're clearing the original image
                                              setEditImagePreview(null);
                                              setEditSliderItem(prev => ({
                                                ...prev,
                                                imageUrl: ''
                                              }));
                                            }
                                          }}
                                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        type="button"
                                        onClick={triggerEditFileInput}
                                        className="w-full py-4 flex flex-col items-center justify-center focus:outline-none"
                                      >
                                        <ImageLucide className="w-10 h-10 text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-500">
                                          Click to select a new image
                                        </p>
                                      </button>
                                    )}
                                    <input
                                      ref={editFileInputRef}
                                      type="file"
                                      accept="image/*"
                                      onChange={handleEditImageChange}
                                      className="hidden"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-6 flex justify-end space-x-3">
                                <button
                                  onClick={cancelEditingSliderItem}
                                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => updateSliderItem(selectedSlider, item.id)}
                                  disabled={updatingSliderItem}
                                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                                >
                                  {updatingSliderItem ? (
                                    <span>Updating...</span>
                                  ) : (
                                    <>
                                      <Save className="w-4 h-4 mr-2 inline" />
                                      Update Slide
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Display mode
                            <div className="flex flex-col md:flex-row">
                              <div className="md:w-1/3 relative aspect-[16/9]">
                                <Image
                                  src={item.imageUrl}
                                  alt={item.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="p-4 md:flex-1 flex flex-col justify-between">
                                <div>
                                  <h3 className="font-medium text-lg">{item.title}</h3>
                                  <div className="text-sm text-gray-500 mb-2">
                                    {item.link ? (
                                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center">
                                        <LinkIcon className="w-3 h-3 mr-1" />
                                        {item.link}
                                      </a>
                                    ) : (
                                      <span className="inline-flex items-center text-gray-400">
                                        <LinkIcon className="w-3 h-3 mr-1" />
                                        No link set
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between mt-4">
                                  <div className="space-x-1">
                                    <button
                                      onClick={() => moveSliderItem(selectedSlider, item.id, 'up')}
                                      disabled={item.order === 0}
                                      className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => moveSliderItem(selectedSlider, item.id, 'down')}
                                      disabled={item.order === sliderItems[selectedSlider].length - 1}
                                      className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </div>
                                  
                                  <div className="space-x-2">
                                    <button
                                      onClick={() => startEditingSliderItem({ sliderId: selectedSlider, itemId: item.id })}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded inline-flex items-center"
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteSliderItem(selectedSlider, item.id, item.imageUrl)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded inline-flex items-center"
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 border rounded-md">
                      No slides created yet. Add your first slide above!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-lg border border-dashed p-8 flex flex-col items-center justify-center text-center">
                <ImageLucide className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium mb-1">No Slider Selected</h3>
                <p className="text-gray-500 mb-4">
                  Please select a slider from the list or create a new one
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Ads Management */}
      {selectedTab === 'ads' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ad Creation Form */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Create New Ad</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ad Title</label>
                  <input
                    type="text"
                    name="title"
                    value={newAd.title}
                    onChange={handleAdChange}
                    placeholder="Enter ad title"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Ad Type</label>
                  <select
                    name="type"
                    value={newAd.type}
                    onChange={handleAdTypeChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  >
                    <option value={AdType.TEXT}>Text Ad</option>
                    <option value={AdType.IMAGE}>Image Ad</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Zone</label>
                  <select
                    name="zone"
                    value={newAd.zone}
                    onChange={handleAdChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  >
                    <option value="">Select a zone</option>
                    {/* Default zones */}
                    <option value="sidebar">Sidebar</option>
                    <option value="header">Header</option>
                    <option value="footer">Footer</option>
                    <option value="content">In-Content</option>
                    
                    {/* Registered zones from components */}
                    {contextAppSettings?.adzones && contextAppSettings.adzones.length > 0 && (
                      <>
                        {contextAppSettings.adzones
                          .filter((zone: string) => !['sidebar', 'header', 'footer', 'content'].includes(zone))
                          .map((zone: string) => (
                            <option key={zone} value={zone}>{zone}</option>
                          ))
                        }
                      </>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Link URL</label>
                  <input
                    type="text"
                    name="link"
                    value={newAd.link}
                    onChange={handleAdChange}
                    placeholder="https://example.com"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  />
                </div>
                
                {newAd.type === AdType.TEXT && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Ad Content</label>
                    <textarea
                      name="content"
                      value={newAd.content ?? ''}
                      onChange={handleAdChange}
                      placeholder="Enter ad text content"
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary h-24 resize-none bg-card"
                    />
                  </div>
                )}
                
                {newAd.type === AdType.IMAGE && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Orientation</label>
                      <select
                        name="orientation"
                        value={newAd.orientation ?? ''}
                        onChange={handleAdChange}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                      >
                        <option value="">Select orientation</option>
                        {Object.entries(OrientationDimensions).map(([key, value]) => (
                          <option key={key} value={key}>
                            {key.charAt(0).toUpperCase() + key.slice(1)} ({value})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Image</label>
                      <div className="mt-1 flex items-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAdImageChange}
                          className="hidden"
                          ref={fileInputRef}
                        />
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border hover:bg-gray-200 flex items-center"
                        >
                          <ImageLucide className="w-4 h-4 mr-2" />
                          Select Image
                        </button>
                      </div>
                      
                      {adImagePreview && (
                        <div className="mt-2 relative">
                          <Image 
                            src={adImagePreview} 
                            alt="Preview" 
                            width={800}
                            height={200}
                            className="w-full max-h-[200px] object-contain border rounded"
                          />
                          <button
                            onClick={() => {
                              setAdImagePreview(null);
                              setAdImageFile(null);
                            }}
                            className="absolute top-1 right-1 bg-red-100 p-1 rounded-full text-red-600 hover:bg-red-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    name="active"
                    checked={newAd.active}
                    onChange={(e) => setNewAd(prev => ({ ...prev, active: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="active" className="text-sm">Active</label>
                </div>
                
                <button
                  onClick={addAd}
                  disabled={creatingAd}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center justify-center disabled:opacity-70"
                >
                  {creatingAd ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Ad
                    </>
                  )}
                </button>
              </div>
              
              {/* List of existing ads */}
              <div className="mt-8">
                <h3 className="font-medium text-sm text-gray-500 mb-3">Available Ads</h3>
                <div className="space-y-2">
                  {ads.map(ad => (
                    <div 
                      key={ad.id}
                      className={`p-3 border rounded-md cursor-pointer flex justify-between items-center ${
                        selectedAd === ad.id ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedAd(ad.id)}
                    >
                      <div>
                        <h4 className="font-medium">{ad.title}</h4>
                        <p className="text-xs text-gray-500">
                          Type: {ad.type.charAt(0).toUpperCase() + ad.type.slice(1)} • 
                          Zone: {ad.zone} • 
                          {!ad.active && <span className="text-red-500 ml-1">Inactive</span>}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAd(ad.id);
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {ads.length === 0 && !loading && (
                    <div className="text-center py-4 text-gray-500">
                      No ads created yet
                    </div>
                  )}
                  
                  {loading && (
                    <div className="text-center py-4 text-gray-500">
                      Loading ads...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Ad Preview */}
          <div className="lg:col-span-2">
            {selectedAd ? (
              <div className="bg-card rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    Ad Preview: {ads.find(a => a.id === selectedAd)?.title}
                  </h2>
                </div>
                
                {(() => {
                  const ad = ads.find(a => a.id === selectedAd);
                  
                  if (!ad) return null;
                  
                  return (
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <h3 className="font-medium mb-2">Ad Details</h3>
                        {editingAd ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Ad Title</label>
                              <input
                                type="text"
                                name="title"
                                value={editAd.title}
                                onChange={handleEditAdChange}
                                placeholder="Enter ad title"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">Ad Type</label>
                              <select
                                name="type"
                                value={editAd.type}
                                onChange={handleEditAdTypeChange}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                              >
                                <option value={AdType.TEXT}>Text Ad</option>
                                <option value={AdType.IMAGE}>Image Ad</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">Zone</label>
                              <select
                                name="zone"
                                value={editAd.zone}
                                onChange={handleEditAdChange}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                              >
                                <option value="">Select a zone</option>
                                {/* Default zones */}
                                <option value="sidebar">Sidebar</option>
                                <option value="header">Header</option>
                                <option value="footer">Footer</option>
                                <option value="content">In-Content</option>
                                
                                {/* Registered zones from components */}
                                {contextAppSettings?.adzones && contextAppSettings.adzones.length > 0 && (
                                  <>
                                    {contextAppSettings.adzones
                                      .filter((zone: string) => !['sidebar', 'header', 'footer', 'content'].includes(zone))
                                      .map((zone: string) => (
                                        <option key={zone} value={zone}>{zone}</option>
                                      ))
                                    }
                                  </>
                                )}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">Link URL</label>
                              <input
                                type="text"
                                name="link"
                                value={editAd.link}
                                onChange={handleEditAdChange}
                                placeholder="https://example.com"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                              />
                            </div>
                            
                            {editAd.type === AdType.TEXT && (
                              <div>
                                <label className="block text-sm font-medium mb-1">Ad Content</label>
                                <textarea
                                  name="content"
                                  value={editAd.content ?? ''}
                                  onChange={handleEditAdChange}
                                  placeholder="Enter ad text content"
                                  className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary h-24 resize-none bg-card"
                                />
                              </div>
                            )}
                            
                            {editAd.type === AdType.IMAGE && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Orientation</label>
                                  <select
                                    name="orientation"
                                    value={editAd.orientation ?? ''}
                                    onChange={handleEditAdChange}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                                  >
                                    <option value="">Select orientation</option>
                                    {Object.entries(OrientationDimensions).map(([key, value]) => (
                                      <option key={key} value={key}>
                                        {key.charAt(0).toUpperCase() + key.slice(1)} ({value})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium mb-1">Image</label>
                                  <div className="mt-1 flex items-center">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleEditAdImageChange}
                                      className="hidden"
                                      ref={editAdFileInputRef}
                                    />
                                    <button
                                      type="button"
                                      onClick={triggerEditAdFileInput}
                                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border hover:bg-gray-200 flex items-center"
                                    >
                                      <ImageLucide className="w-4 h-4 mr-2" />
                                      Select New Image
                                    </button>
                                  </div>
                                  
                                  {editAdImagePreview && (
                                    <div className="mt-2 relative">
                                      <Image 
                                        src={editAdImagePreview} 
                                        alt="Preview" 
                                        width={800}
                                        height={200}
                                        className="w-full max-h-[200px] object-contain border rounded"
                                      />
                                      <button
                                        onClick={() => {
                                          setEditAdImagePreview(null);
                                          setEditAdImageFile(null);
                                          setEditAd(prev => ({ ...prev, imageUrl: undefined }));
                                        }}
                                        className="absolute top-1 right-1 bg-red-100 p-1 rounded-full text-red-600 hover:bg-red-200"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="editActive"
                                name="active"
                                checked={editAd.active}
                                onChange={(e) => setEditAd(prev => ({ ...prev, active: e.target.checked }))}
                                className="mr-2"
                              />
                              <label htmlFor="editActive" className="text-sm">Active</label>
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={cancelEditingAd}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => updateAd(selectedAd!)}
                                disabled={updatingAd}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center disabled:opacity-70"
                              >
                                {updatingAd ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Update Ad
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm text-gray-500 block">Title:</span>
                              <span>{ad.title}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500 block">Type:</span>
                              <span>{ad.type.charAt(0).toUpperCase() + ad.type.slice(1)}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500 block">Zone:</span>
                              <span>{ad.zone}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500 block">Status:</span>
                              <span className={ad.active ? 'text-green-600' : 'text-red-600'}>
                                {ad.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-sm text-gray-500 block">Link:</span>
                              <a 
                                href={ad.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {ad.link}
                              </a>
                            </div>
                            {ad.type === AdType.IMAGE && ad.orientation && (
                              <div>
                                <span className="text-sm text-gray-500 block">Orientation:</span>
                                <span>{ad.orientation.charAt(0).toUpperCase() + ad.orientation.slice(1)} ({OrientationDimensions[ad.orientation as keyof typeof OrientationDimensions]})</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-4">Ad Preview</h3>
                        
                        <div className="border rounded-md p-4 bg-gray-50">
                          {ad.type === AdType.TEXT ? (
                            <div className="bg-card p-4 border rounded">
                              <div className="text-sm text-blue-600 hover:underline cursor-pointer mb-1">
                                {ad.title}
                              </div>
                              <div className="text-gray-700">
                                {ad.content}
                              </div>
                            </div>
                          ) : (
                            ad.imageUrl ? (
                              <div className="flex justify-center">
                                <a href={ad.link} target="_blank" rel="noopener noreferrer" className="block">
                                  <Image 
                                    src={ad.imageUrl} 
                                    alt={ad.title} 
                                    width={800}
                                    height={200}
                                    className="w-full max-h-[200px] object-contain border"
                                    style={{ 
                                      maxWidth: ad.orientation ? OrientationDimensions[ad.orientation as keyof typeof OrientationDimensions].split('x')[0] + 'px' : undefined,
                                      maxHeight: ad.orientation ? OrientationDimensions[ad.orientation as keyof typeof OrientationDimensions].split('x')[1] + 'px' : undefined
                                    }}
                                  />
                                </a>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                No image available
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        {!editingAd && (
                          <button
                            onClick={() => startEditingAd(selectedAd!)}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center mr-2"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Ad
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const updatedAds = ads.map(a => {
                              if (a.id === selectedAd) {
                                return { ...a, active: !a.active };
                              }
                              return a;
                            });
                            setAds(updatedAds);
                            setHasUnsavedChanges(true);
                          }}
                          className={`px-4 py-2 rounded-md inline-flex items-center mr-2 ${
                            ads.find(a => a.id === selectedAd)?.active
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-gg-500 text-white hover:bg-gg-600'
                          }`}
                        >
                          {ads.find(a => a.id === selectedAd)?.active ? 'Deactivate' : 'Activate'}
                        </button>
                        
                        <button
                          onClick={() => deleteAd(selectedAd)}
                          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 inline-flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Ad
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-muted rounded-lg border border-dashed p-8 flex flex-col items-center justify-center text-center">
                <Layout className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium mb-1">No Ad Selected</h3>
                <p className="text-gray-500 mb-4">
                  Please select an ad from the list or create a new one
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'social' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Social Media Form */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Add Social Media</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={newSocialMedia.title}
                    onChange={handleSocialMediaChange}
                    placeholder="e.g. Facebook, Twitter, etc."
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Link</label>
                  <input
                    type="url"
                    name="link"
                    value={newSocialMedia.link}
                    onChange={handleSocialMediaChange}
                    placeholder="https://..."
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Icon</label>
                  <select
                    name="icon"
                    value={newSocialMedia.icon}
                    onChange={handleSocialMediaChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                  >
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="snapchat">Snapchat</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                  </select>
                </div>
                
                <button
                  onClick={addSocialMedia}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Social Media
                </button>
              </div>
              
              {hasUnsavedChanges && (
                <div className="mt-4">
                  <button
                    onClick={saveSocialMedia}
                    className="w-full px-4 py-2 bg-gg-600 text-white rounded-md hover:bg-gg-700 inline-flex items-center justify-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Social Media List */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Social Media Accounts</h2>
              
              {socialMedia.length === 0 && !loading ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Share2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No social media accounts added yet.</p>
                  <p className="text-gray-400 text-sm">Add some accounts using the form on the left.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {socialMedia.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 relative">
                      {editingSocialMedia === item.id ? (
                        <div className="space-y-3">
                          <div className="flex justify-between mb-2">
                            <h3 className="font-medium">Edit Social Media</h3>
                            <button
                              onClick={cancelEditingSocialMedia}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <input
                              type="text"
                              name="title"
                              value={editSocialMedia.title}
                              onChange={handleEditSocialMediaChange}
                              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Link</label>
                            <input
                              type="url"
                              name="link"
                              value={editSocialMedia.link}
                              onChange={handleEditSocialMediaChange}
                              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Icon</label>
                            <select
                              name="icon"
                              value={editSocialMedia.icon}
                              onChange={handleEditSocialMediaChange}
                              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-card"
                            >
                              <option value="facebook">Facebook</option>
                              <option value="twitter">Twitter</option>
                              <option value="instagram">Instagram</option>
                              <option value="linkedin">LinkedIn</option>
                              <option value="youtube">YouTube</option>
                              <option value="tiktok">TikTok</option>
                              <option value="pinterest">Pinterest</option>
                              <option value="snapchat">Snapchat</option>
                              <option value="whatsapp">WhatsApp</option>
                              <option value="telegram">Telegram</option>
                            </select>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={updateSocialMedia}
                              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Save
                            </button>
                            
                            <button
                              onClick={cancelEditingSocialMedia}
                              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 inline-flex items-center"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              {renderSocialIcon(item.icon)}
                            </div>
                            <div className="ml-4">
                              <h3 className="font-medium">{item.title}</h3>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline inline-flex items-center"
                              >
                                <LinkIcon className="w-3 h-3 mr-1" />
                                {item.link}
                              </a>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => startEditingSocialMedia(item.id)}
                              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => deleteSocialMedia(item.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {loading && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading social media accounts...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add function to render social icons based on the icon name
const renderSocialIcon = (icon: string) => {
  switch (icon) {
    case 'facebook':
      return <FaFacebook className="w-5 h-5" />;
    case 'twitter':
      return <FaTwitter className="w-5 h-5" />;
    case 'instagram':
      return <FaInstagram className="w-5 h-5" />;
    case 'linkedin':
      return <FaLinkedin className="w-5 h-5" />;
    case 'youtube':
      return <FaYoutube className="w-5 h-5" />;
    case 'tiktok':
      return <span className="text-xs font-bold">TikTok</span>;
    case 'pinterest':
      return <span className="text-xs font-bold">PIN</span>;
    case 'snapchat':
      return <span className="text-xs font-bold">SC</span>;
    case 'whatsapp':
      return <span className="text-xs font-bold">WA</span>;
    case 'telegram':
      return <span className="text-xs font-bold">TG</span>;
    default:
      return <Share2 className="w-5 h-5" />;
  }
}; 