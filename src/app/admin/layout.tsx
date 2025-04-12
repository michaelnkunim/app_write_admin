'use client';

import { useState } from 'react';
import { 
  Share2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AppSwitcher from '@/components/AppSwitcher';
import AdminMenuItems from '@/components/AdminMenuItems';
import { AdminAppProvider } from '@/context/AdminAppContext';
import Navbar from '@/components/Navbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AdminAppProvider>
      <div className='w-full align-right justify-right'>
      <Navbar />
      </div>
      <div className="flex min-h-screen bg-background">
     
        {/* Sidebar */}
        <aside 
          className={`fixed left-0 top-0 z-40 h-screen bg-card border transition-all duration-300 overflow-y-auto ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className="flex h-14 items-center justify-between px-4  background">
            {!collapsed && (
              <h1 className="text-xl font-semibold">Admin Panel</h1>
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-md hover:bg-accent"
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {/* App Switcher */}
          <div className="p-2 border-b">
            {collapsed ? (
              <div className="flex justify-center py-2">
                <button 
                  onClick={() => setCollapsed(false)}
                  className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center hover:bg-accent/50 transition-colors"
                  title="Expand to switch app"
                >
                  <Share2 size={20} />
                </button>
              </div>
            ) : (
              <AppSwitcher />
            )}
          </div>

          <nav className="flex flex-col gap-1 p-2">
            {/* App-specific navigation items */}
            <AdminMenuItems collapsed={collapsed} />
          </nav>
        </aside>

        {/* Main content */}
        <div className={`flex-1 transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}>
          <div className={`py-8 px-2 ${collapsed ? 'container-fluid' : 'container'}`}>
            {children}
          </div>
        </div>
      </div>
    </AdminAppProvider>
  );
} 