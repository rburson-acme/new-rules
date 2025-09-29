import { getMapCenter } from '@/src/core/Map';
import { useState } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapLocation } from 'thredlib';
import { Button } from '../../common/Button';

type MapProps = {
  locations: MapLocation[];
};
export const Map = ({ locations }: MapProps) => {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = getMapCenter(locations);
  const [fullScreen, setFullScreen] = useState(false);

  return (
    <View>
      {/* Inline preview */}
      <MapView
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta,
          longitudeDelta,
        }}
        zoomControlEnabled={true}
        provider={PROVIDER_GOOGLE}
        style={{ width: 180, height: 180 }}>
        {locations.map(location => (
          <Marker
            key={location.name}
            coordinate={{
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
            }}
            title={location.name}>
            {location.display && (
              <Image source={{ uri: location.display }} style={{ width: 50, height: 50 }} resizeMode="contain" />
            )}
          </Marker>
        ))}
      </MapView>
      <Button content="Full Screen" onPress={() => setFullScreen(true)} />

      {/* Fullscreen modal */}
      <Modal visible={fullScreen} animationType="slide">
        <View style={styles.overlay}>
          <MapView
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta,
              longitudeDelta,
            }}
            zoomControlEnabled={true}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}>
            {locations.map(location => (
              <Marker
                key={location.name}
                coordinate={{
                  latitude: Number(location.latitude),
                  longitude: Number(location.longitude),
                }}
                title={location.name}>
                {location.display && (
                  <Image source={{ uri: location.display }} style={{ width: 50, height: 50 }} resizeMode="contain" />
                )}
              </Marker>
            ))}
          </MapView>

          {/* Floating close button */}
          <View style={styles.closeButton}>
            <Button content="Close" onPress={() => setFullScreen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
});
