import { Button } from '@/src/components/Button';
import { GeoModuleStore } from '@/src/stores/GeoModuleStore';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type GeoModuleProps = {
  geoModuleStore: GeoModuleStore;
};
export const GeoModule = observer(({ geoModuleStore }: GeoModuleProps) => {
  const { hasInitialized, location, errorMessage, turnOnLocation, canAskAgain } = geoModuleStore;

  useEffect(() => {
    geoModuleStore.initialize();
  }, []);

  if (!hasInitialized) {
    return <ActivityIndicator />;
  }
  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 8, gap: 4 }}>
      {location ? (
        <Text>{JSON.stringify(location)}</Text>
      ) : (
        <View>
          {errorMessage && <Text style={{ textAlign: 'center' }}>{errorMessage}</Text>}
          {canAskAgain && <Button content={'Request All Permissions'} onPress={turnOnLocation} />}
        </View>
      )}
    </View>
  );
});
