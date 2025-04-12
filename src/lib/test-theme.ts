/**
 * This is a simple test function that can be used in the browser console
 * to verify that the theme switching works correctly.
 */

import { applyAppTheme } from './theme-utils';

export function testThemeSwitching() {
  // Example app theme
  const testTheme = {
    light: {
      primary: '#3B82F6', // Blue primary
      secondary: '#10B981', // Green secondary
      background: '#FFFFFF',
      text: '#1F2937',
      accent: '#F3F4F6'
    },
    dark: {
      primary: '#60A5FA', // Lighter blue for dark mode
      secondary: '#34D399', // Lighter green for dark mode
      background: '#111827',
      text: '#F9FAFB',
      accent: '#374151'
    }
  };

  console.log('Applying test light theme...');
  applyAppTheme(testTheme, 'light');
  
  // After 3 seconds, switch to dark theme
  setTimeout(() => {
    console.log('Applying test dark theme...');
    applyAppTheme(testTheme, 'dark');
  }, 3000);
} 