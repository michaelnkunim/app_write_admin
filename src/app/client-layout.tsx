'use client';

import { usePathname } from 'next/navigation';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileToolbar from "@/components/MobileToolbar";
import HeaderAd from '@/components/HeaderAd';
import { AlarmIndicator } from '@/components/AlarmIndicator';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  // const isChatPage = pathname?.startsWith('/chat');
  const isAdminPage = pathname?.startsWith('/admin');
  const isDashboardPage = pathname?.startsWith('/dashboard');
  // const shouldHideFooter = isChatPage || isAdminPage || isDashboardPage;
  const shouldHideHeaderAd = isAdminPage || isDashboardPage;

  return (
    <div className="flex flex-col min-h-screen">
      {/* <Navbar /> */}
      {!shouldHideHeaderAd && <HeaderAd />}
      <main className="flex-grow main-container">{children}</main>
      {/* {!shouldHideFooter && <Footer />} */}
      {/* <div className="block md:hidden">
        <MobileToolbar />
      </div> */}
      <AlarmIndicator />
    </div>
  );
} 