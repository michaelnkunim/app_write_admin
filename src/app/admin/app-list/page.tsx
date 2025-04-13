'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  Save,
  X,
  ExternalLink,
  Share2,
  Flame,
  Code,
  Menu,
  Settings,
  Users,
  FileText,
  Home,
  Image as ImageIcon,
  Search,
  LayoutDashboard,
  GripVertical
} from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';

interface App {
  id: string;
  name: string;
  description: string;
  domain: string;
  logoUrl: string;
  isLive: boolean;
  createdAt: Date;
  updatedAt: Date;
  order?: number;
  adminMenuItems: Array<{
    id: string;
    name: string;
    path: string;
    icon: string;
    order: number;
  }>;
  theme: {
    light: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      accent: string;
    };
    dark: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      accent: string;
    };
  };
  firebaseConfig: string;
}

const DEFAULT_APP: Omit<App, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  domain: '',
  logoUrl: '',
  isLive: false,
  adminMenuItems: [],
  theme: {
    light: {
      primary: '#FF385C',
      secondary: '#3B82F6',
      background: '#FFFFFF',
      text: '#171717',
      accent: '#F3F4F6',
    },
    dark: {
      primary: '#FF385C',
      secondary: '#3B82F6',
      background: '#1F2937',
      text: '#F9FAFB',
      accent: '#374151',
    }
  },
  firebaseConfig: ''
};

// Helper function to get icon component from icon name
const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'Menu': return <Menu className="h-5 w-5" />;
    case 'Settings': return <Settings className="h-5 w-5" />;
    case 'Users': return <Users className="h-5 w-5" />;
    case 'FileText': return <FileText className="h-5 w-5" />;
    case 'Home': return <Home className="h-5 w-5" />;
    case 'Image': return <ImageIcon className="h-5 w-5" />;
    case 'Share': return <Share2 className="h-5 w-5" />;
    case 'Search': return <Search className="h-5 w-5" />;
    case 'LayoutDashboard': return <LayoutDashboard className="h-5 w-5" />;
    default: return <Menu className="h-5 w-5" />;
  }
};

// Add a SortableMenuItem component
interface SortableMenuItemProps {
  readonly id: string;
  readonly item: App['adminMenuItems'][0];
  readonly onRemove: (id: string) => void;
  readonly onEdit: (id: string, updatedItem: Partial<App['adminMenuItems'][0]>) => void;
  readonly availableIcons: string[];
}

