import { getMapCenter, Location } from '@/src/core/Map';
import { GoogleMap, Libraries, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useRef } from 'react';

const containerStyle = {
  width: '180px',
  height: '180px',
  borderRadius: '8px',
};

type MapProps = {
  locations: Location[];
};

const libraries: Libraries = ['places', 'drawing', 'geometry', 'marker'];
export function Map({ locations }: MapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API,
    libraries: libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      if (locations.length === 1) {
        // Single location: center + default zoom
        map.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude });
        map.setZoom(12);
      } else if (locations.length > 1) {
        // Multiple locations: fit bounds
        const bounds = new google.maps.LatLngBounds();
        locations.forEach(loc => bounds.extend(new google.maps.LatLng(loc.latitude, loc.longitude)));
        map.fitBounds(bounds, 20); // 20px padding
      }
    },
    [locations],
  );

  const { latitude, longitude } = getMapCenter(locations);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat: latitude, lng: longitude }}
      onLoad={onLoad}
      options={{
        scaleControl: false,
        cameraControl: false,
        mapTypeControl: false,
        streetViewControl: false,
      }}>
      {locations.map(location => {
        return (
          <Marker
            key={location.name}
            position={{
              lat: location.latitude,
              lng: location.longitude,
            }}
            title={location.name}
          />
        );
      })}
    </GoogleMap>
  );
}
