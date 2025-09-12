import { getMapCenter } from '@/src/core/Map';
import { Image } from 'react-native';

import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapLocation } from 'thredlib';

type MapProps = {
  locations: MapLocation[];
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
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
            }}
            title={location.name}>
            {location.display && (
              <Image
                source={{ uri: location.display }}
                style={{ width: 50, height: 50 }} // control size here
                resizeMode="contain"
              />
            )}
          </Marker>
        );
      })}
    </MapView>
  );
};
