'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider enableSystem={true} attribute="class" defaultTheme="light">
      <Toaster 
        richColors 
        position="top-right"
        expand={false}
        closeButton
        offset={16}
      />
      {children}
    </ThemeProvider>
  );
} 