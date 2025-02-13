import { getMapCenter, Location } from '@/src/core/Map';
import { GoogleMap, Libraries, Marker, useJsApiLoader } from '@react-google-maps/api';

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

  const { latitude, longitude } = getMapCenter(locations);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat: latitude, lng: longitude }}
      zoom={10}
      options={{
        zoomControl: false,
        scaleControl: false,
        cameraControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        gestureHandling: 'none',
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
