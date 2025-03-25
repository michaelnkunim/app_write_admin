import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { AuthProvider } from '@/context/AuthContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { AppSettingsProvider } from '@/context/AppSettingsContext';
import { UnreadCountProvider } from '@/context/UnreadCountContext';
import { LanguageProvider } from '@/context/LanguageContext';
import ClientLayout from './client-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'RentEasy',
  description: 'Your ultimate rental marketplace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AppSettingsProvider>
            <AuthProvider>
              <ProfileProvider>
                <FavoritesProvider>
                  <OnboardingProvider>
                    <UnreadCountProvider>
                      <LanguageProvider>
                        <ClientLayout>{children}</ClientLayout>
                      </LanguageProvider>
                    </UnreadCountProvider>
                  </OnboardingProvider>
                </FavoritesProvider>
              </ProfileProvider>
            </AuthProvider>
          </AppSettingsProvider>
        </Providers>
      </body>
    </html>
  );
}
