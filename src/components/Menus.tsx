'use client';

import { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { useAppSettings, Menu, MenuColumn } from '@/context/AppSettingsContext';

interface MenusProps {
  zone?: string;
}

// Utility function to convert string to title case
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const Menus = memo(function Menus({ zone = 'footer' }: MenusProps) {
  const { getMenusForZone, loading: contextLoading } = useAppSettings();
  const [menus, setMenus] = useState<{ menu: Menu; items: MenuColumn[] }[]>([]);

  // Fetch menus from context based on zone
  useEffect(() => {
    if (zone) {
      const zoneMenus = getMenusForZone(zone);
      setMenus(zoneMenus);
    }
  }, [zone, getMenusForZone]);

  // If we're still loading or there are no menus, show a placeholder
  if (contextLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-12 gap-8">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="col-span-12 md:col-span-6 lg:col-span-3 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                {[...Array(4)].map((_, subIndex) => (
                  <div key={subIndex} className="h-3 w-32 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no menus are found for this zone
  if (menus.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-12 gap-8">
        {menus.map(({ menu, items }) => (
          items.map((column, columnIndex) => (
            <div key={`${menu.id}-${columnIndex}`} className="col-span-12 md:col-span-6 lg:col-span-3">
              {items.length > 1 && (
                <h3 className="text-lg font-semibold mb-4">{toTitleCase(column.title)}</h3>
              )}
              {items.length === 1 && (
                <h3 className="text-lg font-semibold mb-4">{toTitleCase(menu.title)}</h3>
              )}
              <ul className="space-y-2">
                {column.items.map((item, itemIndex) => (
                  <li key={`${menu.id}-${columnIndex}-${itemIndex}`}>
                    <Link 
                      href={item.url}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {toTitleCase(item.text)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ))}
      </div>
    </div>
  );
});

export default Menus; 