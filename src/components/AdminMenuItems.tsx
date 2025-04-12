'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  Settings, 
  Users, 
  FileText, 
  Home, 
  Image as ImageIcon,
  Search,
  LayoutDashboard,
  Share2,
  Calendar1Icon,
  StickyNote,
  LayoutDashboardIcon,
  UsersIcon
} from 'lucide-react';
import { useAdminApp } from '@/context/AdminAppContext';

// Helper function to get icon component from icon name
const getIconComponent = (iconName: string, size = 20) => {
  switch (iconName) {
    case 'Menu': return <Menu size={size} />;
    case 'Settings': return <Settings size={size} />;
    case 'Users': return <Users size={size} />;
    case 'FileText': return <FileText size={size} />;
    case 'Home': return <Home size={size} />;
    case 'Image': return <ImageIcon size={size} />;
    case 'Share': return <Share2 size={size} />;
    case 'Search': return <Search size={size} />;
    case 'LayoutDashboard': return <LayoutDashboard size={size} />;
    case 'Calendar1': return <Calendar1Icon size={size} />;
    case 'StickyNote': return <StickyNote size={size} />;
    case 'LayoutDashboardIcon': return <LayoutDashboardIcon size={size} />;
    case 'UsersIcon': return <UsersIcon size={size} />;
    default: return <Menu size={size} />;
  }
};

interface AdminMenuItemsProps {
  collapsed: boolean;
}

export default function AdminMenuItems({ collapsed }: AdminMenuItemsProps) {
  const { selectedApp, loading } = useAdminApp();
  const pathname = usePathname();
  
  if (loading || !selectedApp?.adminMenuItems?.length) {
    return null;
  }
  
  // Sort menu items by their order
  const sortedMenuItems = [...selectedApp.adminMenuItems].sort((a, b) => a.order - b.order);

  const defaultMenuItems = [
    {
      icon: 'Settings',
      id: 'settings',
      name: 'Settings',
      path: '/admin/settings',
    },
    {
      icon: 'UsersIcon',
      id: 'users',
      name: 'Users',
      path: '/admin/users',
    },
    {
      icon: 'LayoutDashboardIcon',
      id: 'interface',
      name: 'Interface',
      path: '/admin/interface',
    },
    // {
    //   icon: 'Calendar1',
    //   id: 'tracker',
    //   name: 'Tracker',
    //   path: '/admin/tracker',
    // },
    // {
    //   icon: 'StickyNote',
    //   id: 'notes',
    //   name: 'Notes',
    //   path: '/admin/notes',
    // },
  ]

  
  return (
    <div className="mt-2 pt-1">


          <Link

            href='/admin/apps'
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              pathname === '/admin/apps' || pathname.startsWith('/admin/apps/')
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent'
            }`}
          >
            <LayoutDashboardIcon size={20} />
            {!collapsed && <span>Apps</span>}
          </Link>

<br/>

      <div className={`text-xs uppercase text-muted-foreground mb-2 px-3 ${collapsed ? 'sr-only' : ''}`}>
        {selectedApp.name} Menu
      </div>

      {defaultMenuItems.map((item) => {
        const href = item.path.startsWith('/') ? item.path : `/${item.path}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        
        return (
          <Link
            key={item.id}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent'
            }`}
          >
            {getIconComponent(item.icon)}
            {!collapsed && <span>{item.name}</span>}
          </Link>
        );
      })}

  <hr className='my-2 border-t border-border' />
      
      {sortedMenuItems.map((item) => {
        const href = item.path.startsWith('/') ? item.path : `/${item.path}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        
        return (
          <Link
            key={item.id}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent'
            }`}
          >
            {getIconComponent(item.icon)}
            {!collapsed && <span>{item.name}</span>}
          </Link>
        );
      })}

      <hr className='my-2 border-t border-border' />

      <Link  
        href='/admin/tracker'  
        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
          pathname === '/admin/tracker' || pathname.startsWith('/admin/tracker/') 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-accent'
        }`}
      >
        <Calendar1Icon size={20} />
        {!collapsed && <span>Tracker</span>}
      </Link>

      <Link  
        href='/admin/notes'
        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
          pathname === '/admin/notes' || pathname.startsWith('/admin/notes/') 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-accent'
        }`}
      >
        <StickyNote size={20} />
        {!collapsed && <span>Notes</span>}
      </Link>
      
      <hr className='my-2 border-t border-border' />
    </div>
  );
}