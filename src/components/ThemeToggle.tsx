'use client';

import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors">
        <MoonIcon className="h-5 w-5 text-foreground" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <MoonIcon className="h-5 w-5 text-foreground" />
      ) : (
        <SunIcon className="h-5 w-5 text-foreground" />
      )}
    </button>
  );
} 