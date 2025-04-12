'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { LABELS, LABELS_FR } from '@/constants/labels';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppSettings } from './AppSettingsContext';

// Define supported languages
export type SupportedLanguage = 'en' | 'fr';

// Define label structure type based on LABELS
export type LabelStructure = typeof LABELS;

// Define the context type
interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  labels: LabelStructure;
}

// Create the context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  labels: LABELS
});

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

// Provider component
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Initialize language from localStorage if available, default to 'en'
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [labels, setLabels] = useState<LabelStructure>(LABELS);
  const { appSettings } = useAppSettings();

  // Function to merge labels, prioritizing Firestore custom labels
  const mergeLabels = async (lang: SupportedLanguage): Promise<LabelStructure> => {
    try {
      // Get the base labels depending on language
      const baseLabels = lang === 'en' ? LABELS : LABELS_FR;
      
      // Check if we have custom labels from appSettings
      const langSettings = Array.isArray(appSettings.languages) 
        ? appSettings.languages.find(l => l.code === lang)
        : null;
      
      if (langSettings?.customLabels) {
        // If we have custom labels in appSettings, merge with base labels
        // Custom labels take priority (they're spread last)
       // console.log('Using customLabels from appSettings for', lang);
        return deepMergeLabels(baseLabels, langSettings.customLabels) as LabelStructure;
      }
      
      // If not in appSettings, try to fetch directly from Firestore
      const settingsDoc = await getDoc(doc(db, 'appSettings', 'interface'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.languages && Array.isArray(data.languages)) {
          // Define a proper type for language settings
          interface FirestoreLanguageSetting {
            code: string;
            name: string;
            isActive: boolean;
            isDefault: boolean;
            customLabels?: Record<string, Record<string, string>>;
          }
          
          const firestoreLangSettings = data.languages.find(
            (l: FirestoreLanguageSetting) => l.code === lang
          );
          
          if (firestoreLangSettings?.customLabels) {
            // Merge with Firestore labels taking priority
            console.log('Using customLabels from Firestore for', lang);
            
            // Deep merge the labels to ensure nested structures are properly combined
            return deepMergeLabels(baseLabels, firestoreLangSettings.customLabels) as LabelStructure;
          }
        }
      }
      
      // If no custom labels found, return the base labels
      console.log('Using default labels for', lang);
      return baseLabels;
    } catch (error) {
      console.error('Error merging labels:', error);
      // Fallback to base labels on error
      return lang === 'en' ? LABELS : LABELS_FR;
    }
  };
  
  // Helper function to deep merge objects (for nested label structures)
  const deepMergeLabels = (baseLabels: Record<string, unknown>, customLabels: Record<string, unknown>): Record<string, unknown> => {
    const result = { ...baseLabels };
    
    Object.keys(customLabels).forEach(key => {
      const baseValue = result[key];
      const customValue = customLabels[key];
      
      if (
        typeof customValue === 'object' && 
        customValue !== null && 
        typeof baseValue === 'object' && 
        baseValue !== null &&
        !Array.isArray(customValue) &&
        !Array.isArray(baseValue)
      ) {
        // If both values are objects, recursively merge them
        result[key] = deepMergeLabels(
          baseValue as Record<string, unknown>,
          customValue as Record<string, unknown>
        );
      } else {
        // Otherwise, custom label takes precedence
        result[key] = customValue;
      }
    });
    
    return result;
  };

  // Load saved language preference on mount
  useEffect(() => {
    const loadLanguage = async () => {
     // console.log('🔍 Loading language, appSettings changed', appSettings.updatedAt);
     // console.log('🔍 Current appSettings languages:', appSettings.languages);
      
      const savedLanguage = localStorage.getItem('language') as SupportedLanguage;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'fr')) {
        setLanguageState(savedLanguage);
        const mergedLabels = await mergeLabels(savedLanguage);
       // console.log('🔍 Setting merged labels for', savedLanguage);
        setLabels(mergedLabels as LabelStructure);
      } else {
        // Default to English
        const mergedLabels = await mergeLabels('en');
       //console.log('🔍 Setting default English merged labels');
        setLabels(mergedLabels as LabelStructure);
      }
    };
    
    loadLanguage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSettings, appSettings.updatedAt]); // Re-run when appSettings changes or when it's updated

  // Update labels when language changes
  useEffect(() => {
    const updateLabels = async () => {
     // console.log('🔍 Language changed to', language, ', updating labels');
      
      // Directly fetch from Firestore to ensure we have the latest data
      try {
        const settingsDoc = await getDoc(doc(db, 'appSettings', 'interface'));
        if (settingsDoc.exists()) {
         // console.log('🔍 Directly fetched Firestore data:', settingsDoc.data());
        }
      } catch (error) {
        console.error('Error fetching Firestore data:', error);
      }
      
      const mergedLabels = await mergeLabels(language);
      setLabels(mergedLabels as LabelStructure);
    };
    
    updateLabels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Function to change language
  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, labels }}>
      {children}
    </LanguageContext.Provider>
  );
} 