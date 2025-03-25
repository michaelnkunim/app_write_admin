'use client';

import { useLanguage, SupportedLanguage } from '@/context/LanguageContext';
import { LanguagesIcon } from 'lucide-react';
import { useState } from 'react';

interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' }
];

export default function LanguageSwitcher() {
  const { language, setLanguage, labels } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="p-2 hover:bg-accent rounded-full transition-colors"
        aria-label={labels.shared.CHANGE_LANGUAGE}
      >
        <LanguagesIcon className="h-6 w-6" />
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-1 w-48 bg-background rounded-md shadow-lg z-50 border border-border overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.value}
              className={`w-full text-left px-4 py-2 flex items-center space-x-2 hover:bg-accent transition-colors ${
                language === lang.value ? 'bg-accent' : ''
              }`}
              onClick={() => handleLanguageChange(lang.value)}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 