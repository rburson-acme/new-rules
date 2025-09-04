import { getMapCenter, Location } from '@/src/core/Map';

import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

type MapProps = {
  locations: Location[];
};

export const Map = ({ locations }: MapProps) => {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = getMapCenter(locations);
  return (
    <MapView
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta,
        longitudeDelta,
      }}
      zoomControlEnabled={true}
      provider={PROVIDER_GOOGLE}
      style={{
        width: 180,
        height: 180,
      }}>
      {locations.map(location => {
        return (
          <Marker
            key={location.name}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name}
          />
        );
      })}
    </MapView>
  );
};
