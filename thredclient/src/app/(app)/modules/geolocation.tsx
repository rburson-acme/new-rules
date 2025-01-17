import { Button } from '@/src/components/common/Button';
import { RootStore } from '@/src/stores/rootStore';
import { useNavigation } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

function GeoModule() {
  const { geoModuleStore } = RootStore.get();
  const { hasInitialized, location, errorMessage, turnOnLocation, canAskAgain } = geoModuleStore;
  useEffect(() => {
    geoModuleStore.initialize();
  }, []);

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Geolocation' });
  }, [navigation]);

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
}

export default observer(GeoModule);
