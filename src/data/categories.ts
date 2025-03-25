export interface Category {
  title: string;
  key: string;
}

export const categories: Category[] = [
  { title: 'All', key: 'all' },
  { title: 'For Sale', key: 'for-sale' },
  { title: 'For Rent', key: 'for-rent' },
  { title: 'Short Stays', key: 'short-stays' }
];

export type CategoryKey = typeof categories[number]['key'];

export function getCategoryByKey(key: string): Category | undefined {
  return categories.find(category => category.key === key);
}

export function getCategoryTitle(key: string): string {
  return getCategoryByKey(key)?.title || 'All';
} 