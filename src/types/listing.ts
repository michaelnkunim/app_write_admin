import { Category } from "@/data/categories";

export interface Listing {
  id: string;
  title: string;
  description: string;
  image: string;
  images: string[];
  price: number;
  location: string;
  category: Category[];
  status: 'active' | 'frozen' | 'pending' | 'taken';
  published: boolean;
  views?: number;
  rating?: number;
  reviews?: number;
  bathrooms?: number;
  bedrooms?: number;
  area?: number;
  propertyType: string;
  host: {
    id: string;
    name: string;
    image: string;
    rating?: number;
    reviews?: number;
    experience?: number;
    phone?: string;
    specialties?: string[];
    description?: string;
  };
  amenities: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  promotionPackage?: string;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
} 