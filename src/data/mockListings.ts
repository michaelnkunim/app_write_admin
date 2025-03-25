export interface Listing {
  id: string;
  title: string;
  description: string;
  image: string;
  images: string[];
  price: number;
  location: string;
  rating: number;
  reviews: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  amenities: string[];
  category: 'For Sale' | 'For Rent' | 'Short Stay';
  promotionPackage?: string;
  host: {
    id: string;
    name: string;
    image: string;
    rating: number;
    reviews: number;
    experience: number;
    phone: string;
    specialties: string[];
    description: string;
  };
}

export const mockListings: Listing[] = [
  {
    id: '1',
    title: 'Luxury Mountain Cabin',
    description: 'Beautiful cabin in the mountains with stunning views and modern amenities. Perfect for a peaceful getaway.',
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8',
    images: [
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8',
      'https://images.unsplash.com/photo-1458442310124-dde6edb43d10',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'
    ],
    price: 250,
    location: 'Aspen, Colorado',
    rating: 4.9,
    reviews: 128,
    coordinates: {
      lat: 39.1911,
      lng: -106.8175
    },
    amenities: [
      'Mountain View',
      'Fireplace',
      'Hot Tub',
      'WiFi',
      'Kitchen',
      'Free Parking'
    ],
    category: 'For Rent',
    host: {
      id: 'host1',
      name: 'Emily Wilson',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
      rating: 4.7,
      reviews: 156,
      experience: 4,
      phone: '+1 (555) 234-5678',
      specialties: ['Mountain Properties', 'Vacation Homes', 'Luxury Cabins'],
      description: 'Mountain property specialist with deep knowledge of the Aspen area. Passionate about helping clients find their perfect mountain retreat.'
    }
  },
  {
    id: '2',
    title: 'Historic City Apartment',
    description: 'Charming apartment in a historic building in downtown Boston. Features original architectural details with modern updates.',
    image: 'https://images.unsplash.com/photo-1460317442991-0ec209397118',
    images: [
      'https://images.unsplash.com/photo-1460317442991-0ec209397118',
      'https://images.unsplash.com/photo-1494526585095-c41746248156',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858'
    ],
    price: 175,
    location: 'Boston, Massachusetts',
    rating: 4.8,
    reviews: 95,
    coordinates: {
      lat: 42.3601,
      lng: -71.0589
    },
    amenities: [
      'City View',
      'Historic Building',
      'Modern Kitchen',
      'WiFi',
      'Washer/Dryer',
      'Subway Access'
    ],
    category: 'For Rent',
    host: {
      id: 'host2',
      name: 'David Brown',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      rating: 4.6,
      reviews: 134,
      experience: 6,
      phone: '+1 (555) 345-6789',
      specialties: ['Historic Properties', 'City Apartments', 'Renovated Buildings'],
      description: 'Boston real estate expert specializing in historic properties. Helping clients find character-rich homes with modern comfort.'
    }
  },
  {
    id: '3',
    title: 'Beachfront Villa',
    description: 'Stunning beachfront villa with direct access to pristine sandy beaches. Perfect for luxury vacation rentals.',
    image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2',
    images: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2'
    ],
    price: 500,
    location: 'Malibu, California',
    rating: 4.9,
    reviews: 210,
    coordinates: {
      lat: 34.0259,
      lng: -118.7798
    },
    amenities: [
      'Beach Access',
      'Pool',
      'Ocean View',
      'Gourmet Kitchen',
      'Home Theater',
      'Private Parking'
    ],
    category: 'For Rent',
    host: {
      id: 'host3',
      name: 'Sarah Martinez',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f',
      rating: 4.9,
      reviews: 278,
      experience: 8,
      phone: '+1 (555) 456-7890',
      specialties: ['Luxury Properties', 'Beachfront Homes', 'Investment Properties'],
      description: 'Luxury real estate specialist focusing on premium beachfront properties in Malibu. Extensive experience in high-end real estate transactions.'
    }
  },
  {
    id: '4',
    title: 'Modern Downtown Loft',
    description: 'Sleek and modern loft in the heart of downtown. Floor-to-ceiling windows with spectacular city views.',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'
    ],
    price: 300,
    location: 'Chicago, Illinois',
    rating: 4.7,
    reviews: 156,
    coordinates: {
      lat: 41.8781,
      lng: -87.6298
    },
    amenities: [
      'City Views',
      'Modern Design',
      'Gym Access',
      'Smart Home',
      'Concierge',
      'Rooftop Deck'
    ],
    category: 'For Rent',
    host: {
      id: 'host4',
      name: 'Michael Chen',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      rating: 4.8,
      reviews: 203,
      experience: 5,
      phone: '+1 (555) 567-8901',
      specialties: ['Urban Properties', 'Luxury Condos', 'Investment Properties'],
      description: 'Chicago real estate expert specializing in luxury urban properties. Helping clients find their perfect city home.'
    }
  },
  {
    id: '5',
    title: 'Desert Oasis Villa',
    description: 'Luxurious desert villa with private pool and stunning mountain views. Perfect blend of modern comfort and desert living.',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750'
    ],
    price: 400,
    location: 'Scottsdale, Arizona',
    rating: 4.8,
    reviews: 142,
    coordinates: {
      lat: 33.4942,
      lng: -111.9261
    },
    amenities: [
      'Private Pool',
      'Mountain View',
      'Desert Garden',
      'Outdoor Kitchen',
      'Fire Pit',
      'Golf Access'
    ],
    category: 'For Rent',
    host: {
      id: 'host1',
      name: 'Emily Wilson',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
      rating: 4.7,
      reviews: 156,
      experience: 4,
      phone: '+1 (555) 234-5678',
      specialties: ['Mountain Properties', 'Vacation Homes', 'Luxury Cabins'],
      description: 'Mountain property specialist with deep knowledge of the Aspen area. Passionate about helping clients find their perfect mountain retreat.'
    }
  },
  {
    id: '6',
    title: 'Lakefront Cottage',
    description: 'Charming cottage on the lake with private dock. Perfect for peaceful getaways and water activities.',
    image: 'https://images.unsplash.com/photo-1475087542963-13ab5e611954',
    images: [
      'https://images.unsplash.com/photo-1475087542963-13ab5e611954',
      'https://images.unsplash.com/photo-1475087542963-13ab5e611954',
      'https://images.unsplash.com/photo-1475087542963-13ab5e611954'
    ],
    price: 225,
    location: 'Lake Tahoe, Nevada',
    rating: 4.6,
    reviews: 98,
    coordinates: {
      lat: 39.0968,
      lng: -120.0324
    },
    amenities: [
      'Lake View',
      'Private Dock',
      'Kayaks',
      'Fireplace',
      'BBQ Grill',
      'Beach Access'
    ],
    category: 'For Rent',
    host: {
      id: 'host2',
      name: 'David Brown',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      rating: 4.6,
      reviews: 134,
      experience: 6,
      phone: '+1 (555) 345-6789',
      specialties: ['Historic Properties', 'City Apartments', 'Renovated Buildings'],
      description: 'Boston real estate expert specializing in historic properties. Helping clients find character-rich homes with modern comfort.'
    }
  },
  {
    id: '7',
    title: 'Urban Micro Apartment',
    description: 'Efficiently designed micro apartment in trendy neighborhood. Smart space utilization with modern amenities.',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'
    ],
    price: 150,
    location: 'Portland, Oregon',
    rating: 4.5,
    reviews: 75,
    coordinates: {
      lat: 45.5155,
      lng: -122.6789
    },
    amenities: [
      'Smart Design',
      'Bike Storage',
      'Rooftop Garden',
      'Coffee Shop',
      'Workspace',
      'City Transit'
    ],
    category: 'For Rent',
    host: {
      id: 'host3',
      name: 'Sarah Martinez',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f',
      rating: 4.9,
      reviews: 278,
      experience: 8,
      phone: '+1 (555) 456-7890',
      specialties: ['Luxury Properties', 'Beachfront Homes', 'Investment Properties'],
      description: 'Luxury real estate specialist focusing on premium beachfront properties in Malibu. Extensive experience in high-end real estate transactions.'
    }
  },
  {
    id: '8',
    title: 'Vineyard Estate',
    description: 'Elegant estate in wine country with private vineyard. Spectacular views and wine tasting experience.',
    image: 'https://images.unsplash.com/photo-1464288550599-43d5a73451b8',
    images: [
      'https://images.unsplash.com/photo-1464288550599-43d5a73451b8',
      'https://images.unsplash.com/photo-1464288550599-43d5a73451b8',
      'https://images.unsplash.com/photo-1464288550599-43d5a73451b8'
    ],
    price: 600,
    location: 'Napa Valley, California',
    rating: 4.9,
    reviews: 184,
    coordinates: {
      lat: 38.5025,
      lng: -122.2654
    },
    amenities: [
      'Private Vineyard',
      'Wine Cellar',
      'Tasting Room',
      'Pool',
      'Garden',
      'Mountain Views'
    ],
    category: 'For Rent',
    host: {
      id: 'host4',
      name: 'Michael Chen',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      rating: 4.8,
      reviews: 203,
      experience: 5,
      phone: '+1 (555) 567-8901',
      specialties: ['Urban Properties', 'Luxury Condos', 'Investment Properties'],
      description: 'Chicago real estate expert specializing in luxury urban properties. Helping clients find their perfect city home.'
    }
  }
]; 