function SortableMenuItem({ id, item, onRemove, onEdit, availableIcons }: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState({
    name: item.name,
    path: item.path,
    icon: item.icon
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const handleSave = () => {
    if (!editedItem.name || !editedItem.path) {
      toast.error("Name and path are required");
      return;
    }
    
    onEdit(id, editedItem);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedItem({
      name: item.name,
      path: item.path,
      icon: item.icon
    });
    setIsEditing(false);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="col-span-12 md:col-span-6 border rounded-md cursor-move"
    >
      {isEditing ? (
        <div className="p-3">
          <div className="grid grid-cols-1 gap-3 mb-3">
            <div>
              <label htmlFor="menuItemName" className="block text-xs font-medium mb-1">Name</label>
              <input
                id="menuItemName"
                type="text"
                value={editedItem.name}
                onChange={(e) => setEditedItem(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                placeholder="Menu item name"
              />
            </div>
            <div>
              <label htmlFor="menuItemPath" className="block text-xs font-medium mb-1">Path</label>
              <input
                id="menuItemPath"
                type="text"
                value={editedItem.path}
                onChange={(e) => setEditedItem(prev => ({ ...prev, path: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                placeholder="/admin/path"
              />
            </div>
            <div>
              <label htmlFor="menuItemIcon" className="block text-xs font-medium mb-1">Icon</label>
              <select
                id="menuItemIcon"
                value={editedItem.icon}
                onChange={(e) => setEditedItem(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              >
                {availableIcons.map(icon => (
                  <option key={icon} value={icon} className="flex items-center">
                    {icon}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center">
                <span className="mr-2 text-sm text-muted-foreground">Selected:</span>
                <div className="w-5 h-5 flex items-center justify-center">
                  {getIconComponent(editedItem.icon)}
                </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-2 justify-end border-t pt-3">
            <button
              onClick={handleCancel}
              className="px-2 py-1 bg-accent rounded-md text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-primary text-white rounded-md text-xs"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center w-full">
            <div 
              className="p-1 mr-2 text-muted-foreground hover:text-gray-700 cursor-grab"
              {...attributes} 
              {...listeners}
            >
              <GripVertical size={16} />
            </div>
            <div className="flex items-center flex-1">
              <div className="mr-2 text-muted-foreground">
                {getIconComponent(item.icon)}
              </div>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.path}</div>
              </div>
            </div>
            <div className="flex">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-muted-foreground hover:text-foreground mr-1"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onRemove(id)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add a SortableAppCard component
interface SortableAppCardProps {
  id: string;
  app: App;
  onEdit: (app: App) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (app: App) => void;
}

// Add these helper functions before the component
const getAppStatusStyle = (isLive: boolean): string => {
  return isLive 
    ? 'bg-green-100 text-green-800' 
    : 'bg-gray-100 text-gray-800';
};

const getAppStatusText = (isLive: boolean): string => {
  return isLive ? 'Live' : 'Draft';
};

const getToggleSwitchContainerStyle = (isEnabled: boolean): string => {
  return `w-11 h-6 flex items-center rounded-full p-1 cursor-pointer ${
    isEnabled ? 'bg-primary' : 'bg-gray-300'
  }`;
};

const getToggleSwitchButtonStyle = (isEnabled: boolean): string => {
  return `bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
    isEnabled ? 'translate-x-5' : ''
  }`;
};

function SortableAppCard({ id, app, onEdit, onDelete, onToggleStatus }: SortableAppCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center border rounded-lg p-4 hover:bg-accent/50 transition-colors"
    >
      <div 
        className="p-1 mr-2 text-muted-foreground hover:text-gray-700 cursor-grab"
        {...attributes} 
        {...listeners}
      >
        <GripVertical size={16} />
      </div>
      <div className="w-12 h-12 bg-accent rounded-md flex items-center justify-center overflow-hidden mr-4">
        {app.logoUrl ? (
          <Image 
            src={app.logoUrl} 
            alt={app.name}
            width={48}
            height={48}
            className="w-full h-full object-contain"
          />
        ) : (
          <Share2 className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <h3 className="font-medium truncate mr-2">{app.name}</h3>
          <span className={`px-2 py-0.5 text-xs rounded-full ${getAppStatusStyle(app.isLive)}`}>
            {getAppStatusText(app.isLive)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {app.domain}
        </div>
        {app.adminMenuItems && app.adminMenuItems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {app.adminMenuItems.slice(0, 4).map(item => (
              <div 
                key={item.id} 
                className="flex items-center bg-accent rounded-md px-2 py-1"
                title={`${item.name} (${item.path})`}
              >
                <div className="mr-1 text-muted-foreground">
                  {getIconComponent(item.icon)}
                </div>
                <span className="text-xs">{item.name}</span>
              </div>
            ))}
            {app.adminMenuItems.length > 4 && (
              <div className="bg-accent rounded-md px-2 py-1">
                <span className="text-xs text-muted-foreground">+{app.adminMenuItems.length - 4} more</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex space-x-2">
        {app.domain && (
          <a
            href={`https://${app.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground rounded-md"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        )}
        
        <button
          onClick={() => onToggleStatus(app)}
          className="p-2 text-muted-foreground hover:text-foreground rounded-md"
          title={app.isLive ? 'Set to offline' : 'Set to live'}
        >
          {app.isLive ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
        
        <button
          onClick={() => onEdit(app)}
          className="p-2 text-muted-foreground hover:text-foreground rounded-md"
        >
          <Edit className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => onDelete(app.id)}
          className="p-2 text-red-500 hover:text-red-700 rounded-md"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function AppsAdmin() {
  const { user } = useAuth();
  const router = useRouter();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [currentApp, setCurrentApp] = useState<Omit<App, 'id' | 'createdAt' | 'updatedAt'>>(DEFAULT_APP);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedThemeMode, setSelectedThemeMode] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'general' | 'menu' | 'theme' | 'firebase'>('general');
  const [firebaseJsonError, setFirebaseJsonError] = useState('');

  // Icons available for menu items
  const availableIcons = [
    'Menu', 'Settings', 'Users', 'FileText', 'Home', 'Image', 'Share', 'Search', 'LayoutDashboard'
  ];

  // Setup sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Redirect non-admin users
  useEffect(() => {
    if (!user?.isAdmin) {
      router.push('/login');
      return;
    }

    fetchApps();
  }, [user, router]);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const appsCollection = collection(db, 'apps');
      const appsSnapshot = await getDocs(appsCollection);
      
      const appsList = appsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        order: doc.data().order || 0 // Ensure order property exists
      } as App));
      
      // Sort by order property if available
      const sortedApps = appsList.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setApps(sortedApps);
    } catch (error) {
      console.error("Error fetching apps:", error);
      toast.error("Failed to load apps");
    } finally {
      setLoading(false);
    }
  };

  const validateFirebaseJson = (jsonString: string) => {
    if (!jsonString.trim()) {
      setFirebaseJsonError('');
      return true; // Empty is valid (optional)
    }
    
    try {
      // First try standard JSON.parse
      JSON.parse(jsonString);
      setFirebaseJsonError('');
      return true;
    } catch {
      try {
        // If that fails, try parsing as JavaScript object notation with a custom function
        fixFirebaseJson(jsonString); // Just validate, don't need to store result here
        // If we got here, it's valid after fixing
        setFirebaseJsonError('');
        return true;
      } catch {
        setFirebaseJsonError('Invalid JSON format');
        return false;
      }
    }
  };

  // Function to fix Firebase JSON by adding quotes to keys if missing
  const fixFirebaseJson = (jsonString: string): string => {
    // Replace JavaScript object keys without quotes with quoted keys
    // This regex matches keys that are valid JavaScript identifiers but not already quoted
    const fixedJson = jsonString.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');
    
    // Validate the fixed JSON by parsing it
    JSON.parse(fixedJson);
    
    return fixedJson;
  };

  const handleCreateApp = async () => {
    try {
      const formattedApp = { ...currentApp };
      
      // Fix Firebase JSON if needed
      if (formattedApp.firebaseConfig) {
        try {
          formattedApp.firebaseConfig = fixFirebaseJson(formattedApp.firebaseConfig);
        } catch (e) {
          // If fixing fails, continue with original value
          console.warn("Could not fix Firebase config format", e);
        }
      }
      
      const newApp = {
        ...formattedApp,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'apps'), newApp);
      
      setApps(prev => [
        ...prev,
        { id: docRef.id, ...newApp } as App
      ]);
      
      resetForm();
      setIsCreating(false);
      toast.success("App created successfully");
    } catch (error) {
      console.error("Error creating app:", error);
      toast.error("Failed to create app");
    }
  };

  const handleUpdateApp = async () => {
    if (!isEditing) return;
    
    try {
      const formattedApp = { ...currentApp };
      
      // Fix Firebase JSON if needed
      if (formattedApp.firebaseConfig) {
        try {
          formattedApp.firebaseConfig = fixFirebaseJson(formattedApp.firebaseConfig);
        } catch (e) {
          // If fixing fails, continue with original value
          console.warn("Could not fix Firebase config format", e);
        }
      }
      
      const appRef = doc(db, 'apps', isEditing);
      
      await updateDoc(appRef, {
        ...formattedApp,
        updatedAt: new Date()
      });
      
      setApps(prev => prev.map(app => 
        app.id === isEditing 
          ? { ...app, ...formattedApp, updatedAt: new Date() } 
          : app
      ));
      
      resetForm();
      setIsEditing(null);
      toast.success("App updated successfully");
    } catch (error) {
      console.error("Error updating app:", error);
      toast.error("Failed to update app");
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm("Are you sure you want to delete this app? This action cannot be undone.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'apps', id));
      setApps(prev => prev.filter(app => app.id !== id));
      toast.success("App deleted successfully");
    } catch (error) {
      console.error("Error deleting app:", error);
      toast.error("Failed to delete app");
    }
  };

  const handleEditApp = (app: App) => {
    setCurrentApp({
      name: app.name,
      description: app.description,
      domain: app.domain,
      logoUrl: app.logoUrl,
      isLive: app.isLive,
      adminMenuItems: app.adminMenuItems || [],
      theme: app.theme || DEFAULT_APP.theme,
      firebaseConfig: app.firebaseConfig || ''
    });
    setIsEditing(app.id);
    setActiveTab('general');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const storageRef = ref(storage, `app-logos/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Error uploading file:", error);
        toast.error("Failed to upload logo");
        setIsUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setCurrentApp(prev => ({ ...prev, logoUrl: downloadURL }));
          setIsUploading(false);
          toast.success("Logo uploaded successfully");
        });
      }
    );
  };

  const handleToggleLiveStatus = async (app: App) => {
    try {
      const appRef = doc(db, 'apps', app.id);
      
      await updateDoc(appRef, {
        isLive: !app.isLive,
        updatedAt: new Date()
      });
      
      setApps(prev => prev.map(a => 
        a.id === app.id 
          ? { ...a, isLive: !app.isLive, updatedAt: new Date() } 
          : a
      ));
      
      toast.success(`App ${!app.isLive ? 'is now live' : 'is now offline'}`);
    } catch (error) {
      console.error("Error toggling app status:", error);
      toast.error("Failed to update app status");
    }
  };

  const removeMenuItem = (id: string) => {
    setCurrentApp(prev => ({
      ...prev,
      adminMenuItems: prev.adminMenuItems.filter(item => item.id !== id)
    }));
  };

  const resetForm = () => {
    setCurrentApp(DEFAULT_APP);
    setIsCreating(false);
    setIsEditing(null);
    setActiveTab('general');
  };

  const updateThemeColor = (mode: 'light' | 'dark', property: keyof typeof DEFAULT_APP.theme.light, value: string) => {
    setCurrentApp(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [mode]: {
          ...prev.theme[mode],
          [property]: value
        }
      }
    }));
  };

  const reorderMenuItems = (items: App['adminMenuItems'], startIndex: number, endIndex: number) => {
    const result = arrayMove(items, startIndex, endIndex);
    // Update the order property to match the new array order
    return result.map((item, index) => ({ ...item, order: index }));
  };

  const handleDragEndMenuItems = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find the indices of both items
    const activeIndex = currentApp.adminMenuItems.findIndex(item => item.id === activeId);
    const overIndex = currentApp.adminMenuItems.findIndex(item => item.id === overId);
    
    // Reorder the items
    const reorderedItems = reorderMenuItems(
      currentApp.adminMenuItems,
      activeIndex,
      overIndex
    );
    
    // Update the state with the new order
    setCurrentApp(prev => ({
      ...prev,
      adminMenuItems: reorderedItems
    }));
  };

  // Add a function to save app order to Firebase
  const saveAppOrder = async (reorderedApps: App[]) => {
    try {
      // Update each app with its new order in Firebase
      const updatePromises = reorderedApps.map((app, index) => {
        const appRef = doc(db, 'apps', app.id);
        return updateDoc(appRef, { order: index });
      });
      
      await Promise.all(updatePromises);
      
      // No need to toast here as it would be too frequent during drag operations
    } catch (error) {
      console.error("Error saving app order:", error);
      toast.error("Failed to save app order");
    }
  };

  // Update the handleDragEndApps function to save the order
  const handleDragEndApps = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find the indices of both items
    const activeIndex = apps.findIndex(app => app.id === activeId);
    const overIndex = apps.findIndex(app => app.id === overId);
    
    // Reorder the items
    const reorderedApps = arrayMove([...apps], activeIndex, overIndex);
    
    // Update the state with the new order
    setApps(reorderedApps);
    
    // Save the new order to Firebase
    saveAppOrder(reorderedApps);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Apps Management</h1>
        <div className="bg-card rounded-lg border shadow-sm p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Apps Management</h1>
        
        {!isCreating && !isEditing && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary text-white rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" /> Create New App
          </button>
        )}
      </div>
      
      {(isCreating || isEditing) && (
        <div className="bg-card rounded-lg border shadow-sm mb-8">
          <div className="border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {isCreating ? 'Create New App' : 'Edit App'}
            </h2>
            <button
              onClick={resetForm}
              className="p-2 text-muted-foreground rounded-md hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="border-b mb-6">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`px-4 py-2 border-b-2 -mb-px transition-colors ${
                    activeTab === 'general' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`px-4 py-2 border-b-2 -mb-px transition-colors ${
                    activeTab === 'menu' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  Admin Menu
                </button>
                <button
                  onClick={() => setActiveTab('theme')}
                  className={`px-4 py-2 border-b-2 -mb-px transition-colors ${
                    activeTab === 'theme' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  Theme Settings
                </button>
                <button
                  onClick={() => setActiveTab('firebase')}
                  className={`px-4 py-2 border-b-2 -mb-px transition-colors flex items-center ${
                    activeTab === 'firebase' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Flame className="h-4 w-4 mr-1" /> Firebase Config
                </button>
              </div>
            </div>
            
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={currentApp.name}
                    onChange={(e) => setCurrentApp(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter app name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={currentApp.description}
                    onChange={(e) => setCurrentApp(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-24"
                    placeholder="Enter app description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={currentApp.domain}
                    onChange={(e) => setCurrentApp(prev => ({ ...prev, domain: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="domain.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    App Logo
                  </label>
                  
                  <div className="flex items-center space-x-4">
                    {currentApp.logoUrl && (
                      <div className="w-16 h-16 border rounded-md overflow-hidden flex items-center justify-center">
                        <Image 
                          src={currentApp.logoUrl} 
                          alt="App Logo" 
                          width={64}
                          height={64}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <input
                        type="file"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                        accept="image/*"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="px-4 py-2 bg-accent rounded-md cursor-pointer inline-block"
                      >
                        {isUploading ? 'Uploading...' : 'Upload Logo'}
                      </label>
                      
                      {isUploading && (
                        <div className="mt-2 w-full bg-accent rounded-full h-2.5">
                          <div
                            className="bg-primary h-2.5 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">
                    Live Status
                  </label>
                  <div 
                    className={getToggleSwitchContainerStyle(currentApp.isLive)}
                    onClick={() => setCurrentApp(prev => ({ ...prev, isLive: !prev.isLive }))}
                    role="switch"
                    aria-checked={currentApp.isLive}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCurrentApp(prev => ({ ...prev, isLive: !prev.isLive }));
                      }
                    }}
                  >
                    <div className={getToggleSwitchButtonStyle(currentApp.isLive)} />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'menu' && (
              <div>
                <h3 className="font-medium mb-4">Admin Menu Items</h3>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndMenuItems}
                >
                  <SortableContext 
                    items={currentApp.adminMenuItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-12 gap-4 mb-6">
                      {currentApp.adminMenuItems.map((item) => (
                        <SortableMenuItem 
                          key={item.id} 
                          id={item.id} 
                          item={item} 
                          onRemove={removeMenuItem}
                          onEdit={(id, updatedItem) => {
                            setCurrentApp(prev => ({
                              ...prev,
                              adminMenuItems: prev.adminMenuItems.map(item =>
                                item.id === id ? { ...item, ...updatedItem } : item
                              )
                            }));
                          }}
                          availableIcons={availableIcons}
                        />
                      ))}
                      
                      {currentApp.adminMenuItems.length === 0 && (
                        <div className="col-span-12 py-4">
                          <div className="text-center text-muted-foreground mb-6">
                            No menu items yet. Add from the suggestions below or create custom items.
                          </div>
                          
                          <div className="border rounded-md p-4 bg-accent/30">
                            <h4 className="font-medium mb-3">Suggested Menu Items</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div 
                                onClick={() => {
                                  setCurrentApp(prev => ({
                                    ...prev,
                                    adminMenuItems: [
                                      ...prev.adminMenuItems,
                                      {
                                        id: Date.now() + "-1",
                                        name: "Dashboard",
                                        path: "/admin/dashboard",
                                        icon: "LayoutDashboard",
                                        order: prev.adminMenuItems.length
                                      }
                                    ]
                                  }));
                                }}
                                className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-accent"
                              >
                                <LayoutDashboard className="h-5 w-5 text-primary" />
                                <span>Dashboard</span>
                              </div>
                              
                              <div 
                                onClick={() => {
                                  setCurrentApp(prev => ({
                                    ...prev,
                                    adminMenuItems: [
                                      ...prev.adminMenuItems,
                                      {
                                        id: Date.now() + "-2",
                                        name: "Users",
                                        path: "/admin/users",
                                        icon: "Users",
                                        order: prev.adminMenuItems.length
                                      }
                                    ]
                                  }));
                                }}
                                className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-accent"
                              >
                                <Users className="h-5 w-5 text-primary" />
                                <span>Users</span>
                              </div>
                              
                              <div 
                                onClick={() => {
                                  setCurrentApp(prev => ({
                                    ...prev,
                                    adminMenuItems: [
                                      ...prev.adminMenuItems,
                                      {
                                        id: Date.now() + "-3",
                                        name: "Settings",
                                        path: "/admin/settings",
                                        icon: "Settings",
                                        order: prev.adminMenuItems.length
                                      }
                                    ]
                                  }));
                                }}
                                className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-accent"
                              >
                                <Settings className="h-5 w-5 text-primary" />
                                <span>Settings</span>
                              </div>
                              
                              <div 
                                onClick={() => {
                                  setCurrentApp(prev => ({
                                    ...prev,
                                    adminMenuItems: [
                                      ...prev.adminMenuItems,
                                      {
                                        id: Date.now() + "-4",
                                        name: "Content",
                                        path: "/admin/content",
                                        icon: "FileText",
                                        order: prev.adminMenuItems.length
                                      }
                                    ]
                                  }));
                                }}
                                className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-accent"
                              >
                                <FileText className="h-5 w-5 text-primary" />
                                <span>Content</span>
                              </div>
                              
                              <div 
                                onClick={() => {
                                  setCurrentApp(prev => ({
                                    ...prev,
                                    adminMenuItems: [
                                      ...prev.adminMenuItems,
                                      {
                                        id: Date.now() + "-5",
                                        name: "Media",
                                        path: "/admin/media",
                                        icon: "Image",
                                        order: prev.adminMenuItems.length
                                      }
                                    ]
                                  }));
                                }}
                                className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-accent"
                              >
                                <ImageIcon className="h-5 w-5 text-primary" />
                                <span>Media</span>
                              </div>
                              
                              <div 
                                onClick={() => {
                                  setCurrentApp(prev => ({
                                    ...prev,
                                    adminMenuItems: [
                                      ...prev.adminMenuItems,
                                      {
                                        id: Date.now() + "-6",
                                        name: "Analytics",
                                        path: "/admin/analytics",
                                        icon: "Search",
                                        order: prev.adminMenuItems.length
                                      }
                                    ]
                                  }));
                                }}
                                className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-accent"
                              >
                                <Search className="h-5 w-5 text-primary" />
                                <span>Analytics</span>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-center">
                              <button
                                onClick={() => {
                                  setCurrentApp(prev => ({
                                    ...prev,
                                    adminMenuItems: [
                                      ...prev.adminMenuItems,
                                      {
                                        id: Date.now() + "-1",
                                        name: "Dashboard",
                                        path: "/admin/dashboard",
                                        icon: "LayoutDashboard",
                                        order: 0
                                      },
                                      {
                                        id: Date.now() + "-2",
                                        name: "Users",
                                        path: "/admin/users",
                                        icon: "Users",
                                        order: 1
                                      },
                                      {
                                        id: Date.now() + "-3",
                                        name: "Content",
                                        path: "/admin/content",
                                        icon: "FileText",
                                        order: 2
                                      },
                                      {
                                        id: Date.now() + "-4",
                                        name: "Settings",
                                        path: "/admin/settings",
                                        icon: "Settings",
                                        order: 3
                                      }
                                    ]
                                  }));
                                }}
                                className="text-primary text-sm underline"
                              >
                                Add all common items
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
            
            {activeTab === 'theme' && (
              <div>
                <div className="flex justify-between mb-6">
                  <h3 className="font-medium">Theme Settings</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedThemeMode('light')}
                      className={`px-3 py-1 rounded-md ${
                        selectedThemeMode === 'light' 
                          ? 'bg-primary text-white' 
                          : 'bg-accent'
                      }`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setSelectedThemeMode('dark')}
                      className={`px-3 py-1 rounded-md ${
                        selectedThemeMode === 'dark' 
                          ? 'bg-primary text-white' 
                          : 'bg-accent'
                      }`}
                    >
                      Dark
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Primary Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={currentApp.theme[selectedThemeMode].primary}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'primary', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentApp.theme[selectedThemeMode].primary}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'primary', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Secondary Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={currentApp.theme[selectedThemeMode].secondary}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'secondary', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentApp.theme[selectedThemeMode].secondary}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'secondary', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Background Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={currentApp.theme[selectedThemeMode].background}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'background', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentApp.theme[selectedThemeMode].background}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'background', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Text Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={currentApp.theme[selectedThemeMode].text}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'text', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentApp.theme[selectedThemeMode].text}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'text', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={currentApp.theme[selectedThemeMode].accent}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'accent', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentApp.theme[selectedThemeMode].accent}
                        onChange={(e) => updateThemeColor(selectedThemeMode, 'accent', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-accent p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Preview</h4>
                  <div 
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: currentApp.theme[selectedThemeMode].background,
                      color: currentApp.theme[selectedThemeMode].text
                    }}
                  >
                    <div 
                      className="text-lg font-bold mb-2"
                      style={{ color: currentApp.theme[selectedThemeMode].primary }}
                    >
                      Sample Heading
                    </div>
                    <p className="mb-3">This is how your text will appear.</p>
                    <div className="flex space-x-2">
                      <button
                        className="px-4 py-2 rounded-md"
                        style={{
                          backgroundColor: currentApp.theme[selectedThemeMode].primary,
                          color: '#fff'
                        }}
                      >
                        Primary Button
                      </button>
                      <button
                        className="px-4 py-2 rounded-md"
                        style={{
                          backgroundColor: currentApp.theme[selectedThemeMode].secondary,
                          color: '#fff'
                        }}
                      >
                        Secondary Button
                      </button>
                      <button
                        className="px-4 py-2 rounded-md"
                        style={{
                          backgroundColor: currentApp.theme[selectedThemeMode].accent,
                          color: currentApp.theme[selectedThemeMode].text
                        }}
                      >
                        Accent Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'firebase' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center mb-2">
                    <label className="block text-sm font-medium">
                      Firebase Configuration
                    </label>
                    <div className="ml-2 text-xs text-muted-foreground">
                      (Paste your firebase.json or firebaseConfig object)
                    </div>
                  </div>
                  
                  <textarea
                    value={currentApp.firebaseConfig}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCurrentApp(prev => ({ ...prev, firebaseConfig: value }));
                      validateFirebaseJson(value);
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-64 font-mono text-sm ${
                      firebaseJsonError ? 'border-red-500' : ''
                    }`}
                    placeholder='{
  apiKey: "...",    // Unquoted keys are supported
  "authDomain": "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}'
                  />
                  
                  {firebaseJsonError && (
                    <p className="text-red-500 text-sm mt-1">{firebaseJsonError}</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="inline-block mr-1">💡</span>
                    You can use JavaScript format with unquoted keys. Keys will be automatically quoted when saving.
                  </p>
                  
                  <div className="mt-4 bg-accent rounded-md p-4">
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <Code className="h-4 w-4 mr-2" />
                      <span>Usage Example</span>
                    </div>
                    <pre className="text-xs overflow-x-auto p-2 bg-card border rounded-md">
{`// Initialize Firebase
import { initializeApp } from "firebase/app";

const firebaseConfig = ${currentApp.firebaseConfig || '/* Your configuration will appear here */'}

const app = initializeApp(firebaseConfig);`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={isCreating ? handleCreateApp : handleUpdateApp}
                className="px-4 py-2 bg-primary text-white rounded-md flex items-center"
                disabled={!currentApp.name || !currentApp.domain || !!firebaseJsonError}
              >
                <Save className="h-4 w-4 mr-2" />
                {isCreating ? 'Create App' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {!isCreating && !isEditing && (
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Apps</h2>
            
            {apps.length === 0 ? (
              <div className="bg-accent rounded-lg p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-accent/50 rounded-full flex items-center justify-center mb-4">
                  <Share2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Apps Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Get started by creating your first app.
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-6 py-3 bg-primary text-white rounded-md font-medium text-lg flex items-center mx-auto"
                >
                  <Plus className="h-5 w-5 mr-2" /> Create Your First App
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndApps}
              >
                <div className="space-y-4">
                  <div className="flex items-center mb-2 text-sm text-muted-foreground">
                    <GripVertical size={16} className="mr-1" />
                    <span>Drag and drop to reorder your apps</span>
                  </div>
                  <SortableContext 
                    items={apps.map(app => app.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {apps.map(app => (
                        <SortableAppCard 
                          key={app.id}
                          id={app.id}
                          app={app}
                          onEdit={handleEditApp}
                          onDelete={handleDeleteApp}
                          onToggleStatus={handleToggleLiveStatus}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </DndContext>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 