/**
 * Utility functions for handling theme operations
 */

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

interface AppTheme {
  light: ThemeColors;
  dark: ThemeColors;
}

/**
 * Apply theme variables to CSS custom properties
 */
export function applyAppTheme(theme: AppTheme | undefined, mode: 'light' | 'dark'): void {
  if (!theme) return;
  
  const themeColors = theme[mode];
  const root = document.documentElement;
  
  // Apply primary color and create a contrasting text color for it
  if (themeColors.primary) {
    root.style.setProperty('--primary', themeColors.primary);
    
    // Determine if the primary color is dark or light to set an appropriate text color
    const isColorDark = isColorDarkEnough(themeColors.primary);
    root.style.setProperty('--primary-text', isColorDark ? '#FFFFFF' : '#000000');
  }
  
  // Apply background color based on mode
  if (mode === 'light') {
    // Light mode colors
    if (themeColors.background) {
      root.style.setProperty('--background', themeColors.background);
    }
    if (themeColors.text) {
      root.style.setProperty('--foreground', themeColors.text);
    }
    if (themeColors.accent) {
      root.style.setProperty('--mute', themeColors.accent);
    }
  } else {
    // Dark mode colors
    if (themeColors.background) {
      root.style.setProperty('--background', themeColors.background);
    }
    if (themeColors.text) {
      root.style.setProperty('--foreground', themeColors.text);
    }
    if (themeColors.accent) {
      root.style.setProperty('--mute', themeColors.accent);
    }
  }
}

/**
 * Determines if a color is dark enough to require white text
 */
function isColorDarkEnough(hexColor: string): boolean {
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Calculate luminance - a formula to determine if a color is dark or light
  // W3C accessibility guidelines formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if the color is dark (needs white text)
  return luminance < 0.5;
}

/**
 * Reset theme to default values
 */
export function resetAppTheme(mode: 'light' | 'dark'): void {
  const root = document.documentElement;
  
  // Reset to default colors
  if (mode === 'light') {
    root.style.setProperty('--primary', '#FF385C');
    root.style.setProperty('--primary-text', '#FFFFFF');
    root.style.setProperty('--background', 'white');
    root.style.setProperty('--foreground', '#171717');
    root.style.setProperty('--mute', '#f5f5f5');
  } else {
    root.style.setProperty('--primary', '#FF385C');
    root.style.setProperty('--primary-text', '#FFFFFF');
    root.style.setProperty('--background', '#1F2937');
    root.style.setProperty('--foreground', '#F9FAFB');
    root.style.setProperty('--mute', '#1b253b');
  }
} 