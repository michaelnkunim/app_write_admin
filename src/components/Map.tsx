'use client';

import { useState } from 'react';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapComponentProps {
  coordinates: {
    lat: number;
    lng: number;
  };
}

export default function MapComponent({ coordinates }: MapComponentProps) {
  const [viewport, setViewport] = useState({
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    zoom: 14
  });

  return (
    <Map
      reuseMaps
      {...viewport}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      onMove={evt => setViewport(evt.viewState)}
    >
      <Marker
        latitude={coordinates.lat}
        longitude={coordinates.lng}
      >
        <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg" />
      </Marker>
    </Map>
  );
} 