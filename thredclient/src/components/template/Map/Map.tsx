import { getMapCenter, Location } from '@/src/core/Map';
import { View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Bubble } from '../../common/Bubble';

type MapProps = {
  locations: Location[];
};

export const Map = ({ locations }: MapProps) => {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = getMapCenter(locations);
  return (
    <Bubble>
      <MapView
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta,
          longitudeDelta,
        }}
        provider={PROVIDER_GOOGLE}
        style={{
          width: 280,
          height: 275,
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
    </Bubble>
  );
};
