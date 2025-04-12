'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, Save, AlertTriangle, Globe, Server, Search as MagnifyingGlassIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAppSettings } from '@/context/AppSettingsContext';
import Link from 'next/link';
import { useAdminApp } from '@/context/AdminAppContext';
import { useAppFirestore } from '@/hooks/useAppFirestore';

// Define LABELS and LABELS_FR if they're not imported
const LABELS = {
  common: {
    BROWSE: 'Browse',
    SEARCH: 'Search',
    LOGIN: 'Login',
    SIGNUP: 'Sign up',
    // Add more common labels as needed
  },
  homePage: {
    FEATURED_PROPERTIES: 'Featured Properties',
    // Add more home page labels as needed
  },
  // Add more sections as needed
};

const LABELS_FR = {
  common: {
    BROWSE: 'Parcourir',
    SEARCH: 'Rechercher',
    LOGIN: 'Connexion',
    SIGNUP: 'Inscription',
    // Add more common labels as needed
  },
  homePage: {
    FEATURED_PROPERTIES: 'Propriétés en vedette',
    // Add more home page labels as needed
  },
  // Add more sections as needed
};

// Language settings interface
interface LanguageSettings {
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  customLabels?: Record<string, unknown>;
}

// Array of tabs for the settings page
const TABS = [
  { id: 'general', label: 'General', icon: Server },
  { id: 'languages', label: 'Languages & Labels', icon: Globe },
  { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
];

export default function SettingsAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';
  const [formChanged, setFormChanged] = useState(false);
  const { appSettings, refreshAppSettings } = useAppSettings();
  const { appFirebase, appFirebaseLoading, appFirebaseError, selectedApp } = useAdminApp();
  const { 
    getDocument, 
    updateDocument,
    saveDocument
  } = useAppFirestore();
  
  // Form state
  const [settings, setSettings] = useState({
    siteName: 'RentEasy',
    contactEmail: 'support@renteasy.com',
    phoneNumber: '+1 (555) 123-4567',
    address: '123 Main St, San Francisco, CA 94105',
    maxListingsPerUser: 10,
    featuredListingCost: 29.99,
    enableUserRegistration: true,
    enableListingCreation: true,
    maintenanceMode: false,
    googleMapsApiKey: 'AIzaS••••••••••••••••••••••••••',
    stripePublicKey: 'pk_test_••••••••••••••••••••••••',
    stripeSecretKey: 'sk_test_••••••••••••••••••••••••',
    // Authentication settings
    authMethods: {
      emailPassword: true,
      google: false,
      apple: false,
      facebook: false,
      phone: false,
      anonymous: false,
    },
    // Facebook auth settings
    facebookAppId: '',
    facebookAppSecret: '',
    // Typesense search settings
    typesense: {
      apiKey: '',
      host: '',
      port: '8108',
      protocol: 'https',
      listingIndexName: '',
      userIndexName: ''
    }
  });

  // Language settings state
  const [languageSettings, setLanguageSettings] = useState<LanguageSettings[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [availableLanguages, setAvailableLanguages] = useState<{ code: string; name: string }[]>([
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ar', name: 'Arabic' }
  ]);

  // Add after the languageSettings state:
  const [labelData, setLabelData] = useState<Record<string, any>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [rawJson, setRawJson] = useState('');

  // Redirect non-admin users and fetch settings
  useEffect(() => {
    if (!user || !user.isAdmin) {
      router.push('/login');
    } else {
      // Fetch existing settings
      const fetchSettings = async () => {
        try {
          // Check if we have a valid Firebase instance for the selected app
          if (appFirebaseError) {
            toast.error(`Firebase error: ${appFirebaseError}`);
            return;
          }
          
          if (appFirebaseLoading) {
            // Wait for Firebase to initialize
            return;
          }
          
          // Use the app's Firestore instance to fetch settings
          const settingsDoc = await getDocument('appSettings', 'interface');
          
          if (settingsDoc) {
            const data = settingsDoc;
            // Check if siteSettings exists in the data
            if (data.siteSettings) {
              // Use siteSettings from appSettings/interface
              const siteData = data.siteSettings;
              setSettings(prev => ({
                ...prev,
                siteName: siteData.siteName || prev.siteName,
                contactEmail: siteData.contactEmail || prev.contactEmail,
                phoneNumber: siteData.phoneNumber || prev.phoneNumber,
                address: siteData.address || prev.address,
                maxListingsPerUser: siteData.maxListingsPerUser || prev.maxListingsPerUser,
                featuredListingCost: siteData.featuredListingCost || prev.featuredListingCost,
                enableUserRegistration: siteData.enableUserRegistration !== undefined ? siteData.enableUserRegistration : prev.enableUserRegistration,
                enableListingCreation: siteData.enableListingCreation !== undefined ? siteData.enableListingCreation : prev.enableListingCreation,
                maintenanceMode: siteData.maintenanceMode !== undefined ? siteData.maintenanceMode : prev.maintenanceMode,
                googleMapsApiKey: siteData.googleMapsApiKey || prev.googleMapsApiKey,
                stripePublicKey: siteData.stripePublicKey || prev.stripePublicKey,
                stripeSecretKey: siteData.stripeSecretKey || prev.stripeSecretKey,
                // Initialize auth methods
                authMethods: {
                  emailPassword: siteData.authMethods?.emailPassword !== undefined ? siteData.authMethods.emailPassword : prev.authMethods.emailPassword,
                  google: siteData.authMethods?.google !== undefined ? siteData.authMethods.google : prev.authMethods.google,
                  apple: siteData.authMethods?.apple !== undefined ? siteData.authMethods.apple : prev.authMethods.apple,
                  facebook: siteData.authMethods?.facebook !== undefined ? siteData.authMethods.facebook : prev.authMethods.facebook,
                  phone: siteData.authMethods?.phone !== undefined ? siteData.authMethods.phone : prev.authMethods.phone,
                  anonymous: siteData.authMethods?.anonymous !== undefined ? siteData.authMethods.anonymous : prev.authMethods.anonymous,
                },
                facebookAppId: siteData.facebookAppId || prev.facebookAppId,
                facebookAppSecret: siteData.facebookAppSecret || prev.facebookAppSecret,
                // Load Typesense settings if available
                typesense: {
                  apiKey: siteData.search?.apiKey || prev.typesense.apiKey,
                  host: siteData.search?.host || prev.typesense.host,
                  port: siteData.search?.port || prev.typesense.port,
                  protocol: siteData.search?.protocol || prev.typesense.protocol,
                  listingIndexName: siteData.search?.listingIndexName || prev.typesense.listingIndexName,
                  userIndexName: siteData.search?.userIndexName || prev.typesense.userIndexName
                }
              }));
            }
            
            // Load language settings - ensure it's an array
            if (data.languages && Array.isArray(data.languages)) {
              setLanguageSettings(data.languages);
            } else {
              // Use default language settings from app settings context
              // Ensure we're setting an array
              const defaultLanguages = Array.isArray(appSettings.languages) 
                ? appSettings.languages 
                : [
                    { code: 'en', name: 'English', isActive: true, isDefault: true },
                    { code: 'fr', name: 'French', isActive: true, isDefault: false }
                  ];
              setLanguageSettings(defaultLanguages);
            }
          }
        } catch (error) {
          console.error('Error fetching settings:', error);
          toast.error('Failed to load settings');
          // Set default languages as fallback
          setLanguageSettings([
            { code: 'en', name: 'English', isActive: true, isDefault: true },
            { code: 'fr', name: 'French', isActive: true, isDefault: false }
          ]);
        }
      };
      
      fetchSettings();
    }
  }, [user, router, appSettings.languages, appFirebase, appFirebaseLoading, appFirebaseError, selectedApp]);

  // Load label data for the selected language
  useEffect(() => {
    if (selectedLanguage === 'en') {
      // Check if we have custom English labels from Firestore
      const englishSettings = Array.isArray(languageSettings) 
        ? languageSettings.find(l => l.code === 'en')
        : null;
      
      // Merge default LABELS with any custom labels from Firestore
      const mergedLabels = englishSettings?.customLabels 
        ? { ...LABELS, ...englishSettings.customLabels } 
        : LABELS;
      
      setLabelData(mergedLabels);
      setRawJson(JSON.stringify(mergedLabels, null, 2));
    } else if (selectedLanguage === 'fr') {
      // Check if we have custom French labels from Firestore
      const frenchSettings = Array.isArray(languageSettings)
        ? languageSettings.find(l => l.code === 'fr')
        : null;
      
      // Merge default LABELS_FR with any custom labels from Firestore
      const mergedLabels = frenchSettings?.customLabels 
        ? { ...LABELS_FR, ...frenchSettings.customLabels } 
        : LABELS_FR;
      
      setLabelData(mergedLabels);
      setRawJson(JSON.stringify(mergedLabels, null, 2));
    } else {
      // For custom languages, check if there are custom labels in the language settings
      const langSetting = Array.isArray(languageSettings) 
        ? languageSettings.find(l => l.code === selectedLanguage)
        : null;
        
      if (langSetting?.customLabels) {
        // Merge with English default labels to ensure structure completeness
        const mergedLabels = { ...LABELS, ...langSetting.customLabels };
        setLabelData(mergedLabels);
        setRawJson(JSON.stringify(mergedLabels, null, 2));
      } else {
        // Default to English if no custom labels are found
        setLabelData(LABELS);
        setRawJson(JSON.stringify(LABELS, null, 2));
      }
    }
  }, [selectedLanguage, languageSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    setFormChanged(true);
  };

  // Handle auth method toggles specifically
  const handleAuthMethodChange = (method: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      authMethods: {
        ...prev.authMethods,
        [method]: checked
      }
    }));
    
    setFormChanged(true);
  };

  const handleLanguageStatusChange = (code: string, field: 'isActive' | 'isDefault', value: boolean) => {
    setLanguageSettings(prev => {
      const updated = prev.map(lang => {
        // If setting a new default, unset the previous default
        if (field === 'isDefault' && value === true) {
          return {
            ...lang,
            isDefault: lang.code === code
          };
        }
        
        // Otherwise just update the specific language
        if (lang.code === code) {
          return {
            ...lang,
            [field]: value
          };
        }
        return lang;
      });
      
      return updated;
    });
    
    setFormChanged(true);
  };

  const addLanguage = (code: string) => {
    const langToAdd = availableLanguages.find(l => l.code === code);
    if (!langToAdd) return;
    
    if (!languageSettings.some(l => l.code === code)) {
      setLanguageSettings(prev => [
        ...prev,
        {
          code: langToAdd.code,
          name: langToAdd.name,
          isActive: true,
          isDefault: prev.length === 0 // Make default if it's the first language
        }
      ]);
      setFormChanged(true);
    }
  };

  const removeLanguage = (code: string) => {
    // Cannot remove the default language
    if (languageSettings.find(l => l.code === code)?.isDefault) {
      toast.error('Cannot remove the default language');
      return;
    }
    
    setLanguageSettings(prev => prev.filter(l => l.code !== code));
    setFormChanged(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check for Firebase errors
      if (appFirebaseError) {
        toast.error(`Firebase error: ${appFirebaseError}`);
        return;
      }
      
      if (appFirebaseLoading) {
        toast.error('Firebase is still initializing. Please try again in a moment.');
        return;
      }
      
      const siteSettings = {
        siteName: settings.siteName,
        contactEmail: settings.contactEmail,
        phoneNumber: settings.phoneNumber,
        address: settings.address,
        maxListingsPerUser: settings.maxListingsPerUser,
        featuredListingCost: settings.featuredListingCost,
        enableUserRegistration: settings.enableUserRegistration,
        enableListingCreation: settings.enableListingCreation,
        maintenanceMode: settings.maintenanceMode,
        googleMapsApiKey: settings.googleMapsApiKey,
        stripePublicKey: settings.stripePublicKey,
        stripeSecretKey: settings.stripeSecretKey,
        authMethods: settings.authMethods,
        facebookAppId: settings.facebookAppId,
        facebookAppSecret: settings.facebookAppSecret,
        search: {
          apiKey: settings.typesense.apiKey,
          host: settings.typesense.host,
          port: settings.typesense.port,
          protocol: settings.typesense.protocol,
          listingIndexName: settings.typesense.listingIndexName,
          userIndexName: settings.typesense.userIndexName
        }
      };

      // If in JSON view mode, apply the latest JSON changes before saving
      if (rawJsonMode && !jsonError && selectedLanguage !== 'en' && selectedLanguage !== 'fr') {
        try {
          const parsed = JSON.parse(rawJson);
          // Update labelData with the parsed JSON
          setLabelData(parsed);
          
          // Update languageSettings with the latest JSON
          const updatedSettings = languageSettings.map(lang => 
            lang.code === selectedLanguage 
              ? { ...lang, customLabels: parsed } 
              : lang
          );
          setLanguageSettings(updatedSettings);
        } catch (error) {
          console.error('Error parsing JSON before save:', error);
          toast.error('Invalid JSON format. Please fix errors before saving.');
          return; // Don't proceed with saving if JSON is invalid
        }
      }
      // Ensure the current language's customLabels are updated before saving
      else if (selectedLanguage !== 'en' && selectedLanguage !== 'fr') {
        // Check if there are any validation errors
        if (!jsonError) {
          const updatedSettings = languageSettings.map(lang => 
            lang.code === selectedLanguage 
              ? { ...lang, customLabels: labelData } 
              : lang
          );
          setLanguageSettings(updatedSettings);
        }
      }

      // Use saveDocument instead of updateDocument to handle document creation if it doesn't exist
      await saveDocument('appSettings', 'interface', {
        siteSettings: siteSettings,
        languages: languageSettings,
        updatedAt: new Date()
      });
      
      toast.success('Settings saved successfully!');
      setFormChanged(false);
      refreshAppSettings(); // Update the context
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
      setFormChanged(true);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const startEditing = (path: string, value: string) => {
    setEditingPath(path);
    setEditValue(value);
    // Focus the input after it renders
    setTimeout(() => {
      const input = document.getElementById(`edit-${path}`);
      if (input) {
        input.focus();
      }
    }, 10);
  };

  const saveEdit = (path: string) => {
    // Split the path into parts (e.g., "homePage.FEATURED_PROPERTIES" -> ["homePage", "FEATURED_PROPERTIES"])
    const parts = path.split('.');
    
    // Create a deep copy of the label data
    const updatedLabels = JSON.parse(JSON.stringify(labelData));
    
    // Traverse the object to find the value to update
    let current = updatedLabels;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    
    // Update the value
    current[parts[parts.length - 1]] = editValue;
    
    // Update state
    setLabelData(updatedLabels);
    setEditingPath(null);
    
    // Also update the raw JSON
    setRawJson(JSON.stringify(updatedLabels, null, 2));
    
    // Update languageSettings for custom languages
    if (selectedLanguage !== 'en' && selectedLanguage !== 'fr') {
      setLanguageSettings(prev => 
        prev.map(lang => 
          lang.code === selectedLanguage 
            ? { ...lang, customLabels: updatedLabels } 
            : lang
        )
      );
    }
    
    // Mark form as changed
    setFormChanged(true);
  };

  const cancelEdit = () => {
    setEditingPath(null);
  };

  const handleRawJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawJson(e.target.value);
    try {
      JSON.parse(e.target.value);
      setJsonError(null);
      setFormChanged(true);
    } catch (error) {
      if (error instanceof Error) {
        setJsonError(error.message);
      } else {
        setJsonError('Invalid JSON format');
      }
    }
  };

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(rawJson);
      setLabelData(parsed);
      setJsonError(null);
      
      // Update the custom labels for the selected language
      if (selectedLanguage !== 'en' && selectedLanguage !== 'fr') {
        setLanguageSettings(prev => 
          prev.map(lang => 
            lang.code === selectedLanguage 
              ? { ...lang, customLabels: parsed } 
              : lang
          )
        );
      }
      
      setFormChanged(true);
    } catch (error) {
      if (error instanceof Error) {
        setJsonError(error.message);
      } else {
        setJsonError('Invalid JSON format');
      }
    }
  };

  // Save all language labels to Firebase, including English and French
  const saveAllLanguageLabels = async () => {
    try {
      // Check for Firebase errors
      if (appFirebaseError) {
        toast.error(`Firebase error: ${appFirebaseError}`);
        return;
      }
      
      if (appFirebaseLoading) {
        toast.error('Firebase is still initializing. Please try again in a moment.');
        return;
      }
      
      // First, ensure current language's changes are applied
      if (rawJsonMode && !jsonError) {
        try {
          const parsed = JSON.parse(rawJson);
          
          // Update current language's labels
          if (selectedLanguage === 'en') {
            // For English, update directly in the database
            await saveDocument('appSettings', 'interface', {
              'languages': [
                { code: 'en', name: 'English', isActive: true, isDefault: true, customLabels: parsed },
                ...(Array.isArray(languageSettings) ? 
                  languageSettings.filter(lang => lang.code !== 'en') : [])
              ],
              updatedAt: new Date()
            });
            toast.success('English labels saved to database');
          } else if (selectedLanguage === 'fr') {
            // For French, update directly in the database
            await saveDocument('appSettings', 'interface', {
              'languages': [
                ...(Array.isArray(languageSettings) ? 
                  languageSettings.filter(lang => lang.code !== 'fr') : []),
                { 
                  code: 'fr', 
                  name: 'French', 
                  isActive: true, 
                  isDefault: false, 
                  customLabels: parsed 
                }
              ],
              updatedAt: new Date()
            });
            toast.success('French labels saved to database');
          } else {
            // For other languages, update in the languageSettings array
            if (!Array.isArray(languageSettings)) {
              // Initialize as array if it's not one
              const newLanguageSettings = [
                { code: 'en', name: 'English', isActive: true, isDefault: true },
                { 
                  code: selectedLanguage, 
                  name: selectedLanguage === 'fr' ? 'French' : selectedLanguage.toUpperCase(), 
                  isActive: true, 
                  isDefault: false,
                  customLabels: parsed 
                }
              ];
              setLanguageSettings(newLanguageSettings);
              
              await saveDocument('appSettings', 'interface', {
                languages: newLanguageSettings,
                updatedAt: new Date()
              });
            } else {
              const updatedSettings = languageSettings.map(lang => 
                lang.code === selectedLanguage 
                  ? { ...lang, customLabels: parsed } 
                  : lang
              );
              setLanguageSettings(updatedSettings);
              
              // Save to Firebase
              await saveDocument('appSettings', 'interface', {
                languages: updatedSettings,
                updatedAt: new Date()
              });
            }
            toast.success(`${selectedLanguage.toUpperCase()} labels saved to database`);
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
          toast.error('Invalid JSON format. Please fix errors before saving.');
          return;
        }
      } else if (!rawJsonMode) {
        // In Tree View mode
        // If current language is English or French, create custom labels
        if (selectedLanguage === 'en' || selectedLanguage === 'fr') {
          const updatedLanguages = Array.isArray(languageSettings) ? 
            [...languageSettings] : 
            [
              { code: 'en', name: 'English', isActive: true, isDefault: true },
              { code: 'fr', name: 'French', isActive: true, isDefault: false }
            ];
          
          // Find or add the selected language
          const langIndex = updatedLanguages.findIndex(l => l.code === selectedLanguage);
          
          if (langIndex >= 0) {
            updatedLanguages[langIndex] = {
              ...updatedLanguages[langIndex],
              customLabels: labelData
            };
          } else {
            updatedLanguages.push({
              code: selectedLanguage,
              name: selectedLanguage === 'en' ? 'English' : 'French',
              isActive: true,
              isDefault: selectedLanguage === 'en',
              customLabels: labelData
            });
          }
          
          await saveDocument('appSettings', 'interface', {
            languages: updatedLanguages,
            updatedAt: new Date()
          });
          toast.success(`${selectedLanguage === 'en' ? 'English' : 'French'} labels saved to database`);
        } else {
          // For other languages, update the languageSettings array
          if (!Array.isArray(languageSettings)) {
            // Initialize as array if it's not one
            const newLanguageSettings = [
              { code: 'en', name: 'English', isActive: true, isDefault: true },
              { 
                code: selectedLanguage, 
                name: selectedLanguage.toUpperCase(), 
                isActive: true, 
                isDefault: false,
                customLabels: labelData 
              }
            ];
            setLanguageSettings(newLanguageSettings);
            
            await saveDocument('appSettings', 'interface', {
              languages: newLanguageSettings,
              updatedAt: new Date()
            });
          } else {
            const updatedSettings = languageSettings.map(lang => 
              lang.code === selectedLanguage 
                ? { ...lang, customLabels: labelData } 
                : lang
            );
            
            await saveDocument('appSettings', 'interface', {
              languages: updatedSettings,
              updatedAt: new Date()
            });
          }
          toast.success(`${selectedLanguage.toUpperCase()} labels saved to database`);
        }
      }
      
      // Force a refresh of the app settings context to update labels across the app
      refreshAppSettings();
      
      // Show loading toast and force page reload to ensure labels are refreshed
      toast.info('Refreshing page to apply label changes...', {
        duration: 2000,
        position: 'top-center'
      });
      
      // Use a more direct approach to ensure reload happens
      const reloadTimer = window.setTimeout(() => {
        console.log('Reloading page to apply label changes...');
        window.location.href = window.location.href; // Force hard reload
      }, 1500);
      
      // Ensure the timeout runs even if there's a state update
      return () => clearTimeout(reloadTimer);
      
    } catch (error) {
      console.error('Error saving language labels:', error);
      toast.error('Failed to save language labels');
    }
  };

  // Helper function to render a label tree
  const renderLabelTree = (
    data: Record<string, unknown>,
    path = '',
    editingPath: string | null,
    startEditing: (path: string, value: string) => void,
    editValue: string,
    saveEdit: (path: string) => void,
    cancelEdit: () => void,
    toggleSection: (section: string) => void,
    expandedSections: Record<string, boolean>
  ) => {
    return Object.entries(data).map(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        // This is a section or subsection
        return (
          <div key={currentPath} className="my-3">
            <div 
              className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded transition-colors"
              onClick={() => toggleSection(currentPath)}
            >
              <span className="mr-2">
                {expandedSections[currentPath] ? '▼' : '►'}
              </span>
              <span className="font-medium text-primary">{key}</span>
            </div>
            
            {expandedSections[currentPath] && (
              <div className="ml-6 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                {renderLabelTree(value as Record<string, unknown>, currentPath, editingPath, startEditing, editValue, saveEdit, cancelEdit, toggleSection, expandedSections)}
              </div>
            )}
          </div>
        );
      } else {
        // This is a leaf node (actual label)
        return (
          <div key={currentPath} className="flex items-center py-1 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 rounded transition-colors">
            {editingPath === currentPath ? (
              <>
                <input 
                  id={`edit-${currentPath}`}
                  type="text" 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-primary bg-background dark:bg-background"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(currentPath);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => saveEdit(currentPath)}
                  className="ml-2 p-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  ✓
                </button>
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="ml-1 p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-1/3">{key}</span>
                <span className="text-sm flex-1 truncate">{String(value)}</span>
                <button 
                  type="button" 
                  onClick={() => startEditing(currentPath, String(value))}
                  className="ml-2 p-1 text-blue-500 hover:text-blue-700"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        );
      }
    });
  };

  // Add handler for Typesense settings changes
  const handleTypesenseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setSettings(prev => ({
      ...prev,
      typesense: {
        ...prev.typesense,
        [name]: value
      }
    }));
    
    setFormChanged(true);
  };

  return (
    <div className="pb-16">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Settings size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">System Settings</h1>
        </div>
        <button 
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            formChanged 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          onClick={handleSubmit}
          disabled={!formChanged}
        >
          <Save size={18} />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <div className="flex space-x-1">
          {TABS.map(tab => (
            <Link
              key={tab.id}
              href={`/admin/settings?tab=${tab.id}`}
              className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <>
            {/* General Settings */}
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-xl font-semibold mb-3">General Settings</h2>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                  <label htmlFor="siteName" className="block text-sm font-medium mb-1">
                    Site Name
                  </label>
                  <input
                    type="text"
                    id="siteName"
                    name="siteName"
                    value={settings.siteName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
                <div className="col-span-3">
                  <label htmlFor="contactEmail" className="block text-sm font-medium mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    id="contactEmail"
                    name="contactEmail"
                    value={settings.contactEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
                <div className="col-span-3">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={settings.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
                <div className="col-span-3">
                  <label htmlFor="address" className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={settings.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
              </div>
            </div>

            {/* Listing Settings */}
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-xl font-semibold mb-3">Listing Settings</h2>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                  <label htmlFor="maxListingsPerUser" className="block text-sm font-medium mb-1">
                    Max Listings Per User
                  </label>
                  <input
                    type="number"
                    id="maxListingsPerUser"
                    name="maxListingsPerUser"
                    value={settings.maxListingsPerUser}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
                <div className="col-span-3">
                  <label htmlFor="featuredListingCost" className="block text-sm font-medium mb-1">
                    Featured Listing Cost ($)
                  </label>
                  <input
                    type="number"
                    id="featuredListingCost"
                    name="featuredListingCost"
                    value={settings.featuredListingCost}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-xl font-semibold mb-3">System Settings</h2>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableUserRegistration"
                    name="enableUserRegistration"
                    checked={settings.enableUserRegistration}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="enableUserRegistration" className="text-sm font-medium">
                    Enable User Registration
                  </label>
                </div>
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableListingCreation"
                    name="enableListingCreation"
                    checked={settings.enableListingCreation}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="enableListingCreation" className="text-sm font-medium">
                    Enable Listing Creation
                  </label>
                </div>
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="maintenanceMode"
                    name="maintenanceMode"
                    checked={settings.maintenanceMode}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="maintenanceMode" className="text-sm font-medium">
                    Maintenance Mode
                  </label>
                </div>
              </div>
              {settings.maintenanceMode && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                  <AlertTriangle className="text-amber-500 mt-0.5" size={16} />
                  <p className="text-xs text-amber-800">
                    Maintenance mode will prevent users from accessing the site. Only administrators will be able to log in.
                  </p>
                </div>
              )}
            </div>

            {/* API Keys */}
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-xl font-semibold mb-3">API Keys</h2>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label htmlFor="googleMapsApiKey" className="block text-sm font-medium mb-1">
                    Google Maps API Key
                  </label>
                  <input
                    type="password"
                    id="googleMapsApiKey"
                    name="googleMapsApiKey"
                    value={settings.googleMapsApiKey}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
                <div className="col-span-4">
                  <label htmlFor="stripePublicKey" className="block text-sm font-medium mb-1">
                    Stripe Public Key
                  </label>
                  <input
                    type="password"
                    id="stripePublicKey"
                    name="stripePublicKey"
                    value={settings.stripePublicKey}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
                <div className="col-span-4">
                  <label htmlFor="stripeSecretKey" className="block text-sm font-medium mb-1">
                    Stripe Secret Key
                  </label>
                  <input
                    type="password"
                    id="stripeSecretKey"
                    name="stripeSecretKey"
                    value={settings.stripeSecretKey}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  />
                </div>
              </div>
              <div className="mt-3 p-2 bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start gap-2">
                <AlertTriangle className="text-blue-500 mt-0.5" size={16} />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  API keys are sensitive information. In a production environment, these should be stored securely and not exposed in client-side code.
                </p>
              </div>
            </div>

            {/* Authentication Settings Section */}
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-xl font-semibold mb-3">Authentication Settings</h2>
              
              {/* Login Methods in columns */}
              <h3 className="text-lg font-medium mb-2">Login Methods</h3>
              <div className="grid grid-cols-12 gap-4 mb-3">
                {/* Email/Password Login */}
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="emailPassword"
                    checked={settings.authMethods.emailPassword}
                    onChange={(e) => handleAuthMethodChange('emailPassword', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="emailPassword" className="text-sm font-medium">
                    Email and Password
                  </label>
                </div>
                
                {/* Google Login */}
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="google"
                    checked={settings.authMethods.google}
                    onChange={(e) => handleAuthMethodChange('google', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="google" className="text-sm font-medium">
                    Google Login
                  </label>
                </div>
                
                {/* Apple Login */}
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="apple"
                    checked={settings.authMethods.apple}
                    onChange={(e) => handleAuthMethodChange('apple', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="apple" className="text-sm font-medium">
                    Apple Login
                  </label>
                </div>
                
                {/* Phone Login */}
                <div className="col-span-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="phone"
                    checked={settings.authMethods.phone}
                    onChange={(e) => handleAuthMethodChange('phone', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </label>
                </div>
                
                {/* Facebook Login */}
                <div className="col-span-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="facebook"
                    checked={settings.authMethods.facebook}
                    onChange={(e) => handleAuthMethodChange('facebook', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="facebook" className="text-sm font-medium">
                    Facebook
                  </label>
                </div>

                {/* Anonymous Login */}
                <div className="col-span-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={settings.authMethods.anonymous}
                    onChange={(e) => handleAuthMethodChange('anonymous', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="anonymous" className="text-sm font-medium">
                    Anonymous
                  </label>
                </div>
              </div>

              {/* Facebook App Keys (Show only if Facebook login is enabled) */}
              {settings.authMethods.facebook && (
                <div className="mt-4 pt-3 border-t">
                  <h3 className="text-sm font-medium mb-2">Facebook App Configuration</h3>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label htmlFor="facebookAppId" className="block text-sm font-medium mb-1">
                        Facebook App ID
                      </label>
                      <input
                        type="text"
                        id="facebookAppId"
                        name="facebookAppId"
                        value={settings.facebookAppId}
                        onChange={handleInputChange}
                        placeholder="Enter Facebook App ID"
                        className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                      />
                    </div>
                    <div className="col-span-6">
                      <label htmlFor="facebookAppSecret" className="block text-sm font-medium mb-1">
                        Facebook App Secret
                      </label>
                      <input
                        type="password"
                        id="facebookAppSecret"
                        name="facebookAppSecret"
                        value={settings.facebookAppSecret}
                        onChange={handleInputChange}
                        placeholder="Enter Facebook App Secret"
                        className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    You can find your Facebook App ID and App Secret in the Facebook Developer Portal.
                  </p>
                </div>
              )}

              <div className="mt-3 p-2 bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-2">
                <AlertTriangle className="text-amber-500 mt-0.5" size={16} />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Remember to configure these authentication methods in your Firebase console as well.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Languages & Labels Tab */}
        {activeTab === 'languages' && (
          <>
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-xl font-semibold mb-3">Available Languages</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Manage which languages are available in your application. Set one language as default.
              </p>
              
              {/* Language List */}
              <div className="space-y-3 mb-6">
                {Array.isArray(languageSettings) && languageSettings.length > 0 ? (
                  languageSettings.map(lang => (
                    <div key={lang.code} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{
                          lang.code === 'en' ? '🇬🇧' :
                          lang.code === 'fr' ? '🇫🇷' :
                          lang.code === 'es' ? '🇪🇸' :
                          lang.code === 'de' ? '🇩🇪' :
                          lang.code === 'it' ? '🇮🇹' :
                          lang.code === 'pt' ? '🇵🇹' :
                          lang.code === 'ru' ? '🇷🇺' :
                          lang.code === 'zh' ? '🇨🇳' :
                          lang.code === 'ja' ? '🇯🇵' :
                          lang.code === 'ar' ? '🇸🇦' :
                          '🌐'
                        }</span>
                        <div>
                          <h3 className="font-medium">{lang.name}</h3>
                          <p className="text-xs text-muted-foreground">{lang.code}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`active-${lang.code}`}
                            checked={lang.isActive}
                            onChange={e => handleLanguageStatusChange(lang.code, 'isActive', e.target.checked)}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor={`active-${lang.code}`} className="text-sm">Active</label>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id={`default-${lang.code}`}
                            name="defaultLanguage"
                            checked={lang.isDefault}
                            onChange={() => handleLanguageStatusChange(lang.code, 'isDefault', true)}
                            className="mr-2 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor={`default-${lang.code}`} className="text-sm">Default</label>
                        </div>
                        
                        {!lang.isDefault && (
                          <button
                            type="button"
                            onClick={() => removeLanguage(lang.code)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors"
                            aria-label={`Remove ${lang.name}`}
                          >
                            <AlertTriangle size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 border rounded-md text-center text-muted-foreground">
                    <p>No languages configured. Add a language below.</p>
                  </div>
                )}
              </div>
              
              {/* Add Language */}
              <div className="mt-6">
                <h3 className="font-medium mb-2">Add New Language</h3>
                <div className="flex space-x-2">
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  >
                    {availableLanguages
                      .filter(lang => !languageSettings.some(l => l.code === lang.code))
                      .map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name} ({lang.code})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addLanguage(selectedLanguage)}
                    className="px-4 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                    disabled={!selectedLanguage || availableLanguages.filter(lang => !languageSettings.some(l => l.code === lang.code)).length === 0}
                  >
                    Add Language
                  </button>
                </div>
              </div>
            </div>
            
            {/* Labels Editor */}
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-xl font-semibold mb-3">Label Management</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Customize the labels used throughout your application for different languages.
              </p>
              
              <div className="flex justify-between mb-4">
                <div className="flex space-x-2">
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  >
                    {languageSettings.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    onClick={() => setRawJsonMode(!rawJsonMode)}
                  >
                    {rawJsonMode ? 'Tree View' : 'JSON View'}
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  {rawJsonMode && (
                    <button
                      type="button"
                      className="px-4 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                      onClick={applyJsonChanges}
                      disabled={!!jsonError}
                    >
                      Apply Changes
                    </button>
                  )}
                  
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    onClick={saveAllLanguageLabels}
                    disabled={!!jsonError}
                  >
                    Save Labels to Database
                  </button>
                </div>
              </div>
              
              {rawJsonMode ? (
                <div className="relative">
                  <textarea
                    ref={editorRef}
                    value={rawJson}
                    onChange={handleRawJsonChange}
                    className="w-full h-[500px] font-mono text-sm p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background dark:bg-background overflow-auto"
                  />
                  {jsonError && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded text-red-800 dark:text-red-300 text-sm">
                      <strong>Error:</strong> {jsonError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-md overflow-auto h-[500px] p-4 bg-card dark:bg-card">
                  {Object.keys(labelData).length > 0 ? (
                    renderLabelTree(labelData, '', editingPath, startEditing, editValue, saveEdit, cancelEdit, toggleSection, expandedSections)
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No labels found for this language.</p>
                  )}
                </div>
              )}
              
              <div className="mt-4 p-4 border rounded-md bg-muted dark:bg-muted">
                <h3 className="font-medium mb-2">Working with Labels</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Click on a section to expand/collapse it</li>
                  <li>Click "Edit" to modify any label value</li>
                  <li>Switch to JSON View for bulk editing</li>
                  <li>Labels for English and French are built-in</li>
                  <li>For other languages, changes are saved to application settings</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <>
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-xl font-semibold mb-3">Typesense Search Configuration</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Configure Typesense search engine settings for your application.
              </p>
              
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
                    TYPESENSE_API_KEY
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    name="apiKey"
                    value={settings.typesense.apiKey}
                    onChange={handleTypesenseChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                    placeholder="Enter Typesense API Key"
                  />
                </div>
                
                <div className="col-span-6">
                  <label htmlFor="host" className="block text-sm font-medium mb-1">
                    TYPESENSE_HOST
                  </label>
                  <input
                    type="text"
                    id="host"
                    name="host"
                    value={settings.typesense.host}
                    onChange={handleTypesenseChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                    placeholder="e.g., search.yourdomain.com"
                  />
                </div>
                
                <div className="col-span-4">
                  <label htmlFor="port" className="block text-sm font-medium mb-1">
                    TYPESENSE_PORT
                  </label>
                  <input
                    type="text"
                    id="port"
                    name="port"
                    value={settings.typesense.port}
                    onChange={handleTypesenseChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                    placeholder="e.g., 8108"
                  />
                </div>
                
                <div className="col-span-4">
                  <label htmlFor="protocol" className="block text-sm font-medium mb-1">
                    TYPESENSE_PROTOCOL
                  </label>
                  <select
                    id="protocol"
                    name="protocol"
                    value={settings.typesense.protocol}
                    onChange={handleTypesenseChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  >
                    <option value="https">https</option>
                    <option value="http">http</option>
                  </select>
                </div>
                
                <div className="col-span-4">
                  <label htmlFor="listingIndexName" className="block text-sm font-medium mb-1">
                    LISTING_INDEX_NAME
                  </label>
                  <input
                    type="text"
                    id="listingIndexName"
                    name="listingIndexName"
                    value={settings.typesense.listingIndexName}
                    onChange={handleTypesenseChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                    placeholder="e.g., listings"
                  />
                </div>
                
                <div className="col-span-4">
                  <label htmlFor="userIndexName" className="block text-sm font-medium mb-1">
                    USER_INDEX_NAME
                  </label>
                  <input
                    type="text"
                    id="userIndexName"
                    name="userIndexName"
                    value={settings.typesense.userIndexName}
                    onChange={handleTypesenseChange}
                    className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                    placeholder="e.g., users"
                  />
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start gap-2">
                <AlertTriangle className="text-blue-500 mt-0.5" size={16} />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  These settings are used to connect to your Typesense search instance. After changing these settings, you may need to restart your application for the changes to take effect.
                </p>
              </div>
              
              <div className="mt-4 p-4 border rounded-md bg-muted dark:bg-muted">
                <h3 className="font-medium mb-2">Setting Up Typesense</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Typesense is a fast, typo-tolerant search engine that's simple to set up and use.</li>
                  <li>To use Typesense, you'll need to create a Typesense cluster (either self-hosted or cloud).</li>
                  <li>Generate an API key with search and write permissions.</li>
                  <li>The search index name defines the collection where your searchable data will be stored.</li>
                  <li>For more information, visit <a href="https://typesense.org/docs/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Typesense Documentation</a>.</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
} 